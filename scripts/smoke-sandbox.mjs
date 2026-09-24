import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// Explicitly opt-in: this script creates two genuine sandbox purchases.
// It never intercepts traffic, replays payment POSTs, loads .env, or relaxes TLS.
// Official fixtures, verified 2026-09-23:
// https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/
const APPROVED_ORIGIN =
  "https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com";
const SANDBOX_APIS = new Set([
  "https://api-sandbox.co.uat.wompi.dev/v1",
  "https://sandbox.wompi.co/v1",
]);
const OUTPUT_DIRECTORY = resolve("test-results/live-sandbox");
const STATUSES = new Set([
  "PENDING",
  "APPROVED",
  "DECLINED",
  "ERROR",
  "VOIDED",
]);
const TERMINAL_HEADINGS = {
  APPROVED: "Tu luz está en camino.",
  DECLINED: "El pago fue rechazado.",
  ERROR: "No se completó el pago.",
  VOIDED: "El pago fue anulado.",
};
const SCENARIOS = [
  { name: "approved", expectedStatus: "APPROVED", number: "4242".repeat(4) },
  {
    name: "declined",
    expectedStatus: "DECLINED",
    number: "4" + "1".repeat(15),
  },
];

class SmokeFailure extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
function must(condition, code) {
  if (!condition) throw new SmokeFailure(code);
}
function safeFailure(error) {
  if (error instanceof SmokeFailure) return error.code;
  // Inspect only for classification; never print raw Playwright/HTTP errors.
  const detail =
    String(error?.message ?? "") + String(error?.cause?.code ?? "");
  if (/CERT|SSL|TLS|SELF_SIGNED/i.test(detail)) return "TLS_VALIDATION_FAILED";
  if (error?.name === "TimeoutError" || /timed? ?out/i.test(detail)) {
    return "OPERATION_TIMED_OUT";
  }
  return "OPERATION_FAILED";
}
function safeId(value) {
  return (
    typeof value === "string" &&
    /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value)
  );
}

const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  origin: APPROVED_ORIGIN,
  execution: "real-sandbox-no-interception",
  tlsVerification: "enabled",
  browser: null,
  preflight: [],
  scenarios: [],
  passed: false,
  failure: null,
};
let phase = "argument-validation";
let browser;

function recordStep(result, name) {
  result.steps.push({ name, at: new Date().toISOString(), status: "PASS" });
}

async function preflight() {
  phase = "sandbox-configuration-preflight";
  let response;
  try {
    response = await fetch(`${APPROVED_ORIGIN}/api/checkout/config`, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    throw new SmokeFailure(
      safeFailure(error) === "TLS_VALIDATION_FAILED"
        ? "PREFLIGHT_TLS_VALIDATION_FAILED"
        : "SANDBOX_CONFIGURATION_UNREACHABLE",
    );
  }
  report.preflight.push({
    route: "/api/checkout/config",
    status: response.status,
  });
  must(response.ok, "SANDBOX_CONFIGURATION_UNAVAILABLE");
  let config;
  try {
    config = (await response.json()).data;
  } catch {
    throw new SmokeFailure("SANDBOX_CONFIGURATION_INVALID_JSON");
  }
  must(config?.environment === "sandbox", "NON_SANDBOX_ENVIRONMENT_BLOCKED");
  must(
    SANDBOX_APIS.has(config.paymentApiUrl),
    "UNAPPROVED_PAYMENT_ENDPOINT_BLOCKED",
  );
  const keyPrefix = config.paymentApiUrl.includes(".uat.")
    ? "pub_stagtest_"
    : "pub_test_";
  must(
    typeof config.publicKey === "string" &&
      config.publicKey.startsWith(keyPrefix),
    "SANDBOX_KEY_FAMILY_MISMATCH",
  );
  must(config.currency === "COP", "UNEXPECTED_CURRENCY");
  report.environment = "sandbox";
  report.sandboxApiOrigin = new URL(config.paymentApiUrl).origin;
  // Return only the allowlisted endpoint. Public key and acceptance tokens stay
  // in this short-lived scope and never enter the report or diagnostic output.
  return config.paymentApiUrl;
}

function classifyRoute(url, paymentApiUrl) {
  if (url.origin === APPROVED_ORIGIN) {
    if (/^\/api\/transactions\/[\w-]+\/pay$/.test(url.pathname)) {
      return "/api/transactions/:id/pay";
    }
    if (/^\/api\/transactions\/[\w-]+$/.test(url.pathname)) {
      return "/api/transactions/:id";
    }
    if (/^\/api\/deliveries\/[\w-]+$/.test(url.pathname)) {
      return "/api/deliveries/:id";
    }
    if (
      [
        "/api/products",
        "/api/checkout/config",
        "/api/checkout/session",
        "/api/checkout/draft",
        "/api/checkout/quote",
        "/api/transactions",
      ].includes(url.pathname)
    ) {
      return url.pathname;
    }
  }
  if (`${url.origin}${url.pathname}` === `${paymentApiUrl}/tokens/cards`) {
    return "/v1/tokens/cards";
  }
  return null;
}

async function readApi(context, path, result, timeout = 15000) {
  let response;
  try {
    response = await context.request.get(`${APPROVED_ORIGIN}${path}`, {
      timeout,
      maxRedirects: 0,
    });
  } catch (error) {
    throw new SmokeFailure(
      safeFailure(error) === "TLS_VALIDATION_FAILED"
        ? "APPLICATION_TLS_VALIDATION_FAILED"
        : "APPLICATION_API_UNREACHABLE",
    );
  }
  const route = path.replace(/(transactions|deliveries)\/[\w-]+/, "$1/:id");
  result.http.push({ route, method: "GET", status: response.status() });
  must(response.ok(), "APPLICATION_API_HTTP_FAILURE");
  try {
    const data = (await response.json()).data;
    must(data !== undefined, "APPLICATION_API_INVALID_ENVELOPE");
    return data;
  } finally {
    await response.dispose();
  }
}

async function screenshot(page, result, stage) {
  // Defensive: no screenshot is taken if any card-input element exists.
  must(
    (await page.locator('input[name="number"], input[name="cvc"]').count()) ===
      0,
    "SENSITIVE_SCREENSHOT_BLOCKED",
  );
  const filename = `${result.name}-${stage}.png`;
  const target =
    stage === "product" || stage === "product-return"
      ? page
      : page.getByRole("dialog");
  await target.screenshot({
    path: resolve(OUTPUT_DIRECTORY, filename),
    mask: [page.locator(".delivery-summary")],
    animations: "disabled",
  });
  result.screenshots.push(filename);
}

async function assertSafeStorage(page, number) {
  const safe = await page.evaluate((pan) => {
    const permitted = new Set([
      "version",
      "productId",
      "step",
      "transactionId",
      "idempotencyKey",
    ]);
    const raw = localStorage.getItem("lumen.checkout.v1");
    if (!raw) return false;
    try {
      const pointer = JSON.parse(raw);
      return (
        pointer.version === 1 &&
        localStorage.length === 1 &&
        Object.keys(pointer).every((key) => permitted.has(key)) &&
        !raw.replace(/\s/g, "").includes(pan) &&
        sessionStorage.length === 0
      );
    } catch {
      return false;
    }
  }, number);
  must(safe, "UNSAFE_BROWSER_PROGRESS_STORAGE");
}

async function runScenario(scenario, paymentApiUrl) {
  const result = {
    name: scenario.name,
    expectedStatus: scenario.expectedStatus,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    passed: false,
    steps: [],
    http: [],
    networkFailures: [],
    cancelledRequests: [],
    screenshots: [],
    createRequestCount: 0,
    tokenizationRequestCount: 0,
    payRequestCount: 0,
    transactionId: null,
    transactionStatus: null,
    deliveryExists: null,
    stockBefore: null,
    stockAfter: null,
    failure: null,
  };
  report.scenarios.push(result);
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    locale: "es-CO",
    // Default TLS validation remains enabled. No tracing, HAR or video capture.
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(30000);
  let createdResponse = null;
  let payResponse = null;
  let tokenizationFailure = null;
  const ownPath = (request) => {
    const url = new URL(request.url());
    return url.origin === APPROVED_ORIGIN ? url.pathname : null;
  };
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    const route = classifyRoute(new URL(request.url()), paymentApiUrl);
    if (route === "/api/transactions") result.createRequestCount += 1;
    if (route === "/api/transactions/:id/pay") result.payRequestCount += 1;
    if (route === "/v1/tokens/cards") result.tokenizationRequestCount += 1;
  });
  page.on("response", (response) => {
    const route = classifyRoute(new URL(response.url()), paymentApiUrl);
    if (!route) return;
    const method = response.request().method();
    result.http.push({ route, method, status: response.status() });
    if (method === "POST" && route === "/api/transactions")
      createdResponse = response;
    if (method === "POST" && route === "/api/transactions/:id/pay")
      payResponse = response;
    if (method === "POST" && route === "/v1/tokens/cards" && !response.ok()) {
      tokenizationFailure = "SANDBOX_TOKENIZATION_HTTP_FAILURE";
    }
  });
  page.on("requestfailed", (request) => {
    const route = classifyRoute(new URL(request.url()), paymentApiUrl);
    if (!route) return;
    const errorText = request.failure()?.errorText ?? "";
    const observation = {
      route,
      method: request.method(),
      at: new Date().toISOString(),
      phase,
    };
    // This identifies Chromium's explicit cancellation signal, not its cause.
    // Keep raw browser errors out of evidence; they can contain sensitive data.
    if (errorText === "net::ERR_ABORTED") {
      result.cancelledRequests.push({ ...observation, reason: "ERR_ABORTED" });
      if (route === "/v1/tokens/cards") {
        tokenizationFailure = "SANDBOX_TOKENIZATION_CANCELLED";
      }
      return;
    }
    const tls = /CERT|SSL|TLS/i.test(errorText);
    const reason = tls ? "TLS_VALIDATION_FAILED" : "NETWORK_FAILURE";
    result.networkFailures.push({ ...observation, reason });
    if (route === "/v1/tokens/cards") {
      tokenizationFailure = tls
        ? "SANDBOX_TLS_VALIDATION_FAILED"
        : "SANDBOX_TOKENIZATION_UNREACHABLE";
    }
  });

  try {
    phase = `${scenario.name}:product`;
    await page.goto(APPROVED_ORIGIN, { waitUntil: "domcontentloaded" });
    must(
      new URL(page.url()).origin === APPROVED_ORIGIN,
      "UNAPPROVED_APPLICATION_REDIRECT",
    );
    const products = await readApi(context, "/api/products", result);
    must(Array.isArray(products), "INVALID_PRODUCT_LIST");
    const product = products.find((item) => item.id === "product_lumen_one");
    must(
      product && Number.isSafeInteger(product.stock) && product.stock > 0,
      "INSUFFICIENT_STOCK",
    );
    if (scenario.name === "approved")
      must(
        product.stock >= 2,
        "TWO_SANDBOX_SCENARIOS_REQUIRE_TWO_AVAILABLE_UNITS",
      );
    result.stockBefore = product.stock;
    await page
      .getByRole("button", { name: "Pagar con tarjeta", exact: true })
      .waitFor();
    await screenshot(page, result, "product");
    recordStep(result, "product-from-live-api");

    phase = `${scenario.name}:details`;
    await page
      .getByRole("button", { name: "Pagar con tarjeta", exact: true })
      .click();
    const continueButton = page.getByRole("button", {
      name: "Continuar al resumen",
      exact: true,
    });
    await continueButton.waitFor();
    // The UI fetches its own runtime configuration and real provider agreements.
    await page.getByRole("checkbox", { name: /Acepto los/ }).waitFor();
    await page
      .getByLabel("Número de tarjeta", { exact: true })
      .fill(scenario.number);
    await page
      .getByLabel("Nombre del titular", { exact: true })
      .fill("Persona de Prueba");
    const expiry = `12${String((new Date().getUTCFullYear() + 3) % 100).padStart(2, "0")}`;
    await page.getByLabel("Vencimiento", { exact: true }).fill(expiry);
    await page.getByLabel("Código de seguridad", { exact: true }).fill("123");
    await page
      .getByLabel("Número de cuotas", { exact: true })
      .selectOption("1");
    for (const [label, value] of [
      ["Nombre de quien recibe", "Cliente Sandbox"],
      ["Correo electrónico", "email@example.test"],
      ["Teléfono", "3000000000"],
      ["Dirección", "Calle de Prueba 10"],
      ["Ciudad", "Bogotá"],
      ["Departamento", "Bogotá D.C."],
    ])
      await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole("checkbox", { name: /Acepto los/ }).check();
    await page.getByRole("checkbox", { name: /Autorizo el/ }).check();
    await continueButton.click();
    await page.getByRole("dialog", { name: "Un último vistazo." }).waitFor();
    must(
      (await page.getByRole("dialog").innerText())
        .replace(/\s/g, "")
        .includes(scenario.number) === false,
      "FULL_CARD_EXPOSED_IN_SUMMARY",
    );
    await assertSafeStorage(page, scenario.number);
    await screenshot(page, result, "summary-masked");
    recordStep(result, "details-and-masked-summary");

    phase = `${scenario.name}:payment`;
    await page.getByRole("button", { name: /^Pagar \$/ }).click();
    const paymentDeadline = Date.now() + 60000;
    // Observe existing browser traffic only; no script-initiated payment request.
    while (!payResponse && Date.now() < paymentDeadline) {
      if (tokenizationFailure) throw new SmokeFailure(tokenizationFailure);
      if (createdResponse && !createdResponse.ok()) {
        throw new SmokeFailure("TRANSACTION_CREATION_HTTP_FAILURE");
      }
      must(result.payRequestCount <= 1, "DUPLICATE_PAYMENT_REQUEST");
      await sleep(100);
    }
    must(createdResponse?.ok(), "TRANSACTION_CREATION_NOT_CONFIRMED");
    const created = (await createdResponse.json()).data;
    must(safeId(created?.id), "INVALID_APPLICATION_TRANSACTION_ID");
    result.transactionId = created.id;
    must(
      created.status === "PENDING" &&
        created.submissionStatus === "NOT_STARTED" &&
        created.delivery === null,
      "PAYMENT_NOT_CREATED_PENDING_FIRST",
    );
    must(payResponse, "PAYMENT_SUBMISSION_NOT_CONFIRMED_WITHIN_60_SECONDS");
    must(
      ownPath(payResponse.request()) === `/api/transactions/${created.id}/pay`,
      "PAYMENT_TRANSACTION_ID_MISMATCH",
    );
    must(
      result.createRequestCount === 1 &&
        result.tokenizationRequestCount === 1 &&
        result.payRequestCount === 1,
      "UNEXPECTED_SUBMISSION_COUNT",
    );
    must(payResponse.ok(), "PAYMENT_SUBMISSION_HTTP_FAILURE");
    recordStep(result, "one-pending-creation-one-tokenization-one-payment");

    phase = `${scenario.name}:refresh-and-confirmation`;
    await page.reload({ waitUntil: "domcontentloaded" });
    recordStep(result, "refresh-after-payment-submission");
    const deadline = Date.now() + 60000;
    let current;
    let interval = 0;
    do {
      const remaining = deadline - Date.now();
      must(remaining > 0, "TRANSACTION_STILL_PENDING_AFTER_60_SECONDS");
      current = await readApi(
        context,
        `/api/transactions/${created.id}`,
        result,
        Math.min(15000, remaining),
      );
      must(
        current?.id === created.id && STATUSES.has(current.status),
        "INVALID_TRANSACTION_STATE",
      );
      result.transactionStatus = current.status;
      result.deliveryExists = current.delivery !== null;
      must(result.payRequestCount === 1, "PAYMENT_REPOSTED_AFTER_REFRESH");
      if (current.status !== "PENDING") break;
      await sleep(
        Math.min(
          [2000, 3000, 5000, 8000][Math.min(interval++, 3)],
          Math.max(0, deadline - Date.now()),
        ),
      );
    } while (Date.now() <= deadline);
    must(
      current?.status !== "PENDING",
      "TRANSACTION_STILL_PENDING_AFTER_60_SECONDS",
    );
    must(
      Number.isSafeInteger(current.amounts?.totalInCents) &&
        current.amounts.currency === "COP",
      "INVALID_FINAL_AMOUNT",
    );
    result.totalInCents = current.amounts.totalInCents;
    if (current.status === "APPROVED") {
      must(safeId(current.delivery?.id), "APPROVAL_WITHOUT_DELIVERY");
      const delivery = await readApi(
        context,
        `/api/deliveries/${current.delivery.id}`,
        result,
      );
      must(
        delivery?.transactionId === created.id &&
          delivery.productId === product.id &&
          delivery.quantity === 1 &&
          delivery.status === "READY",
        "INVALID_APPROVED_DELIVERY",
      );
    } else {
      must(current.delivery === null, "NON_APPROVED_PAYMENT_CREATED_DELIVERY");
    }
    recordStep(result, "authoritative-terminal-state-and-delivery");

    // A second reload proves a terminal result survives refresh as the same ID.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .getByRole("heading", {
        name: TERMINAL_HEADINGS[current.status],
        exact: true,
      })
      .waitFor();
    await assertSafeStorage(page, scenario.number);
    await screenshot(page, result, "result-restored");
    must(
      result.payRequestCount === 1,
      "PAYMENT_REPOSTED_AFTER_TERMINAL_REFRESH",
    );
    recordStep(result, "terminal-result-survives-refresh-without-repayment");

    phase = `${scenario.name}:stock-verification`;
    await page
      .getByRole("button", { name: "Volver al producto", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.locator(".stock").waitFor();
    const refreshed = (await readApi(context, "/api/products", result)).find(
      (item) => item.id === product.id,
    );
    must(Number.isSafeInteger(refreshed?.stock), "INVALID_UPDATED_STOCK");
    result.stockAfter = refreshed.stock;
    const expectedStock =
      result.stockBefore - (current.status === "APPROVED" ? 1 : 0);
    must(
      result.stockAfter === expectedStock,
      "STOCK_CHANGE_DOES_NOT_MATCH_PAYMENT_RESULT",
    );
    const stockLabel = await page.locator(".stock").innerText();
    must(
      expectedStock === 0
        ? stockLabel.includes("Agotado")
        : stockLabel.includes(`Disponible · ${expectedStock} `),
      "DISPLAYED_STOCK_DIFFERS_FROM_API",
    );
    await screenshot(page, result, "product-return");
    must(result.payRequestCount === 1, "UNEXPECTED_ADDITIONAL_PAYMENT_REQUEST");
    recordStep(result, "stock-updates-only-after-approval");
    must(
      current.status === scenario.expectedStatus,
      "OFFICIAL_SANDBOX_FIXTURE_RETURNED_UNEXPECTED_STATUS",
    );
    result.passed = true;
  } catch (error) {
    // Preserve the safe application ID for operational reconciliation even if
    // tokenization failed before /pay. Do not retry or cancel a financial flow.
    if (!result.transactionId && createdResponse?.ok()) {
      try {
        const created = (await createdResponse.json()).data;
        if (safeId(created?.id)) result.transactionId = created.id;
        if (STATUSES.has(created?.status)) {
          result.transactionStatus = created.status;
        }
      } catch {
        // A partial response cannot establish a transaction identity.
      }
    }
    result.failure = { phase, code: safeFailure(error) };
    throw error;
  } finally {
    result.finishedAt = new Date().toISOString();
    await context.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log(
      `Usage: node scripts/smoke-sandbox.mjs ${APPROVED_ORIGIN} --run-sandbox`,
    );
    return;
  }
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  try {
    must(
      args.length === 2 && args.includes("--run-sandbox"),
      "EXPLICIT_SANDBOX_OPT_IN_REQUIRED",
    );
    const endpoint = args.find((value) => value !== "--run-sandbox");
    must(
      endpoint === APPROVED_ORIGIN || endpoint === `${APPROVED_ORIGIN}/`,
      "UNAPPROVED_APPLICATION_ENDPOINT_BLOCKED",
    );
    // Prevent inherited debugging options from printing filled card values, and
    // refuse a process configured to skip TLS verification.
    must(
      !process.env.DEBUG && !process.env.PWDEBUG,
      "UNSAFE_DEBUG_CONFIGURATION",
    );
    must(
      process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
      "TLS_VERIFICATION_DISABLED",
    );
    const paymentApiUrl = await preflight();
    phase = "browser-launch";
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch({ headless: true });
    report.browser = { engine: "chromium", version: browser.version() };
    for (const scenario of SCENARIOS)
      await runScenario(scenario, paymentApiUrl);
    report.passed =
      report.scenarios.length === 2 &&
      report.scenarios.every((item) => item.passed);
  } catch (error) {
    report.failure = { phase, code: safeFailure(error) };
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    report.finishedAt = new Date().toISOString();
    await writeFile(
      resolve(OUTPUT_DIRECTORY, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    // The report contains only explicitly enumerated fields. Never serialize an
    // Error, request, response, configuration, cookie jar, or browser storage.
    console.log(
      JSON.stringify({
        passed: report.passed,
        completedScenarios: report.scenarios.filter((item) => item.passed)
          .length,
        failure: report.failure,
        report: "test-results/live-sandbox/report.json",
      }),
    );
  }
}

await main().catch(() => {
  // Even filesystem/browser setup errors must not leak an unsanitized stack.
  console.error("Sandbox smoke failed while writing safe evidence.");
  process.exitCode = 1;
});

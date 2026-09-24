import { randomInt, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Explicit pre-payment verification against one approved deployment. The real
// application/API are used, but every tokenization or /pay attempt is aborted
// before transmission and makes the run fail. No payment success is claimed.
const ORIGIN = "https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com";
const OUTPUT = resolve("test-results/cloud-recovery");
const SANDBOX_APIS = new Set([
  "https://api-sandbox.co.uat.wompi.dev/v1",
  "https://sandbox.wompi.co/v1",
]);
const CUSTOMER_A = {
  fullName: "Destinatario de prueba reservado",
  email: "reserved@example.test",
  phone: "3000000000",
};
const DELIVERY_A = {
  addressLine1: "Calle de prueba reservada 10",
  city: "Bogotá",
  region: "Bogotá D.C.",
  country: "CO",
};
const CUSTOMER_B = { ...CUSTOMER_A, fullName: "Destinatario de otra pestaña" };
const DELIVERY_B = {
  ...DELIVERY_A,
  addressLine1: "Carrera de prueba de otra pestaña 20",
};

class ProbeFailure extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
function must(condition, code) {
  if (!condition) throw new ProbeFailure(code);
}
function safeFailure(error) {
  if (error instanceof ProbeFailure) return error.code;
  // Classify only. Never emit raw browser errors, which may contain input data.
  const detail =
    String(error?.message ?? "") + String(error?.cause?.code ?? "");
  if (/CERT|SSL|TLS|SELF_SIGNED/i.test(detail)) return "TLS_VALIDATION_FAILED";
  if (error?.name === "TimeoutError" || /timed? ?out/i.test(detail))
    return "OPERATION_TIMED_OUT";
  return "OPERATION_FAILED";
}
function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value)
  );
}
function syntheticCard() {
  const prefix = `4${Array.from({ length: 14 }, () => randomInt(0, 10)).join("")}`;
  const sum = [...prefix].reduce((total, digit, index) => {
    const value = Number(digit) * (index % 2 === 0 ? 2 : 1);
    return total + (value > 9 ? value - 9 : value);
  }, 0);
  return prefix + ((10 - (sum % 10)) % 10);
}

const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  origin: ORIGIN,
  scope: "Live AWS R09 recovery before payment; no payment verification",
  tlsVerification: "enabled",
  responseMocks: false,
  browser: null,
  assets: [],
  steps: [],
  http: [],
  blockedPaymentRequests: [],
  blockedExternalRequestCount: 0,
  transactionId: null,
  stockBefore: null,
  stockReserved: null,
  stockAfter: null,
  screenshots: [],
  cleanup: { attempted: false, passed: false, failure: null },
  passed: false,
  failure: null,
};
let phase = "arguments";
let browser;
let context;
let ownsSession = false;
let creationAttempted = false;
let productId;
let flowPassed = false;

function step(name) {
  report.steps.push({ name, at: new Date().toISOString(), status: "PASS" });
}
function routeLabel(path) {
  return path
    .replace(/\/transactions\/[\w-]+/, "/transactions/:id")
    .replace(/\/products\/[\w-]+/, "/products/:id");
}
function allowedApi(path, method) {
  return (
    (method === "GET" &&
      ["/checkout/config", "/checkout/session", "/products"].includes(path)) ||
    (method === "GET" && /^\/(?:products|transactions)\/[\w-]+$/.test(path)) ||
    (method === "DELETE" && path === "/checkout/draft")
  );
}

// This request client shares the fresh browser context's cookies. It is used
// only for allowlisted reads and cleanup; it cannot submit a payment or create.
async function api(path, method = "GET") {
  must(allowedApi(path, method), "UNAPPROVED_PROBE_API_OPERATION");
  const headers = { Origin: ORIGIN };
  if (method === "DELETE") {
    const session = await api("/checkout/session");
    must(
      session.status === 200 && typeof session.data?.csrfToken === "string",
      "CLEANUP_SESSION_UNAVAILABLE",
    );
    headers["X-CSRF-Token"] = session.data.csrfToken;
  }
  const response = await context.request.fetch(`${ORIGIN}/api${path}`, {
    method,
    headers,
    maxRedirects: 0,
    timeout: 20000,
  });
  try {
    report.http.push({
      route: `/api${routeLabel(path)}`,
      method,
      status: response.status(),
    });
    const body = response.status() === 204 ? {} : await response.json();
    return {
      status: response.status(),
      data: body.data,
      errorCode: body.error?.code,
    };
  } finally {
    await response.dispose();
  }
}

function assertPaymentGuard() {
  must(report.blockedPaymentRequests.length === 0, "PAYMENT_ATTEMPT_BLOCKED");
  must(
    report.blockedExternalRequestCount === 0,
    "UNEXPECTED_EXTERNAL_REQUEST_BLOCKED",
  );
}

async function fillCard(page, number) {
  await page.getByLabel("Número de tarjeta", { exact: true }).fill(number);
  await page
    .getByLabel("Nombre del titular", { exact: true })
    .fill("Titular de Prueba");
  await page
    .getByLabel("Vencimiento", { exact: true })
    .fill(
      `12${String((new Date().getUTCFullYear() + 3) % 100).padStart(2, "0")}`,
    );
  await page.getByLabel("Código de seguridad", { exact: true }).fill("123");
  await page.getByRole("checkbox", { name: /Acepto los/ }).check();
  await page.getByRole("checkbox", { name: /Autorizo el/ }).check();
}
async function review(page) {
  await page
    .getByRole("button", { name: "Continuar al resumen", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Un último vistazo." }).waitFor();
}

async function verifyFlow() {
  phase = "sandbox-preflight";
  const config = await api("/checkout/config");
  must(config.status === 200, "SANDBOX_CONFIGURATION_UNAVAILABLE");
  must(
    config.data?.environment === "sandbox" &&
      SANDBOX_APIS.has(config.data.paymentApiUrl),
    "UNAPPROVED_PROVIDER_CONFIGURATION",
  );
  step("sandbox-configuration-with-normal-tls");

  const pageB = await context.newPage();
  pageB.setDefaultTimeout(15000);
  pageB.setDefaultNavigationTimeout(30000);
  phase = "fresh-session";
  await pageB.goto(ORIGIN, { waitUntil: "domcontentloaded" });
  must(new URL(pageB.url()).origin === ORIGIN, "UNAPPROVED_REDIRECT");
  await pageB
    .getByRole("button", { name: "Pagar con tarjeta", exact: true })
    .waitFor();
  const session = await api("/checkout/session");
  must(
    session.status === 200 &&
      session.data?.activeTransactionId === null &&
      session.data?.draft === null,
    "FRESH_EMPTY_SESSION_REQUIRED",
  );
  ownsSession = true;
  report.assets = await pageB.evaluate(() =>
    [...document.querySelectorAll('script[src], link[rel="stylesheet"][href]')]
      .map(
        (element) =>
          new URL(
            element.getAttribute("src") ?? element.getAttribute("href"),
            location.origin,
          ),
      )
      .filter(
        (url) =>
          url.origin === location.origin &&
          /^\/assets\/[\w-]+\.(?:js|css)$/.test(url.pathname),
      )
      .map((url) => url.pathname)
      .slice(0, 10),
  );
  must(
    report.assets.some((path) => path.endsWith(".js")),
    "APPLICATION_ASSET_VERSION_MISSING",
  );
  const products = await api("/products");
  must(
    products.status === 200 && Array.isArray(products.data),
    "PRODUCTS_UNAVAILABLE",
  );
  const product = products.data.find((item) => item.id === "product_lumen_one");
  must(
    Number.isSafeInteger(product?.stock) && product.stock > 0,
    "INSUFFICIENT_STOCK",
  );
  productId = product.id;
  report.stockBefore = product.stock;
  step("fresh-isolated-session-and-deployed-assets");

  phase = "tab-b-summary";
  await pageB
    .getByRole("button", { name: "Pagar con tarjeta", exact: true })
    .click();
  await pageB.getByRole("dialog", { name: "Completa tus datos." }).waitFor();
  for (const [label, value] of [
    ["Nombre de quien recibe", CUSTOMER_B.fullName],
    ["Correo electrónico", CUSTOMER_B.email],
    ["Teléfono", CUSTOMER_B.phone],
    ["Dirección", DELIVERY_B.addressLine1],
    ["Ciudad", DELIVERY_B.city],
    ["Departamento", DELIVERY_B.region],
  ])
    await pageB.getByLabel(label, { exact: true }).fill(value);
  const number = syntheticCard();
  await fillCard(pageB, number);
  await review(pageB);
  must(
    (await pageB.locator(".delivery-summary").innerText()).includes(
      DELIVERY_B.addressLine1,
    ),
    "STALE_SUMMARY_SETUP_FAILED",
  );
  assertPaymentGuard();
  step("tab-b-has-open-summary-with-synthetic-card");

  phase = "tab-a-reservation";
  const pageA = await context.newPage();
  pageA.setDefaultTimeout(15000);
  pageA.setDefaultNavigationTimeout(30000);
  await pageA.goto(ORIGIN, { waitUntil: "domcontentloaded" });
  must(new URL(pageA.url()).origin === ORIGIN, "UNAPPROVED_REDIRECT");
  await pageA.getByRole("dialog", { name: "Completa tus datos." }).waitFor();
  must(
    (await pageA.getByLabel("Dirección", { exact: true }).inputValue()) ===
      DELIVERY_B.addressLine1,
    "SECOND_TAB_NOT_SHARING_DRAFT",
  );
  creationAttempted = true;
  const created = await pageA.evaluate(
    async ({ productId, customer, delivery, key }) => {
      const session = (
        await (
          await fetch("/api/checkout/session", { redirect: "error" })
        ).json()
      ).data;
      const headers = {
        "Content-Type": "application/json",
        "X-CSRF-Token": session.csrfToken,
      };
      const quoteResponse = await fetch("/api/checkout/quote", {
        method: "POST",
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (!quoteResponse.ok)
        return { status: quoteResponse.status, quoteFailed: true };
      const quote = (await quoteResponse.json()).data;
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { ...headers, "Idempotency-Key": key },
        redirect: "error",
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          productId,
          quantity: 1,
          expectedTotalInCents: quote.amounts.totalInCents,
          customer,
          delivery,
        }),
      });
      const data = (await response.json()).data;
      return {
        status: response.status,
        id: data?.id,
        state: data?.status,
        submissionStatus: data?.submissionStatus,
        canPay: data?.canPay,
        deliveryAbsent: data?.delivery === null,
      };
    },
    {
      productId,
      customer: CUSTOMER_A,
      delivery: DELIVERY_A,
      key: randomUUID(),
    },
  );
  if (isUuid(created.id)) report.transactionId = created.id;
  must(
    created.status === 201 &&
      isUuid(created.id) &&
      created.state === "PENDING" &&
      created.submissionStatus === "NOT_STARTED" &&
      created.canPay === true &&
      created.deliveryAbsent,
    "RESERVATION_NOT_CONFIRMED",
  );
  const canonical = await api("/checkout/session");
  must(
    canonical.data?.activeTransactionId === created.id &&
      canonical.data?.draft?.delivery?.addressLine1 ===
        DELIVERY_A.addressLine1 &&
      canonical.data?.draft?.customer?.fullName === CUSTOMER_A.fullName,
    "RESERVATION_DRAFT_NOT_CANONICAL",
  );
  const reserved = await api(`/products/${productId}`);
  report.stockReserved = reserved.data?.stock;
  must(
    report.stockReserved === report.stockBefore - 1,
    "RESERVATION_STOCK_MISMATCH",
  );
  step("tab-a-reserved-authoritative-recipient-and-address");

  phase = "tab-b-conflict-recovery-without-reload";
  let navigations = 0;
  pageB.on("framenavigated", (frame) => {
    if (frame === pageB.mainFrame()) navigations += 1;
  });
  const responsePromise = pageB
    .waitForResponse(
      (response) =>
        new URL(response.url()).origin === ORIGIN &&
        new URL(response.url()).pathname === "/api/transactions" &&
        response.request().method() === "POST",
    )
    .catch(() => null);
  await pageB.getByRole("button", { name: /^Pagar \$/ }).click();
  const conflict = await responsePromise;
  must(conflict, "SECOND_TAB_CREATION_RESPONSE_MISSING");
  report.http.push({
    route: "/api/transactions",
    method: "POST",
    status: conflict.status(),
  });
  must(
    conflict.status() === 409 &&
      (await conflict.json()).error?.code === "PAYMENT_IN_PROGRESS",
    "SECOND_TAB_CREATION_NOT_REJECTED",
  );
  await pageB
    .getByRole("heading", { name: "Tu pedido está reservado.", exact: true })
    .waitFor();
  assertPaymentGuard();
  await pageB
    .getByRole("button", { name: "Completar pago", exact: true })
    .click();
  must(
    (await pageB
      .getByLabel("Número de tarjeta", { exact: true })
      .inputValue()) === "" &&
      (await pageB
        .getByLabel("Código de seguridad", { exact: true })
        .inputValue()) === "",
    "CARD_NOT_CLEARED_DURING_RECOVERY",
  );
  must(
    !(await pageB.getByRole("checkbox", { name: /Acepto los/ }).isChecked()) &&
      !(await pageB.getByRole("checkbox", { name: /Autorizo el/ }).isChecked()),
    "CONSENTS_NOT_CLEARED_DURING_RECOVERY",
  );
  must(
    (await pageB.getByLabel("Dirección", { exact: true }).count()) === 0,
    "RESERVED_DELIVERY_REMAINED_EDITABLE",
  );
  await pageB
    .getByRole("button", { name: "Continuar al resumen", exact: true })
    .click();
  must(
    (await pageB
      .getByLabel("Número de tarjeta", { exact: true })
      .getAttribute("aria-invalid")) === "true",
    "CARD_REENTRY_NOT_REQUIRED",
  );
  const recoveryNumber = syntheticCard();
  await fillCard(pageB, recoveryNumber);
  await review(pageB);
  const summary = await pageB.locator(".delivery-summary").innerText();
  must(
    summary.includes(DELIVERY_A.addressLine1) &&
      summary.includes(CUSTOMER_A.fullName) &&
      !summary.includes(DELIVERY_B.addressLine1) &&
      !summary.includes(CUSTOMER_B.fullName),
    "RECOVERED_SUMMARY_HAS_STALE_RECIPIENT",
  );
  must(navigations === 0, "RECOVERY_REQUIRED_PAGE_RELOAD");
  const finalSession = await api("/checkout/session");
  must(
    finalSession.data?.activeTransactionId === report.transactionId,
    "RECOVERY_TRANSACTION_CHANGED",
  );
  const pending = await api(`/transactions/${report.transactionId}`);
  must(
    pending.data?.status === "PENDING" &&
      pending.data?.submissionStatus === "NOT_STARTED" &&
      pending.data?.delivery === null,
    "UNEXPECTED_PAYMENT_OR_DELIVERY",
  );
  assertPaymentGuard();
  step("conflict-recovers-authoritative-summary-without-reload-or-payment");

  // Capture only the summary, with its fictional recipient masked. Never capture
  // input fields, a trace, HAR, console output, request bodies or browser storage.
  must(
    (await pageB.locator('input[name="number"], input[name="cvc"]').count()) ===
      0,
    "SENSITIVE_SCREENSHOT_BLOCKED",
  );
  const visibleDigits = (await pageB.getByRole("dialog").innerText()).replace(
    /\D/g,
    "",
  );
  must(
    !visibleDigits.includes(number) && !visibleDigits.includes(recoveryNumber),
    "UNMASKED_CARD_SCREENSHOT_BLOCKED",
  );
  await pageB.getByRole("dialog").screenshot({
    path: resolve(OUTPUT, "recovered-summary-masked.png"),
    mask: [pageB.locator(".delivery-summary")],
    animations: "disabled",
  });
  report.screenshots.push("recovered-summary-masked.png");
  flowPassed = true;
}

async function cleanup() {
  if (!context || !ownsSession) return;
  phase = "own-reservation-cleanup";
  report.cleanup.attempted = true;
  // Stop autosave/polling producers first; keep the cookie-bearing context for
  // allowlisted cleanup HTTP requests. No card or payment request is retried.
  for (const page of context.pages()) await page.close();
  const session = await api("/checkout/session");
  must(session.status === 200, "CLEANUP_SESSION_UNAVAILABLE");
  const activeId = session.data?.activeTransactionId;
  if (!report.transactionId && creationAttempted && isUuid(activeId))
    report.transactionId = activeId;
  must(
    !activeId || activeId === report.transactionId,
    "CLEANUP_TRANSACTION_ID_MISMATCH",
  );
  if (report.transactionId) {
    const current = await api(`/transactions/${report.transactionId}`);
    must(
      current.data?.status === "PENDING" &&
        current.data?.submissionStatus === "NOT_STARTED" &&
        current.data?.delivery === null,
      "CLEANUP_REQUIRES_OWN_UNSUBMITTED_RESERVATION",
    );
  }
  const cleared = await api("/checkout/draft", "DELETE");
  must(cleared.status === 204, "OWN_RESERVATION_CLEANUP_FAILED");
  if (report.transactionId) {
    const cancelled = await api(`/transactions/${report.transactionId}`);
    must(
      cancelled.data?.status === "ERROR" &&
        cancelled.data?.submissionStatus === "NOT_STARTED" &&
        cancelled.data?.canPay === false &&
        cancelled.data?.delivery === null,
      "CANCELLED_RESERVATION_NOT_CONFIRMED",
    );
    report.cleanup.transactionStatus = "ERROR";
    report.cleanup.submissionStatus = "NOT_STARTED";
    report.cleanup.deliveryExists = false;
  }
  const restored = await api("/checkout/session");
  must(
    restored.data?.activeTransactionId === null &&
      restored.data?.draft === null,
    "SESSION_NOT_CLEARED",
  );
  if (productId) {
    const released = await api(`/products/${productId}`);
    must(Number.isSafeInteger(released.data?.stock), "INVALID_RELEASED_STOCK");
    report.stockAfter = released.data.stock;
    must(
      report.stockAfter === report.stockBefore,
      "RESERVATION_STOCK_NOT_RESTORED",
    );
  }
  report.cleanup.passed = true;
  step("own-reservation-cancelled-with-no-delivery-and-restored-stock");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log(
      `Usage: node scripts/smoke-cloud-recovery.mjs ${ORIGIN} --run-recovery`,
    );
    return;
  }
  await mkdir(OUTPUT, { recursive: true });
  try {
    must(
      args.length === 2 && args.includes("--run-recovery"),
      "EXPLICIT_PREPAY_OPT_IN_REQUIRED",
    );
    must(
      args.find((value) => value !== "--run-recovery") === ORIGIN,
      "UNAPPROVED_APPLICATION_ORIGIN",
    );
    must(
      !process.env.DEBUG && !process.env.PWDEBUG,
      "UNSAFE_DEBUG_CONFIGURATION",
    );
    must(
      process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
      "TLS_VERIFICATION_DISABLED",
    );
    phase = "browser-launch";
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch({ headless: true });
    report.browser = { engine: "chromium", version: browser.version() };
    context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      locale: "es-CO",
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      // Guard all methods, including CORS preflights, before traffic is sent.
      if (
        /\/(?:tokens?|tokenization)(?:\/|$)/i.test(url.pathname) ||
        /\/pay(?:\/|$)/i.test(url.pathname)
      ) {
        report.blockedPaymentRequests.push({
          route: /\/pay(?:\/|$)/i.test(url.pathname)
            ? "/api/transactions/:id/pay"
            : "/tokenization",
          method: route.request().method(),
        });
        await route.abort("blockedbyclient");
      } else if (url.origin !== ORIGIN) {
        report.blockedExternalRequestCount += 1;
        await route.abort("blockedbyclient");
      } else await route.continue();
    });
    await verifyFlow();
  } catch (error) {
    report.failure = { phase, code: safeFailure(error) };
  } finally {
    try {
      await cleanup();
    } catch (error) {
      report.cleanup.failure = safeFailure(error);
    }
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (report.blockedPaymentRequests.length && !report.failure)
      report.failure = {
        phase: "payment-guard",
        code: "PAYMENT_ATTEMPT_BLOCKED",
      };
    report.passed =
      flowPassed &&
      report.cleanup.passed &&
      !report.failure &&
      report.blockedPaymentRequests.length === 0 &&
      report.blockedExternalRequestCount === 0;
    report.finishedAt = new Date().toISOString();
    if (!report.passed) process.exitCode = 1;
    await writeFile(
      resolve(OUTPUT, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({
        passed: report.passed,
        scope: report.scope,
        failure: report.failure,
        cleanup: report.cleanup,
        report: "test-results/cloud-recovery/report.json",
      }),
    );
  }
}

await main().catch(() => {
  console.error("Cloud recovery probe failed while writing safe evidence.");
  process.exitCode = 1;
});

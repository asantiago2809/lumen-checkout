import { get } from "node:https";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

// Read-only, no payment. New contexts isolate browser caches; Lambda lifecycle
// and the user's network are uncontrolled, so this is not a lab/field percentile.
const origin = "https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com";
const label = process.argv[2];
if (!["before", "after"].includes(label))
  throw new Error("Use before or after");
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0")
  throw new Error("TLS verification required");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const report = {
  observedAt: new Date().toISOString(),
  origin,
  label,
  method:
    "Three fresh contexts per viewport; first visit and repeat visit in each context; no throttling or payments. Browser cache cold does not imply Lambda cold. Network and cloud load uncontrolled.",
  browser: null,
  navigations: [],
  assets: [],
  passed: false,
};
const output = `test-results/cloud-performance-${label}`;
await mkdir(output, { recursive: true });

function raw(path, encoding = "identity", method = "GET") {
  if (!(path === "/" || /^\/assets\/[\w-]+\.(js|css)$/.test(path)))
    throw new Error("Unexpected asset path");
  return new Promise((resolve, reject) => {
    const request = get(
      origin + path,
      { method, headers: { "Accept-Encoding": encoding }, timeout: 20000 },
      (response) => {
        const chunks = [];
        let length = 0;
        response.on("data", (chunk) => {
          length += chunk.length;
          if (length > 5 * 1024 * 1024)
            request.destroy(new Error("Asset limit exceeded"));
          else chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            bytes: Buffer.concat(chunks),
          }),
        );
        response.on("error", reject);
      },
    );
    request.on("timeout", () =>
      request.destroy(new Error("Asset request timeout")),
    );
    request.on("error", reject);
  });
}

const browser = await chromium.launch();
report.browser = browser.version();
try {
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 1440, height: 900 },
  ]) {
    for (let sample = 1; sample <= 3; sample++) {
      const context = await browser.newContext({
        viewport,
        locale: "es-CO",
        serviceWorkers: "block",
      });
      try {
        await context.addInitScript(() => {
          window.__qualityMetrics = { lcp: 0, cls: 0 };
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              window.__qualityMetrics.lcp = entry.startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              if (!entry.hadRecentInput)
                window.__qualityMetrics.cls += entry.value;
          }).observe({ type: "layout-shift", buffered: true });
        });
        const page = await context.newPage();
        page.setDefaultTimeout(30000);
        const failures = [];
        page.on("requestfailed", (request) =>
          failures.push({
            path: new URL(request.url()).pathname,
            error: request.failure()?.errorText,
          }),
        );
        for (const cache of ["browser-cold", "repeat-visit"]) {
          failures.length = 0;
          const response = await page.goto(origin, {
            waitUntil: "domcontentloaded",
          });
          await page
            .getByRole("button", { name: "Pagar con tarjeta", exact: true })
            .waitFor();
          await page
            .locator(".product-scene img")
            .evaluate((image) => image.decode());
          await page.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              ),
          );
          // Allow the asynchronous observer to deliver the last paint record.
          await page.waitForTimeout(250);
          const metrics = await page.evaluate(() => {
            const nav = performance.getEntriesByType("navigation")[0];
            const productImage = document.querySelector(".product-scene img");
            return {
              lcpMs: window.__qualityMetrics.lcp,
              cls: window.__qualityMetrics.cls,
              ttfbMs: nav.responseStart - nav.requestStart,
              domContentLoadedMs: nav.domContentLoadedEventEnd,
              overflow: document.documentElement.scrollWidth > innerWidth,
              imageWidth: productImage.naturalWidth,
              resources: performance
                .getEntriesByType("resource")
                .map((entry) => ({
                  path: new URL(entry.name).pathname,
                  durationMs: entry.duration,
                  ttfbMs: entry.responseStart - entry.requestStart,
                  transferBytes: entry.transferSize,
                  encodedBytes: entry.encodedBodySize,
                  decodedBytes: entry.decodedBodySize,
                })),
            };
          });
          report.navigations.push({
            viewport,
            sample,
            cache,
            status: response.status(),
            ...metrics,
            failedRequests: [...failures],
          });
          await page.goto("about:blank");
        }
      } finally {
        await context.close();
      }
    }
  }
  const html = await raw("/");
  const paths = [
    ...new Set(
      [
        ...html.bytes
          .toString("utf8")
          .matchAll(/(?:src|href)="(\/assets\/[\w-]+\.(?:js|css))"/g),
      ].map((match) => match[1]),
    ),
  ];
  if (html.status !== 200 || paths.length !== 2)
    throw new Error("Application assets unavailable");
  for (const path of paths) {
    const identity = await raw(path);
    const negotiated = await raw(path, "gzip");
    const refused = await raw(path, "gzip;q=0, identity;q=1");
    const head = await raw(path, "gzip", "HEAD");
    const gzip = negotiated.headers["content-encoding"] === "gzip";
    const decoded = gzip ? gunzipSync(negotiated.bytes) : negotiated.bytes;
    report.assets.push({
      path,
      statuses: [
        identity.status,
        negotiated.status,
        refused.status,
        head.status,
      ],
      identityBytes: identity.bytes.length,
      transferredBytes: negotiated.bytes.length,
      contentEncoding: negotiated.headers["content-encoding"] ?? "identity",
      vary: negotiated.headers.vary ?? null,
      reductionPercent:
        Math.round(
          (1 - negotiated.bytes.length / identity.bytes.length) * 10000,
        ) / 100,
      decodedMatchesIdentity: sha(decoded) === sha(identity.bytes),
      qZeroHonored:
        !refused.headers["content-encoding"] &&
        sha(refused.bytes) === sha(identity.bytes),
      headMatches:
        head.bytes.length === 0 &&
        head.headers["content-length"] ===
          negotiated.headers["content-length"] &&
        head.headers["content-encoding"] ===
          negotiated.headers["content-encoding"],
      headBodyBytes: head.bytes.length,
      headContentLength: head.headers["content-length"] ?? null,
      getContentLength: negotiated.headers["content-length"] ?? null,
      immutable:
        negotiated.headers["cache-control"]?.includes("immutable") ?? false,
      securityHeadersPreserved:
        !!negotiated.headers["content-security-policy"] &&
        negotiated.headers["x-content-type-options"] === "nosniff",
    });
  }
  report.summary = [];
  for (const width of [375, 1440])
    for (const cache of ["browser-cold", "repeat-visit"]) {
      const rows = report.navigations.filter(
        (row) => row.viewport.width === width && row.cache === cache,
      );
      const values = rows.map((row) => row.lcpMs).sort((a, b) => a - b);
      report.summary.push({
        width,
        cache,
        samples: rows.length,
        lcpMinMs: values[0],
        lcpMedianMs: values[1],
        lcpMaxMs: values[2],
        maxCls: Math.max(...rows.map((row) => row.cls)),
      });
    }
  report.passed =
    report.navigations.every(
      (row) =>
        row.status === 200 &&
        !row.overflow &&
        row.failedRequests.length === 0 &&
        row.imageWidth > 0 &&
        row.lcpMs > 0,
    ) &&
    report.assets.every(
      (asset) =>
        asset.statuses.every((status) => status === 200) &&
        asset.decodedMatchesIdentity &&
        asset.qZeroHonored &&
        asset.headMatches &&
        asset.immutable &&
        asset.securityHeadersPreserved &&
        (label === "before" ||
          (asset.contentEncoding === "gzip" &&
            asset.vary?.toLowerCase().includes("accept-encoding") &&
            asset.reductionPercent > 0)),
    );
} catch (error) {
  report.failure =
    error instanceof Error ? error.message.slice(0, 300) : "Probe failed";
} finally {
  await browser.close();
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(
  JSON.stringify(
    {
      passed: report.passed,
      summary: report.summary,
      assets: report.assets,
      failure: report.failure,
      report: `${output}/report.json`,
    },
    null,
    2,
  ),
);
if (!report.passed) process.exitCode = 1;

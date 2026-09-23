"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { createHandler } = require("./index.cjs");

const event = (rawPath, method = "GET") => ({
  version: "2.0",
  rawPath,
  requestContext: { http: { method } },
});
const decoded = (response) => Buffer.from(response.body, "base64");
const asset = (bytes) => ({ Body: Readable.from([bytes]) });

test("root/index use exact S3 key, byte-safe body and security/no-cache headers", async () => {
  const requests = [];
  const html = Buffer.from("<!doctype html><title>Lumen · luz</title>");
  const handler = createHandler({
    bucket: "private-web-fixture",
    getObject: async (input) => {
      requests.push(input);
      return asset(html);
    },
  });
  for (const path of ["/", "/index.html", "/%69ndex.html"]) {
    const response = await handler(event(path));
    assert.equal(response.statusCode, 200);
    assert.equal(response.isBase64Encoded, true);
    assert.deepEqual(decoded(response), html);
    assert.equal(response.headers["content-type"], "text/html; charset=utf-8");
    assert.equal(response.headers["content-length"], String(html.length));
    assert.equal(response.headers["cache-control"], "no-cache");
    assert.equal(response.headers["x-frame-options"], "DENY");
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.match(
      response.headers["content-security-policy"],
      /frame-ancestors 'none'/,
    );
    assert.match(
      response.headers["content-security-policy"],
      /https:\/\/sandbox.wompi.co/,
    );
    assert.equal(
      response.headers["permissions-policy"],
      "camera=(), microphone=(), geolocation=()",
    );
    assert.equal(
      response.headers["strict-transport-security"],
      "max-age=31536000; includeSubDomains",
    );
  }
  assert.deepEqual(
    requests,
    Array(3).fill({ Bucket: "private-web-fixture", Key: "index.html" }),
  );
});

test("hashed CSS/JS and public images have fixed MIME and cache policies; HEAD has no body", async () => {
  const bytes = Buffer.from([0, 255, 128, 0, 42]);
  const handler = createHandler({
    bucket: "web",
    getObject: async () => ({
      Body: bytes,
      ContentType: "text/plain",
      CacheControl: "unsafe",
    }),
  });
  for (const [path, mime, cache] of [
    [
      "/assets/index-B0SNZsA6.js",
      "text/javascript; charset=utf-8",
      "public, max-age=31536000, immutable",
    ],
    [
      "/assets/index-1WnVjKqv.css",
      "text/css; charset=utf-8",
      "public, max-age=31536000, immutable",
    ],
    ["/favicon.svg", "image/svg+xml", "public, max-age=3600"],
    ["/lumen-lamp.svg", "image/svg+xml", "public, max-age=3600"],
    ["/lumen-one-640.webp", "image/webp", "public, max-age=3600"],
    ["/lumen-one-1200.webp", "image/webp", "public, max-age=3600"],
  ]) {
    const get = await handler(event(path));
    assert.equal(get.statusCode, 200);
    assert.equal(get.headers["content-type"], mime);
    assert.equal(get.headers["cache-control"], cache);
    assert.deepEqual(decoded(get), bytes);
    const head = await handler(event(path, "HEAD"));
    assert.equal(head.statusCode, 200);
    assert.equal(head.body, "");
    assert.deepEqual(head.headers, get.headers);
  }
});

test("traversal, hidden paths, malformed escapes, directories, API paths and non-GET methods never reach S3", async () => {
  let calls = 0;
  const handler = createHandler({
    bucket: "web",
    getObject: async () => {
      calls++;
      return asset(Buffer.from("secret"));
    },
  });
  const forbidden = [
    "/.env",
    "/.git/config",
    "/%2eenv",
    "/%252eenv",
    "/../index.html",
    "/assets/../index.html",
    "/assets/%2e%2e/index.html",
    "/assets%2findex-B0SNZsA6.js",
    "/%5c.env",
    "/assets\\index-B0SNZsA6.js",
    "/%ZZ",
    "/%E0%A4",
    "/index.html%00",
    "//index.html",
    "/index.html/",
    "/assets/",
    "/assets",
    "/assets/index.js",
    "/assets/index-abc.js",
    "/assets/index-B0SNZsA6.js.map",
    "/assets/.hidden-AbCdEfGh.js",
    "/assets/nested/index-B0SNZsA6.js",
    "/package.json",
    "/checkout",
    "/api/products",
    "/INDEX.html",
    "/index.html?private=1",
    "/index.html#fragment",
    "/ index.html",
    "index.html",
    "/" + "a".repeat(1025),
  ];
  for (const path of forbidden) {
    const response = await handler(event(path));
    assert.equal(response.statusCode, 404, path);
    assert.equal(decoded(response).toString(), "Not found.");
    assert.equal(response.headers["cache-control"], "no-store");
  }
  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"])
    assert.equal((await handler(event("/", method))).statusCode, 404);
  assert.equal((await handler({})).statusCode, 404);
  assert.equal((await handler(null)).statusCode, 404);
  assert.equal(calls, 0);
});

test("S3 failures, missing bucket/body and empty results remain generic without secret leakage", async () => {
  const handler = createHandler({
    bucket: "private-secret-bucket",
    getObject: async () => {
      throw new Error("private-secret-provider-stack");
    },
  });
  const response = await handler(event("/"));
  assert.equal(response.statusCode, 404);
  assert.equal(decoded(response).toString(), "Not found.");
  assert.doesNotMatch(JSON.stringify(response), /private-secret/);
  assert.equal((await handler(event("/", "HEAD"))).body, "");
  const missingBucket = createHandler({
    getObject: async () => {
      assert.fail("S3 must not be called");
    },
  });
  assert.equal((await missingBucket(event("/"))).statusCode, 404);
  for (const object of [undefined, {}, { Body: {} }]) {
    const missingBody = createHandler({
      bucket: "web",
      getObject: async () => object,
    });
    assert.equal((await missingBody(event("/"))).statusCode, 404);
  }
  assert.throws(
    () => createHandler({ bucket: "web" }),
    /getObject is required/,
  );
});

test("size limit applies to metadata, direct bytes and streamed bodies before base64 exceeds 5 MiB", async () => {
  const maxSource = Math.floor((5 * 1024 * 1024) / 4) * 3;
  let destroyed = false;
  const metadata = createHandler({
    bucket: "web",
    getObject: async () => ({
      ContentLength: maxSource + 1,
      Body: {
        destroy: () => {
          destroyed = true;
        },
      },
    }),
  });
  assert.equal((await metadata(event("/"))).statusCode, 404);
  assert.equal(destroyed, true);
  const direct = createHandler({
    bucket: "web",
    getObject: async () => ({ Body: Buffer.alloc(maxSource + 1) }),
  });
  assert.equal((await direct(event("/"))).statusCode, 404);
  const stream = Readable.from([Buffer.alloc(maxSource), Buffer.from([1])]);
  const streamed = createHandler({
    bucket: "web",
    getObject: async () => ({ Body: stream }),
  });
  assert.equal((await streamed(event("/"))).statusCode, 404);
  assert.equal(stream.destroyed, true);
  const boundary = createHandler({
    bucket: "web",
    getObject: async () => ({ Body: Buffer.alloc(maxSource) }),
  });
  const success = await boundary(event("/"));
  assert.equal(success.statusCode, 200);
  assert.equal(success.body.length, 5 * 1024 * 1024);
});

"use strict";

// Node.js 22 Lambda includes @aws-sdk/client-s3 (SDK v3). The runtime minor
// version varies by region; this handler uses only its stable GetObject API.
// https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
const MAX_RESPONSE_BODY_BYTES = 5 * 1024 * 1024;
// Base64 expands bytes by 4/3. Keep the entire body below 5 MiB, with room for
// response headers inside Lambda's 6 MiB synchronous response envelope.
const MAX_SOURCE_BYTES = Math.floor(MAX_RESPONSE_BODY_BYTES / 4) * 3;
const PUBLIC_FILES = new Set([
  "index.html",
  "favicon.svg",
  "lumen-lamp.svg",
  "lumen-one-640.webp",
  "lumen-one-1200.webp",
]);
const HASHED_ASSET =
  /^assets\/[A-Za-z0-9][A-Za-z0-9_-]*-[A-Za-z0-9_-]{8,}\.(js|css)$/;
const SECURITY_HEADERS = Object.freeze({
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "content-security-policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api-sandbox.co.uat.wompi.dev https://sandbox.wompi.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests",
});

function allowedKey(rawPath) {
  if (
    typeof rawPath !== "string" ||
    rawPath.length > 1024 ||
    !rawPath.startsWith("/") ||
    /[%]2f|[%]5c/i.test(rawPath)
  ) {
    return null;
  }
  let path;
  try {
    path = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (/[\\%?#\u0000-\u0020\u007f]/.test(path)) return null;
  if (path === "/") return "index.html";
  const segments = path.slice(1).split("/");
  if (segments.some((segment) => !segment || segment.startsWith("."))) {
    return null;
  }
  const key = segments.join("/");
  return PUBLIC_FILES.has(key) || HASHED_ASSET.test(key) ? key : null;
}

function headersFor(key, length) {
  const mime = key.endsWith(".html")
    ? "text/html; charset=utf-8"
    : key.endsWith(".js")
      ? "text/javascript; charset=utf-8"
      : key.endsWith(".css")
        ? "text/css; charset=utf-8"
        : key.endsWith(".svg")
          ? "image/svg+xml"
          : "image/webp";
  const cacheControl =
    key === "index.html"
      ? "no-cache"
      : key.startsWith("assets/")
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600";
  return {
    ...SECURITY_HEADERS,
    "content-type": mime,
    "cache-control": cacheControl,
    "content-length": String(length),
  };
}

function notFound(method) {
  return {
    statusCode: 404,
    headers: {
      ...SECURITY_HEADERS,
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
    isBase64Encoded: true,
    body: method === "HEAD" ? "" : Buffer.from("Not found.").toString("base64"),
  };
}

function release(body) {
  if (typeof body?.destroy === "function") body.destroy();
}

async function readBounded(body) {
  if (body instanceof Uint8Array) {
    if (body.byteLength > MAX_SOURCE_BYTES) throw new Error("Asset too large");
    return Buffer.from(body);
  }
  if (!body || typeof body[Symbol.asyncIterator] !== "function") {
    throw new Error("Missing asset body");
  }
  const chunks = [];
  let length = 0;
  try {
    for await (const chunk of body) {
      const bytes = Buffer.from(chunk);
      length += bytes.length;
      if (length > MAX_SOURCE_BYTES) throw new Error("Asset too large");
      chunks.push(bytes);
    }
    return Buffer.concat(chunks, length);
  } finally {
    release(body);
  }
}

/** Dependency injection keeps tests isolated from AWS and credentials. */
function createHandler({ bucket, getObject }) {
  if (typeof getObject !== "function") {
    throw new TypeError("getObject is required");
  }
  return async (event) => {
    const method = event?.requestContext?.http?.method;
    const key = allowedKey(event?.rawPath);
    if (!bucket || !key || (method !== "GET" && method !== "HEAD")) {
      return notFound(method);
    }
    try {
      const object = await getObject({ Bucket: bucket, Key: key });
      if (object.ContentLength > MAX_SOURCE_BYTES) {
        release(object.Body);
        return notFound(method);
      }
      const bytes = await readBounded(object.Body);
      return {
        statusCode: 200,
        headers: headersFor(key, bytes.length),
        isBase64Encoded: true,
        body: method === "HEAD" ? "" : bytes.toString("base64"),
      };
    } catch {
      // Do not expose bucket names, keys, SDK errors, stack traces or secrets.
      return notFound(method);
    }
  };
}

let runtimeHandler;
exports.handler = async (event) => {
  if (!runtimeHandler) {
    const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
    const client = new S3Client({ maxAttempts: 2 });
    runtimeHandler = createHandler({
      bucket: process.env.WEB_BUCKET,
      getObject: (input) => client.send(new GetObjectCommand(input)),
    });
  }
  return runtimeHandler(event);
};
exports.createHandler = createHandler;

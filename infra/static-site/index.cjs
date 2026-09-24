"use strict";

const { gzip } = require("node:zlib");
const { promisify } = require("node:util");
const compress = promisify(gzip);
const MIN_GZIP_BYTES = 1024;
const MAX_CACHE_BYTES = 8 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 16;
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
    ...(/\.(html|js|css|svg)$/.test(key) ? { vary: "Accept-Encoding" } : {}),
  };
}

// Explicit refusals override wildcard acceptance. Unknown/invalid q values are
// not permission to send a coding; an absent header gets the identity form.
function acceptedEncodings(headers) {
  const header = Object.entries(headers ?? {}).find(
    ([name]) => name.toLowerCase() === "accept-encoding",
  )?.[1];
  const weights = new Map();
  if (typeof header === "string") {
    for (const entry of header.split(",")) {
      const [name, ...parameters] = entry.trim().toLowerCase().split(";");
      const coding = name.trim() === "x-gzip" ? "gzip" : name.trim();
      let weight = 1;
      for (const parameter of parameters) {
        const [key, value] = parameter.trim().split("=");
        if (key === "q") {
          weight = /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(value ?? "")
            ? Number(value)
            : 0;
        }
      }
      weights.set(coding, Math.min(weights.get(coding) ?? 1, weight));
    }
  }
  return {
    gzip: weights.get("gzip") ?? weights.get("*") ?? 0,
    identity: weights.get("identity") ?? (weights.get("*") === 0 ? 0 : 1),
    identityExplicit: weights.has("identity"),
  };
}

function notAcceptable(method) {
  const response = notFound(method);
  response.statusCode = 406;
  response.headers.vary = "Accept-Encoding";
  response.body =
    method === "HEAD" ? "" : Buffer.from("Not acceptable.").toString("base64");
  return response;
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
function createHandler({ bucket, getObject, gatewayManagesHead = false }) {
  if (typeof getObject !== "function") {
    throw new TypeError("getObject is required");
  }
  // Only content-hashed assets are immutable. Never cache index.html, images
  // under mutable names, errors or API data in a warm execution environment.
  const cache = new Map();
  let cacheBytes = 0;
  async function load(key) {
    const hit = cache.get(key);
    if (hit) {
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    const object = await getObject({ Bucket: bucket, Key: key });
    if (object.ContentLength > MAX_SOURCE_BYTES) {
      release(object.Body);
      throw new Error("Asset too large");
    }
    const bytes = await readBounded(object.Body);
    const compressed = /\.(html|js|css|svg)$/.test(key)
      ? await compress(bytes)
      : null;
    const entry = { bytes, compressed };
    const size = bytes.length + (compressed?.length ?? 0);
    if (HASHED_ASSET.test(key) && size <= MAX_CACHE_BYTES) {
      // Another concurrent request may have populated this key while S3 ran.
      const previous = cache.get(key);
      if (previous) {
        cacheBytes -=
          previous.bytes.length + (previous.compressed?.length ?? 0);
        cache.delete(key);
      }
      while (
        cache.size &&
        (cacheBytes + size > MAX_CACHE_BYTES || cache.size >= MAX_CACHE_ENTRIES)
      ) {
        const oldest = cache.keys().next().value;
        const removed = cache.get(oldest);
        cacheBytes -= removed.bytes.length + (removed.compressed?.length ?? 0);
        cache.delete(oldest);
      }
      cache.set(key, entry);
      cacheBytes += size;
    }
    return entry;
  }
  return async (event) => {
    const method = event?.requestContext?.http?.method;
    const key = allowedKey(event?.rawPath);
    if (!bucket || !key || (method !== "GET" && method !== "HEAD")) {
      return notFound(method);
    }
    try {
      const { bytes, compressed } = await load(key);
      const accepted = acceptedEncodings(event.headers);
      const useGzip =
        compressed &&
        accepted.gzip > 0 &&
        (accepted.identity === 0 ||
          (bytes.length >= MIN_GZIP_BYTES &&
            compressed.length < bytes.length &&
            (!accepted.identityExplicit ||
              accepted.gzip >= accepted.identity)));
      if (!useGzip && accepted.identity === 0) return notAcceptable(method);
      const body = useGzip ? compressed : bytes;
      return {
        statusCode: 200,
        headers: {
          ...headersFor(key, body.length),
          ...(useGzip ? { "content-encoding": "gzip" } : {}),
        },
        isBase64Encoded: true,
        // HTTP API calculates Content-Length from the proxy envelope and
        // suppresses HEAD bytes on the wire. Supply the representation there;
        // an ordinary HTTP adapter can instead use the empty-body default.
        body:
          method === "HEAD" && !gatewayManagesHead
            ? ""
            : body.toString("base64"),
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
      gatewayManagesHead: true,
      getObject: (input) => client.send(new GetObjectCommand(input)),
    });
  }
  return runtimeHandler(event);
};
exports.createHandler = createHandler;

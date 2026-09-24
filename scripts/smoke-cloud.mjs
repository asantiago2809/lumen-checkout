import { randomUUID } from 'node:crypto';

// Pre-payment cloud verification only: no card, tokenization or /pay request.
// Creates a fictional attempt and cancels it through the public API. Financial
// audit records remain ERROR/cancelled; its reservation and draft must be released.
const origin = new URL(process.argv[2] ?? 'https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com').origin;
if (!origin.startsWith('https://')) throw new Error('An HTTPS origin is required');
const results = [];
let cookie = '';
let csrf = '';
let needsCleanup = false;
const check = (ok, name) => {
  if (!ok) throw new Error(`Failed: ${name}`);
  results.push({ check: name, result: 'PASS' });
};
async function request(path, { method = 'GET', body, headers = {}, session = true } = {}) {
  const response = await fetch(`${origin}/api${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(session && cookie ? { Cookie: cookie } : {}),
      ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  let data, errorCode;
  try { const parsed = text ? JSON.parse(text) : {}; data = parsed.data; errorCode = parsed.error?.code; } catch { /* HTML Swagger is expected. */ }
  return { response, data, errorCode };
}

try {
  const health = await request('/health');
  check(health.response.status === 200, 'Public API health');
  check(!!health.response.headers.get('content-security-policy') && !!health.response.headers.get('x-content-type-options'), 'API security headers');
  const docs = await request('/docs');
  check(docs.response.status === 200 && docs.response.headers.get('content-type')?.includes('text/html'), 'Public Swagger HTML');
  const openapi = await fetch(`${origin}/api/docs-json`);
  const spec = await openapi.json();
  check(openapi.status === 200 && !!spec.paths?.['/api/transactions'], 'Public OpenAPI transaction contract');
  const initial = await request('/products');
  check(initial.response.status === 200 && Array.isArray(initial.data) && initial.data.length > 0, 'Persistent seeded catalogue');
  const product = initial.data[0];
  check(product.stock > 0, 'Stock available for isolated pre-payment probe');

  const bootstrap = await request('/checkout/session', { method: 'POST', body: {} });
  const setCookie = bootstrap.response.headers.getSetCookie().find(value => value.startsWith('checkout_session=')) ?? '';
  cookie = setCookie.split(';')[0];
  csrf = bootstrap.data?.csrfToken ?? '';
  check(bootstrap.response.status === 201 && !!cookie && !!csrf, 'New cloud checkout session');
  check(/;\s*HttpOnly/i.test(setCookie) && /;\s*Secure/i.test(setCookie) && /;\s*SameSite=Lax/i.test(setCookie), 'HttpOnly Secure SameSite cookie');
  check(bootstrap.response.headers.get('cache-control')?.includes('no-store'), 'Private session response is not cached');
  const rejectedOrigin = await request('/checkout/session', { method: 'POST', body: {}, headers: { Origin: 'https://untrusted.example.test' }, session: false });
  check(rejectedOrigin.response.status === 403, 'Untrusted Origin rejected');
  const rejectedCsrf = await request('/checkout/draft', { method: 'PUT', body: {}, headers: { 'X-CSRF-Token': 'invalid-probe' } });
  check(rejectedCsrf.response.status === 403, 'Invalid CSRF rejected');

  const customer = { fullName: 'Persona de Prueba Cloud', email: 'cloud-probe@example.test', phone: '3000000000' };
  const delivery = { addressLine1: 'Calle de prueba 10', city: 'Bogotá', region: 'Bogotá D.C.', country: 'CO' };
  needsCleanup = true;
  const draft = await request('/checkout/draft', { method: 'PUT', body: { productId: product.id, quantity: 1, step: 'SUMMARY', customer, delivery } });
  check(draft.response.status === 200, `Cloud draft persisted (HTTP ${draft.response.status}, ${draft.errorCode ?? 'no error code'})`);
  const restored = await request('/checkout/session');
  check(restored.data?.draft?.customer?.email === customer.email, 'Draft restored through another HTTP request');
  const quote = await request('/checkout/quote', { method: 'POST', body: { productId: product.id, quantity: 1 } });
  check(quote.response.status === 200 && Number.isSafeInteger(quote.data?.amounts?.totalInCents), 'Server quote uses integer money');
  const key = randomUUID();
  const purchase = { productId: product.id, quantity: 1, expectedTotalInCents: quote.data.amounts.totalInCents, customer, delivery };
  const created = await request('/transactions', { method: 'POST', body: purchase, headers: { 'Idempotency-Key': key } });
  check(created.response.status === 201 && created.data?.status === 'PENDING', 'Durable PENDING created before any payment');
  const repeated = await request('/transactions', { method: 'POST', body: purchase, headers: { 'Idempotency-Key': key } });
  check(repeated.response.status === 200 && repeated.data?.id === created.data.id, 'Idempotent cloud retry returns the same attempt');
  const reserved = await request(`/products/${product.id}`);
  check(reserved.data?.stock === product.stock - 1, 'Reservation reduces publicly available stock');
  const cleared = await request('/checkout/draft', { method: 'DELETE', body: {} });
  check(cleared.response.status === 204, 'Unsubmitted attempt cancelled through API');
  needsCleanup = false;
  const cancelled = await request(`/transactions/${created.data.id}`);
  check(cancelled.data?.status === 'ERROR' && cancelled.data?.submissionStatus === 'NOT_STARTED' && cancelled.data?.canPay === false && cancelled.data?.delivery === null, 'Cancelled attempt cannot be paid and has no delivery');
  const released = await request(`/products/${product.id}`);
  check(released.data?.stock === product.stock, 'Reservation released and publicly available stock restored');
  const config = await request('/checkout/config');
  results.push({ check: 'External sandbox configuration', status: config.response.status, result: config.response.ok ? 'AVAILABLE; real payment still untested' : 'UNAVAILABLE; external integration gate remains open' });
  console.log(JSON.stringify({ observedAt: new Date().toISOString(), origin, scope: 'Live AWS pre-payment only; no card or payment submitted', results }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ origin, scope: 'Incomplete live AWS pre-payment probe', results }, null, 2));
  console.error(error instanceof Error ? error.message : 'Cloud probe failed');
  process.exitCode = 1;
} finally {
  if (needsCleanup && cookie && csrf) {
    try {
      const cleanup = await request('/checkout/draft', { method: 'DELETE', body: {} });
      console.log(`Own probe draft/reservation cleanup HTTP ${cleanup.response.status}`);
      if (cleanup.response.status !== 204) process.exitCode = 1;
    } catch { console.error('Own probe cleanup needs inspection; do not infer that stock was released.'); process.exitCode = 1; }
  }
}

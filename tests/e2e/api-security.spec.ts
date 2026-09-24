import { randomUUID } from 'node:crypto';
import { test, expect, amounts, apiOrigin, createPurchase, draft, fakePayInput, purchase, qaOrigin, qaProductId } from './server';

test('QA-S03/S04: origin and CSRF enforced; session cookie and no-store present', async ({ harness, request }) => {
  const foreign = await request.post(`${apiOrigin}/api/checkout/session`, { headers: { Origin: 'https://foreign.example.test' }, data: {} });
  expect(foreign.status()).toBe(403);
  const session = await harness.session();
  const restored = await session.client.post('/api/checkout/session', { data: {} });
  expect(restored.status()).toBe(200);
  const cookie = restored.headers()['set-cookie'];
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
  expect(cookie).toContain('Path=/api');
  expect(restored.headers()['cache-control']).toBe('no-store');
  const quote = await session.client.post('/api/checkout/quote', { data: { productId: qaProductId, quantity: 1 } });
  expect(quote.status()).toBe(403);
  const good = await session.client.post('/api/checkout/quote', { headers: { 'X-CSRF-Token': session.csrf }, data: { productId: qaProductId, quantity: 1 } });
  expect(good.status()).toBe(200);
  expect((await good.json()).data.amounts).toEqual(amounts);
  const serialized = JSON.stringify(await harness.readState());
  const rawCookie = (await session.client.storageState()).cookies.find(item => item.name === 'checkout_session')!.value;
  expect(serialized.includes(rawCookie)).toBe(false);
});

test('QA-M01/M02: server rejects unknown financial fields and changed price before reservation', async ({ harness }) => {
  const session = await harness.session();
  const injected = await createPurchase(session, randomUUID(), { ...purchase, status: 'APPROVED', amount: 1 } as any);
  expect(injected.response.status()).toBe(400);
  const changed = await createPurchase(session, randomUUID(), { ...purchase, expectedTotalInCents: 1 });
  expect(changed.response.status()).toBe(409);
  expect(changed.body.error.code).toBe('PRICE_CHANGED');
  const state = await harness.readState();
  expect(Object.keys(state).filter(key => key.startsWith('TX#'))).toHaveLength(0);
  expect(state[`PRODUCT#${qaProductId}`].value.stockAvailable).toBe(12);
  expect(harness.gateway.createCount).toBe(0);
});

test('QA-M04/M05: concurrent create is durable idempotent; changed body conflicts', async ({ harness }) => {
  const session = await harness.session();
  const key = randomUUID();
  const results = await Promise.all([createPurchase(session, key), createPurchase(session, key)]);
  expect(results.map(item => item.response.status()).sort()).toEqual([200, 201]);
  expect(results[0].body.data.id).toBe(results[1].body.data.id);
  const conflict = await createPurchase(session, key, { ...purchase, customer: { ...purchase.customer, fullName: 'Otra Persona' } });
  expect(conflict.response.status()).toBe(409);
  expect(conflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  const state = await harness.readState();
  expect(Object.keys(state).filter(key => key.startsWith('TX#'))).toHaveLength(1);
  expect(state[`PRODUCT#${qaProductId}`].value.stockReserved).toBe(1);
  expect(harness.gateway.createCount).toBe(0);
});

test('QA-M07: two sessions cannot reserve the same last unit', async ({ harness }) => {
  const product = await harness.store.get(`PRODUCT#${qaProductId}`);
  await harness.store.commit([{ key: `PRODUCT#${qaProductId}`, expectedVersion: product.version, value: { ...product.value, stockOnHand: 1, stockAvailable: 1 } }]);
  const [a, b] = await Promise.all([harness.session(), harness.session()]);
  const results = await Promise.all([createPurchase(a), createPurchase(b)]);
  expect(results.map(item => item.response.status()).sort()).toEqual([201, 409]);
  const state = await harness.readState();
  expect(state[`PRODUCT#${qaProductId}`].value).toMatchObject({ stockOnHand: 1, stockAvailable: 0, stockReserved: 1 });
  expect(Object.keys(state).filter(key => key.startsWith('TX#'))).toHaveLength(1);
});

test('QA-S03: other sessions cannot read or pay transaction, customer or delivery', async ({ harness }) => {
  const a = await harness.session();
  const b = await harness.session();
  const created = await createPurchase(a);
  const id = created.body.data.id;
  const pay = await a.client.post(`/api/transactions/${id}/pay`, { headers: { 'X-CSRF-Token': a.csrf }, data: fakePayInput });
  expect(pay.status()).toBe(200);
  const transaction = (await harness.readState())[`TX#${id}`].value;
  for (const path of [`/api/transactions/${id}`, `/api/customers/${transaction.customerId}`, `/api/deliveries/${transaction.deliveryId}`]) {
    expect((await b.client.get(path)).status()).toBe(404);
  }
  expect((await b.client.post(`/api/transactions/${id}/pay`, { headers: { 'X-CSRF-Token': b.csrf }, data: fakePayInput })).status()).toBe(404);
  expect(harness.gateway.createCount).toBe(1);
});

test('QA-F08/M08/M09: repeated pay finalizes one delivery and consumes stock once', async ({ harness }) => {
  const session = await harness.session();
  const created = await createPurchase(session);
  const id = created.body.data.id;
  const send = () => session.client.post(`/api/transactions/${id}/pay`, { headers: { 'X-CSRF-Token': session.csrf }, data: fakePayInput });
  await Promise.all([send(), send()]);
  await send();
  await session.client.get(`/api/transactions/${id}`);
  const state = await harness.readState();
  expect(state[`TX#${id}`].value.status).toBe('APPROVED');
  expect(state[`PRODUCT#${qaProductId}`].value).toMatchObject({ stockOnHand: 11, stockAvailable: 11, stockReserved: 0 });
  expect(Object.keys(state).filter(key => key.startsWith('DELIVERY#'))).toHaveLength(1);
  expect(harness.gateway.createCount).toBe(1);
});

test('QA-F09: decline releases reservation and never creates delivery', async ({ harness }) => {
  harness.gateway.mode = 'declined';
  const session = await harness.session();
  const created = await createPurchase(session);
  const result = await session.client.post(`/api/transactions/${created.body.data.id}/pay`, { headers: { 'X-CSRF-Token': session.csrf }, data: fakePayInput });
  expect((await result.json()).data.status).toBe('DECLINED');
  const state = await harness.readState();
  expect(state[`PRODUCT#${qaProductId}`].value).toMatchObject({ stockOnHand: 12, stockAvailable: 12, stockReserved: 0 });
  expect(Object.keys(state).filter(key => key.startsWith('DELIVERY#'))).toHaveLength(0);
});

test('QA-M11/R05: ambiguous timeout stays UNKNOWN and blocks repeated charge/cancel', async ({ harness }) => {
  harness.gateway.mode = 'uncertain';
  const session = await harness.session();
  const created = await createPurchase(session);
  const id = created.body.data.id;
  for (let i = 0; i < 2; i++) {
    const response = await session.client.post(`/api/transactions/${id}/pay`, { headers: { 'X-CSRF-Token': session.csrf }, data: fakePayInput });
    expect(response.status()).toBe(202);
    expect((await response.json()).data).toMatchObject({ status: 'PENDING', submissionStatus: 'UNKNOWN', canPay: false });
  }
  harness.clock.now += 86400000;
  // Public catalogue may expire unused reservations but must preserve uncertain ones.
  await session.client.get('/api/products');
  const state = await harness.readState();
  expect(state[`PRODUCT#${qaProductId}`].value).toMatchObject({ stockOnHand: 12, stockAvailable: 11, stockReserved: 1 });
  expect(Object.keys(state).filter(key => key.startsWith('DELIVERY#'))).toHaveLength(0);
  expect(harness.gateway.createCount).toBe(1);
});

test('QA-M12: expired unsubmitted reservation cannot be paid and replay is terminal', async ({ harness }) => {
  const session = await harness.session();
  const created = await createPurchase(session);
  harness.clock.now += 16 * 60000;
  const replay = await createPurchase(session, created.key);
  expect(replay.body.data.canPay).toBe(false);
  const response = await session.client.post(`/api/transactions/${created.body.data.id}/pay`, { headers: { 'X-CSRF-Token': session.csrf }, data: fakePayInput });
  expect((await response.json()).data.status).toBe('ERROR');
  expect(harness.gateway.createCount).toBe(0);
  const state = await harness.readState();
  expect(state[`PRODUCT#${qaProductId}`].value).toMatchObject({ stockOnHand: 12, stockAvailable: 12, stockReserved: 0 });
});

test('QA-R01/R03: saved draft and active transaction survive new client context with same cookie', async ({ harness, playwright }) => {
  const session = await harness.session();
  const saved = await session.client.put('/api/checkout/draft', { headers: { 'X-CSRF-Token': session.csrf }, data: draft });
  expect(saved.status()).toBe(200);
  const created = await createPurchase(session);
  const restored = await playwright.request.newContext({ baseURL: apiOrigin, storageState: await session.client.storageState(), extraHTTPHeaders: { Origin: qaOrigin } });
  try {
    const response = await restored.post('/api/checkout/session', { data: {} });
    expect((await response.json()).data).toMatchObject({ activeTransactionId: created.body.data.id, draft });
  } finally { await restored.dispose(); }
});

test('QA-L04: OpenAPI documents meaningful request body schemas', async ({ harness, request }) => {
  const response = await request.get(`${apiOrigin}/api/docs-json`);
  expect(response.status()).toBe(200);
  const schema = await response.json();
  expect(Object.keys(schema.paths)).toContain('/api/transactions');
  expect(Object.keys(schema.components.schemas.CreateDto.properties ?? {})).toEqual(expect.arrayContaining(['productId', 'quantity', 'expectedTotalInCents', 'customer', 'delivery']));
  expect(Object.keys(schema.components.schemas.PayDto.properties ?? {})).toEqual(expect.arrayContaining(['cardToken', 'installments', 'acceptanceToken', 'acceptPersonalAuth']));
});

import { test as base, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
// Production TypeScript must be built first; use its emitted decorator metadata.
const { createApp } = require('../../apps/api/dist/bootstrap/create-app.js');
const { FileStore } = require('../../apps/api/dist/infrastructure/persistence/file.store.js');
const { CheckoutService } = require('../../apps/api/dist/application/checkout.service.js');

/** Track real async work, including operations that outlive an aborted HTTP socket. */
function operationDrain() {
  const active = new Set<Promise<unknown>>();
  return {
    track(target: any, methods: string[]) {
      for (const name of methods) {
        const original = target[name];
        if (typeof original !== 'function') throw new Error(`Missing tracked method: ${name}`);
        target[name] = function (...args: unknown[]) {
          const result = original.apply(this, args);
          if (!result || typeof result.then !== 'function') return result;
          const tracked = Promise.resolve(result).finally(() => active.delete(tracked));
          active.add(tracked);
          return tracked;
        };
      }
    },
    async wait() {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          (async () => { while (active.size) await Promise.allSettled([...active]); })(),
          new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error(`QA shutdown did not drain ${active.size} operations`)), 5000); }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export const qaOrigin = 'http://127.0.0.1:5174';
export const apiOrigin = 'http://127.0.0.1:3002';
export const qaProductId = 'product_lumen_one';
export const amounts = { currency: 'COP', subtotalInCents: 18900000, baseFeeInCents: 250000, deliveryFeeInCents: 1200000, totalInCents: 20350000 };
export const customer = { fullName: 'Persona de Prueba', email: 'checkout@example.test', phone: '3000000000' };
export const delivery = { addressLine1: 'Calle de prueba 10', city: 'Bogotá', region: 'Bogotá D.C.', country: 'CO' };
export const purchase = { productId: qaProductId, quantity: 1, expectedTotalInCents: amounts.totalInCents, customer, delivery };
export const draft = { productId: qaProductId, quantity: 1, step: 'SUMMARY', customer, delivery };
export const fakePayInput = { cardToken: 'qa-ephemeral-card-token', installments: 1, acceptanceToken: 'qa-terms', acceptPersonalAuth: 'qa-personal' };

/** Controlled boundary exclusively injected by tests. No real payment requests. */
export class TestGateway {
  mode: 'approved' | 'declined' | 'pending' | 'uncertain' | 'unavailable' = 'approved';
  createCount = 0;
  getCount = 0;
  private payments = new Map<string, any>();
  configured() { return this.mode !== 'unavailable'; }
  async config() {
    if (!this.configured()) return { ok: false, error: { code: 'PAYMENT_UNAVAILABLE', message: 'El proveedor de pruebas no está disponible.', httpStatus: 503 } };
    return { ok: true, value: { environment: 'sandbox', paymentApiUrl: 'https://sandbox.wompi.co/v1', publicKey: 'pub_test_qa', currency: 'COP', baseFeeInCents: amounts.baseFeeInCents, deliveryFeeInCents: amounts.deliveryFeeInCents,
      acceptance: { terms: { token: 'qa-terms', url: 'https://example.test/terms' }, personalData: { token: 'qa-personal', url: 'https://example.test/privacy' } } } };
  }
  async create(tx: any) {
    this.createCount += 1;
    if (this.mode === 'uncertain') return { ok: false, error: { code: 'PAYMENT_UNCERTAIN', message: 'La respuesta de prueba se perdió.', httpStatus: 503 } };
    const result = { id: `qa-${randomUUID()}`, reference: tx.reference, status: this.mode === 'declined' ? 'DECLINED' : this.mode === 'pending' ? 'PENDING' : 'APPROVED', amountInCents: tx.amounts.totalInCents, currency: 'COP', card: { brand: 'VISA', lastFour: '0000' } };
    this.payments.set(result.id, result);
    return { ok: true, value: result };
  }
  async get(id: string) {
    this.getCount += 1;
    const value = this.payments.get(id);
    return value ? { ok: true, value } : { ok: false, error: { code: 'PAYMENT_UNCERTAIN', message: 'Consulta de prueba sin respuesta.', httpStatus: 503 } };
  }
}

type Harness = {
  gateway: TestGateway;
  store: any;
  clock: { now: number };
  readState(): Promise<Record<string, any>>;
  session(): Promise<{ client: APIRequestContext; csrf: string; data: any }>;
};

export const test = base.extend<{ harness: Harness }>({
  harness: async ({ context }, use) => {
    const directory = await mkdtemp(join(tmpdir(), 'lumen-independent-qa-'));
    const path = join(directory, 'store.json');
    const store = new FileStore(path);
    const operations = operationDrain();
    operations.track(store, ['get', 'products', 'pending', 'commit']);
    const gateway = new TestGateway();
    const clock = { now: Date.now() };
    const clients: APIRequestContext[] = [];
    const runtime = { now: () => new Date(clock.now), id: randomUUID, token: () => randomBytes(32).toString('base64url'), hash: (value: string) => createHmac('sha256', 'qa-session-hash-only').update(value).digest('hex') };
    const app = await createApp({ store, gateway, runtime, env: { NODE_ENV: 'test', ALLOWED_ORIGINS: qaOrigin } });
    operations.track(app.get(CheckoutService), ['sessionFromToken', 'bootstrap', 'saveDraft', 'clearDraft', 'products', 'product', 'quote', 'create', 'pay', 'transaction', 'customer', 'delivery']);
    await app.listen(3002, '127.0.0.1');
    try {
      await use({ gateway, store, clock, readState: async () => JSON.parse(await readFile(path, 'utf8')), session: async () => {
        const client = await playwrightRequest.newContext({ baseURL: apiOrigin, extraHTTPHeaders: { Origin: qaOrigin } });
        clients.push(client);
        const response = await client.post('/api/checkout/session', { data: {} });
        expect(response.status()).toBe(201);
        const data = (await response.json()).data;
        return { client, csrf: data.csrfToken, data };
      } });
    } finally {
      // Stop all browser producers first, then HTTP clients/listener. Closing a socket
      // does not cancel its already-started use case, so drain real async work explicitly.
      await context.close();
      for (const client of clients) await client.dispose();
      await app.close();
      await operations.wait();
      // Resolve and validate the exact disposable directory before recursive removal.
      if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith('lumen-independent-qa-')) throw new Error('Unexpected QA cleanup target');
      await rm(directory, { recursive: true, force: true, maxRetries: 2, retryDelay: 50 });
    }
  },
});
export { expect };

export async function createPurchase(session: { client: APIRequestContext; csrf: string }, key = randomUUID(), data = purchase) {
  const response = await session.client.post('/api/transactions', { headers: { 'X-CSRF-Token': session.csrf, 'Idempotency-Key': key }, data });
  return { response, body: await response.json(), key };
}

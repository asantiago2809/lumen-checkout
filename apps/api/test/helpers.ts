import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { CheckoutStore, PaymentGateway, Runtime, Stored, Write, WriteConflict } from '../src/application/ports';
import { CheckoutService } from '../src/application/checkout.service';
import { CreateInput, PayInput, Product, ProviderTransaction, Transaction } from '../src/domain/models';
import { ok, Result } from '../src/domain/result';

export class MemoryStore implements CheckoutStore {
  records = new Map<string, Stored<any>>();
  async get<T>(key: string): Promise<Stored<T> | null> { return structuredClone(this.records.get(key) ?? null); }
  async products() { return [...this.records.entries()].filter(([key]) => key.startsWith('PRODUCT#')).map(([, value]) => structuredClone(value) as Stored<Product>); }
  async pending() { return [...this.records.entries()].filter(([key, value]) => key.startsWith('TX#') && value.value.status === 'PENDING').map(([, value]) => structuredClone(value) as Stored<Transaction>); }
  async commit(writes: Write[]) {
    for (const write of writes) if ((this.records.get(write.key)?.version ?? null) !== write.expectedVersion) throw new WriteConflict();
    for (const write of writes) {
      if (write.value === null) this.records.delete(write.key);
      else this.records.set(write.key, { value: structuredClone(write.value), version: (write.expectedVersion ?? 0) + 1 });
    }
  }
}
export class FakeGateway implements PaymentGateway {
  enabled = true;
  status: ProviderTransaction['status'] = 'APPROVED';
  last?: Transaction;
  create = jest.fn(async (tx: Transaction, _email: string, _input: PayInput): Promise<Result<ProviderTransaction>> => { this.last = tx; return ok(this.provider(tx)); });
  get = jest.fn(async (_id: string): Promise<Result<ProviderTransaction>> => ok(this.provider(this.last!)));
  configured() { return this.enabled; }
  config = jest.fn(async () => ok({ environment: 'sandbox' as const, paymentApiUrl: 'https://sandbox.wompi.co/v1', publicKey: 'public-placeholder', currency: 'COP' as const,
    baseFeeInCents: 250000, deliveryFeeInCents: 1200000, acceptance: { terms: { token: 'terms-token', url: 'https://example.com/terms' }, personalData: { token: 'privacy-token', url: 'https://example.com/privacy' } } }));
  provider(tx: Transaction): ProviderTransaction { return { id: 'provider-id', reference: tx.reference, status: this.status, amountInCents: tx.amounts.totalInCents, currency: 'COP', card: { brand: 'VISA', lastFour: '4242' } }; }
}
export const input: CreateInput = { productId: 'product_lumen_one', quantity: 1, expectedTotalInCents: 20350000,
  customer: { fullName: 'Cliente Demo', email: 'demo@example.com', phone: '3000000000' }, delivery: { addressLine1: 'Calle ejemplo 123', city: 'Bogotá', region: 'Bogotá D.C.', country: 'CO' } };
export const payment: PayInput = { cardToken: 'token_ephemeral', installments: 1, acceptanceToken: 'terms', acceptPersonalAuth: 'privacy' };
export function value<T>(result: Result<T>): T { if (!result.ok) throw new Error(result.error.code); return result.value; }
export async function setup() {
  const store = new MemoryStore(), gateway = new FakeGateway();
  let time = Date.parse('2026-09-23T12:00:00Z');
  const runtime: Runtime = { now: () => new Date(time), id: randomUUID, token: () => randomBytes(32).toString('base64url'), hash: raw => createHash('sha256').update(raw).digest('hex') };
  const service = new CheckoutService(store, gateway, runtime);
  await service.seed();
  const session = await service.bootstrap();
  return { store, gateway, runtime, service, owner: session.session.id, token: session.token, session: session.session, advance: (ms: number) => { time += ms; } };
}

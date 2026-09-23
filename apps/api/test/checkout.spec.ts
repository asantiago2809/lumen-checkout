import { randomUUID } from 'node:crypto';
import { CheckoutService } from '../src/application/checkout.service';
import { WriteConflict } from '../src/application/ports';
import { keys, Product, Session, Transaction } from '../src/domain/models';
import { quote, statusMessage } from '../src/domain/checkout';
import { andThen, fail, ok } from '../src/domain/result';
import { input, payment, setup, value } from './helpers';

describe('checkout business invariants', () => {
  it('prices server-side and short-circuits invalid ROP paths', async () => {
    const { service, store } = await setup();
    expect(value(await service.quote(input.productId, 1)).amounts.totalInCents).toBe(20350000);
    expect(await service.quote('absent', 1)).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    const p = (await store.get<Product>(keys.product(input.productId)))!.value;
    expect(quote(p, 2)).toMatchObject({ ok: false });
    expect(quote({ ...p, priceInCents: 0 }, 1)).toMatchObject({ ok: false });
    expect(quote({ ...p, priceInCents: Number.MAX_SAFE_INTEGER }, 1)).toMatchObject({ ok: false });
    const next = jest.fn(); expect(andThen(fail('X', 'x'), next)).toMatchObject({ ok: false }); expect(next).not.toHaveBeenCalled();
    expect(andThen(ok(2), n => ok(n * 2))).toEqual(ok(4));
    expect(statusMessage('VOIDED')).toContain('anulado');
  });
  it('seeds once, recovers a session and never exposes owner or internal stock counters', async () => {
    const { service, token, owner, advance } = await setup();
    await service.seed();
    expect((await service.bootstrap(token)).created).toBe(false);
    expect(value(await service.sessionFromToken(token)).id).toBe(owner);
    expect(service.sessionView(value(await service.sessionFromToken(token)))).not.toHaveProperty('id');
    const product = value(await service.product(input.productId)); expect(product.stock).toBe(12); expect(product).not.toHaveProperty('stockOnHand');
    expect(value(await service.products())).toHaveLength(1);
    expect(await service.product('missing')).toMatchObject({ ok: false });
    expect(await service.sessionFromToken('bad')).toMatchObject({ ok: false });
    expect(await service.sessionFromToken('z'.repeat(43))).toMatchObject({ ok: false });
    advance(86400001); expect(await service.sessionFromToken(token)).toMatchObject({ ok: false });
    expect((await service.bootstrap(token)).created).toBe(true);
  });
  it('persists incomplete non-card drafts, authorizes and clears them', async () => {
    const { service, owner, store } = await setup();
    const draft = { productId: input.productId, quantity: 1 as const, step: 'DETAILS' as const, customer: { email: 'unfinished@' }, delivery: {} };
    expect(await service.saveDraft(owner, draft)).toEqual(ok({ draft }));
    expect((await store.get<Session>(keys.session(owner)))!.value.draft).toEqual(draft);
    expect(await service.saveDraft(owner, { ...draft, productId: 'none' })).toMatchObject({ ok: false });
    expect(await service.saveDraft('missing', draft)).toMatchObject({ ok: false });
    expect(await service.clearDraft('missing')).toMatchObject({ ok: false });
    expect(await service.clearDraft(owner)).toEqual(ok(null));
  });
  it('rejects altered totals, missing sessions and duplicate keys with another body', async () => {
    const { service, owner, store } = await setup();
    expect(await service.create(owner, randomUUID(), { ...input, expectedTotalInCents: 1 })).toMatchObject({ ok: false, error: { code: 'PRICE_CHANGED' } });
    expect(await service.create('missing', randomUUID(), input)).toMatchObject({ ok: false });
    expect(await service.create(owner, randomUUID(), { ...input, productId: 'missing' })).toMatchObject({ ok: false });
    const key = randomUUID(); const created = value(await service.create(owner, key, input));
    const replay = value(await service.create(owner, key, input));
    expect(replay.created).toBe(false); expect(replay.transaction.id).toBe(created.transaction.id);
    expect(await service.create(owner, key, { ...input, customer: { ...input.customer, fullName: 'Different' } })).toMatchObject({ ok: false, error: { code: 'IDEMPOTENCY_CONFLICT' } });
    expect(await service.create(owner, randomUUID(), input)).toMatchObject({ ok: false, error: { code: 'PAYMENT_IN_PROGRESS' } });
    expect((await store.get<Product>(keys.product(input.productId)))!.value).toMatchObject({ stockAvailable: 11, stockReserved: 1, stockOnHand: 12 });
  });
  it('reserves the final unit once across concurrent buyers and idempotent retries', async () => {
    const { service, owner, store } = await setup();
    const p = (await store.get<Product>(keys.product(input.productId)))!;
    await store.commit([{ key: keys.product(input.productId), expectedVersion: p.version, value: { ...p.value, stockAvailable: 1, stockOnHand: 1 } }]);
    const other = (await service.bootstrap()).session.id;
    const results = await Promise.all([service.create(owner, randomUUID(), input), service.create(other, randomUUID(), input)]);
    expect(results.filter(r => r.ok)).toHaveLength(1);
    expect(results.find(r => !r.ok)).toMatchObject({ error: { code: 'OUT_OF_STOCK' } });
    expect((await store.get<Product>(keys.product(input.productId)))!.value.stockAvailable).toBe(0);
    const fresh = await setup(), key = randomUUID();
    const [a, b] = await Promise.all([fresh.service.create(fresh.owner, key, input), fresh.service.create(fresh.owner, key, input)]);
    expect(value(a).transaction.id).toBe(value(b).transaction.id);
  });
  it.each(['APPROVED', 'DECLINED', 'ERROR', 'VOIDED'] as const)('applies %s atomically once and controls reads by owner', async status => {
    const { service, owner, store, gateway } = await setup(); gateway.status = status;
    const tx = value(await service.create(owner, randomUUID(), input)).transaction;
    const [first, repeated] = await Promise.all([service.pay(owner, tx.id, payment), service.pay(owner, tx.id, payment)]);
    expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(value(first).status).toBe(status);
    expect(value(await service.pay(owner, tx.id, payment)).status).toBe(status);
    expect(value(await service.transaction(owner, tx.id)).status).toBe(status);
    const p = (await store.get<Product>(keys.product(input.productId)))!.value;
    expect(p).toMatchObject({ stockOnHand: status === 'APPROVED' ? 11 : 12, stockAvailable: status === 'APPROVED' ? 11 : 12, stockReserved: 0 });
    const raw = (await store.get<Transaction>(keys.transaction(tx.id)))!.value;
    expect(value(await service.customer(owner, raw.customerId))).toMatchObject({ email: input.customer.email });
    expect(await service.customer('stranger', raw.customerId)).toMatchObject({ ok: false });
    expect(await service.transaction('stranger', tx.id)).toMatchObject({ ok: false });
    expect(await service.pay('stranger', tx.id, payment)).toMatchObject({ ok: false });
    if (status === 'APPROVED') {
      expect(value(await service.delivery(owner, raw.deliveryId!))).toMatchObject({ status: 'READY' });
      expect(await service.delivery('stranger', raw.deliveryId!)).toMatchObject({ ok: false });
    } else expect(raw.deliveryId).toBeNull();
    expect(await service.clearDraft(owner)).toEqual(ok(null));
  });
  it('holds uncertain submissions without releasing stock or charging again', async () => {
    const { service, owner, gateway, store, advance } = await setup();
    gateway.create.mockResolvedValue(fail('PAYMENT_UNCERTAIN', 'timeout', 503));
    const tx = value(await service.create(owner, randomUUID(), input)).transaction;
    expect(value(await service.pay(owner, tx.id, payment))).toMatchObject({ status: 'PENDING', submissionStatus: 'UNKNOWN', canPay: false });
    advance(3600000); await service.products();
    expect(value(await service.transaction(owner, tx.id)).status).toBe('PENDING');
    await service.pay(owner, tx.id, payment); expect(gateway.create).toHaveBeenCalledTimes(1);
    expect(await service.clearDraft(owner)).toMatchObject({ ok: false, error: { code: 'PAYMENT_IN_PROGRESS' } });
    expect((await store.get<Product>(keys.product(input.productId)))!.value.stockReserved).toBe(1);
  });
  it('reconciles a pending provider result once, tolerates unavailable and mismatched responses', async () => {
    const { service, owner, gateway } = await setup(); gateway.status = 'PENDING';
    const tx = value(await service.create(owner, randomUUID(), input)).transaction;
    expect(value(await service.pay(owner, tx.id, payment)).status).toBe('PENDING');
    gateway.get.mockResolvedValueOnce(fail('PAYMENT_UNCERTAIN', 'offline', 503));
    expect(value(await service.transaction(owner, tx.id)).status).toBe('PENDING');
    gateway.get.mockResolvedValueOnce(ok({ ...gateway.provider(gateway.last!), reference: 'OTHER' }));
    expect(value(await service.transaction(owner, tx.id)).status).toBe('PENDING');
    gateway.status = 'APPROVED';
    const [a, b] = await Promise.all([service.transaction(owner, tx.id), service.transaction(owner, tx.id)]);
    expect(value(a).delivery?.id).toBe(value(b).delivery?.id);
  });
  it('does not submit when unconfigured, releases definitive rejection and rejects mismatched amounts', async () => {
    const { service, owner, gateway } = await setup(); gateway.enabled = false;
    const tx = value(await service.create(owner, randomUUID(), input)).transaction;
    expect(await service.pay(owner, tx.id, payment)).toMatchObject({ ok: false, error: { code: 'PAYMENT_UNAVAILABLE' } });
    expect(gateway.create).not.toHaveBeenCalled();
    gateway.enabled = true; gateway.create.mockResolvedValue(fail('PAYMENT_REJECTED', 'bad token', 422));
    expect(value(await service.pay(owner, tx.id, payment)).status).toBe('ERROR');
    const tx2 = value(await service.create(owner, randomUUID(), input)).transaction;
    gateway.create.mockImplementationOnce(async raw => ok({ ...gateway.provider(raw), amountInCents: 1 }));
    expect(value(await service.pay(owner, tx2.id, payment)).submissionStatus).toBe('UNKNOWN');
  });
  it.each(['transaction', 'product', 'quote', 'replay', 'pay'] as const)('expires an unsubmitted reservation through %s', async route => {
    const { service, owner, advance, store, gateway } = await setup(), key = randomUUID();
    const tx = value(await service.create(owner, key, input)).transaction; advance(900001);
    if (route === 'transaction') await service.transaction(owner, tx.id);
    if (route === 'product') await service.product(input.productId);
    if (route === 'quote') await service.quote(input.productId, 1);
    if (route === 'replay') expect(value(await service.create(owner, key, input)).transaction.canPay).toBe(false);
    if (route === 'pay') expect(value(await service.pay(owner, tx.id, payment)).canPay).toBe(false);
    expect((await store.get<Transaction>(keys.transaction(tx.id)))!.value.status).toBe('ERROR');
    expect((await store.get<Product>(keys.product(input.productId)))!.value.stockAvailable).toBe(12);
    expect(gateway.create).not.toHaveBeenCalled();
    expect(value(await service.create(owner, randomUUID(), input)).created).toBe(true);
  });
  it('cancels safely and prevents a stale expiry observation from releasing a claimed payment', async () => {
    const { service, owner, store, advance } = await setup();
    const first = value(await service.create(owner, randomUUID(), input)).transaction;
    await service.clearDraft(owner); expect(value(await service.transaction(owner, first.id)).status).toBe('ERROR');
    const second = value(await service.create(owner, randomUUID(), input)).transaction;
    const stale = (await store.get<Transaction>(keys.transaction(second.id)))!;
    await store.commit([{ key: keys.transaction(second.id), expectedVersion: stale.version, value: { ...stale.value, submissionStatus: 'CLAIMED' } }]);
    jest.spyOn(store, 'pending').mockResolvedValue([stale]); advance(900001); await service.products();
    expect(value(await service.transaction(owner, second.id))).toMatchObject({ status: 'PENDING', submissionStatus: 'CLAIMED' });
    expect((await store.get<Product>(keys.product(input.productId)))!.value.stockReserved).toBe(1);
  });
  it('reports contention after bounded retries and propagates unexpected storage failure', async () => {
    const { service, store, owner } = await setup();
    const commit = jest.spyOn(store, 'commit').mockRejectedValue(new WriteConflict());
    expect(await service.create(owner, randomUUID(), input)).toMatchObject({ ok: false, error: { code: 'CONCURRENT_UPDATE' } });
    expect(commit).toHaveBeenCalledTimes(5);
    commit.mockRejectedValue(new Error('disk unavailable'));
    await expect(service.clearDraft(owner)).rejects.toThrow('disk unavailable');
  });
});

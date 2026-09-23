import { createHash } from 'node:crypto';
import { SandboxGateway } from '../src/infrastructure/payment/sandbox.gateway';
import { input, payment, setup, value } from './helpers';
import { keys, Transaction } from '../src/domain/models';
import { randomUUID } from 'node:crypto';

const env = { apiUrl: 'https://sandbox.wompi.co/v1', publicKey: 'pub_test_placeholder', privateKey: 'prv_test_placeholder', integritySecret: 'test-integrity-placeholder' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify({ data }), { status });
describe('genuine sandbox HTTP adapter contract', () => {
  it.each([
    {}, { ...env, apiUrl: 'https://production.wompi.co/v1' }, { ...env, publicKey: 'pub_prod_example' },
    { ...env, privateKey: 'prv_prod_example' }, { ...env, apiUrl: 'https://api-sandbox.co.uat.wompi.dev/v1' },
  ])('fails closed for absent credentials, production and mismatched environments', async invalid => {
    const http = jest.fn(), gateway = new SandboxGateway(invalid, http);
    expect(gateway.configured()).toBe(false); expect(await gateway.config()).toMatchObject({ ok: false, error: { code: 'PAYMENT_UNAVAILABLE' } }); expect(http).not.toHaveBeenCalled();
  });
  it('supports configured UAT and returns only public key plus two policies', async () => {
    const http = jest.fn().mockResolvedValue(json({ presigned_acceptance: { acceptance_token: 'terms', permalink: 'https://example.com/terms' }, presigned_personal_data_auth: { acceptance_token: 'personal', permalink: 'https://example.com/personal' } }));
    const gateway = new SandboxGateway({ ...env, apiUrl: 'https://api-sandbox.co.uat.wompi.dev/v1/', publicKey: 'pub_stagtest_placeholder', privateKey: 'prv_stagtest_placeholder' }, http);
    expect(gateway.configured()).toBe(true); const result = value(await gateway.config());
    expect(result.acceptance.personalData.token).toBe('personal'); expect(result).not.toHaveProperty('privateKey'); expect(JSON.stringify(result)).not.toContain(env.integritySecret);
    expect(http.mock.calls[0][0]).toMatch(/\/merchants\/info$/); expect(http.mock.calls[0][1].headers).toEqual({ 'x-merchant-public-key': 'pub_stagtest_placeholder' });
  });
  it('requires HTTPS policy links and complete acceptance metadata', async () => {
    const http = jest.fn().mockResolvedValueOnce(json({})).mockResolvedValueOnce(json({ presigned_acceptance: { acceptance_token: 'x', permalink: 'http://unsafe.test' }, presigned_personal_data_auth: {} }));
    const gateway = new SandboxGateway(env, http);
    expect(await gateway.config()).toMatchObject({ ok: false }); expect(await gateway.config()).toMatchObject({ ok: false });
  });
  it('signs immutable server amounts, uses private authentication and maps card variants', async () => {
    const { service, owner, store } = await setup(); const created = value(await service.create(owner, randomUUID(), input));
    const tx = (await store.get<Transaction>(keys.transaction(created.transaction.id)))!.value;
    const payload = { id: 'external', status: 'PENDING', reference: tx.reference, amount_in_cents: tx.amounts.totalInCents, currency: 'COP', payment_method: { extra: { brand: 'VISA', last_four: '4242' } } };
    const http = jest.fn().mockResolvedValueOnce(json(payload)).mockResolvedValueOnce(json({ ...payload, payment_method: { brand: 'MASTERCARD', last_four: '4444' } })).mockResolvedValueOnce(json({ ...payload, payment_method: {} }));
    const gateway = new SandboxGateway(env, http);
    expect(value(await gateway.create(tx, input.customer.email, payment)).card).toEqual({ brand: 'VISA', lastFour: '4242' });
    const outbound = JSON.parse(http.mock.calls[0][1].body);
    expect(outbound).toMatchObject({ amount_in_cents: 20350000, currency: 'COP', payment_method: { token: payment.cardToken, installments: 1, type: 'CARD' }, accept_personal_auth: payment.acceptPersonalAuth });
    expect(outbound.signature).toBe(createHash('sha256').update(`${tx.reference}20350000COP${env.integritySecret}`).digest('hex'));
    expect(outbound).not.toHaveProperty('pan'); expect(http.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${env.privateKey}`);
    expect(value(await gateway.get('id/with space')).card?.brand).toBe('MASTERCARD'); expect(http.mock.calls[1][0]).toContain('id%2Fwith%20space');
    expect(value(await gateway.get('id')).card).toBeNull();
  });
  it.each([400, 401, 403, 404, 422, 429, 500])('sanitizes HTTP %i and distinguishes ambiguous outcomes', async status => {
    const gateway = new SandboxGateway(env, jest.fn().mockResolvedValue(json({ secret: 'must-not-leak' }, status)));
    const result = await gateway.get('id'); expect(result).toMatchObject({ ok: false, error: { code: [429, 500].includes(status) ? 'PAYMENT_UNCERTAIN' : 'PAYMENT_REJECTED' } });
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
  });
  it.each([null, {}, { id: 'x', status: 'FAKE' }, { id: 'x', status: 'PENDING', reference: 'r', amount_in_cents: 1.5, currency: 'COP' }])('rejects malformed provider body %j', async payload => {
    const gateway = new SandboxGateway(env, jest.fn().mockResolvedValue(json(payload)));
    expect(await gateway.get('id')).toMatchObject({ ok: false, error: { code: 'PAYMENT_UNCERTAIN' } });
  });
  it('keeps TLS/network errors and invalid JSON uncertain without disabling verification', async () => {
    const http = jest.fn().mockRejectedValueOnce(new Error('SELF_SIGNED_CERT_IN_CHAIN')).mockResolvedValueOnce(new Response('invalid json'));
    const gateway = new SandboxGateway(env, http);
    expect(await gateway.get('id')).toMatchObject({ ok: false }); expect(await gateway.get('id')).toMatchObject({ ok: false });
    expect(http.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
});

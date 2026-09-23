import { createHash } from 'node:crypto';
import { PaymentGateway, PublicPaymentConfig } from '../../application/ports';
import { BASE_FEE, DELIVERY_FEE, PayInput, ProviderTransaction, Status, Transaction } from '../../domain/models';
import { fail, ok, Result } from '../../domain/result';

export interface PaymentEnvironment { apiUrl?: string; publicKey?: string; privateKey?: string; integritySecret?: string }
const SANDBOX_URLS = ['https://api-sandbox.co.uat.wompi.dev/v1', 'https://sandbox.wompi.co/v1'];
const STATES: Status[] = ['PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED'];
type Json = Record<string, any>;

/** No request/response payload logging: these payloads contain ephemeral tokens. */
export class SandboxGateway implements PaymentGateway {
  private readonly base: string;
  constructor(private readonly env: PaymentEnvironment, private readonly http: typeof fetch = fetch) {
    this.base = (env.apiUrl ?? '').replace(/\/$/, '');
  }
  configured(): boolean {
    if (!SANDBOX_URLS.includes(this.base) || !this.env.publicKey || !this.env.privateKey || !this.env.integritySecret) return false;
    const uat = this.base.includes('.uat.');
    return this.env.publicKey.startsWith(uat ? 'pub_stagtest_' : 'pub_test_') && this.env.privateKey.startsWith(uat ? 'prv_stagtest_' : 'prv_test_');
  }
  private async request(path: string, init: RequestInit): Promise<Result<Json>> {
    if (!this.configured()) return fail('PAYMENT_UNAVAILABLE', 'El servicio de pagos de prueba no está disponible.', 503);
    try {
      const response = await this.http(`${this.base}${path}`, { ...init, signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        const definitive = [400, 401, 403, 404, 422].includes(response.status);
        return fail(definitive ? 'PAYMENT_REJECTED' : 'PAYMENT_UNCERTAIN', 'No fue posible confirmar la respuesta del servicio de pagos.', definitive ? 422 : 503);
      }
      const body = await response.json();
      if (!body || typeof body !== 'object' || !body.data) return fail('PAYMENT_UNCERTAIN', 'No fue posible confirmar el pago.', 503);
      return ok(body as Json);
    } catch { return fail('PAYMENT_UNCERTAIN', 'No fue posible confirmar la conexión con el servicio de pagos.', 503); }
  }
  async config(): Promise<Result<PublicPaymentConfig>> {
    const response = await this.request('/merchants/info', { headers: { 'x-merchant-public-key': this.env.publicKey ?? '' } });
    if (!response.ok) return fail('PAYMENT_UNAVAILABLE', 'El servicio de pagos de prueba no está disponible.', 503);
    const terms = response.value.data.presigned_acceptance;
    const personal = response.value.data.presigned_personal_data_auth;
    const valid = (value: Json | undefined) => value && typeof value.acceptance_token === 'string' && typeof value.permalink === 'string' && value.permalink.startsWith('https://');
    if (!valid(terms) || !valid(personal)) return fail('PAYMENT_UNAVAILABLE', 'No podemos cargar las condiciones del pago.', 503);
    return ok({ environment: 'sandbox', paymentApiUrl: this.base, publicKey: this.env.publicKey!, currency: 'COP', baseFeeInCents: BASE_FEE, deliveryFeeInCents: DELIVERY_FEE,
      acceptance: { terms: { token: terms.acceptance_token, url: terms.permalink }, personalData: { token: personal.acceptance_token, url: personal.permalink } } });
  }
  private map(response: Result<Json>): Result<ProviderTransaction> {
    if (!response.ok) return response;
    const tx = response.value.data;
    if (typeof tx.id !== 'string' || !STATES.includes(tx.status) || typeof tx.reference !== 'string' || !Number.isSafeInteger(tx.amount_in_cents) || typeof tx.currency !== 'string') return fail('PAYMENT_UNCERTAIN', 'No fue posible confirmar el pago.', 503);
    const card = tx.payment_method?.extra ?? tx.payment_method;
    return ok({ id: tx.id, status: tx.status, reference: tx.reference, amountInCents: tx.amount_in_cents, currency: tx.currency,
      card: typeof card?.brand === 'string' && /^\d{4}$/.test(card?.last_four) ? { brand: card.brand, lastFour: card.last_four } : null });
  }
  async create(tx: Transaction, email: string, input: PayInput) {
    const signature = createHash('sha256').update(`${tx.reference}${tx.amounts.totalInCents}${tx.amounts.currency}${this.env.integritySecret ?? ''}`).digest('hex');
    return this.map(await this.request('/transactions', { method: 'POST', headers: { Authorization: `Bearer ${this.env.privateKey ?? ''}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_in_cents: tx.amounts.totalInCents, currency: tx.amounts.currency, reference: tx.reference, customer_email: email,
        signature, acceptance_token: input.acceptanceToken, accept_personal_auth: input.acceptPersonalAuth,
        payment_method: { type: 'CARD', token: input.cardToken, installments: input.installments } }) }));
  }
  async get(id: string) {
    return this.map(await this.request(`/transactions/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${this.env.privateKey ?? ''}` } }));
  }
}

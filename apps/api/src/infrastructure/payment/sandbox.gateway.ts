import { createHash } from "node:crypto";
import { PaymentGateway, PublicPaymentConfig } from "../../application/ports";
import {
  BASE_FEE,
  DELIVERY_FEE,
  PayInput,
  ProviderTransaction,
  Transaction,
} from "../../domain/models";
import { fail, ok, Result } from "../../domain/result";
import { acceptanceFrom, isRecord, transactionFrom } from "./sandbox-response";

export interface PaymentEnvironment {
  apiUrl?: string;
  publicKey?: string;
  privateKey?: string;
  integritySecret?: string;
}
const SANDBOX_URLS = [
  "https://api-sandbox.co.uat.wompi.dev/v1",
  "https://sandbox.wompi.co/v1",
];

/** No request/response payload logging: these payloads contain ephemeral tokens. */
export class SandboxGateway implements PaymentGateway {
  private readonly base: string;
  constructor(
    private readonly env: PaymentEnvironment,
    private readonly http: typeof fetch = fetch,
  ) {
    this.base = (env.apiUrl ?? "").replace(/\/$/, "");
  }
  configured(): boolean {
    if (
      !SANDBOX_URLS.includes(this.base) ||
      !this.env.publicKey ||
      !this.env.privateKey ||
      !this.env.integritySecret
    )
      return false;
    const uat = this.base.includes(".uat.");
    return (
      this.env.publicKey.startsWith(uat ? "pub_stagtest_" : "pub_test_") &&
      this.env.privateKey.startsWith(uat ? "prv_stagtest_" : "prv_test_")
    );
  }
  private async request(
    path: string,
    init: RequestInit,
  ): Promise<Result<Record<string, unknown>>> {
    if (!this.configured())
      return fail(
        "PAYMENT_UNAVAILABLE",
        "El servicio de pagos de prueba no está disponible.",
      );
    try {
      const response = await this.http(`${this.base}${path}`, {
        ...init,
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        const definitive = [400, 401, 403, 404, 422].includes(response.status);
        return fail(
          definitive ? "PAYMENT_REJECTED" : "PAYMENT_UNCERTAIN",
          "No fue posible confirmar la respuesta del servicio de pagos.",
        );
      }
      const body: unknown = await response.json();
      if (!isRecord(body) || !isRecord(body.data))
        return fail("PAYMENT_UNCERTAIN", "No fue posible confirmar el pago.");
      return ok(body.data);
    } catch {
      return fail(
        "PAYMENT_UNCERTAIN",
        "No fue posible confirmar la conexión con el servicio de pagos.",
      );
    }
  }
  async config(): Promise<Result<PublicPaymentConfig>> {
    const response = await this.request("/merchants/info", {
      headers: { "x-merchant-public-key": this.env.publicKey ?? "" },
    });
    if (!response.ok)
      return fail(
        "PAYMENT_UNAVAILABLE",
        "El servicio de pagos de prueba no está disponible.",
      );
    const acceptance = acceptanceFrom(response.value);
    if (!acceptance)
      return fail(
        "PAYMENT_UNAVAILABLE",
        "No podemos cargar las condiciones del pago.",
      );
    return ok({
      environment: "sandbox",
      paymentApiUrl: this.base,
      publicKey: this.env.publicKey!,
      currency: "COP",
      baseFeeInCents: BASE_FEE,
      deliveryFeeInCents: DELIVERY_FEE,
      acceptance,
    });
  }
  private map(
    response: Result<Record<string, unknown>>,
  ): Result<ProviderTransaction> {
    if (!response.ok) return response;
    const transaction = transactionFrom(response.value);
    if (!transaction)
      return fail("PAYMENT_UNCERTAIN", "No fue posible confirmar el pago.");
    return ok(transaction);
  }
  async create(tx: Transaction, email: string, input: PayInput) {
    const signature = createHash("sha256")
      .update(
        `${tx.reference}${tx.amounts.totalInCents}${tx.amounts.currency}${this.env.integritySecret ?? ""}`,
      )
      .digest("hex");
    return this.map(
      await this.request("/transactions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.privateKey ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_in_cents: tx.amounts.totalInCents,
          currency: tx.amounts.currency,
          reference: tx.reference,
          customer_email: email,
          signature,
          acceptance_token: input.acceptanceToken,
          accept_personal_auth: input.acceptPersonalAuth,
          payment_method: {
            type: "CARD",
            token: input.cardToken,
            installments: input.installments,
          },
        }),
      }),
    );
  }
  async get(id: string) {
    return this.map(
      await this.request(`/transactions/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${this.env.privateKey ?? ""}` },
      }),
    );
  }
}

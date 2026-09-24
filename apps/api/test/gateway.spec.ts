import { createHash } from "node:crypto";
import { SandboxGateway } from "../src/infrastructure/payment/sandbox.gateway";
import { input, payment, setup, value } from "./helpers";
import { keys, Product, Transaction } from "../src/domain/models";
import { randomUUID } from "node:crypto";
import { CheckoutService } from "../src/application/checkout.service";

const env = {
  apiUrl: "https://sandbox.wompi.co/v1",
  publicKey: "pub_test_placeholder",
  privateKey: "prv_test_placeholder",
  integritySecret: "test-integrity-placeholder",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ data }), { status });
const validTransaction = {
  id: "external",
  status: "PENDING",
  reference: "LUM-reference",
  amount_in_cents: 20350000,
  currency: "COP",
};
const validPolicy = {
  acceptance_token: "placeholder-token",
  permalink: "https://example.com/policy",
};
describe("genuine sandbox HTTP adapter contract", () => {
  it.each([
    {},
    { ...env, apiUrl: "https://production.wompi.co/v1" },
    { ...env, publicKey: "pub_prod_example" },
    { ...env, privateKey: "prv_prod_example" },
    { ...env, apiUrl: "https://api-sandbox.co.uat.wompi.dev/v1" },
  ])(
    "fails closed for absent credentials, production and mismatched environments",
    async (invalid) => {
      const http = jest.fn(),
        gateway = new SandboxGateway(invalid, http);
      expect(gateway.configured()).toBe(false);
      expect(await gateway.config()).toMatchObject({
        ok: false,
        error: { code: "PAYMENT_UNAVAILABLE" },
      });
      expect(http).not.toHaveBeenCalled();
    },
  );
  it("supports configured UAT and returns only public key plus two policies", async () => {
    const http = jest.fn().mockResolvedValue(
      json({
        presigned_acceptance: {
          acceptance_token: "terms",
          permalink: "https://example.com/terms",
        },
        presigned_personal_data_auth: {
          acceptance_token: "personal",
          permalink: "https://example.com/personal",
        },
      }),
    );
    const gateway = new SandboxGateway(
      {
        ...env,
        apiUrl: "https://api-sandbox.co.uat.wompi.dev/v1/",
        publicKey: "pub_stagtest_placeholder",
        privateKey: "prv_stagtest_placeholder",
      },
      http,
    );
    expect(gateway.configured()).toBe(true);
    const result = value(await gateway.config());
    expect(result.acceptance.personalData.token).toBe("personal");
    expect(result).not.toHaveProperty("privateKey");
    expect(JSON.stringify(result)).not.toContain(env.integritySecret);
    expect(http.mock.calls[0][0]).toMatch(/\/merchants\/info$/);
    expect(http.mock.calls[0][1].headers).toEqual({
      "x-merchant-public-key": "pub_stagtest_placeholder",
    });
  });
  it("requires HTTPS policy links and complete acceptance metadata", async () => {
    const http = jest
      .fn()
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(
        json({
          presigned_acceptance: {
            acceptance_token: "x",
            permalink: "http://unsafe.test",
          },
          presigned_personal_data_auth: {},
        }),
      );
    const gateway = new SandboxGateway(env, http);
    expect(await gateway.config()).toMatchObject({ ok: false });
    expect(await gateway.config()).toMatchObject({ ok: false });
  });
  it("signs immutable server amounts, uses private authentication and maps card variants", async () => {
    const { service, owner, store } = await setup();
    const created = value(await service.create(owner, randomUUID(), input));
    const tx = (await store.get<Transaction>(
      keys.transaction(created.transaction.id),
    ))!.value;
    const payload = {
      id: "external",
      status: "PENDING",
      reference: tx.reference,
      amount_in_cents: tx.amounts.totalInCents,
      currency: "COP",
      payment_method: { extra: { brand: "VISA", last_four: "4242" } },
    };
    const http = jest
      .fn()
      .mockResolvedValueOnce(json(payload))
      .mockResolvedValueOnce(
        json({
          ...payload,
          payment_method: { brand: "MASTERCARD", last_four: "4444" },
        }),
      )
      .mockResolvedValueOnce(json({ ...payload, payment_method: {} }));
    const gateway = new SandboxGateway(env, http);
    expect(
      value(await gateway.create(tx, input.customer.email, payment)).card,
    ).toEqual({ brand: "VISA", lastFour: "4242" });
    const outbound = JSON.parse(http.mock.calls[0][1].body);
    expect(outbound).toMatchObject({
      amount_in_cents: 20350000,
      currency: "COP",
      payment_method: {
        token: payment.cardToken,
        installments: 1,
        type: "CARD",
      },
      accept_personal_auth: payment.acceptPersonalAuth,
    });
    expect(outbound.signature).toBe(
      createHash("sha256")
        .update(`${tx.reference}20350000COP${env.integritySecret}`)
        .digest("hex"),
    );
    expect(outbound).not.toHaveProperty("pan");
    expect(http.mock.calls[0][1].headers.Authorization).toBe(
      `Bearer ${env.privateKey}`,
    );
    expect(value(await gateway.get("id/with space")).card?.brand).toBe(
      "MASTERCARD",
    );
    expect(http.mock.calls[1][0]).toContain("id%2Fwith%20space");
    expect(value(await gateway.get("id")).card).toBeNull();
  });
  it.each([400, 401, 403, 404, 422, 429, 500])(
    "sanitizes HTTP %i and distinguishes ambiguous outcomes",
    async (status) => {
      const gateway = new SandboxGateway(
        env,
        jest.fn().mockResolvedValue(json({ secret: "must-not-leak" }, status)),
      );
      const result = await gateway.get("id");
      expect(result).toMatchObject({
        ok: false,
        error: {
          code: [429, 500].includes(status)
            ? "PAYMENT_UNCERTAIN"
            : "PAYMENT_REJECTED",
        },
      });
      expect(JSON.stringify(result)).not.toContain("must-not-leak");
    },
  );
  it.each([
    null,
    {},
    { id: "x", status: "FAKE" },
    {
      id: "x",
      status: "PENDING",
      reference: "r",
      amount_in_cents: 1.5,
      currency: "COP",
    },
  ])("rejects malformed provider body %j", async (payload) => {
    const gateway = new SandboxGateway(
      env,
      jest.fn().mockResolvedValue(json(payload)),
    );
    expect(await gateway.get("id")).toMatchObject({
      ok: false,
      error: { code: "PAYMENT_UNCERTAIN" },
    });
  });
  it("keeps TLS/network errors and invalid JSON uncertain without disabling verification", async () => {
    const http = jest
      .fn()
      .mockRejectedValueOnce(new Error("SELF_SIGNED_CERT_IN_CHAIN"))
      .mockResolvedValueOnce(new Response("invalid json"));
    const gateway = new SandboxGateway(env, http);
    expect(await gateway.get("id")).toMatchObject({ ok: false });
    expect(await gateway.get("id")).toMatchObject({ ok: false });
    expect(http.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it("treats null, primitive and array envelopes or data as uncertain without throwing", async () => {
    const bodies: unknown[] = [null, [], "unexpected", 7, true, {}];
    for (const data of [null, [], "unexpected", 7, true]) bodies.push({ data });
    for (const body of bodies) {
      const gateway = new SandboxGateway(
        env,
        jest.fn().mockResolvedValue(new Response(JSON.stringify(body))),
      );
      expect(await gateway.get("external")).toMatchObject({
        ok: false,
        error: { code: "PAYMENT_UNCERTAIN" },
      });
      expect(await gateway.config()).toMatchObject({
        ok: false,
        error: { code: "PAYMENT_UNAVAILABLE" },
      });
    }
  });
  it("rejects invalid identity, state, reference, currency and minor-unit amounts", async () => {
    const invalid: Record<string, unknown>[] = [
      { id: null },
      { id: [] },
      { id: 1 },
      { id: "" },
      { id: " " },
      { id: "x".repeat(257) },
      { id: "external\n" },
      { status: null },
      { status: ["APPROVED"] },
      { status: 1 },
      { status: "approved" },
      { status: "SETTLED" },
      { reference: null },
      { reference: [] },
      { reference: 1 },
      { reference: "" },
      { reference: "\tref" },
      { reference: "r".repeat(257) },
      { amount_in_cents: null },
      { amount_in_cents: "20350000" },
      { amount_in_cents: [] },
      { amount_in_cents: -1 },
      { amount_in_cents: 0 },
      { amount_in_cents: 1.5 },
      { amount_in_cents: Number.MAX_SAFE_INTEGER + 1 },
      { currency: null },
      { currency: 1 },
      { currency: [] },
      { currency: "cop" },
      { currency: "" },
      { currency: "COP\n" },
    ];
    for (const fields of invalid) {
      const gateway = new SandboxGateway(
        env,
        jest.fn().mockResolvedValue(json({ ...validTransaction, ...fields })),
      );
      expect(await gateway.get("external")).toEqual({
        ok: false,
        error: {
          code: "PAYMENT_UNCERTAIN",
          message: "No fue posible confirmar el pago.",
        },
      });
    }
  });
  it("requires complete typed consent metadata and usable HTTPS URLs", async () => {
    const invalid: unknown[] = [
      null,
      [],
      "policy",
      1,
      {},
      { ...validPolicy, acceptance_token: [] },
      { ...validPolicy, acceptance_token: "" },
      { ...validPolicy, acceptance_token: "token\n" },
      { ...validPolicy, acceptance_token: "x".repeat(16385) },
      { ...validPolicy, permalink: 1 },
      { ...validPolicy, permalink: [] },
      { ...validPolicy, permalink: "" },
      { ...validPolicy, permalink: "https://" },
      { ...validPolicy, permalink: "https://invalid host" },
      { ...validPolicy, permalink: "http://example.com/policy" },
      { ...validPolicy, permalink: "https://user:password@example.com/policy" },
      { ...validPolicy, permalink: "https://user@example.com/policy" },
      { ...validPolicy, permalink: "https://example.com/" + "x".repeat(4096) },
    ];
    for (const policy of invalid) {
      for (const key of [
        "presigned_acceptance",
        "presigned_personal_data_auth",
      ]) {
        const gateway = new SandboxGateway(
          env,
          jest.fn().mockResolvedValue(
            json({
              presigned_acceptance: validPolicy,
              presigned_personal_data_auth: validPolicy,
              [key]: policy,
            }),
          ),
        );
        expect(await gateway.config()).toMatchObject({
          ok: false,
          error: { code: "PAYMENT_UNAVAILABLE" },
        });
      }
    }
  });
  it("retains only typed display metadata and never coerces malformed card data", async () => {
    const invalid: unknown[] = [
      undefined,
      null,
      [],
      "card",
      42,
      {},
      { extra: [] },
      { extra: "card" },
      { extra: 1 },
      { brand: ["VISA"], last_four: "4242" },
      { brand: 1, last_four: "4242" },
      { brand: "UNRECOGNIZED", last_four: "4242" },
      { brand: "VISA", last_four: 4242 },
      { brand: "VISA", last_four: ["4242"] },
      { brand: "VISA", last_four: "4242\n" },
      { brand: "VISA", last_four: "invalid" },
    ];
    for (const payment_method of invalid) {
      const gateway = new SandboxGateway(
        env,
        jest
          .fn()
          .mockResolvedValue(json({ ...validTransaction, payment_method })),
      );
      expect(value(await gateway.get("external"))).toMatchObject({
        status: "PENDING",
        card: null,
      });
    }
    for (const status of [
      "PENDING",
      "APPROVED",
      "DECLINED",
      "ERROR",
      "VOIDED",
    ]) {
      const gateway = new SandboxGateway(
        env,
        jest.fn().mockResolvedValue(
          json({
            ...validTransaction,
            status,
            payment_method: {
              extra: {
                brand: "AMEX",
                last_four: "0005",
                token: "must-not-persist",
              },
            },
          }),
        ),
      );
      expect(value(await gateway.get("external"))).toEqual({
        id: validTransaction.id,
        status,
        reference: validTransaction.reference,
        amountInCents: validTransaction.amount_in_cents,
        currency: "COP",
        card: { brand: "AMEX", lastFour: "0005" },
      });
    }
  });
  it("keeps malformed or mismatched approved responses uncertain with the reservation held", async () => {
    const changes: Record<string, unknown>[] = [
      { amount_in_cents: "20350000" },
      { reference: "another-order" },
      { amount_in_cents: 20350001 },
      { currency: "USD" },
    ];
    for (const fields of changes) {
      const { store, owner, runtime } = await setup();
      const http = jest.fn();
      const gateway = new SandboxGateway(env, http);
      const service = new CheckoutService(store, gateway, runtime);
      const created = value(await service.create(owner, randomUUID(), input));
      http.mockResolvedValue(
        json({
          ...validTransaction,
          reference: created.transaction.reference,
          status: "APPROVED",
          ...fields,
        }),
      );
      const first = value(
        await service.pay(owner, created.transaction.id, payment),
      );
      expect(first).toMatchObject({
        status: "PENDING",
        submissionStatus: "UNKNOWN",
        canPay: false,
        delivery: null,
      });
      expect(
        value(await service.pay(owner, created.transaction.id, payment)),
      ).toEqual(first);
      expect(http).toHaveBeenCalledTimes(1);
      expect(
        (await store.get<Product>(keys.product(input.productId)))!.value,
      ).toMatchObject({
        stockOnHand: 12,
        stockAvailable: 11,
        stockReserved: 1,
      });
      expect(
        [...store.records.keys()].some((key) => key.startsWith("DELIVERY#")),
      ).toBe(false);
    }
  });
});

import "reflect-metadata";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { createApp } from "../src/bootstrap/create-app";
import { input, payment, setup, value } from "./helpers";
import { requestProtection } from "../src/infrastructure/http/security";
import { CheckoutService } from "../src/application/checkout.service";
import { keys, Transaction } from "../src/domain/models";
import { DomainErrorCode, fail } from "../src/domain/result";

const ORIGIN = "http://localhost:5173";
describe("HTTP contract and security boundary", () => {
  let app: INestApplication;
  let setupResult: Awaited<ReturnType<typeof setup>>;
  let api: ReturnType<typeof request.agent>;
  let csrf: string;
  beforeAll(async () => {
    setupResult = await setup();
    app = await createApp({
      ...setupResult,
      env: { NODE_ENV: "test", ALLOWED_ORIGINS: ORIGIN },
    });
    api = request.agent(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
  });
  it("publishes health, catalog and meaningful OpenAPI schemas with safe headers", async () => {
    const health = await api.get("/api/health").expect(200);
    expect(health.body).toEqual({ data: { status: "ok" } });
    expect(health.headers["x-content-type-options"]).toBe("nosniff");
    expect(health.headers["x-powered-by"]).toBeUndefined();
    expect(health.headers["cache-control"]).toBe("no-store");
    expect(health.headers["x-request-id"]).toBeTruthy();
    const products = await api.get("/api/products").expect(200);
    expect(products.body.data[0].stock).toBe(12);
    await api.get(`/api/products/${input.productId}`).expect(200);
    await api.get("/api/products/missing").expect(404);
    const config = await api.get("/api/checkout/config").expect(200);
    expect(config.body.data.environment).toBe("sandbox");
    const docs = await api.get("/api/docs-json").expect(200);
    expect(docs.body.paths["/api/transactions"]).toBeDefined();
    expect(
      docs.body.components.schemas.CreateDto.properties.customer,
    ).toBeDefined();
    expect(docs.body.paths["/api/transactions"].post.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Idempotency-Key", required: true }),
      ]),
    );
    expect(docs.body.paths["/api/transactions"].post.security).toEqual(
      expect.arrayContaining([{ csrf: [] }]),
    );
    await api.get("/api/docs").expect(200);
  });
  it("rejects unknown origin/content type, bootstraps an HttpOnly session and protects CSRF", async () => {
    await api
      .post("/api/checkout/session")
      .set("Origin", "https://attacker.example")
      .send({})
      .expect(403);
    await api
      .post("/api/checkout/session")
      .set("Origin", ORIGIN)
      .set("Content-Type", "text/plain")
      .send("{}")
      .expect(415);
    await api.get("/api/checkout/session").expect(401);
    const created = await api
      .post("/api/checkout/session")
      .set("Origin", ORIGIN)
      .send({})
      .expect(201);
    expect(created.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(created.headers["set-cookie"][0]).toContain("SameSite=Lax");
    expect(created.headers["set-cookie"][0]).toContain("Path=/api");
    csrf = created.body.data.csrfToken;
    await api
      .post("/api/checkout/session")
      .set("Origin", ORIGIN)
      .send({})
      .expect(200);
    const restored = await api.get("/api/checkout/session").expect(200);
    expect(restored.body.data.csrfToken).toBe(csrf);
    await api
      .post("/api/checkout/quote")
      .set("Origin", ORIGIN)
      .send({ productId: input.productId, quantity: 1 })
      .expect(403);
    await api
      .post("/api/checkout/quote")
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", "z".repeat(csrf.length))
      .send({ productId: input.productId, quantity: 1 })
      .expect(403);
    await api
      .post("/api/checkout/quote")
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({ productId: input.productId, quantity: 1 })
      .expect(200);
  });
  it("validates nested DTOs, rejects card and forged fields and restores partial drafts", async () => {
    const post = () =>
      api
        .post("/api/transactions")
        .set("Origin", ORIGIN)
        .set("X-CSRF-Token", csrf)
        .set("Idempotency-Key", randomUUID());
    const invalid = await post()
      .send({
        ...input,
        customer: { ...input.customer, email: "bad", pan: "fake-card-data" },
        status: "APPROVED",
      })
      .expect(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(invalid.body)).not.toContain("fake-card-data");
    await post()
      .send({ ...input, delivery: { ...input.delivery, postalCode: "x" } })
      .expect(400);
    await post()
      .send({ ...input, quantity: 2 })
      .expect(400);
    const draft = {
      productId: input.productId,
      quantity: 1,
      step: "DETAILS",
      customer: { fullName: "Demo", email: "" },
      delivery: { addressLine1: "", postalCode: "" },
    };
    await api
      .put("/api/checkout/draft")
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send(draft)
      .expect(200);
    const restored = await api.get("/api/checkout/session").expect(200);
    expect(restored.body.data.draft).toEqual(draft);
    await api
      .put("/api/checkout/draft")
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({ ...draft, cvc: "secret" })
      .expect(400);
    await api
      .put("/api/checkout/draft")
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .set("Content-Type", "application/json")
      .send("{broken")
      .expect(400);
    await api
      .put("/api/checkout/draft")
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({ huge: "x".repeat(34000) })
      .expect(413);
  });
  it("creates PENDING before sending payment, protects IDs and returns terminal result without another charge", async () => {
    await api
      .post("/api/transactions")
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send(input)
      .expect(400);
    const key = randomUUID();
    const first = await api
      .post("/api/transactions")
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .set("Idempotency-Key", key)
      .send({
        ...input,
        customer: { ...input.customer, phone: "+57 3000000000" },
      })
      .expect(201);
    expect(first.body.data).toMatchObject({ status: "PENDING", canPay: true });
    expect(first.headers.location).toContain(first.body.data.id);
    expect(setupResult.gateway.create).not.toHaveBeenCalled();
    const replay = await api
      .post("/api/transactions")
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .set("Idempotency-Key", key)
      .send(input)
      .expect(200);
    expect(replay.body.data.id).toBe(first.body.data.id);
    const id = first.body.data.id;
    const outsider = request.agent(app.getHttpServer());
    await outsider
      .post("/api/checkout/session")
      .set("Origin", ORIGIN)
      .send({})
      .expect(201);
    await outsider.get(`/api/transactions/${id}`).expect(404);
    await api
      .post(`/api/transactions/${id}/pay`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send({ ...payment, installments: 0 })
      .expect(400);
    const paid = await api
      .post(`/api/transactions/${id}/pay`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send(payment)
      .expect(200);
    expect(paid.body.data.status).toBe("APPROVED");
    await api
      .post(`/api/transactions/${id}/pay`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send(payment)
      .expect(200);
    expect(setupResult.gateway.create).toHaveBeenCalledTimes(1);
    await api.get(`/api/transactions/${id}`).expect(200);
    const tx = (await setupResult.store.get<Transaction>(keys.transaction(id)))!
      .value;
    await api.get(`/api/customers/${tx.customerId}`).expect(200);
    await outsider.get(`/api/customers/${tx.customerId}`).expect(404);
    await api.get(`/api/deliveries/${tx.deliveryId}`).expect(200);
    await outsider.get(`/api/deliveries/${tx.deliveryId}`).expect(404);
    await api
      .delete("/api/checkout/draft")
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .expect(204);
    expect((await api.get("/api/products")).body.data[0].stock).toBe(11);
  });
  it("returns 202 for pending and sanitizes unforeseen failures", async () => {
    setupResult.gateway.status = "PENDING";
    const tx = await api
      .post("/api/transactions")
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .set("Idempotency-Key", randomUUID())
      .send(input)
      .expect(201);
    await api
      .post(`/api/transactions/${tx.body.data.id}/pay`)
      .set("Origin", ORIGIN)
      .set("X-CSRF-Token", csrf)
      .send(payment)
      .expect(202);
    setupResult.gateway.config.mockRejectedValueOnce(
      new Error("secret stack details"),
    );
    const failed = await api.get("/api/checkout/config").expect(500);
    expect(failed.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(failed.body)).not.toContain("secret");
    await api.get("/api/missing-route").expect(404);
  });
  it("preserves the public status and sanitized envelope for every business failure", async () => {
    const cases: [DomainErrorCode, number][] = [
      ["NOT_FOUND", 404],
      ["INVALID_QUANTITY", 422],
      ["OUT_OF_STOCK", 409],
      ["INVALID_PRICE", 503],
      ["CONCURRENT_UPDATE", 409],
      ["SESSION_EXPIRED", 401],
      ["PAYMENT_IN_PROGRESS", 409],
      ["IDEMPOTENCY_CONFLICT", 409],
      ["PRICE_CHANGED", 409],
      ["DATA_UNAVAILABLE", 503],
      ["INVENTORY_UNAVAILABLE", 503],
      ["PAYMENT_UNAVAILABLE", 503],
      ["PAYMENT_REJECTED", 422],
      ["PAYMENT_UNCERTAIN", 503],
    ];
    const products = jest.spyOn(app.get(CheckoutService), "products");
    try {
      for (const [code, status] of cases) {
        const result = fail(code, "Mensaje seguro de negocio.");
        expect(result).toEqual({
          ok: false,
          error: { code, message: "Mensaje seguro de negocio." },
        });
        products.mockResolvedValueOnce(result);
        const response = await api.get("/api/products").expect(status);
        expect(response.body).toEqual({
          error: {
            code,
            message: "Mensaje seguro de negocio.",
            requestId: response.headers["x-request-id"],
          },
        });
      }
    } finally {
      products.mockRestore();
    }
  });
});

describe("bootstrap and rate-limit configuration", () => {
  it("rejects unsafe production persistence and short session secrets", async () => {
    await expect(
      createApp({ env: { NODE_ENV: "production" } }),
    ).rejects.toThrow("SESSION_SECRET");
    await expect(
      createApp({
        env: { NODE_ENV: "production", SESSION_SECRET: "a".repeat(32) },
      }),
    ).rejects.toThrow("DynamoDB");
  });
  it("limits bursts, expires counters and handles non-sensitive traffic independently", () => {
    let now = 0;
    const protect = requestProtection([ORIGIN], () => now);
    const next = jest.fn();
    const response: any = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const req: any = {
      path: "/api/checkout/session",
      method: "GET",
      ip: "test",
      header: () => ORIGIN,
      is: () => true,
    };
    for (let i = 0; i < 41; i++) protect(req, response, next);
    expect(response.status).toHaveBeenCalledWith(429);
    expect(next).toHaveBeenCalledTimes(40);
    now = 60001;
    protect(req, response, next);
    expect(next).toHaveBeenCalledTimes(41);
    req.path = "/api/products";
    protect(req, response, next);
    expect(next).toHaveBeenCalledTimes(42);
    req.method = "POST";
    req.header = () => undefined;
    protect(req, response, next);
    expect(response.status).toHaveBeenCalledWith(403);
  });
});

import {
  api,
  ApiError,
  errorMessage,
  readPointer,
  tokenize,
  writePointer,
} from "./api";
import {
  card,
  config,
  draft,
  product,
  quote,
  session,
  transaction,
} from "./test/fixtures";
import type { SafePointer } from "./types";

const fetchMock = jest.fn();
const respond = (data: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce({
    ok: status < 400,
    status,
    json: async () => ({ data }),
  });
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});
describe("HTTP transport and sandbox isolation", () => {
  test("bootstraps CSRF then submits only contract fields", async () => {
    respond(session);
    expect(await api.session()).toEqual(session);
    respond([product]);
    expect(await api.products()).toEqual([product]);
    respond(config);
    expect(await api.config()).toEqual(config);
    respond({ draft });
    await api.saveDraft(draft);
    respond(quote);
    await api.quote(product.id);
    respond(transaction);
    await api.create(
      { ...draft, customer: { ...draft.customer, phone: "+57 3000000000" } },
      quote.amounts.totalInCents,
      "stable-id",
    );
    respond(transaction, 202);
    await api.pay(transaction.id, "tok_test", 3, config);
    respond(transaction);
    await api.transaction(transaction.id);
    respond(undefined, 204);
    await api.clearDraft();
    expect(fetchMock.mock.calls[3][1].headers["X-CSRF-Token"]).toBe(
      session.csrfToken,
    );
    expect(fetchMock.mock.calls[5][1].headers["Idempotency-Key"]).toBe(
      "stable-id",
    );
    const body = JSON.parse(fetchMock.mock.calls[5][1].body);
    expect(body.expectedTotalInCents).toBe(20350000);
    expect(body.customer.phone).toBe("3000000000");
    expect(body).not.toHaveProperty("amount");
    expect(JSON.parse(fetchMock.mock.calls[6][1].body)).toEqual({
      cardToken: "tok_test",
      installments: 3,
      acceptanceToken: "terms_fixture",
      acceptPersonalAuth: "data_fixture",
    });
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
  });
  test("sanitizes network and malformed responses, preserves structured errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("private stack"));
    await expect(api.products()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
    fetchMock.mockResolvedValueOnce({
      status: 409,
      ok: false,
      json: async () => ({
        error: {
          code: "OUT_OF_STOCK",
          message: "Agotado",
          fields: { productId: "Agotado" },
        },
      }),
    });
    await expect(api.quote("a")).rejects.toMatchObject({
      code: "OUT_OF_STOCK",
      message: "Agotado",
      status: 409,
    });
    fetchMock.mockResolvedValueOnce({
      status: 503,
      ok: false,
      json: async () => ({}),
    });
    await expect(api.config()).rejects.toMatchObject({
      code: "REQUEST_FAILED",
    });
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ broken: true }),
    });
    await expect(api.products()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => null,
    });
    await expect(api.products()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
  test.each([
    { environment: "production" },
    { paymentApiUrl: "https://production.example/v1" },
    { publicKey: "secret_unsafe" },
    {
      acceptance: {
        ...config.acceptance,
        terms: { token: "", url: "https://example.com" },
      },
    },
    {
      acceptance: {
        ...config.acceptance,
        terms: { token: "fixture", url: "javascript:alert(1)" },
      },
    },
  ])("rejects unsafe public configuration %s", async (update) => {
    respond({ ...config, ...update });
    await expect(api.config()).rejects.toBeInstanceOf(ApiError);
  });
  test("card data goes only to allowlisted sandbox, token stays ephemeral", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "CREATED", data: { id: "tok_test_demo" } }),
    });
    expect(await tokenize(card, config)).toBe("tok_test_demo");
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${config.paymentApiUrl}/tokens/cards`);
    expect(options.credentials).toBe("omit");
    expect(JSON.parse(options.body)).toEqual({
      number: "4242424242424242",
      cvc: "123",
      exp_month: "12",
      exp_year: "39",
      card_holder: "Cliente Demo",
    });
    expect(localStorage.length).toBe(0);
  });
  test("tokenization errors never expose provider payload or imply payment success", async () => {
    await expect(
      tokenize(card, {
        ...config,
        paymentApiUrl: "https://production.example",
      }),
    ).rejects.toMatchObject({ code: "PAYMENT_UNAVAILABLE" });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "provider-private-message" }),
    });
    await expect(tokenize(card, config)).rejects.toMatchObject({
      code: "TOKENIZATION_FAILED",
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "CREATED", data: {} }),
    });
    await expect(tokenize(card, config)).rejects.toMatchObject({
      code: "TOKENIZATION_FAILED",
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ERROR", data: { id: "x" } }),
    });
    await expect(tokenize(card, config)).rejects.toMatchObject({
      code: "TOKENIZATION_FAILED",
    });
    fetchMock.mockRejectedValueOnce(new Error("network"));
    await expect(tokenize(card, config)).rejects.toMatchObject({
      code: "PAYMENT_UNAVAILABLE",
    });
  });
  test("HTTP and tokenization have bounded waiting time", async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener("abort", () =>
            reject(new Error("aborted")),
          ),
        ),
    );
    const requests = Promise.allSettled([
      api.products(),
      tokenize(card, config),
    ]);
    await jest.advanceTimersByTimeAsync(20000);
    expect(
      (await requests).every((result) => result.status === "rejected"),
    ).toBe(true);
    jest.useRealTimers();
  });
});
describe("safe progress pointers", () => {
  const pointer: SafePointer = {
    version: 1,
    productId: product.id,
    step: "SUMMARY",
    transactionId: null,
    idempotencyKey: "uuid-fixture",
  };
  test("round trips only explicitly safe fields", () => {
    expect(readPointer()).toBeNull();
    writePointer({ ...pointer, email: "private@example.com" } as SafePointer);
    expect(readPointer()).toEqual(pointer);
    expect(localStorage.getItem("lumen.checkout.v1")).not.toContain("private");
  });
  test.each([
    "broken",
    "null",
    JSON.stringify({ ...pointer, version: 2 }),
    JSON.stringify({ ...pointer, step: "INVALID" }),
    JSON.stringify({ ...pointer, productId: "<script>" }),
    JSON.stringify({ ...pointer, cardNumber: "unsafe" }),
  ])("rejects corrupt/untrusted pointer %s", (raw) => {
    localStorage.setItem("lumen.checkout.v1", raw);
    expect(readPointer()).toBeNull();
  });
  test("storage policies do not crash checkout", () => {
    const get = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(readPointer()).toBeNull();
    get.mockRestore();
    const set = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(() => writePointer(pointer)).not.toThrow();
    set.mockRestore();
    expect(errorMessage(new Error("Readable"))).toBe("Readable");
    expect(errorMessage(null)).toContain("Vuelve a intentar");
  });
});

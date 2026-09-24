import type {
  CardInput,
  CheckoutConfig,
  Draft,
  Product,
  Quote,
  SafePointer,
  Session,
  Transaction,
} from "./types";
import { digits, normalizePhone } from "./validation";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
let csrfToken = "";
const storageKey = "lumen.checkout.v1";
const sandboxUrls = new Set([
  "https://api-sandbox.co.uat.wompi.dev/v1",
  "https://sandbox.wompi.co/v1",
]);

async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        ...(method !== "GET"
          ? { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }
          : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 204) return undefined as T;
    const result = await response.json();
    if (!response.ok)
      throw new ApiError(
        result.error?.code ?? "REQUEST_FAILED",
        result.error?.message ?? "No pudimos completar la solicitud.",
        response.status,
        result.error?.fields,
      );
    if (!result || !("data" in result))
      throw new ApiError(
        "INVALID_RESPONSE",
        "Recibimos una respuesta incompleta. Vuelve a consultar.",
      );
    return result.data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "NETWORK_ERROR",
      "No pudimos conectar. Comprueba tu conexión e inténtalo de nuevo.",
    );
  } finally {
    window.clearTimeout(timer);
  }
}

export const api = {
  products: () => request<Product[]>("/products"),
  config: async () => {
    const config = await request<CheckoutConfig>("/checkout/config");
    if (
      config.environment !== "sandbox" ||
      !sandboxUrls.has(config.paymentApiUrl) ||
      !config.publicKey.startsWith("pub_")
    )
      throw new ApiError(
        "PAYMENT_UNAVAILABLE",
        "El pago de prueba no está disponible en este momento.",
      );
    for (const item of [
      config.acceptance.terms,
      config.acceptance.personalData,
    ]) {
      if (!item.token || !item.url.startsWith("https://"))
        throw new ApiError(
          "PAYMENT_UNAVAILABLE",
          "No pudimos obtener los documentos de aceptación.",
        );
    }
    return config;
  },
  session: async () => {
    const session = await request<Session>("/checkout/session", "POST", {});
    csrfToken = session.csrfToken;
    return session;
  },
  saveDraft: (draft: Draft) =>
    request<{ draft: Draft }>("/checkout/draft", "PUT", draft),
  clearDraft: () => request<void>("/checkout/draft", "DELETE"),
  quote: (productId: string) =>
    request<Quote>("/checkout/quote", "POST", { productId, quantity: 1 }),
  create: (draft: Draft, total: number, key: string) =>
    request<Transaction>(
      "/transactions",
      "POST",
      {
        productId: draft.productId,
        quantity: 1,
        expectedTotalInCents: total,
        customer: {
          ...draft.customer,
          phone: normalizePhone(draft.customer.phone ?? ""),
        },
        delivery: draft.delivery,
      },
      { "Idempotency-Key": key },
    ),
  pay: (
    id: string,
    cardToken: string,
    installments: number,
    config: CheckoutConfig,
  ) =>
    request<Transaction>(
      `/transactions/${encodeURIComponent(id)}/pay`,
      "POST",
      {
        cardToken,
        installments,
        acceptanceToken: config.acceptance.terms.token,
        acceptPersonalAuth: config.acceptance.personalData.token,
      },
    ),
  transaction: (id: string) =>
    request<Transaction>(`/transactions/${encodeURIComponent(id)}`),
};

/** This call goes directly to the sandbox. No card data crosses our API or Redux. */
export async function tokenize(
  card: CardInput,
  config: CheckoutConfig,
): Promise<string> {
  if (
    config.environment !== "sandbox" ||
    !sandboxUrls.has(config.paymentApiUrl)
  )
    throw new ApiError(
      "PAYMENT_UNAVAILABLE",
      "El pago de prueba no está disponible.",
    );
  const [month, year] = card.expiry.split("/");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${config.paymentApiUrl}/tokens/cards`, {
      method: "POST",
      credentials: "omit",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.publicKey}`,
      },
      body: JSON.stringify({
        number: digits(card.number),
        cvc: card.cvc,
        exp_month: month,
        exp_year: year,
        card_holder: card.holder.trim(),
      }),
    });
    const result = await response.json();
    if (
      !response.ok ||
      result.status !== "CREATED" ||
      typeof result.data?.id !== "string"
    )
      throw new ApiError(
        "TOKENIZATION_FAILED",
        "No pudimos validar la tarjeta. Revisa los datos o intenta de nuevo.",
      );
    return result.data.id;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "PAYMENT_UNAVAILABLE",
      "El proveedor de pruebas no está disponible. Tu pago no se ha enviado.",
    );
  } finally {
    window.clearTimeout(timer);
  }
}

export function readPointer(): SafePointer | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as SafePointer;
    const validId = (id: unknown) =>
      id === null || (typeof id === "string" && /^[\w-]{1,100}$/.test(id));
    if (
      value.version !== 1 ||
      !["PRODUCT", "DETAILS", "SUMMARY", "RESULT"].includes(value.step) ||
      ![value.productId, value.transactionId, value.idempotencyKey].every(
        validId,
      ) ||
      Object.keys(value).some(
        (key) =>
          ![
            "version",
            "productId",
            "step",
            "transactionId",
            "idempotencyKey",
          ].includes(key),
      )
    ) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
export function writePointer(pointer: SafePointer): void {
  try {
    // Enumerate the only safe fields even if a caller passes an object with extras.
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        productId: pointer.productId,
        step: pointer.step,
        transactionId: pointer.transactionId,
        idempotencyKey: pointer.idempotencyKey,
      }),
    );
  } catch {
    /* Private browsing/storage policies do not prevent checkout. */
  }
}
export function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  )
    return error.message;
  return "No pudimos completar la solicitud. Vuelve a intentar.";
}

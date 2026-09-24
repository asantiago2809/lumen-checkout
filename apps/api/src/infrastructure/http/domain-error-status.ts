import { DomainErrorCode } from "../../domain/result";

// Every business failure is translated at the transport boundary. Adding a
// domain code requires an explicit HTTP contract decision here.
export const DOMAIN_ERROR_STATUS = {
  NOT_FOUND: 404,
  INVALID_QUANTITY: 422,
  OUT_OF_STOCK: 409,
  INVALID_PRICE: 503,
  CONCURRENT_UPDATE: 409,
  SESSION_EXPIRED: 401,
  PAYMENT_IN_PROGRESS: 409,
  IDEMPOTENCY_CONFLICT: 409,
  PRICE_CHANGED: 409,
  DATA_UNAVAILABLE: 503,
  INVENTORY_UNAVAILABLE: 503,
  PAYMENT_UNAVAILABLE: 503,
  PAYMENT_REJECTED: 422,
  PAYMENT_UNCERTAIN: 503,
} satisfies Record<DomainErrorCode, number>;

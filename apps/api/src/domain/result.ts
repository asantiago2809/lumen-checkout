export type DomainErrorCode =
  | "NOT_FOUND"
  | "INVALID_QUANTITY"
  | "OUT_OF_STOCK"
  | "INVALID_PRICE"
  | "CONCURRENT_UPDATE"
  | "SESSION_EXPIRED"
  | "PAYMENT_IN_PROGRESS"
  | "IDEMPOTENCY_CONFLICT"
  | "PRICE_CHANGED"
  | "DATA_UNAVAILABLE"
  | "INVENTORY_UNAVAILABLE"
  | "PAYMENT_UNAVAILABLE"
  | "PAYMENT_REJECTED"
  | "PAYMENT_UNCERTAIN";

export type DomainError = {
  code: DomainErrorCode;
  message: string;
  fields?: Record<string, string>;
};
export type Result<T> =
  { ok: true; value: T } | { ok: false; error: DomainError };
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (
  code: DomainErrorCode,
  message: string,
): Result<never> => ({ ok: false, error: { code, message } });
export function andThen<A, B>(
  result: Result<A>,
  next: (value: A) => Result<B>,
): Result<B> {
  return result.ok ? next(result.value) : result;
}

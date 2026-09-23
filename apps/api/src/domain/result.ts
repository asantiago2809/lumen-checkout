export type DomainError = {
  code: string;
  message: string;
  httpStatus: number;
  fields?: Record<string, string>;
};
export type Result<T> =
  { ok: true; value: T } | { ok: false; error: DomainError };
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (
  code: string,
  message: string,
  httpStatus = 400,
): Result<never> => ({ ok: false, error: { code, message, httpStatus } });
export function andThen<A, B>(
  result: Result<A>,
  next: (value: A) => Result<B>,
): Result<B> {
  return result.ok ? next(result.value) : result;
}

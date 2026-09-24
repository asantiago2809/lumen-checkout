import { PublicPaymentConfig } from "../../application/ports";
import { ProviderTransaction, Status } from "../../domain/models";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    value.trim() === value &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function isStatus(value: unknown): value is Status {
  return (
    value === "PENDING" ||
    value === "APPROVED" ||
    value === "DECLINED" ||
    value === "ERROR" ||
    value === "VOIDED"
  );
}

function policy(
  value: unknown,
): PublicPaymentConfig["acceptance"]["terms"] | null {
  if (
    !isRecord(value) ||
    !isText(value.acceptance_token, 16384) ||
    !isText(value.permalink, 4096)
  )
    return null;
  try {
    const url = new URL(value.permalink);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return { token: value.acceptance_token, url: value.permalink };
  } catch {
    return null;
  }
}

export function acceptanceFrom(
  data: Record<string, unknown>,
): PublicPaymentConfig["acceptance"] | null {
  const terms = policy(data.presigned_acceptance);
  const personalData = policy(data.presigned_personal_data_auth);
  return terms && personalData ? { terms, personalData } : null;
}

function cardFrom(value: unknown): ProviderTransaction["card"] {
  if (!isRecord(value)) return null;
  const card = value.extra ?? value;
  // Card metadata is optional. Invalid metadata cannot change a payment's
  // state, and only the display brand and four terminal digits are retained.
  if (
    !isRecord(card) ||
    (card.brand !== "VISA" &&
      card.brand !== "MASTERCARD" &&
      card.brand !== "AMEX") ||
    typeof card.last_four !== "string" ||
    !/^\d{4}$/.test(card.last_four)
  )
    return null;
  return { brand: card.brand, lastFour: card.last_four };
}

export function transactionFrom(
  data: Record<string, unknown>,
): ProviderTransaction | null {
  if (
    !isText(data.id, 256) ||
    !isStatus(data.status) ||
    !isText(data.reference, 256) ||
    typeof data.amount_in_cents !== "number" ||
    !Number.isSafeInteger(data.amount_in_cents) ||
    data.amount_in_cents <= 0 ||
    typeof data.currency !== "string" ||
    !/^[A-Z]{3}$/.test(data.currency)
  )
    return null;
  return {
    id: data.id,
    status: data.status,
    reference: data.reference,
    amountInCents: data.amount_in_cents,
    currency: data.currency,
    card: cardFrom(data.payment_method),
  };
}

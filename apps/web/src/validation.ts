import type { CardInput, Draft } from "./types";

export const digits = (value: string) => value.replace(/\D/g, "");
export function cardBrand(value: string): "Visa" | "Mastercard" | null {
  const number = digits(value);
  if (/^4/.test(number)) return "Visa";
  if (
    /^5[1-5]/.test(number) ||
    (number.length >= 4 &&
      +number.slice(0, 4) >= 2221 &&
      +number.slice(0, 4) <= 2720)
  )
    return "Mastercard";
  return null;
}
export function luhn(value: string): boolean {
  const number = digits(value);
  if (!/^\d{13,19}$/.test(number)) return false;
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i -= 1) {
    let n = Number(number[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}
export const formatCardNumber = (value: string) =>
  digits(value)
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
export const formatExpiry = (value: string) =>
  digits(value)
    .slice(0, 4)
    .replace(/^(\d{2})(\d)/, "$1/$2");
export const normalizePhone = (value: string) =>
  digits(value).replace(/^57(?=\d{10}$)/, "");

export function validateCard(
  card: CardInput,
  now = new Date(),
): Record<string, string> {
  const errors: Record<string, string> = {};
  const number = digits(card.number);
  const brand = cardBrand(number);
  if (!brand)
    errors.number = number
      ? "Usa una tarjeta Visa o Mastercard."
      : "Ingresa un número de tarjeta válido.";
  else if (
    !luhn(number) ||
    (brand === "Mastercard"
      ? number.length !== 16
      : ![13, 16, 19].includes(number.length))
  )
    errors.number = "Ingresa un número de tarjeta válido.";
  if (card.holder.trim().length < 2 || card.holder.trim().length > 100)
    errors.holder = "Ingresa el nombre del titular (2 a 100 caracteres).";
  const expiry = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(card.expiry);
  if (!expiry) errors.expiry = "Ingresa el vencimiento en formato MM/AA.";
  else if (
    2000 + Number(expiry[2]) < now.getFullYear() ||
    (2000 + Number(expiry[2]) === now.getFullYear() &&
      Number(expiry[1]) < now.getMonth() + 1)
  )
    errors.expiry = "La tarjeta está vencida.";
  if (!/^\d{3}$/.test(card.cvc))
    errors.cvc = "Ingresa los 3 dígitos del código de seguridad.";
  if (
    !/^\d+$/.test(card.installments) ||
    +card.installments < 1 ||
    +card.installments > 36
  )
    errors.installments = "Elige entre 1 y 36 cuotas.";
  return errors;
}
export function validateDraft(draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  const { customer, delivery } = draft;
  const length = (value: string | undefined, min: number, max: number) =>
    (value?.trim().length ?? 0) >= min && (value?.trim().length ?? 0) <= max;
  if (!length(customer.fullName, 2, 100))
    errors.fullName = "Ingresa el nombre de quien recibe (2 a 100 caracteres).";
  if (
    !customer.email ||
    customer.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())
  )
    errors.email = "Ingresa un correo válido.";
  if (!/^\d{10}$/.test(normalizePhone(customer.phone ?? "")))
    errors.phone = "Ingresa un teléfono colombiano de 10 dígitos.";
  if (!length(delivery.addressLine1, 5, 160))
    errors.addressLine1 =
      "Ingresa la dirección de entrega (5 a 160 caracteres).";
  if ((delivery.addressLine2?.length ?? 0) > 100)
    errors.addressLine2 = "Usa hasta 100 caracteres en el complemento.";
  if (!length(delivery.city, 2, 80))
    errors.city = "Ingresa la ciudad (2 a 80 caracteres).";
  if (!length(delivery.region, 2, 80))
    errors.region = "Ingresa el departamento (2 a 80 caracteres).";
  return errors;
}
export function money(cents: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

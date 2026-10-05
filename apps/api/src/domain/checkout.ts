import {
  Amounts,
  BASE_FEE,
  DELIVERY_FEE,
  Product,
  Transaction,
  VAT_RATE_PERCENT,
} from "./models";
import { andThen, fail, ok, Result } from "./result";

export function quote(
  product: Product | null,
  quantity: number,
): Result<Amounts> {
  return andThen(
    product ? ok(product) : fail("NOT_FOUND", "El producto no existe."),
    (p) =>
      andThen(
        quantity === 1
          ? ok(p)
          : fail("INVALID_QUANTITY", "Compra una unidad por pedido."),
        (valid) => {
          if (valid.stockAvailable < quantity)
            return fail("OUT_OF_STOCK", "Este producto está agotado.");
          if (
            !Number.isSafeInteger(valid.priceInCents) ||
            valid.priceInCents < 1
          )
            return fail("INVALID_PRICE", "El precio no está disponible.");
          // Tax only the product subtotal. Integer arithmetic rounds half a
          // cent upward without floating-point multiplication drift.
          const subtotal = BigInt(valid.priceInCents);
          const vat = (subtotal * BigInt(VAT_RATE_PERCENT) + 50n) / 100n;
          const total =
            subtotal + vat + BigInt(BASE_FEE) + BigInt(DELIVERY_FEE);
          if (total > BigInt(Number.MAX_SAFE_INTEGER))
            return fail("INVALID_PRICE", "El precio no está disponible.");
          return ok({
            currency: "COP",
            subtotalInCents: valid.priceInCents,
            vatInCents: Number(vat),
            vatRatePercent: VAT_RATE_PERCENT,
            baseFeeInCents: BASE_FEE,
            deliveryFeeInCents: DELIVERY_FEE,
            totalInCents: Number(total),
          });
        },
      ),
  );
}

export const statusMessage = (status: Transaction["status"]): string =>
  ({
    PENDING: "Estamos confirmando el pago. No necesitas pagarlo de nuevo.",
    APPROVED: "Pago aprobado. Estamos preparando tu entrega.",
    DECLINED: "La tarjeta fue rechazada. No se confirmó la compra.",
    ERROR: "No fue posible completar el pago.",
    VOIDED: "El pago fue anulado. No se confirmó la compra.",
  })[status];

export function view(tx: Transaction) {
  return {
    id: tx.id,
    reference: tx.reference,
    status: tx.status,
    submissionStatus: tx.submissionStatus,
    product: tx.product,
    amounts: tx.amounts,
    card: tx.card,
    delivery: tx.deliveryId
      ? { id: tx.deliveryId, status: "READY" as const, city: tx.address.city }
      : null,
    statusMessage: tx.statusMessage,
    canPay: tx.status === "PENDING" && tx.submissionStatus === "NOT_STARTED",
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}

export function publicProduct(product: Product) {
  const {
    stockOnHand: _onHand,
    stockReserved: _reserved,
    stockAvailable,
    ...safe
  } = product;
  return { ...safe, stock: stockAvailable };
}

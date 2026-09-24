import type {
  CardInput,
  CheckoutConfig,
  Draft,
  Product,
  Quote,
  Session,
  Transaction,
} from "../types";
import type { CheckoutState } from "../store";

export const product: Product = {
  id: "product_lumen_one",
  name: "Lumen One",
  description:
    "Una lámpara de escritorio con una silueta simple y un lugar propio en tu mesa.",
  priceInCents: 18900000,
  currency: "COP",
  stock: 12,
  imageUrl: "/lumen-lamp.svg",
  imageAlt: "Lámpara de escritorio verde",
};
export const draft: Draft = {
  productId: product.id,
  quantity: 1,
  step: "DETAILS",
  customer: {
    fullName: "Cliente Demo",
    email: "demo@example.com",
    phone: "3000000000",
  },
  delivery: {
    addressLine1: "Calle de ejemplo 10",
    city: "Bogotá",
    region: "Bogotá D.C.",
    country: "CO",
  },
};
export const quote: Quote = {
  productId: product.id,
  quantity: 1,
  amounts: {
    currency: "COP",
    subtotalInCents: 18900000,
    baseFeeInCents: 250000,
    deliveryFeeInCents: 1200000,
    totalInCents: 20350000,
  },
};
export const session: Session = {
  csrfToken: "csrf_fixture",
  expiresAt: "2099-09-24T12:00:00Z",
  draft: null,
  activeTransactionId: null,
};
export const transaction: Transaction = {
  id: "transaction_fixture",
  reference: "LUM-FIXTURE",
  status: "PENDING",
  submissionStatus: "NOT_STARTED",
  product: { id: product.id, name: product.name, quantity: 1 },
  amounts: quote.amounts,
  card: null,
  delivery: null,
  statusMessage: "Estamos confirmando el pago. No necesitas pagarlo de nuevo.",
  canPay: true,
  createdAt: "2026-09-23T12:00:00Z",
  updatedAt: "2026-09-23T12:00:00Z",
};
export const approved: Transaction = {
  ...transaction,
  status: "APPROVED",
  submissionStatus: "SUBMITTED",
  canPay: false,
  card: { brand: "VISA", lastFour: "4242" },
  delivery: { id: "delivery_fixture", status: "READY", city: "Bogotá" },
  statusMessage: "Pago aprobado. Tu entrega está preparada.",
};
export const config: CheckoutConfig = {
  environment: "sandbox",
  paymentApiUrl: "https://sandbox.wompi.co/v1",
  publicKey: "pub_test_fixture",
  currency: "COP",
  baseFeeInCents: 250000,
  deliveryFeeInCents: 1200000,
  acceptance: {
    terms: { token: "terms_fixture", url: "https://example.com/terms" },
    personalData: { token: "data_fixture", url: "https://example.com/privacy" },
  },
};
export const card: CardInput = {
  number: "4242 4242 4242 4242",
  holder: "Cliente Demo",
  expiry: "12/39",
  cvc: "123",
  installments: "1",
};
export const readyState = (
  overrides: Partial<CheckoutState> = {},
): CheckoutState => ({
  products: [product],
  draft: null,
  quote: null,
  transaction: null,
  step: "PRODUCT",
  loading: "ready",
  error: null,
  notice: null,
  idempotencyKey: null,
  saving: false,
  pendingSaveCount: 0,
  savedDraft: null,
  saveError: null,
  ...overrides,
});

export type Step = "PRODUCT" | "DETAILS" | "SUMMARY" | "RESULT";
export type Product = {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: "COP";
  stock: number;
  imageUrl: string;
  imageAlt: string;
};
export type Customer = { fullName: string; email: string; phone: string };
export type Delivery = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  country: "CO";
  postalCode?: string;
};
export type Draft = {
  productId: string;
  quantity: 1;
  step: "DETAILS" | "SUMMARY";
  customer: Partial<Customer>;
  delivery: Partial<Delivery>;
};
export type Amounts = {
  currency: "COP";
  subtotalInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalInCents: number;
};
export type Quote = { productId: string; quantity: 1; amounts: Amounts };
export type Transaction = {
  id: string;
  reference: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "ERROR" | "VOIDED";
  submissionStatus: "NOT_STARTED" | "CLAIMED" | "SUBMITTED" | "UNKNOWN";
  product: { id: string; name: string; quantity: 1 };
  amounts: Amounts;
  card: { brand: string; lastFour: string } | null;
  delivery: { id: string; status: "READY"; city: string } | null;
  statusMessage: string;
  canPay: boolean;
  createdAt: string;
  updatedAt: string;
};
export type Session = {
  csrfToken: string;
  expiresAt: string;
  draft: Draft | null;
  activeTransactionId: string | null;
};
export type CheckoutConfig = {
  environment: "sandbox";
  paymentApiUrl: string;
  publicKey: string;
  currency: "COP";
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  acceptance: {
    terms: { token: string; url: string };
    personalData: { token: string; url: string };
  };
};
/** Only component memory may hold CardInput. Never dispatch or persist it. */
export type CardInput = {
  number: string;
  holder: string;
  expiry: string;
  cvc: string;
  installments: string;
};
export type SafePointer = {
  version: 1;
  productId: string | null;
  step: Step;
  transactionId: string | null;
  idempotencyKey: string | null;
};

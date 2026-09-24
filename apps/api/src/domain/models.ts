export type Status = "PENDING" | "APPROVED" | "DECLINED" | "ERROR" | "VOIDED";
export type Submission = "NOT_STARTED" | "CLAIMED" | "SUBMITTED" | "UNKNOWN";
export interface Product {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  currency: "COP";
  stockOnHand: number;
  stockReserved: number;
  stockAvailable: number;
  imageUrl: string;
  imageAlt: string;
}
export interface CustomerInput {
  fullName: string;
  email: string;
  phone: string;
}
export interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  country: "CO";
  postalCode?: string;
}
export interface Customer extends CustomerInput {
  id: string;
  ownerSessionHash: string;
  createdAt: string;
}
export interface Draft {
  productId: string;
  quantity: 1;
  step: "DETAILS" | "SUMMARY";
  customer: Partial<CustomerInput>;
  delivery: Partial<Address>;
}
export interface Session {
  id: string;
  csrfToken: string;
  expiresAt: string;
  draft: Draft | null;
  activeTransactionId: string | null;
}
export interface Amounts {
  currency: "COP";
  subtotalInCents: number;
  baseFeeInCents: number;
  deliveryFeeInCents: number;
  totalInCents: number;
}
export interface Transaction {
  id: string;
  ownerSessionHash: string;
  customerId: string;
  product: { id: string; name: string; quantity: 1 };
  address: Address;
  amounts: Amounts;
  reference: string;
  status: Status;
  submissionStatus: Submission;
  providerId: string | null;
  card: { brand: string; lastFour: string } | null;
  deliveryId: string | null;
  reservationExpiresAt: string;
  createdAt: string;
  updatedAt: string;
  statusMessage: string;
}
export interface Delivery {
  id: string;
  ownerSessionHash: string;
  transactionId: string;
  customerId: string;
  productId: string;
  quantity: 1;
  status: "READY";
  address: Address;
  createdAt: string;
}
export interface Idempotency {
  transactionId: string;
  requestHash: string;
}
export interface CreateInput {
  productId: string;
  quantity: 1;
  expectedTotalInCents: number;
  customer: CustomerInput;
  delivery: Address;
}
export interface PayInput {
  cardToken: string;
  installments: number;
  acceptanceToken: string;
  acceptPersonalAuth: string;
}
export interface ProviderTransaction {
  id: string;
  status: Status;
  reference: string;
  amountInCents: number;
  currency: string;
  card: { brand: string; lastFour: string } | null;
}
export const BASE_FEE = 250000;
export const DELIVERY_FEE = 1200000;
export const keys = {
  product: (id: string) => `PRODUCT#${id}`,
  customer: (id: string) => `CUSTOMER#${id}`,
  transaction: (id: string) => `TX#${id}`,
  delivery: (id: string) => `DELIVERY#${id}`,
  session: (id: string) => `SESSION#${id}`,
  idempotency: (owner: string, key: string) => `IDEMP#${owner}#${key}`,
};

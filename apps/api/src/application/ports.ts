import {
  PayInput,
  Product,
  ProviderTransaction,
  Transaction,
} from "../domain/models";
import { Result } from "../domain/result";

export interface Stored<T> {
  value: T;
  version: number;
}
export interface Write {
  key: string;
  value: unknown | null;
  expectedVersion: number | null;
}
export class WriteConflict extends Error {
  constructor() {
    super("Concurrent write");
  }
}
export interface CheckoutStore {
  get<T>(key: string): Promise<Stored<T> | null>;
  products(): Promise<Stored<Product>[]>;
  pending(): Promise<Stored<Transaction>[]>;
  commit(writes: Write[]): Promise<void>;
}
export interface PublicPaymentConfig {
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
}
export interface PaymentGateway {
  configured(): boolean;
  config(): Promise<Result<PublicPaymentConfig>>;
  create(
    tx: Transaction,
    email: string,
    input: PayInput,
  ): Promise<Result<ProviderTransaction>>;
  get(id: string): Promise<Result<ProviderTransaction>>;
}
export interface Runtime {
  now(): Date;
  id(): string;
  token(): string;
  hash(value: string): string;
}

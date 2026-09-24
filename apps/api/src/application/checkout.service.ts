import {
  Address,
  CreateInput,
  Customer,
  Delivery,
  Draft,
  Idempotency,
  keys,
  PayInput,
  Product,
  Session,
  Transaction,
  ProviderTransaction,
} from "../domain/models";
import { fail, ok, Result } from "../domain/result";
import { publicProduct, quote, statusMessage, view } from "../domain/checkout";
import {
  CheckoutStore,
  PaymentGateway,
  Runtime,
  Stored,
  WriteConflict,
} from "./ports";

export class CheckoutService {
  constructor(
    readonly store: CheckoutStore,
    readonly gateway: PaymentGateway,
    private readonly runtime: Runtime,
  ) {}
  private now() {
    return this.runtime.now().toISOString();
  }
  private async retry<T>(work: () => Promise<Result<T>>): Promise<Result<T>> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await work();
      } catch (error) {
        if (!(error instanceof WriteConflict)) throw error;
      }
    }
    return fail(
      "CONCURRENT_UPDATE",
      "La operación está en curso. Consulta de nuevo.",
      409,
    );
  }
  async seed(): Promise<void> {
    const product: Product = {
      id: "product_lumen_one",
      name: "Lumen One",
      description:
        "Una luz cálida. Un espacio que se siente tuyo. Lámpara de escritorio de diseño, con luz regulable y acabado verde bosque.",
      priceInCents: 18900000,
      currency: "COP",
      stockOnHand: 12,
      stockReserved: 0,
      stockAvailable: 12,
      imageUrl: "/lumen-one-1200.webp",
      imageAlt: "Lámpara de escritorio verde bosque sobre una superficie clara",
    };
    if (await this.store.get(keys.product(product.id))) return;
    try {
      await this.store.commit([
        {
          key: keys.product(product.id),
          value: product,
          expectedVersion: null,
        },
      ]);
    } catch (error) {
      if (!(error instanceof WriteConflict)) throw error;
    }
  }
  async sessionFromToken(token?: string): Promise<Result<Session>> {
    if (!token || !/^[a-zA-Z0-9_-]{32,128}$/.test(token))
      return fail(
        "SESSION_EXPIRED",
        "Tu sesión venció. Inicia nuevamente.",
        401,
      );
    const session = await this.store.get<Session>(
      keys.session(this.runtime.hash(token)),
    );
    if (
      !session ||
      Date.parse(session.value.expiresAt) <= this.runtime.now().getTime()
    )
      return fail(
        "SESSION_EXPIRED",
        "Tu sesión venció. Inicia nuevamente.",
        401,
      );
    return ok(session.value);
  }
  async bootstrap(
    token?: string,
  ): Promise<{ session: Session; token: string; created: boolean }> {
    const existing = await this.sessionFromToken(token);
    if (existing.ok)
      return { session: existing.value, token: token!, created: false };
    const freshToken = this.runtime.token();
    const session: Session = {
      id: this.runtime.hash(freshToken),
      csrfToken: this.runtime.token(),
      expiresAt: new Date(
        this.runtime.now().getTime() + 86400000,
      ).toISOString(),
      draft: null,
      activeTransactionId: null,
    };
    await this.store.commit([
      { key: keys.session(session.id), value: session, expectedVersion: null },
    ]);
    return { session, token: freshToken, created: true };
  }
  sessionView(session: Session) {
    const { csrfToken, expiresAt, draft, activeTransactionId } = session;
    return { csrfToken, expiresAt, draft, activeTransactionId };
  }
  private async owned<T extends { ownerSessionHash: string }>(
    key: string,
    owner: string,
  ): Promise<Result<Stored<T>>> {
    const record = await this.store.get<T>(key);
    return record?.value.ownerSessionHash === owner
      ? ok(record)
      : fail("NOT_FOUND", "El recurso no existe.", 404);
  }
  async saveDraft(
    owner: string,
    draft: Draft,
  ): Promise<Result<{ draft: Draft }>> {
    // HTTP validation creates class instances. Persist a plain domain snapshot
    // so adapters do not depend on transport DTO prototypes or class coercion.
    const snapshot: Draft = {
      productId: draft.productId,
      quantity: draft.quantity,
      step: draft.step,
      customer: { ...draft.customer },
      delivery: { ...draft.delivery },
    };
    return this.retry(async () => {
      const session = await this.store.get<Session>(keys.session(owner));
      if (!session) return fail("SESSION_EXPIRED", "Tu sesión venció.", 401);
      if (!(await this.store.get(keys.product(draft.productId))))
        return fail("NOT_FOUND", "El producto no existe.", 404);
      await this.store.commit([
        {
          key: keys.session(owner),
          expectedVersion: session.version,
          value: { ...session.value, draft: snapshot },
        },
      ]);
      return ok({ draft: snapshot });
    });
  }
  async clearDraft(owner: string): Promise<Result<null>> {
    return this.retry(async () => {
      const session = await this.store.get<Session>(keys.session(owner));
      if (!session) return fail("SESSION_EXPIRED", "Tu sesión venció.", 401);
      if (session.value.activeTransactionId) {
        const tx = await this.store.get<Transaction>(
          keys.transaction(session.value.activeTransactionId),
        );
        if (tx?.value.status === "PENDING") {
          if (tx.value.submissionStatus !== "NOT_STARTED")
            return fail(
              "PAYMENT_IN_PROGRESS",
              "Estamos confirmando el pago.",
              409,
            );
          const cancelled = await this.finalize(
            tx.value.id,
            "ERROR",
            null,
            "La compra fue cancelada antes del pago.",
            true,
          );
          if (!cancelled.ok) return cancelled;
          if (cancelled.value.status === "PENDING")
            return fail(
              "PAYMENT_IN_PROGRESS",
              "Estamos confirmando el pago.",
              409,
            );
        }
      }
      await this.store.commit([
        {
          key: keys.session(owner),
          expectedVersion: session.version,
          value: { ...session.value, draft: null, activeTransactionId: null },
        },
      ]);
      return ok(null);
    });
  }
  async products() {
    // Expiry is explicit and atomic; a database TTL never releases a payment reservation.
    for (const pending of await this.store.pending())
      await this.expire(pending.value);
    return ok(
      (await this.store.products()).map((item) => publicProduct(item.value)),
    );
  }
  async product(id: string) {
    for (const pending of await this.store.pending())
      if (pending.value.product.id === id) await this.expire(pending.value);
    const product = await this.store.get<Product>(keys.product(id));
    return product
      ? ok(publicProduct(product.value))
      : fail("NOT_FOUND", "El producto no existe.", 404);
  }
  async quote(productId: string, quantity: number) {
    for (const pending of await this.store.pending())
      if (pending.value.product.id === productId)
        await this.expire(pending.value);
    const product = await this.store.get<Product>(keys.product(productId));
    const result = quote(product?.value ?? null, quantity);
    return result.ok
      ? ok({ productId, quantity, amounts: result.value })
      : result;
  }
  async create(owner: string, idempotencyKey: string, raw: CreateInput) {
    const input: CreateInput = {
      ...raw,
      customer: {
        fullName: raw.customer.fullName.trim(),
        email: raw.customer.email.trim().toLowerCase(),
        phone: raw.customer.phone.replace(/^\+57/, "").replace(/\s/g, ""),
      },
      delivery: Object.fromEntries(
        Object.entries(raw.delivery)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => [k, v.trim()]),
      ) as unknown as Address,
    };
    const canonical = JSON.stringify({
      productId: input.productId,
      quantity: input.quantity,
      expectedTotalInCents: input.expectedTotalInCents,
      customer: input.customer,
      delivery: Object.fromEntries(
        Object.entries(input.delivery).sort(([a], [b]) => a.localeCompare(b)),
      ),
    });
    const requestHash = this.runtime.hash(canonical);
    return this.retry(async () => {
      const previous = await this.store.get<Idempotency>(
        keys.idempotency(owner, idempotencyKey),
      );
      if (previous) {
        if (previous.value.requestHash !== requestHash)
          return fail(
            "IDEMPOTENCY_CONFLICT",
            "Este intento de compra ya contiene otros datos.",
            409,
          );
        const existing = await this.store.get<Transaction>(
          keys.transaction(previous.value.transactionId),
        );
        if (!existing)
          return fail(
            "DATA_UNAVAILABLE",
            "No podemos recuperar la compra.",
            503,
          );
        await this.expire(existing.value);
        const refreshed = (await this.store.get<Transaction>(
          keys.transaction(existing.value.id),
        ))!;
        return ok({ transaction: view(refreshed.value), created: false });
      }
      const session = await this.store.get<Session>(keys.session(owner));
      if (!session) return fail("SESSION_EXPIRED", "Tu sesión venció.", 401);
      if (session.value.activeTransactionId) {
        const active = await this.store.get<Transaction>(
          keys.transaction(session.value.activeTransactionId),
        );
        if (active?.value.status === "PENDING") {
          await this.expire(active.value);
          const current = await this.store.get<Transaction>(
            keys.transaction(active.value.id),
          );
          if (current?.value.status === "PENDING")
            return fail(
              "PAYMENT_IN_PROGRESS",
              "Ya tienes una compra pendiente. Consulta su estado.",
              409,
            );
        }
      }
      const product = await this.store.get<Product>(
        keys.product(input.productId),
      );
      const amounts = quote(product?.value ?? null, input.quantity);
      if (!amounts.ok) return amounts;
      if (input.expectedTotalInCents !== amounts.value.totalInCents)
        return fail(
          "PRICE_CHANGED",
          "El total cambió. Revisa el resumen nuevamente.",
          409,
        );
      const now = this.now(),
        txId = this.runtime.id(),
        customerId = this.runtime.id();
      const tx: Transaction = {
        id: txId,
        ownerSessionHash: owner,
        customerId,
        product: {
          id: product!.value.id,
          name: product!.value.name,
          quantity: 1,
        },
        address: input.delivery,
        amounts: amounts.value,
        reference: `LUM-${txId}`,
        status: "PENDING",
        submissionStatus: "NOT_STARTED",
        providerId: null,
        card: null,
        deliveryId: null,
        reservationExpiresAt: new Date(
          this.runtime.now().getTime() + 900000,
        ).toISOString(),
        createdAt: now,
        updatedAt: now,
        statusMessage: "Compra lista para realizar el pago.",
      };
      const customer: Customer = {
        ...input.customer,
        id: customerId,
        ownerSessionHash: owner,
        createdAt: now,
      };
      await this.store.commit([
        {
          key: keys.product(product!.value.id),
          expectedVersion: product!.version,
          value: {
            ...product!.value,
            stockAvailable: product!.value.stockAvailable - 1,
            stockReserved: product!.value.stockReserved + 1,
          },
        },
        {
          key: keys.customer(customerId),
          expectedVersion: null,
          value: customer,
        },
        { key: keys.transaction(txId), expectedVersion: null, value: tx },
        {
          key: keys.idempotency(owner, idempotencyKey),
          expectedVersion: null,
          value: { requestHash, transactionId: txId },
        },
        {
          key: keys.session(owner),
          expectedVersion: session.version,
          value: { ...session.value, activeTransactionId: txId },
        },
      ]);
      return ok({ transaction: view(tx), created: true });
    });
  }
  private async expire(tx: Transaction): Promise<void> {
    if (
      tx.status === "PENDING" &&
      tx.submissionStatus === "NOT_STARTED" &&
      Date.parse(tx.reservationExpiresAt) <= this.runtime.now().getTime()
    )
      await this.finalize(
        tx.id,
        "ERROR",
        null,
        "La reserva venció antes de iniciar el pago. Puedes intentarlo de nuevo.",
        true,
      );
  }
  private matches(tx: Transaction, provider: ProviderTransaction) {
    return (
      provider.reference === tx.reference &&
      provider.amountInCents === tx.amounts.totalInCents &&
      provider.currency === tx.amounts.currency
    );
  }
  private async finalize(
    id: string,
    status: Transaction["status"],
    provider: ProviderTransaction | null,
    message?: string,
    unsubmittedOnly = false,
  ): Promise<Result<Transaction>> {
    return this.retry(async () => {
      const stored = await this.store.get<Transaction>(keys.transaction(id));
      if (!stored) return fail("NOT_FOUND", "El pago no existe.", 404);
      const tx = stored.value;
      if (tx.status !== "PENDING") return ok(tx);
      if (unsubmittedOnly && tx.submissionStatus !== "NOT_STARTED")
        return ok(tx);
      const updated: Transaction = {
        ...tx,
        status,
        updatedAt: this.now(),
        statusMessage: message ?? statusMessage(status),
        ...(provider
          ? {
              providerId: provider.id,
              submissionStatus: "SUBMITTED" as const,
              card: provider.card,
            }
          : {}),
      };
      const writes = [];
      if (status !== "PENDING") {
        const product = await this.store.get<Product>(
          keys.product(tx.product.id),
        );
        if (!product || product.value.stockReserved < 1)
          return fail(
            "INVENTORY_UNAVAILABLE",
            "Estamos verificando tu compra.",
            503,
          );
        const approved = status === "APPROVED";
        writes.push({
          key: keys.product(tx.product.id),
          expectedVersion: product.version,
          value: {
            ...product.value,
            stockOnHand: product.value.stockOnHand - (approved ? 1 : 0),
            stockReserved: product.value.stockReserved - 1,
            stockAvailable: product.value.stockAvailable + (approved ? 0 : 1),
          },
        });
        if (approved) {
          updated.deliveryId = this.runtime.id();
          const delivery: Delivery = {
            id: updated.deliveryId,
            ownerSessionHash: tx.ownerSessionHash,
            transactionId: id,
            customerId: tx.customerId,
            productId: tx.product.id,
            quantity: 1,
            address: tx.address,
            status: "READY",
            createdAt: this.now(),
          };
          writes.push({
            key: keys.delivery(delivery.id),
            expectedVersion: null,
            value: delivery,
          });
        }
      }
      writes.push({
        key: keys.transaction(id),
        expectedVersion: stored.version,
        value: updated,
      });
      await this.store.commit(writes);
      return ok(updated);
    });
  }
  async pay(owner: string, id: string, input: PayInput) {
    const claim = await this.retry(async () => {
      const owned = await this.owned<Transaction>(keys.transaction(id), owner);
      if (!owned.ok) return owned;
      await this.expire(owned.value.value);
      const stored = (await this.store.get<Transaction>(keys.transaction(id)))!;
      if (
        stored.value.status !== "PENDING" ||
        stored.value.submissionStatus !== "NOT_STARTED"
      )
        return ok({ tx: stored.value, claimed: false });
      if (!this.gateway.configured())
        return fail(
          "PAYMENT_UNAVAILABLE",
          "El servicio de pagos de prueba no está disponible.",
          503,
        );
      const tx: Transaction = {
        ...stored.value,
        submissionStatus: "CLAIMED",
        updatedAt: this.now(),
        statusMessage: statusMessage("PENDING"),
      };
      await this.store.commit([
        {
          key: keys.transaction(id),
          expectedVersion: stored.version,
          value: tx,
        },
      ]);
      return ok({ tx, claimed: true });
    });
    if (!claim.ok) return claim;
    if (!claim.value.claimed) return ok(view(claim.value.tx));
    const customer = await this.store.get<Customer>(
      keys.customer(claim.value.tx.customerId),
    );
    if (!customer)
      return fail("DATA_UNAVAILABLE", "Estamos verificando tu compra.", 503);
    const response = await this.gateway.create(
      claim.value.tx,
      customer.value.email,
      input,
    );
    if (response.ok && this.matches(claim.value.tx, response.value)) {
      const final = await this.finalize(
        id,
        response.value.status,
        response.value,
      );
      return final.ok ? ok(view(final.value)) : final;
    }
    if (!response.ok && response.error.code === "PAYMENT_REJECTED") {
      const final = await this.finalize(id, "ERROR", null);
      return final.ok ? ok(view(final.value)) : final;
    }
    return this.retry(async () => {
      const current = (await this.store.get<Transaction>(
        keys.transaction(id),
      ))!;
      if (current.value.status !== "PENDING") return ok(view(current.value));
      const uncertain: Transaction = {
        ...current.value,
        submissionStatus: "UNKNOWN",
        statusMessage: statusMessage("PENDING"),
        updatedAt: this.now(),
      };
      await this.store.commit([
        {
          key: keys.transaction(id),
          expectedVersion: current.version,
          value: uncertain,
        },
      ]);
      return ok(view(uncertain));
    });
  }
  async transaction(owner: string, id: string) {
    const owned = await this.owned<Transaction>(keys.transaction(id), owner);
    if (!owned.ok) return owned;
    await this.expire(owned.value.value);
    let current = (await this.store.get<Transaction>(keys.transaction(id)))!
      .value;
    if (current.status === "PENDING" && current.providerId) {
      const provider = await this.gateway.get(current.providerId);
      if (provider.ok && this.matches(current, provider.value)) {
        const final = await this.finalize(
          id,
          provider.value.status,
          provider.value,
        );
        if (!final.ok) return final;
        current = final.value;
      }
    }
    return ok(view(current));
  }
  async customer(owner: string, id: string) {
    const result = await this.owned<Customer>(keys.customer(id), owner);
    if (!result.ok) return result;
    const { fullName, email, phone } = result.value.value;
    return ok({ id, fullName, email, phone });
  }
  async delivery(owner: string, id: string) {
    const result = await this.owned<Delivery>(keys.delivery(id), owner);
    if (!result.ok) return result;
    const { transactionId, productId, quantity, status, address } =
      result.value.value;
    return ok({ id, transactionId, productId, quantity, status, address });
  }
}

import { randomUUID } from "node:crypto";
import { CheckoutService } from "../src/application/checkout.service";
import { Write } from "../src/application/ports";
import {
  Customer,
  Draft,
  keys,
  Session,
  Transaction,
} from "../src/domain/models";
import { input, setup, value } from "./helpers";

const staleDraft: Draft = {
  productId: input.productId,
  quantity: 1,
  step: "DETAILS",
  customer: { ...input.customer, fullName: "Other tab recipient" },
  delivery: { ...input.delivery, addressLine1: "Other tab address 456" },
};

describe("reservation and draft consistency across tabs", () => {
  it("atomically replaces an earlier divergent draft with the normalized order snapshot and recovers it after restart", async () => {
    const { service, store, gateway, runtime, owner, token } = await setup();
    await service.saveDraft(owner, staleDraft);
    const raw = {
      ...input,
      customer: {
        fullName: "  Confirmed Recipient  ",
        email: "CONFIRMED@EXAMPLE.COM",
        phone: "+57 3000000000",
      },
      delivery: {
        ...input.delivery,
        addressLine1: "  Confirmed address 123  ",
      },
    };
    const created = value(await service.create(owner, randomUUID(), raw));
    const transaction = (await store.get<Transaction>(
      keys.transaction(created.transaction.id),
    ))!.value;
    const customer = (await store.get<Customer>(
      keys.customer(transaction.customerId),
    ))!.value;
    const restarted = new CheckoutService(store, gateway, runtime);
    const recovered = (await restarted.bootstrap(token)).session;
    expect(recovered.activeTransactionId).toBe(transaction.id);
    expect(recovered.draft).toEqual({
      productId: input.productId,
      quantity: 1,
      step: "SUMMARY",
      customer: {
        fullName: "Confirmed Recipient",
        email: "confirmed@example.com",
        phone: "3000000000",
      },
      delivery: { ...input.delivery, addressLine1: "Confirmed address 123" },
    });
    expect(recovered.draft!.delivery).toEqual(transaction.address);
    expect(recovered.draft!.customer).toEqual({
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
    });
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it.each(["NOT_STARTED", "CLAIMED", "SUBMITTED", "UNKNOWN"] as const)(
    "rejects another tab's late autosave while the order is %s without changing its snapshot",
    async (submissionStatus) => {
      const { service, store, gateway, owner, token } = await setup();
      const created = value(
        await service.create(owner, randomUUID(), input),
      ).transaction;
      const current = (await store.get<Transaction>(
        keys.transaction(created.id),
      ))!;
      await store.commit([
        {
          key: keys.transaction(created.id),
          expectedVersion: current.version,
          value: { ...current.value, submissionStatus },
        },
      ]);
      const before = await store.get<Session>(keys.session(owner));
      expect(await service.saveDraft(owner, staleDraft)).toMatchObject({
        ok: false,
        error: { code: "PAYMENT_IN_PROGRESS" },
      });
      expect(await store.get<Session>(keys.session(owner))).toEqual(before);
      expect((await service.bootstrap(token)).session.draft!.delivery).toEqual(
        input.delivery,
      );
      expect(gateway.create).not.toHaveBeenCalled();
    },
  );

  it("rechecks the reservation after a stale autosave loses the session CAS race to create", async () => {
    const { service, store, gateway, owner, token } = await setup();
    const commit = store.commit.bind(store);
    let reached!: () => void;
    let resume!: () => void;
    const arrived = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const released = new Promise<void>((resolve) => {
      resume = resolve;
    });
    let held = false;
    jest.spyOn(store, "commit").mockImplementation(async (writes: Write[]) => {
      if (
        !held &&
        writes.length === 1 &&
        writes[0].key === keys.session(owner)
      ) {
        held = true;
        reached();
        await released;
      }
      return commit(writes);
    });
    const lateSave = service.saveDraft(owner, staleDraft);
    await arrived;
    const reserved = value(
      await service.create(owner, randomUUID(), input),
    ).transaction;
    resume();
    expect(await lateSave).toMatchObject({
      ok: false,
      error: { code: "PAYMENT_IN_PROGRESS" },
    });
    const restored = (await service.bootstrap(token)).session;
    expect(restored.activeTransactionId).toBe(reserved.id);
    expect(restored.draft!.customer).toEqual(input.customer);
    expect(restored.draft!.delivery).toEqual(input.delivery);
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it("allows a new draft after the old reservation expires or is explicitly cancelled", async () => {
    const { service, owner, advance } = await setup();
    const expired = value(
      await service.create(owner, randomUUID(), input),
    ).transaction;
    advance(900001);
    expect(value(await service.transaction(owner, expired.id)).status).toBe(
      "ERROR",
    );
    expect(value(await service.saveDraft(owner, staleDraft)).draft).toEqual(
      staleDraft,
    );
    await service.create(owner, randomUUID(), input);
    await service.clearDraft(owner);
    expect(value(await service.saveDraft(owner, staleDraft)).draft).toEqual(
      staleDraft,
    );
  });
});

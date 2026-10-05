import { randomUUID } from "node:crypto";
import * as checkoutDomain from "../src/domain/checkout";
import { Amounts, keys, Product, Transaction } from "../src/domain/models";
import { ok } from "../src/domain/result";
import { input, payment, setup, value } from "./helpers";

const currentAmounts: Amounts = {
  currency: "COP",
  subtotalInCents: 18900000,
  vatInCents: 3591000,
  vatRatePercent: 19,
  baseFeeInCents: 250000,
  deliveryFeeInCents: 1200000,
  totalInCents: 23941000,
};

describe("product-only VAT and immutable purchase amounts", () => {
  it("itemizes 19 percent on the product and leaves both fees untaxed", async () => {
    const { service } = await setup();
    expect(value(await service.quote(input.productId, 1)).amounts).toEqual(
      currentAmounts,
    );
  });

  it("rounds fractional cents half up using exact arithmetic, including the largest safe total", async () => {
    const { store } = await setup();
    const product = (await store.get<Product>(keys.product(input.productId)))!
      .value;
    const cases = [
      { price: 1, vat: 0, total: 1450001 },
      { price: 2, vat: 0, total: 1450002 },
      { price: 3, vat: 1, total: 1450004 },
      { price: 49, vat: 9, total: 1450058 },
      { price: 50, vat: 10, total: 1450060 },
      { price: 51, vat: 10, total: 1450061 },
      { price: 149, vat: 28, total: 1450177 },
      { price: 150, vat: 29, total: 1450179 },
      { price: 151, vat: 29, total: 1450180 },
      {
        price: 7569075002765539,
        vat: 1438124250525452,
        total: Number.MAX_SAFE_INTEGER,
      },
    ];
    for (const { price, vat, total } of cases) {
      expect(
        value(checkoutDomain.quote({ ...product, priceInCents: price }, 1)),
      ).toEqual({
        ...currentAmounts,
        subtotalInCents: price,
        vatInCents: vat,
        totalInCents: total,
      });
    }
  });

  it("rejects fractional, nonfinite and unsafe prices or totals before reserving anything", async () => {
    const { store, service, owner, gateway } = await setup();
    for (const priceInCents of [
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
      Number.MAX_SAFE_INTEGER,
      7569075002765540,
    ]) {
      const product = (await store.get<Product>(
        keys.product(input.productId),
      ))!;
      await store.commit([
        {
          key: keys.product(input.productId),
          expectedVersion: product.version,
          value: { ...product.value, priceInCents },
        },
      ]);
      expect(await service.create(owner, randomUUID(), input)).toMatchObject({
        ok: false,
        error: { code: "INVALID_PRICE" },
      });
      expect(
        (await store.get<Product>(keys.product(input.productId)))!.value,
      ).toMatchObject({
        stockOnHand: 12,
        stockAvailable: 12,
        stockReserved: 0,
      });
    }
    expect(gateway.create).not.toHaveBeenCalled();
    expect([...store.records.keys()].some((key) => key.startsWith("TX#"))).toBe(
      false,
    );
  });

  it("stores the VAT snapshot once and replays and pays it after the catalog price changes", async () => {
    const { service, store, owner, gateway } = await setup();
    const key = randomUUID();
    const created = value(await service.create(owner, key, input)).transaction;
    expect(created.amounts).toEqual(currentAmounts);
    expect(
      (await store.get<Transaction>(keys.transaction(created.id)))!.value
        .amounts,
    ).toEqual(currentAmounts);
    const product = (await store.get<Product>(keys.product(input.productId)))!;
    await store.commit([
      {
        key: keys.product(input.productId),
        expectedVersion: product.version,
        value: { ...product.value, priceInCents: 10000000 },
      },
    ]);
    expect(value(await service.create(owner, key, input))).toMatchObject({
      created: false,
      transaction: { id: created.id, amounts: currentAmounts },
    });
    expect(
      value(await service.pay(owner, created.id, payment)).amounts,
    ).toEqual(currentAmounts);
    expect(gateway.create.mock.calls[0][0].amounts).toEqual(currentAmounts);
  });

  it("preserves pre-VAT snapshots for recovery, original idempotency replay and payment", async () => {
    const { service, owner, gateway } = await setup();
    const legacyAmounts: Amounts = {
      currency: "COP",
      subtotalInCents: 18900000,
      baseFeeInCents: 250000,
      deliveryFeeInCents: 1200000,
      totalInCents: 20350000,
    };
    const legacyInput = { ...input, expectedTotalInCents: 20350000 };
    const key = randomUUID();
    // Seed a transaction as the previous application did. Restore current
    // pricing before exercising recovery, replay and provider submission.
    const oldPricing = jest
      .spyOn(checkoutDomain, "quote")
      .mockReturnValueOnce(ok(legacyAmounts));
    let created;
    try {
      created = value(
        await service.create(owner, key, legacyInput),
      ).transaction;
    } finally {
      oldPricing.mockRestore();
    }
    expect(value(await service.quote(input.productId, 1)).amounts).toEqual(
      currentAmounts,
    );
    expect(value(await service.transaction(owner, created.id)).amounts).toEqual(
      legacyAmounts,
    );
    expect(value(await service.create(owner, key, legacyInput))).toMatchObject({
      created: false,
      transaction: { id: created.id, amounts: legacyAmounts },
    });
    expect(await service.create(owner, key, input)).toMatchObject({
      ok: false,
      error: { code: "IDEMPOTENCY_CONFLICT" },
    });
    expect(
      value(await service.pay(owner, created.id, payment)).amounts,
    ).toEqual(legacyAmounts);
    expect(gateway.create.mock.calls[0][0].amounts).toEqual(legacyAmounts);
    expect(gateway.create).toHaveBeenCalledTimes(1);
  });
});

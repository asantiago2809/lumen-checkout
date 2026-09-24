import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileStore } from "../src/infrastructure/persistence/file.store";
import {
  DynamoStore,
  dynamoKey,
} from "../src/infrastructure/persistence/dynamo.store";
import { WriteConflict } from "../src/application/ports";

describe("durable file adapter", () => {
  it("persists across restarts and atomically rejects a stale writer without partial data", async () => {
    const path = join(
      await mkdtemp(join(tmpdir(), "lumen-store-")),
      "nested",
      "state.json",
    );
    const store = new FileStore(path);
    expect(await store.get("none")).toBeNull();
    await store.commit([
      {
        key: "PRODUCT#lamp",
        value: { stockAvailable: 1 },
        expectedVersion: null,
      },
    ]);
    expect(await new FileStore(path).get("PRODUCT#lamp")).toEqual({
      value: { stockAvailable: 1 },
      version: 1,
    });
    const results = await Promise.allSettled([
      store.commit([
        {
          key: "PRODUCT#lamp",
          value: { stockAvailable: 0 },
          expectedVersion: 1,
        },
        { key: "TX#one", value: { status: "PENDING" }, expectedVersion: null },
      ]),
      store.commit([
        {
          key: "PRODUCT#lamp",
          value: { stockAvailable: 0 },
          expectedVersion: 1,
        },
        { key: "TX#two", value: { status: "PENDING" }, expectedVersion: null },
      ]),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await store.get("TX#two")).toBeNull();
    expect(await store.pending()).toHaveLength(1);
    expect(await store.products()).toHaveLength(1);
    await store.commit([
      { key: "TX#one", value: { status: "APPROVED" }, expectedVersion: 1 },
    ]);
    expect(await store.pending()).toHaveLength(0);
    await store.commit([{ key: "TX#one", value: null, expectedVersion: 2 }]);
    expect(await store.get("TX#one")).toBeNull();
    expect(
      JSON.parse(await readFile(path, "utf8"))["PRODUCT#lamp"].version,
    ).toBe(2);
    await writeFile(path, "broken json");
    await expect(store.get("PRODUCT#lamp")).rejects.toThrow();
  });
});

describe("DynamoDB transactional adapter", () => {
  function setup() {
    const send = jest.fn();
    return { send, store: new DynamoStore({ send } as any, "test-table") };
  }
  it("maps keyed, strongly consistent reads and missing records", async () => {
    const { store, send } = setup();
    send
      .mockResolvedValueOnce({ Item: { data: { name: "lamp" }, version: 2 } })
      .mockResolvedValueOnce({});
    expect(dynamoKey("PRODUCT#lamp")).toEqual({
      pk: "CATALOG",
      sk: "PRODUCT#lamp",
    });
    expect(dynamoKey("TX#123")).toEqual({ pk: "TX#123", sk: "META" });
    expect(await store.get("PRODUCT#lamp")).toEqual({
      value: { name: "lamp" },
      version: 2,
    });
    expect(send.mock.calls[0][0].input).toMatchObject({
      ConsistentRead: true,
      TableName: "test-table",
    });
    expect(await store.get("absent")).toBeNull();
  });
  it("paginates catalog and pending-index queries without scans", async () => {
    const { store, send } = setup();
    send
      .mockResolvedValueOnce({
        Items: [{ data: { id: "a" }, version: 1 }],
        LastEvaluatedKey: { pk: "CATALOG", sk: "PRODUCT#a" },
      })
      .mockResolvedValueOnce({ Items: [{ data: { id: "b" }, version: 2 }] });
    expect(await store.products()).toHaveLength(2);
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual({
      pk: "CATALOG",
      sk: "PRODUCT#a",
    });
    send.mockResolvedValueOnce({});
    expect(await store.pending()).toEqual([]);
    expect(send.mock.calls[2][0].input.IndexName).toBe("pending-index");
  });
  it("writes conditions, versions, index membership and session TTL in one transaction", async () => {
    const { store, send } = setup();
    send.mockResolvedValue({});
    await store.commit([]);
    expect(send).not.toHaveBeenCalled();
    await store.commit([
      { key: "PRODUCT#lamp", value: { stockAvailable: 0 }, expectedVersion: 3 },
      {
        key: "TX#123",
        value: { status: "PENDING", createdAt: "2026-09-23T12:00:00Z" },
        expectedVersion: null,
      },
      {
        key: "SESSION#hash",
        value: { expiresAt: "2026-09-24T12:00:00Z" },
        expectedVersion: 1,
      },
      { key: "IDEMP#expired", value: null, expectedVersion: 1 },
    ]);
    const writes = send.mock.calls[0][0].input.TransactItems;
    expect(writes[0].Put).toMatchObject({
      ConditionExpression: "#v = :version",
      ExpressionAttributeValues: { ":version": 3 },
      Item: { version: 4 },
    });
    expect(writes[1].Put).toMatchObject({
      ConditionExpression: "attribute_not_exists(pk)",
      Item: { gsi1pk: "PENDING" },
    });
    expect(writes[2].Put.Item.expiresAt).toBe(
      Date.parse("2026-09-24T12:00:00Z") / 1000,
    );
    expect(writes[3].Delete.Key).toEqual({ pk: "IDEMP#expired", sk: "META" });
    await store.commit([
      { key: "TX#123", value: { status: "APPROVED" }, expectedVersion: 1 },
    ]);
    expect(
      send.mock.calls[1][0].input.TransactItems[0].Put.Item,
    ).not.toHaveProperty("gsi1pk");
  });
  it.each([
    { name: "ConditionalCheckFailedException" },
    {
      name: "TransactionCanceledException",
      CancellationReasons: [{ Code: "ConditionalCheckFailed" }],
    },
    {
      name: "TransactionCanceledException",
      CancellationReasons: [{ Code: "TransactionConflict" }],
    },
  ])(
    "classifies retryable contention without hiding other AWS failures",
    async (error) => {
      const { store, send } = setup();
      send.mockRejectedValue(error);
      await expect(
        store.commit([{ key: "TX#1", expectedVersion: null, value: {} }]),
      ).rejects.toBeInstanceOf(WriteConflict);
      send.mockRejectedValue(new Error("access denied"));
      await expect(
        store.commit([{ key: "TX#1", expectedVersion: null, value: {} }]),
      ).rejects.toThrow("access denied");
      send.mockRejectedValue({ name: "TransactionCanceledException" });
      await expect(
        store.commit([{ key: "TX#1", expectedVersion: null, value: {} }]),
      ).rejects.toEqual({ name: "TransactionCanceledException" });
    },
  );
});

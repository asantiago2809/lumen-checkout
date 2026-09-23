import "reflect-metadata";
import { DynamoDBClient, AttributeValue } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { INestApplication } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { CheckoutService } from "../src/application/checkout.service";
import { createApp } from "../src/bootstrap/create-app";
import {
  CreateDto,
  DraftAddressDto,
  DraftCustomerDto,
  DraftDto,
} from "../src/infrastructure/http/dtos";
import { DynamoStore } from "../src/infrastructure/persistence/dynamo.store";
import { FakeGateway, input } from "./helpers";

type Item = Record<string, AttributeValue>;

/** Only the network boundary is fake. SDK marshalling, HTTP DTO transformation,
 * application code and the DynamoDB store run exactly as in production. */
function dynamoWire() {
  const items = new Map<string, Item>();
  const key = (item: Item) => `${item.pk.S}/${item.sk.S}`;
  const handle = jest.fn(
    async (request: { headers: Record<string, string>; body?: unknown }) => {
      const body =
        request.body instanceof Uint8Array
          ? new TextDecoder().decode(request.body)
          : String(request.body);
      const payload = JSON.parse(body);
      const operation = request.headers["x-amz-target"].split(".").at(-1);
      let result: Record<string, unknown> = {};
      if (operation === "GetItem")
        result = { Item: items.get(key(payload.Key)) };
      else if (operation === "Query") {
        const field = payload.IndexName ? "gsi1pk" : "pk";
        result = {
          Items: [...items.values()].filter(
            (item) =>
              item[field]?.S === payload.ExpressionAttributeValues[":pk"].S,
          ),
        };
      } else if (operation === "TransactWriteItems") {
        for (const operation of payload.TransactItems) {
          const write = operation.Put ?? operation.Delete;
          const current = items.get(key(write.Item ?? write.Key));
          if (
            write.ConditionExpression === "attribute_not_exists(pk)"
              ? !!current
              : current?.version.N !==
                write.ExpressionAttributeValues[":version"].N
          )
            throw new Error(
              "Unexpected conditional conflict in deterministic SDK test",
            );
        }
        for (const operation of payload.TransactItems) {
          if (operation.Put)
            items.set(key(operation.Put.Item), operation.Put.Item);
          else items.delete(key(operation.Delete.Key));
        }
      } else throw new Error(`Unexpected DynamoDB operation: ${operation}`);
      return {
        response: {
          statusCode: 200,
          headers: { "content-type": "application/x-amz-json-1.0" },
          body: Buffer.from(JSON.stringify(result)),
        },
      };
    },
  );
  const raw = new DynamoDBClient({
    region: "us-east-1",
    credentials: { accessKeyId: "test-access", secretAccessKey: "test-secret" },
    requestHandler: { handle },
  });
  const client = DynamoDBDocumentClient.from(raw, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return { client, handle, close: () => raw.destroy() };
}

describe("HTTP DTO to DynamoDB serialization regression", () => {
  const origin = "http://localhost:5173";
  let wire: ReturnType<typeof dynamoWire>;
  let app: INestApplication;
  let api: ReturnType<typeof request.agent>;
  let csrf: string;
  let service: CheckoutService;
  const draft = {
    productId: input.productId,
    quantity: 1,
    step: "SUMMARY",
    customer: { fullName: "Draft contact", email: "unfinished@" },
    delivery: { country: "CO", addressLine1: "" },
  };

  beforeAll(async () => {
    wire = dynamoWire();
    app = await createApp({
      store: new DynamoStore(wire.client, "serialization-test"),
      gateway: new FakeGateway(),
      env: { NODE_ENV: "test", ALLOWED_ORIGINS: origin },
    });
    service = app.get(CheckoutService);
    api = request.agent(app.getHttpServer());
    const bootstrap = await api
      .post("/api/checkout/session")
      .set("Origin", origin)
      .send({})
      .expect(201);
    csrf = bootstrap.body.data.csrfToken;
  });
  afterAll(async () => {
    await app.close();
    wire.close();
  });

  it("reproduces the SDK rejection of a Nest DTO before any network request", async () => {
    const instance = plainToInstance(DraftDto, draft);
    const before = wire.handle.mock.calls.length;
    await expect(
      wire.client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: "serialization-test",
                Item: { pk: "TEST", sk: "META", data: { draft: instance } },
              },
            },
          ],
        }),
      ),
    ).rejects.toThrow(/convertClassInstanceToMap/);
    expect(wire.handle).toHaveBeenCalledTimes(before);
  });

  it("persists and reloads a transformed partial draft through the real SDK serializer", async () => {
    const save = jest.spyOn(service, "saveDraft");
    const response = await api
      .put("/api/checkout/draft")
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf)
      .send(draft)
      .expect(200);
    const received = save.mock.calls[0][1];
    expect(received).toBeInstanceOf(DraftDto);
    expect(received.customer).toBeInstanceOf(DraftCustomerDto);
    expect(received.delivery).toBeInstanceOf(DraftAddressDto);
    expect(response.body.data.draft).toEqual(draft);
    const restored = await api.get("/api/checkout/session").expect(200);
    expect(restored.body.data.draft).toEqual(draft);
    await api
      .put("/api/checkout/draft")
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf)
      .send({ ...draft, customer: { ...draft.customer, pan: "forbidden" } })
      .expect(400);
    expect(save).toHaveBeenCalledTimes(1);
    save.mockRestore();
  });

  it("serializes transaction snapshots and the existing draft, then replays and releases its reservation", async () => {
    const create = jest.spyOn(service, "create");
    const key = randomUUID();
    const post = () =>
      api
        .post("/api/transactions")
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf)
        .set("Idempotency-Key", key);
    const created = await post().send(input).expect(201);
    expect(create.mock.calls[0][2]).toBeInstanceOf(CreateDto);
    expect(created.body.data).toMatchObject({
      status: "PENDING",
      submissionStatus: "NOT_STARTED",
      delivery: null,
    });
    const replay = await post().send(input).expect(200);
    expect(replay.body.data.id).toBe(created.body.data.id);
    expect((await api.get("/api/checkout/session")).body.data.draft).toEqual(
      draft,
    );
    expect(
      (await api.get(`/api/products/${input.productId}`)).body.data.stock,
    ).toBe(11);
    await api
      .delete("/api/checkout/draft")
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf)
      .expect(204);
    const cancelled = await api
      .get(`/api/transactions/${created.body.data.id}`)
      .expect(200);
    expect(cancelled.body.data).toMatchObject({
      status: "ERROR",
      delivery: null,
      canPay: false,
    });
    expect(
      (await api.get(`/api/products/${input.productId}`)).body.data.stock,
    ).toBe(12);
    create.mockRestore();
  });
});

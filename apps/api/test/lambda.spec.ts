import { loadRuntimeSecrets } from "../src/bootstrap/runtime-secrets";
import { createLambdaHandler } from "../src/bootstrap/lambda-runtime";
import { createApp } from "../src/bootstrap/create-app";
import serverlessExpress from "@codegenie/serverless-express";
import { SSMClient } from "@aws-sdk/client-ssm";

jest.mock("../src/bootstrap/create-app", () => ({ createApp: jest.fn() }));
jest.mock("@codegenie/serverless-express", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("runtime secrets", () => {
  it("does not contact SSM when no secret parameter is configured", async () => {
    const send = jest.fn();
    await loadRuntimeSecrets({}, { send } as any);
    expect(send).not.toHaveBeenCalled();
  });
  it("requests decryption and imports only named string secrets, never infrastructure overrides", async () => {
    const env: NodeJS.ProcessEnv = {
      PAYMENT_SECRET_PARAMETER: "/lumen/test",
      AWS_REGION: "safe-region",
    };
    const send = jest.fn().mockResolvedValue({
      Parameter: {
        Value: JSON.stringify({
          PAYMENT_PRIVATE_KEY: "fixture-secret",
          SESSION_SECRET: "session-fixture",
          PAYMENT_PUBLIC_KEY: 123,
          AWS_REGION: "attacker-region",
          NODE_ENV: "development",
        }),
      },
    });
    await loadRuntimeSecrets(env, { send } as any);
    expect(send.mock.calls[0][0].input).toEqual({
      Name: "/lumen/test",
      WithDecryption: true,
    });
    expect(env).toMatchObject({
      PAYMENT_PRIVATE_KEY: "fixture-secret",
      SESSION_SECRET: "session-fixture",
      AWS_REGION: "safe-region",
    });
    expect(env.PAYMENT_PUBLIC_KEY).toBeUndefined();
    expect(env.NODE_ENV).toBeUndefined();
  });
  it.each([
    undefined,
    "",
    "null",
    "[]",
    "123",
    '{"private":"highly-sensitive-fixture"',
  ])(
    "fails closed with sanitized errors for malformed value %p",
    async (raw) => {
      const env: NodeJS.ProcessEnv = {
        PAYMENT_SECRET_PARAMETER: "/lumen/test",
      };
      const send = jest.fn().mockResolvedValue({ Parameter: { Value: raw } });
      await expect(loadRuntimeSecrets(env, { send } as any)).rejects.toThrow(
        /Payment secret parameter/,
      );
      try {
        await loadRuntimeSecrets(env, { send } as any);
      } catch (error) {
        expect(String(error)).not.toContain("highly-sensitive-fixture");
      }
      expect(env.PAYMENT_PRIVATE_KEY).toBeUndefined();
    },
  );
  it("handles missing Parameter and uses the default client when required", async () => {
    const spy = jest
      .spyOn(SSMClient.prototype, "send")
      .mockResolvedValue({} as never);
    await expect(
      loadRuntimeSecrets({ PAYMENT_SECRET_PARAMETER: "/lumen/test" }),
    ).rejects.toThrow("missing a value");
    spy.mockRestore();
  });
});

describe("Lambda cold-start lifecycle", () => {
  const event = { rawPath: "/api/health" },
    context = {} as any,
    callback = jest.fn();
  it("shares a single initializer across concurrent invocations", async () => {
    const adapter = jest.fn().mockResolvedValue({ statusCode: 200 });
    const factory = jest.fn().mockResolvedValue(adapter);
    const handler = createLambdaHandler(factory);
    await Promise.all([
      handler(event, context, callback),
      handler(event, context, callback),
    ]);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(adapter).toHaveBeenCalledWith(event, context, callback);
  });
  it("retries failed initialization without rebuilding a healthy application", async () => {
    const adapter = jest.fn().mockResolvedValue({ statusCode: 200 });
    const factory = jest
      .fn()
      .mockRejectedValueOnce(new Error("temporary initialization failure"))
      .mockResolvedValue(adapter);
    const handler = createLambdaHandler(factory);
    await expect(handler(event, context, callback)).rejects.toThrow(
      "temporary initialization failure",
    );
    await expect(handler(event, context, callback)).resolves.toEqual({
      statusCode: 200,
    });
    await handler(event, context, callback);
    expect(factory).toHaveBeenCalledTimes(2);
  });
  it("connects the actual default bootstrap and Express adapter", async () => {
    const original = process.env.PAYMENT_SECRET_PARAMETER;
    delete process.env.PAYMENT_SECRET_PARAMETER;
    try {
      const expressApp = {};
      const adapter = jest.fn().mockResolvedValue({ statusCode: 200 });
      jest.mocked(createApp).mockResolvedValue({
        getHttpAdapter: () => ({ getInstance: () => expressApp }),
      } as any);
      jest
        .mocked(serverlessExpress)
        .mockReturnValue(
          adapter as unknown as ReturnType<typeof serverlessExpress>,
        );
      await createLambdaHandler()(event, context, callback);
      expect(serverlessExpress).toHaveBeenCalledWith({ app: expressApp });
    } finally {
      if (original !== undefined)
        process.env.PAYMENT_SECRET_PARAMETER = original;
    }
  });
});

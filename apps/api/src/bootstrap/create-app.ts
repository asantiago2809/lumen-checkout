import "reflect-metadata";
import { BadRequestException, Module, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { json } from "express";
import { CheckoutService } from "../application/checkout.service";
import { CheckoutStore, PaymentGateway, Runtime } from "../application/ports";
import { FileStore } from "../infrastructure/persistence/file.store";
import { DynamoStore } from "../infrastructure/persistence/dynamo.store";
import { SandboxGateway } from "../infrastructure/payment/sandbox.gateway";
import {
  ApiController,
  CheckoutRequest,
} from "../infrastructure/http/api.controller";
import {
  CheckoutGuard,
  requestProtection,
  SafeExceptionFilter,
} from "../infrastructure/http/security";

export interface AppOptions {
  store?: CheckoutStore;
  gateway?: PaymentGateway;
  runtime?: Runtime;
  env?: NodeJS.ProcessEnv;
}
export async function createApp(options: AppOptions = {}) {
  const env = options.env ?? process.env;
  if (
    env.NODE_ENV === "production" &&
    (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)
  )
    throw new Error(
      "Production requires SESSION_SECRET of at least 32 characters",
    );
  if (
    env.NODE_ENV === "production" &&
    env.STORE_DRIVER !== "dynamodb" &&
    !options.store
  )
    throw new Error("Production requires durable DynamoDB storage");
  const secret = env.SESSION_SECRET ?? "local-development-only-session-secret";
  const runtime: Runtime = options.runtime ?? {
    now: () => new Date(),
    id: randomUUID,
    token: () => randomBytes(32).toString("base64url"),
    hash: (value) => createHmac("sha256", secret).update(value).digest("hex"),
  };
  const store =
    options.store ??
    (env.STORE_DRIVER === "dynamodb"
      ? new DynamoStore(
          DynamoDBDocumentClient.from(
            new DynamoDBClient({ region: env.AWS_REGION ?? "us-east-1" }),
            { marshallOptions: { removeUndefinedValues: true } },
          ),
          env.DYNAMODB_TABLE ?? "lumen-checkout",
        )
      : new FileStore(
          env.LOCAL_DATA_PATH ?? resolve(process.cwd(), ".data/checkout.json"),
        ));
  const gateway =
    options.gateway ??
    new SandboxGateway({
      apiUrl: env.PAYMENT_API_URL,
      publicKey: env.PAYMENT_PUBLIC_KEY,
      privateKey: env.PAYMENT_PRIVATE_KEY,
      integritySecret: env.PAYMENT_INTEGRITY_SECRET,
    });
  const service = new CheckoutService(store, gateway, runtime);
  await service.seed();
  @Module({
    controllers: [ApiController],
    providers: [{ provide: CheckoutService, useValue: service }],
  })
  class AppModule {}
  const app = await NestFactory.create(AppModule, {
    logger: false,
    bodyParser: false,
  });
  app.setGlobalPrefix("api");
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
        },
      },
    }),
  );
  app.use((request: CheckoutRequest, response: any, next: () => void) => {
    request.requestId = randomUUID();
    response.setHeader("X-Request-Id", request.requestId);
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(
    requestProtection(
      (env.ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:3001")
        .split(",")
        .map((value) => value.trim()),
    ),
  );
  app.use(json({ limit: "32kb" }));
  app.use(cookieParser());
  app.useGlobalGuards(new CheckoutGuard(service));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: "VALIDATION_ERROR",
          message: "Revisa los datos indicados.",
          fields: Object.fromEntries(
            errors.map((error) => [
              error.property,
              "Dato inválido o incompleto.",
            ]),
          ),
        }),
    }),
  );
  app.useGlobalFilters(new SafeExceptionFilter());
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Lumen Checkout API")
      .setDescription(
        "Sandbox checkout. Bootstrap a checkout session, pass X-CSRF-Token on writes, and use Idempotency-Key to create transactions. Card details never enter this API.",
      )
      .setVersion("1.0.0")
      .addCookieAuth("checkout_session")
      .addApiKey({ type: "apiKey", in: "header", name: "X-CSRF-Token" }, "csrf")
      .build(),
  );
  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json",
    swaggerOptions: { persistAuthorization: false },
  });
  await app.init();
  return app;
}

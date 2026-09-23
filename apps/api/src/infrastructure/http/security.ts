import {
  ArgumentsHost,
  CanActivate,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { CheckoutService } from "../../application/checkout.service";
import { CheckoutRequest, unwrap } from "./api.controller";

export class CheckoutGuard implements CanActivate {
  constructor(private readonly service: CheckoutService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CheckoutRequest>();
    const path = request.path.replace(/\/$/, "");
    const publicGet =
      request.method === "GET" &&
      (path === "/api/health" ||
        path === "/api/checkout/config" ||
        path === "/api/products" ||
        path.startsWith("/api/products/"));
    if (
      publicGet ||
      (path === "/api/checkout/session" && request.method === "POST")
    )
      return true;
    request.checkout = unwrap(
      await this.service.sessionFromToken(request.cookies?.checkout_session),
    );
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const token = request.header("x-csrf-token") ?? "";
      const expected = request.checkout.csrfToken;
      if (
        Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
      )
        throw new HttpException(
          {
            code: "CSRF_INVALID",
            message: "Actualiza la página para continuar.",
          },
          403,
        );
    }
    return true;
  }
}

export function requestProtection(
  origins: string[],
  now: () => number = Date.now,
) {
  const limits = new Map<string, { count: number; reset: number }>();
  return (request: Request, response: Response, next: NextFunction) => {
    const time = now();
    for (const [key, limit] of limits)
      if (limit.reset <= time) limits.delete(key);
    const sensitive =
      request.path.endsWith("/pay") || request.path === "/api/checkout/session";
    const key = `${request.ip}:${sensitive ? "sensitive" : "general"}`;
    const limit = limits.get(key) ?? { count: 0, reset: time + 60000 };
    limit.count++;
    limits.set(key, limit);
    if (limit.count > (sensitive ? 40 : 240))
      return response
        .status(429)
        .setHeader("Retry-After", "60")
        .json({
          error: {
            code: "RATE_LIMITED",
            message: "Espera un momento antes de volver a intentar.",
          },
        });
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      if (!origins.includes(request.header("origin") ?? ""))
        return response.status(403).json({
          error: {
            code: "ORIGIN_INVALID",
            message: "Origen de solicitud no autorizado.",
          },
        });
      if (request.method !== "DELETE" && !request.is("application/json"))
        return response.status(415).json({
          error: {
            code: "JSON_REQUIRED",
            message: "Se requiere un cuerpo JSON.",
          },
        });
    }
    next();
  };
}

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<CheckoutRequest>();
    const parserError = error as { type?: string } | null;
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : parserError?.type === "entity.too.large"
          ? 413
          : parserError?.type === "entity.parse.failed"
            ? 400
            : 500;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const details =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    response.status(status).json({
      error: {
        code:
          typeof details.code === "string"
            ? details.code
            : status === 404
              ? "NOT_FOUND"
              : status === 500
                ? "INTERNAL_ERROR"
                : "REQUEST_INVALID",
        message:
          typeof details.message === "string" && status !== 500
            ? details.message
            : "No fue posible completar la solicitud.",
        ...(details.fields ? { fields: details.fields } : {}),
        requestId: request.requestId,
      },
    });
  }
}

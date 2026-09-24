import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpException,
  Param,
  Post,
  Put,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { CheckoutService } from "../../application/checkout.service";
import { Session } from "../../domain/models";
import { Result } from "../../domain/result";
import { CreateDto, DraftDto, EmptyDto, PayDto, QuoteDto } from "./dtos";

export type CheckoutRequest = Request & {
  checkout: Session;
  requestId: string;
};
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok)
    throw new HttpException(result.error, result.error.httpStatus);
  return result.value;
}

@ApiTags("Checkout")
@ApiCookieAuth("checkout_session")
@Controller()
export class ApiController {
  constructor(private readonly checkout: CheckoutService) {}
  @Get("health")
  @ApiOperation({ summary: "Application readiness" })
  health() {
    return { data: { status: "ok" } };
  }
  @Get("products")
  @ApiOperation({ summary: "Seeded products with available stock" })
  async products() {
    return { data: unwrap(await this.checkout.products()) };
  }
  @Get("products/:id")
  async product(@Param("id") id: string) {
    return { data: unwrap(await this.checkout.product(id)) };
  }
  @Get("checkout/config")
  @ApiOperation({
    summary: "Sandbox public configuration and current consent policies",
  })
  async config() {
    return { data: unwrap(await this.checkout.gateway.config()) };
  }
  @Post("checkout/session")
  @ApiBody({ type: EmptyDto })
  async bootstrap(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() _body: EmptyDto,
  ) {
    const result = await this.checkout.bootstrap(
      request.cookies?.checkout_session,
    );
    response.cookie("checkout_session", result.token, {
      httpOnly: true,
      secure: request.secure || process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api",
      maxAge: 86400000,
    });
    response.status(result.created ? 201 : 200);
    return { data: this.checkout.sessionView(result.session) };
  }
  @Get("checkout/session")
  session(@Req() request: CheckoutRequest) {
    return { data: this.checkout.sessionView(request.checkout) };
  }
  @Put("checkout/draft")
  @ApiBody({ type: DraftDto })
  @ApiSecurity("csrf")
  async draft(@Req() request: CheckoutRequest, @Body() body: DraftDto) {
    return {
      data: unwrap(await this.checkout.saveDraft(request.checkout.id, body)),
    };
  }
  @Delete("checkout/draft")
  @HttpCode(204)
  @ApiSecurity("csrf")
  async clear(@Req() request: CheckoutRequest) {
    unwrap(await this.checkout.clearDraft(request.checkout.id));
  }
  @Post("checkout/quote")
  @HttpCode(200)
  @ApiBody({ type: QuoteDto })
  @ApiSecurity("csrf")
  async quote(@Body() body: QuoteDto) {
    return {
      data: unwrap(await this.checkout.quote(body.productId, body.quantity)),
    };
  }
  @Post("transactions")
  @ApiBody({ type: CreateDto })
  @ApiSecurity("csrf")
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    description: "A UUID reused for retries of the same purchase attempt",
  })
  @ApiOperation({
    summary:
      "Reserve inventory and create a PENDING transaction before payment",
  })
  async create(
    @Req() request: CheckoutRequest,
    @Body() body: CreateDto,
    @Headers("idempotency-key") key: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (
      !key ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key,
      )
    )
      throw new HttpException(
        {
          code: "IDEMPOTENCY_KEY_REQUIRED",
          message:
            "El intento de compra requiere una llave de idempotencia UUID.",
        },
        400,
      );
    const result = unwrap(
      await this.checkout.create(request.checkout.id, key, body),
    );
    response
      .status(result.created ? 201 : 200)
      .location(`/api/transactions/${result.transaction.id}`);
    return { data: result.transaction };
  }
  @Post("transactions/:id/pay")
  @ApiBody({ type: PayDto })
  @ApiSecurity("csrf")
  @ApiOperation({
    summary: "Submit one payment; repeated calls never charge again",
  })
  async pay(
    @Req() request: CheckoutRequest,
    @Param("id") id: string,
    @Body() body: PayDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = unwrap(
      await this.checkout.pay(request.checkout.id, id, body),
    );
    response.status(result.status === "PENDING" ? 202 : 200);
    return { data: result };
  }
  @Get("transactions/:id")
  async transaction(@Req() request: CheckoutRequest, @Param("id") id: string) {
    return {
      data: unwrap(await this.checkout.transaction(request.checkout.id, id)),
    };
  }
  @Get("customers/:id")
  async customer(@Req() request: CheckoutRequest, @Param("id") id: string) {
    return {
      data: unwrap(await this.checkout.customer(request.checkout.id, id)),
    };
  }
  @Get("deliveries/:id")
  async delivery(@Req() request: CheckoutRequest, @Param("id") id: string) {
    return {
      data: unwrap(await this.checkout.delivery(request.checkout.id, id)),
    };
  }
}

# Lumen Checkout API

NestJS/TypeScript backend for the five-step sandbox checkout. The domain owns prices, inventory invariants and financial state. Application use cases return explicit `Result` values. HTTP, file storage, DynamoDB and the sandbox provider are adapters.

## Run locally

From the repository root, install the workspaces and copy this application's `.env.example` to an ignored `.env`, supplying sandbox values locally. Run `npm run dev -w apps/api`. The API defaults to port 3001; the web development server proxies `/api` to it. Development uses the TypeScript compiler so Nest's runtime DTO metadata is preserved.

- `GET /api/health`: readiness.
- `GET /api/docs`: interactive OpenAPI.
- `GET /api/docs-json`: portable API specification.
- `npm run build -w apps/api`: compile production JavaScript.
- `npm run typecheck -w apps/api`: type checks, including tests.
- `npm run test:coverage -w apps/api`: deterministic Jest suite and coverage.

Bootstrap a session with `POST /api/checkout/session`, `{}` body and an allowed `Origin`. Reuse its HttpOnly cookie, and send the returned `csrfToken` in `X-CSRF-Token` for writes. Create a PENDING transaction using a UUID `Idempotency-Key`, then submit its ephemeral card token to `/api/transactions/:id/pay`. Full request/response contracts are in `docs/architecture/api-contract.md` at the repository root. Cards are tokenized directly by the browser; this API rejects full card fields.

## Persistence and concurrency

`STORE_DRIVER=file` is durable local development storage for **one process**. It serializes commits, checks expected versions and writes via atomic rename. It is never an acceptable Lambda/cluster adapter.

`STORE_DRIVER=dynamodb` uses `DYNAMODB_TABLE`, `AWS_REGION` and ambient IAM credentials. Table keys are strings `pk` and `sk`. The `pending-index` global secondary index uses `gsi1pk` and `gsi1sk`, projection `ALL`; TTL attribute `expiresAt` applies only to sessions. Products share `pk=CATALOG`; domain entities use typed keys and `sk=META`. Items carry `data` and a monotonically increasing `version`.

Transaction creation atomically reserves the unit, writes customer/transaction/idempotency and updates the session. Approval atomically consumes inventory and creates exactly one delivery. Decline, definite rejection or cancellation releases the reservation without a delivery. Conditional writes retry within a bounded limit. Seeding is idempotent and does not reset existing stock.

## Operational boundaries

- Only the public and UAT sandbox URLs in the allowlist are accepted; key families must match the host. No production fallback or disabled TLS verification exists.
- A lost or ambiguous provider response remains PENDING/UNKNOWN. Its reservation is retained and a duplicate `/pay` does not send another charge. When an external ID exists, authenticated status reads reconcile against the provider.
- There is no verified provider reference-search API in this implementation. A submission with no returned external ID requires operational reconciliation. It is never automatically retried as another charge.
- Unsubmitted reservations expire after 15 minutes, released atomically during product, quote or transaction reads. A background reconciliation worker and signed webhook endpoint are optional follow-up work, **not implemented** and not claimed as delivered features.
- Browser refresh retrieves its server-side draft and transaction using the session cookie. It never restores card fields or full card tokens. Session drafts expire after 24 hours; financial records persist.
- HTTP burst limiting is per running process. It complements Origin/CSRF checks and strict DTO validation; a larger deployment should add an edge/distributed quota.

## Lambda configuration

Exported handler: `dist/lambda.handler`. The first invocation may read `PAYMENT_SECRET_PARAMETER` using SSM `GetParameter` with decryption. The SecureString JSON may contain `PAYMENT_API_URL`, `PAYMENT_PUBLIC_KEY`, `PAYMENT_PRIVATE_KEY`, `PAYMENT_INTEGRITY_SECRET`, `PAYMENT_EVENTS_SECRET` and `SESSION_SECRET`; other keys are ignored. Production requires a session secret of at least 32 characters and DynamoDB storage. Secret values are never logged or written into the browser bundle.

## Verified implementation handoff

On 23 September 2026, local typecheck/build and 65 Jest tests passed. Coverage of all implementation files except the two thin process entrypoints: statements 99.86%, branches 95.02%, functions 96.90%, lines 99.86%. Reports are generated under `coverage/`, including `coverage-summary.json` and `lcov.info`. Tests cover ROP failure paths, server amounts, retries, final-unit concurrency, repeated finalization, expiry/claim races, uncertain payments, owner authorization, Origin/CSRF, strict nested DTOs, body limits, file persistence, DynamoDB command contracts, provider mappings, SSM allowlisting and Lambda cold-start lifecycle. The SSM loader and Lambda initialization/cache logic are included in coverage and each has 100% in all metrics.

These are deterministic local results. The UAT sandbox TLS chain was unavailable during integration checks; no real payment or live DynamoDB/cloud check is certified by this handoff. Independent QA and the release process must record those evidence levels separately.

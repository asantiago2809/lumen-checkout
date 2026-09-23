# Changelog

Changes are recorded as implemented and verified. Git contains the incremental development record; an unreleased entry does not imply a public deployment or completed sandbox integration.

## Unreleased — 2026-09-23

### Added

- React/Redux Toolkit SPA with product, card/delivery modal, summary backdrop, result and product-return flow.
- Original Lumen identity, responsive WebP product artwork, SVG fallback, shared CSS tokens and mobile-first layouts.
- Card validation/brand detection, explicit consent, ephemeral tokenization data, accessible modal focus and field errors.
- Server-side drafts and refresh recovery of existing transactions without a second payment submission.
- NestJS/TypeScript API with thin controllers, hexagonal ports/adapters and explicit Result/ROP error paths.
- Persistent products, customers, transactions and deliveries; integer-centavo prices and fixed server-calculated fees.
- Durable PENDING creation before payment, idempotency, conditional stock reservations and atomic delivery/inventory finalization.
- Single-process durable file storage for development and DynamoDB transactional storage for deployment.
- Sandbox-only provider adapter, integrity signing, private-key lookups and honest handling of ambiguous responses.
- HttpOnly cookies, Origin/CSRF and ownership checks, strict DTOs, body/rate limits, sanitized errors and security headers.
- Swagger/OpenAPI, reproducible onboarding, data model, API contract and environment template without credentials.
- AWS infrastructure, production API packaging, SSM allowlist and tested Lambda initialization/retry behavior.
- Role prompts, an 82-control requirements matrix and independent design/security/QA reviews.
- GitHub Actions workflow for clean installation, secret scanning, type checks, Jest coverage, builds and independent browser tests.
- Restricted static-delivery Lambda and five tests, providing same-origin AWS HTTPS when CloudFront account verification is unavailable.

### Corrected during review

- Revalidated expired reservations in product, quote, transaction and idempotent replay paths.
- Prevented stale expiry observations from releasing inventory after a payment claim.
- Supported direct and nested provider card metadata while exposing only brand and last four digits.
- Preserved Nest decorator metadata and documented real DTO fields, CSRF and idempotency headers in Swagger.
- Returned sanitized HTTP 400/413 for malformed or oversized JSON.
- Moved SSM parsing/allowlisting and Lambda cache/retry logic into covered modules outside thin entrypoints.
- Added recovery, long-summary and narrow/landscape responsive regressions.

### Verified locally

- API: **65** passing Jest tests; statements **98.21%**, branches **95.02%**, functions **96.90%**, lines **98.21%**.
- Web: **82** passing Jest tests; statements **96.10%**, branches **95.27%**, functions **95.23%**, lines **97.20%**.
- Independent Playwright: **55** passing executions, comprising 11 API scenarios and 11 browser scenarios across four projects; zero failures, skips or flaky outcomes in the recorded run.
- Type checks and builds passed locally. The [README](README.md) and [QA report](docs/quality/qa-report.md) explain the commands, reports and test boundaries.

### Open release checks and deliberate limits

- Real payment evidence remains blocked by UAT TLS trust failure; certificate verification has not been disabled.
- Hosted Linux CI passed on `eda790c`; later revisions have their own runs. AWS static delivery and a live DynamoDB adapter probe passed, while API initialization and Swagger await encrypted runtime configuration. See the release report.
- Signed webhooks and a scheduled reconciliation worker are not implemented; relevant reads reconcile status and expire unsubmitted reservations.
- An uncertain submission without an external ID requires operational reconciliation and is not automatically resubmitted.
- Local file persistence is single-process only, and request-rate counters are per process.

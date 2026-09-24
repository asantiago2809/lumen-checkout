# Changelog

Changes are recorded as implemented and verified. Git contains the incremental development record; an unreleased entry does not imply a public deployment or completed sandbox integration.

## Independent rubric review — 2026-09-23

- Preserved the initial 144/150 internal assessment and its blocking finding: another tab could make the checkout summary differ from the reserved order.
- Store the normalized draft atomically with the reservation and reject later draft writes during PENDING, including after a CAS retry. Recovery now adopts the authoritative draft and transaction together and clears the previous quote, card and consents.
- Added seven backend regressions and three browser scenarios across four projects. Independent verification on `ad641f4`: 75 API + 82 web Jest tests and 91 E2E executions passed; both applications exceed 95% in all four coverage metrics.
- Recorded the failing original scenarios, corrected the stale consent checklist entry, and assigned performance, domain/HTTP separation, provider response typing and unsaved-edit feedback improvements. See the [rubric report](docs/quality/rubric-evaluation.md) for the current grade and deployed retest status; the earlier audit below remains historical evidence.

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
- Removed CTA movement when reduced motion is requested; enlarged summary edit and consent targets to at least 44px.
- Closed browser producers and drained real asynchronous fixture work before deleting temporary stores, resolving the CI teardown race.
- Persisted plain draft snapshots at the domain boundary after live DynamoDB exposed unsupported transport DTO instances; regression exercises real HTTP transformation and AWS SDK serialization.
- Pinned current Node 24 GitHub Actions by full commit and disabled persisted checkout credentials.

### Verified locally

- API: **68** passing Jest tests; statements **98.48%**, branches **95.28%**, functions **100%**, lines **98.48%**.
- Web: **82** passing Jest tests; statements **96.10%**, branches **95.27%**, functions **95.23%**, lines **97.20%**.
- Independent Playwright: **79** passing executions, comprising 11 API scenarios and 17 browser scenarios across four projects; zero failures, skips or flaky outcomes in the recorded local run. WebKit's native link-tabbing limitation is documented explicitly.
- Type checks and builds passed locally. The [README](README.md) and [QA report](docs/quality/qa-report.md) explain the commands, reports and test boundaries.

### Live deployment and deliberate limits

- Real sandbox approval and decline passed in Linux Chromium against public AWS and UAT, with one submission per purchase, refresh recovery, stock 12→11 on approval only and a delivery only for approval. TLS verification remained enabled. Live run: `35936568755`.
- Hosted Linux CI passed on `fca0339`: 68 API + 82 web Jest, 79 E2E and five static-handler tests, plus secret scan/typecheck/build. Live AWS checks pass for encrypted SSM configuration, API initialization, catalogue, Swagger, secure sessions, drafts, Origin/CSRF, idempotency and reservation release. See the release report for separate provider evidence.
- Stopped the identified previous assessment EC2 instance after the replacement passed real sandbox checks; retained its data and configuration for recovery.
- Signed webhooks and a scheduled reconciliation worker are not implemented; relevant reads reconcile status and expire unsubmitted reservations.
- An uncertain submission without an external ID requires operational reconciliation and is not automatically resubmitted.
- Local file persistence is single-process only, and request-rate counters are per process.

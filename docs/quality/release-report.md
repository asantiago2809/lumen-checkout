# Release verification — 2026-09-23

**Current release: final application improvements deployed and verified, including a new genuine sandbox approval/decline.** The [delivery audit](delivery-audit.md) contains the current independent grade, individual 82-control checklist and readiness decision. The [rubric history](rubric-evaluation.md), earlier audit and older payment evidence retain their original versions and scope. Initial mobile latency remains a documented limitation. The previous assessment instance is stopped. No assessment has been sent to the employer.

## Final improvement release

Application revision `a150336` includes compressed static delivery, exhaustive domain-to-HTTP error mapping, explicit validation of unknown provider JSON, and reliable draft save feedback with close-time persistence. `f096001` only relocates performance output; `71187e4` adds actual TLS-wire HEAD verification and increases static Lambda memory to 512 MiB. API, web and static handler source remain unchanged after the independent application freeze.

| Gate | Verified result | Evidence |
| --- | --- | --- |
| Independent local verification | 81 API + 89 web Jest tests; 103 E2E; 12 static-handler tests; typecheck/build passed | [Gates](../../tests/e2e/evidence/2026-09-23-delivery-gates.json), [individual E2E results](../../tests/e2e/evidence/2026-09-23-delivery-full-103.json) |
| Linux CI | SUCCESS on `f096001`, same application source | [35950070341](https://github.com/asantiago2809/lumen-checkout/actions/runs/35950070341); final PR and main run status remains available in [Actions](https://github.com/asantiago2809/lumen-checkout/actions/workflows/quality.yml) |
| AWS deployment | UPDATE_COMPLETE; both runtime zip hashes match; API/static memory 512 MiB | [Artifact and runtime evidence](../../tests/e2e/evidence/2026-09-23-delivery-deployment.json) |
| Public API regression | 24 checks PASS plus provider config HTTP 200; own reservation cancelled and released | [API evidence](../../tests/e2e/evidence/2026-09-23-delivery-cloud-api.json) |
| Public cross-tab recovery | Updated assets, authoritative recipient/address, card/consents cleared; no tokenization/payment; own stock 11→10→11 | [Browser evidence](../../tests/e2e/evidence/2026-09-23-delivery-cloud-ui/report.json) |
| Genuine provider regression | APPROVED with delivery and stock 11→10; DECLINED without delivery and stock 10→10 | [Sandbox workflow 35950887803](https://github.com/asantiago2809/lumen-checkout/actions/runs/35950887803), [sanitized report and screenshots](../../tests/e2e/evidence/live-sandbox-35950887803/report.json) |

Both real sandbox cases issued exactly one PENDING creation, direct card tokenization and payment POST, then recovered the same transaction after refresh. The Linux browser used normal TLS and no intercepted responses. The report records zero network failures and a browser `ERR_ABORTED` draft DELETE at product return per case; it also records the completed DELETE HTTP 204. These observations are retained without inventing a cause. The memory-only update happened after this payment pair and did not change application code; no additional payments were needed.

The API zip is `api/api-929a550-20260923220204.zip` (17,544,828 bytes), SHA256 `B5C4518A7CCAEA33C0528AE46799F45151AFD325D06CFAD08583A99CCD456C12`. The static zip is `web/web-497a00175cc1.zip` (3,610 bytes), SHA256 `5E8EA50152823D9D858B3227ABD34F1C6F6CA93F623ED6F80AC32556ACAD7DE0`. The API archive has 12,411 entries, includes the Lambda handler and contains no environment file. Its production dependency audit reported zero vulnerabilities. Browser assets are `index-CjZzrNZL.js` (282,680 bytes) and `index-Dg5qOyc5.css` (19,571 bytes), uploaded before the no-cache entrypoint; previous hashed assets were retained.

### Performance observations and remaining limit

The [initial summary](../../tests/e2e/evidence/2026-09-23-delivery-performance-initial-summary.json) preserves a 12.332-second mobile outlier. Its raw temporary report was removed by Playwright cleanup before copying, so it is explicitly a summary, not reconstructed raw evidence. A separate [full baseline](../../tests/e2e/evidence/2026-09-23-delivery-performance-before.json) retains twelve navigations and the original HEAD metadata mismatch. The probe output now lives outside Playwright cleanup.

The [first post-compression report](../../tests/e2e/evidence/2026-09-23-delivery-performance-after.json) verified transfer savings but recorded a 13.172-second mobile first visit. Platform REPORT records show initial static executions of 4.267/4.432 seconds at 128 MiB, and API initialization plus work above two seconds. They establish server execution delay in that interval, without isolating a unique cause. After increasing the static function to 512 MiB, the [final report](../../tests/e2e/evidence/2026-09-23-delivery-performance-tuned.json) records:

| Viewport / visit | LCP min / median / max, seconds | Maximum CLS |
| --- | --- | --- |
| Mobile 375×667, first visit | 0.748 / 1.592 / 4.976 | 0 |
| Mobile, repeat visit | 0.220 / 0.236 / 0.336 | 0 |
| Desktop 1440×900, first visit | 0.672 / 0.692 / 1.020 | 0.0158 |
| Desktop, repeat visit | 0.236 / 0.236 / 0.244 | 0.0158 |

All twelve final navigations loaded images without overflow or failed requests. Gzip transfers JavaScript in **90,643 bytes (67.93% reduction)** and CSS in **4,759 bytes (75.68% reduction)**. Decoded hashes match identity; `gzip;q=0`, `Vary`, immutable caching and security headers pass. Actual TLS-wire HEAD responses contain zero body bytes and the same length/encoding metadata as GET. Three fresh browser contexts per viewport with repeat visits provide observations, not controlled cold-Lambda experiments, field percentiles or a universal latency guarantee. The 4.976-second first mobile visit remains visible in the final quality decision.

### Deployment incidents retained

The first application update failed with S3 `NoSuchKey` even though the earlier upload process exited zero. CloudFormation rolled back successfully. Release uploaded the API zip through explicit `put-object`, verified its MD5/ETag and all four artifact/asset byte sizes, and retried successfully at 03:13:54 UTC. The index was published only after the successful application update.

A later performance adjustment attempted API memory of 1,024 MiB; this account rejected values above 512 MiB. The immediate rollback collided with an in-progress static update (409), temporarily leaving UPDATE_ROLLBACK_FAILED. Release waited for the function to finish and continued rollback without skipping resources. The final template changes only static memory 128→512 MiB, leaves API at 512 MiB and reached UPDATE_COMPLETE. No financial records were rolled back. The final template passes cfn-lint; AWS template validation also passed. The runbook now requires object verification before updates and explicit stable-state verification after rollback.

The remaining sections are historical release records and keep their original revision identifiers, counts and limits.

## Source and automated evidence

- Public repository: https://github.com/asantiago2809/lumen-checkout
- Implementation pull request: https://github.com/asantiago2809/lumen-checkout/pull/1
- Hosted Linux run: https://github.com/asantiago2809/lumen-checkout/actions/runs/35932314066 — success on `eda790c`, including clean install, secret scan, type checks, 147 Jest tests, builds and 55 independent E2E executions.
- Updated code/infrastructure Linux run: https://github.com/asantiago2809/lumen-checkout/actions/runs/35933599708 — success on `f84fc56`, also including the five restricted static-delivery tests. This verifies the final formatting and alternative HTTPS implementation.
- Expanded Linux run: https://github.com/asantiago2809/lumen-checkout/actions/runs/35935640877 — success on `3edc404`, including 79 independent E2E executions, modern pinned Node 24 actions and the fixture shutdown correction. The preceding CI teardown failure is retained in GitHub; it was corrected rather than hidden with test retries.
- Final application Linux run: https://github.com/asantiago2809/lumen-checkout/actions/runs/35936553836 — success on `fca0339`, including the DynamoDB regression: 68 API + 82 web Jest tests, 79 E2E executions, five static-handler tests, secret scan, typecheck and build.
- Subsequent API formatting commit: `ceb1965`, with another successful local typecheck/build and 65 Jest tests. Final coverage is recorded in the README and QA report; formatting changed line-count denominators.
- Static delivery adapter: five Node tests passed and independently reproduced. They cover allowed paths, traversal rejection, MIME/cache/HEAD behavior, private error handling and response-size limits.
- Both CloudFormation templates pass cfn-lint. The first cloud template also passed AWS `validate-template` before provisioning.
- Exact comparison against all five configured key/session values found zero matches in repository files, Git patch history and the built frontend. The reusable pattern scan also passed. Values were not printed or copied into this report.

## Subsequent rubric correction — `ad641f4`

The independent rubric review found that a second tab could change the visible recipient/address after another tab reserved a different order. Creation now writes the normalized reservation draft atomically, later writes receive `409 PAYMENT_IN_PROGRESS` even after a CAS retry, and client recovery replaces the draft and transaction together. Card and consents are cleared when recovering a conflict.

- Source: `ad641f4b2e2327aebbf5ebbe7e726f324535e373`, [PR3](https://github.com/asantiago2809/lumen-checkout/pull/3).
- [Independent Jest evidence](../../tests/e2e/evidence/2026-09-23-rubric-jest.json): 75 API + 82 web passing tests. [Independent E2E evidence](../../tests/e2e/evidence/2026-09-23-rubric-full-91.json): 91 passing executions, zero failures, skips or flaky outcomes. The new cases failed against the old behavior; their [historical summary](../../tests/e2e/evidence/2026-09-23-rubric-red-summary.json) preserves that result separately.
- [Linux CI 35939598641](https://github.com/asantiago2809/lumen-checkout/actions/runs/35939598641): success on the exact application commit, including 157 Jest, 91 E2E, five static-handler tests, secret scan, typecheck and build.
- API artifact: `api/api-ad641f4-20260923194156.zip`, SHA256 `F3F25AE9422E99DC426CC84CA27E26F3C399E234520546C769B2B7EC71CB153C`. Its 12,407 entries include the Lambda handler and no environment files. Production dependency audit reported zero vulnerabilities. Stack update completed; the new `index-DaPTUmLB.js` (281,035 bytes) was uploaded before the no-cache entrypoint. CSS remains `index-CAoB3uCW.css` and old hashed files were retained.
- [Cutover evidence](../../tests/e2e/evidence/2026-09-23-rubric-deployment.json): complete consistent base-table counts found **zero PENDING** reservations before and after the deployment (27 records scanned each time). The fix protects newly created reservations; it does not repair an inconsistent historical draft restored from a backup. Test tabs must load the updated bundle.
- [Live API retest](../../tests/e2e/evidence/2026-09-23-rubric-cloud-api.json), 2026-09-24T00:47:04Z: 24 checks passed plus sandbox configuration HTTP 200. A divergent earlier draft is replaced by the reserved order, stale writes and second-tab creation receive 409, recovery returns the confirmed details, and cancellation restores availability without a payment or delivery. The earlier real sandbox payment report is unchanged and is not presented as a new payment on this revision.
- [Live browser retest](../../tests/e2e/evidence/2026-09-23-rubric-cloud-ui/report.json), 00:49:04–00:49:24 UTC: Chromium 153 at 375×667 loaded the exact updated assets and verified R09 through two real tabs without reloading. Recovery clears the card/consents and displays the reserved recipient/address. There were zero tokenization or payment attempts and no mocked API responses; an explicit network guard would block and fail any payment attempt. Its own unsubmitted reservation was cancelled to ERROR/NOT_STARTED without delivery, restoring stock 11→10→11. The [masked screenshot](../../tests/e2e/evidence/2026-09-23-rubric-cloud-ui/recovered-summary-masked.png) excludes personal/card input data.

The [rubric report](rubric-evaluation.md) preserves the initial 144/150, the independent reevaluation and remaining improvements. The sections below describe the original deployment checks and retain their historical timestamps and versions.

## AWS provisioning and smoke checks

Region: `us-east-1`. Stacks: `lumen-checkout-artifacts` and `lumen-checkout`.

CloudFront creation was denied because the account requires verification. That failed attempt was rolled back. Its retained provisional bucket and table were checked empty and removed; the earlier assessment was not changed. The successful replacement uses API Gateway HTTPS, a restricted static-delivery Lambda, a private S3 bucket, the Nest Lambda and DynamoDB. CloudFront remains an optional infrastructure parameter for verified accounts.

The application stack reached `CREATE_COMPLETE`, then `UPDATE_COMPLETE` when `AllowedOrigins` was set to the exact HTTPS origin.

Public endpoint: https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com

| Probe | Observed result | Meaning |
| --- | --- | --- |
| `GET /` | 200, 665-byte HTML, CSP, `no-cache` | Static entrypoint is reachable with trusted HTTPS |
| Hashed JavaScript | 200, 280,853 bytes, correct MIME, immutable cache | Production script delivered |
| Hashed CSS | 200, 18,839 bytes, correct MIME, immutable cache | Updated accessible production styles delivered |
| Mobile WebP | 200, 12,192 bytes, image MIME | Product asset delivered |
| `GET /.env` | 404 | Non-allowlisted files are not served |
| `GET /api/health` | 200 | Backend initializes with encrypted SSM configuration |
| `GET /api/docs` and `/api/docs-json` | 200; browser shows 14 operations, all Swagger assets 200, no console/request errors | Public API documentation works under the actual CSP |
| SSM parameter metadata | `/lumen-checkout/sandbox`, SecureString, version 1 | User completed the reviewed manual configuration; values are not in this evidence |
| Live DynamoDB adapter probe | Create, consistent read, versioned update, stale-write rejection passed | Actual DynamoDB behavior checked through the deployed application's adapter |
| Probe cleanup | Unique `SMOKE#...` item deleted and absence checked | No catalogue, customer or payment records altered |

The initial database probe used the authenticated local release profile. The later public API probe below runs through Lambda's own IAM role and actual DynamoDB persistence.

The original verified API zip was built from `0c74bf7`, SHA256 `072B7066DA2E407FCEB91633DACBA2FA43628196C8B3D60D8F0EB30F21C4AB21`. Its 12,407 archive entries were inspected for the Lambda handler and absence of environment files. The stack reached `UPDATE_COMPLETE`. The static adapter object is keyed by its source hash, `web-a08d71c02d54.zip`. Browser assets at that cut were `index-BfNWFEt7.js` and `index-CAoB3uCW.css`, published before the no-cache index; earlier hashed assets were retained. The current revision is recorded in the subsequent-correction section above.

## Live API regression and pre-payment verification

The first live draft write returned a sanitized HTTP 500 because Nest's transformed DTO instances could not be marshalled by the strict AWS SDK. Commit `0c74bf7` snapshots plain domain data before persistence. Three new tests reproduce the rejected class instance and exercise real HTTP validation, SDK serialization, recovery, idempotency and cancellation. The full backend suite passed 68 tests, and the independent auditor reproduced the three new regressions. Validation and SDK strictness were preserved.

At **2026-09-24 00:01:04 UTC** (September 23 locally), `node scripts/smoke-cloud.mjs https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com` exited 0 with 20 passing checks:

- Public health, security headers, Swagger HTML, OpenAPI contract and seeded catalogue.
- Fresh session with HttpOnly/Secure/SameSite cookie and `no-store`; foreign Origin and invalid CSRF both rejected with 403.
- Draft saved with HTTP 200 and recovered on a separate request; quote uses integer amounts.
- PENDING transaction persisted before payment; idempotent replay returned the same transaction with HTTP 200.
- Public available stock changed 12→11 on reservation; cancellation returned 204, final state ERROR/NOT_STARTED with no delivery and no ability to pay, and availability returned to 12.
- The additional provider configuration check returned 200 with genuine UAT merchant policies. No card, tokenization or payment request was made by this pre-payment probe.

The probe's fictional cancelled attempt remains as an audit record. Public availability assertions alone do not prove physical inventory counts; the final consistent DynamoDB read below complements the browser evidence.

## Genuine provider verification and earlier deployment retirement

[Live workflow 35936568755](https://github.com/asantiago2809/lumen-checkout/actions/runs/35936568755) passed on source `fca0339`, from **00:03:45 to 00:04:20 UTC September 24** (September 23 locally). Chromium 153 on clean Linux ran against the public AWS application and supplied UAT endpoint, with normal TLS and no intercepted responses. Official fictional card fixtures came from the [provider documentation](https://docs.wompi.co/docs/colombia/datos-de-prueba-en-sandbox/).

| Scenario | Provider-facing requests | Verified result |
| --- | --- | --- |
| Approved | One PENDING creation, one direct tokenization (201), one payment submission (202) | APPROVED; delivery fetched and linked to the transaction; available stock 12→11 |
| Declined | One PENDING creation, one direct tokenization (201), one payment submission (202) | DECLINED; no delivery; available stock 11→11 |
| Refresh in both cases | Existing transaction read after submission and terminal reload | Same transaction, no repeated payment POST, safe browser progress |
| Final DynamoDB consistent read | Only inventory fields projected | Physical stock 11, reserved 0, available 11 |

The original safe report retains one non-fatal draft `NETWORK_FAILURE` observation in each scenario. Final draft writes, payment, recovery and stock assertions passed. These entries are not erased or misrepresented as zero network events; their exact transport cause was not retained in that report. Later diagnostics distinguish browser-cancelled requests from network failures.

The local Windows network and connected browsers still report `SELF_SIGNED_CERT_IN_CHAIN` / `ERR_CERT_AUTHORITY_INVALID` for UAT. No certificate bypass was used; the independent remote browser and Lambda establish successful integration in their verified environments.

The earlier `trama-live` deployment's CloudFormation configuration was backed up privately. The EC2 resource was matched by stack resource ID and tags before action. After replacement verification it was stopped, and a subsequent EC2 read confirmed **stopped**. Its volume, retained address and stack remain recoverable and may still incur storage/address charges. This is service retirement, not deletion of all old resources or a claim of zero cost.

The earlier SSM dependency is resolved. Automatic approval review had rejected two agent write attempts despite the user's authorization; neither executed. The user completed the account-validated encrypted script personally, after which metadata and actual Lambda initialization were verified. There is no remaining request for that manual action.

The infrastructure uses metered AWS services. API throttling is configured, logs retain 14 days and Lambda shares the account's five-concurrent-execution quota. Stored data, retained versions and DynamoDB recovery incur usage charges. Rollback instructions are in `infra/README.md`.

# Release verification — 2026-09-23

**Status: implementation verified; release blocked.** The public infrastructure exists, but the API cannot initialize until its encrypted runtime parameter is configured. Genuine provider payment verification is a separate open gate. No assessment submission or complete deployment is claimed.

## Source and automated evidence

- Public repository: https://github.com/asantiago2809/lumen-checkout
- Implementation pull request: https://github.com/asantiago2809/lumen-checkout/pull/1
- Hosted Linux run: https://github.com/asantiago2809/lumen-checkout/actions/runs/35932314066 — success on `eda790c`, including clean install, secret scan, type checks, 147 Jest tests, builds and 55 independent E2E executions.
- Subsequent API formatting commit: `ceb1965`, with another successful local typecheck/build and 65 Jest tests. Final coverage is recorded in the README and QA report; formatting changed line-count denominators.
- Static delivery adapter: five Node tests passed and independently reproduced. They cover allowed paths, traversal rejection, MIME/cache/HEAD behavior, private error handling and response-size limits.
- Both CloudFormation templates pass cfn-lint. The first cloud template also passed AWS `validate-template` before provisioning.
- Exact comparison against all five configured key/session values found zero matches in repository files, Git patch history and the built frontend. The reusable pattern scan also passed. Values were not printed or copied into this report.

## AWS provisioning and smoke checks

Region: `us-east-1`. Stacks: `lumen-checkout-artifacts` and `lumen-checkout`.

CloudFront creation was denied because the account requires verification. That failed attempt was rolled back. Its retained provisional bucket and table were checked empty and removed; the earlier assessment was not changed. The successful replacement uses API Gateway HTTPS, a restricted static-delivery Lambda, a private S3 bucket, the Nest Lambda and DynamoDB. CloudFront remains an optional infrastructure parameter for verified accounts.

The application stack reached `CREATE_COMPLETE`, then `UPDATE_COMPLETE` when `AllowedOrigins` was set to the exact HTTPS origin.

Provisional endpoint: https://j67vc6cdn4.execute-api.us-east-1.amazonaws.com

| Probe | Observed result | Meaning |
| --- | --- | --- |
| `GET /` | 200, 665-byte HTML, CSP, `no-cache` | Static entrypoint is reachable with trusted HTTPS |
| Hashed JavaScript | 200, 280,853 bytes, correct MIME, immutable cache | Production script delivered |
| Hashed CSS | 200, 18,724 bytes, correct MIME, immutable cache | Production styles delivered |
| Mobile WebP | 200, 12,192 bytes, image MIME | Product asset delivered |
| `GET /.env` | 404 | Non-allowlisted files are not served |
| `GET /api/health` | 500 | Backend initialization blocked by absent SSM parameter |
| `GET /api/docs` | 500 | Public API documentation is not yet available |
| CloudWatch initialization diagnostic | `ParameterNotFound` | Confirms the runtime-configuration dependency; no credential value logged |
| Live DynamoDB adapter probe | Create, consistent read, versioned update, stale-write rejection passed | Actual DynamoDB behavior checked through the deployed application's adapter |
| Probe cleanup | Unique `SMOKE#...` item deleted and absence checked | No catalogue, customer or payment records altered |

The database probe used the authenticated local release profile, not the Lambda role; it does not certify the Lambda's full IAM path. Public session cookies, Origin/CSRF behavior and provider integration still require a working API smoke run.

The deployed API zip is built from `ceb1965`, SHA256 `8B49D5D490AAA904D7D0E8D653845DA5318464B2DC110AC1963FE7A6F06E027C`. The static adapter object is keyed by its source hash, `web-a08d71c02d54.zip`. The first inspected API package contained its handler and production Nest dependencies, no `.env`, portable ZIP paths and about 53 MiB uncompressed. Static assets were uploaded before the new index; existing assets were not deleted.

## Open gates and handoff

1. **Encrypted runtime configuration:** the user explicitly authorized storing the PDF's sandbox keys and a newly generated session secret in `/lumen-checkout/sandbox`. Automatic approval review nevertheless rejected the operation twice as blocked by policy without further detail. Neither rejected command executed. The reviewed `scripts/configure-secrets.ps1` validates the destination account, writes only an encrypted SecureString, never prints values and removes its temporary request file. Its syntax was checked without execution; the user has a private account-specific wrapper to complete this step personally. This manual action is still pending.
2. **Working sandbox:** the UAT endpoint fails TLS trust validation locally. The supplied UAT public key is not accepted by the separate public sandbox. A trusted UAT access configuration or authorized matching public-sandbox credentials is needed. No unrelated credentials were sourced and TLS verification remains enabled.
3. **After configuration:** verify public products, session/secure cookie, allowed and denied Origin/CSRF requests, draft recovery, Swagger, and both provider approval/decline paths, including inventory and delivery records. Update this report and the 82-control audit with actual evidence.
4. **Earlier deployment:** its CloudFormation configuration was backed up privately. The prior EC2 assessment remains running and unchanged until the replacement is verified. Its retirement is still pending, not reported as completed.

The infrastructure uses metered AWS services. API throttling is configured, logs retain 14 days and Lambda shares the account's five-concurrent-execution quota. Stored data, retained versions and DynamoDB recovery incur usage charges. Rollback instructions are in `infra/README.md`.

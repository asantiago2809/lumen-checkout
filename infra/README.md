# AWS infrastructure

`template.yaml` describes a private versioned S3 bucket, CloudFront HTTPS, an HTTP API, NestJS Lambda, DynamoDB on-demand with point-in-time recovery, least-privilege runtime role and 14-day logs. The browser uses the same CloudFront origin for static assets and `/api/*`; API responses and cookies are never cached.

This template is prepared, not yet deployed or validated against the target account. The existing assessment must first be identified. Never delete its resources by name guesses or bulk account cleanup. Preserve its configuration and data, deploy this stack separately, verify all gates, then retire only the explicitly identified old assessment.

## Deployment sequence

1. Authenticate the AWS CLI with the intended account and verify its identity/region.
2. Run all local quality gates. `scripts/package-api.ps1` compiles the API with TypeScript and packages the output with production dependencies, preserving Nest decorator metadata and Swagger static assets. Upload its zip under an immutable commit key to a private deployment bucket.
3. Save runtime settings as one SSM SecureString JSON parameter at `/lumen-checkout/sandbox`. It contains `PAYMENT_API_URL`, `PAYMENT_PUBLIC_KEY`, `PAYMENT_PRIVATE_KEY`, `PAYMENT_INTEGRITY_SECRET`, `PAYMENT_EVENTS_SECRET` and `SESSION_SECRET`. Read values from the ignored environment file; never put them in command arguments, Git or reports. Lambda reads the parameter on cold start.
4. Validate and deploy `template.yaml` with `CAPABILITY_IAM`, `ArtifactBucket`, `ApiArtifactKey` and the parameter name. The initial origin `https://pending.invalid` deliberately prevents checkout writes until the domain is known.
5. Read `SiteUrl` from stack outputs and update `AllowedOrigins` to that exact HTTPS origin, preserving other parameters. Upload the SPA build to `WebBucketName`; use long immutable cache control only for hashed assets, no-cache for `index.html`.
6. Invalidate CloudFront as needed. Verify health, Swagger, secure cookies, security headers, real sandbox tokenization/payment, recovery, stock and responsive UX over HTTPS.
7. Record the exact commit, stack and verified URLs in the release report and README. An HTTP 200 homepage alone is not acceptance.

## Costs and rollback

These services incur usage charges; this document does not claim zero cost or free-tier eligibility. API throttling is bounded; Lambda uses the account's unreserved concurrency quota (5 in the deployment account at provisioning). DynamoDB point-in-time recovery, stored data, S3 versions, logs and CloudFront traffic can incur charges. Review account-specific estimates before creating resources.

DynamoDB and the static bucket are retained if the stack is removed. Restore a previous immutable API artifact and the matching static build to roll back; do not roll back committed payment records. Retiring the prior assessment is a separate, documented operation after identifying shared resources and a recovery path.

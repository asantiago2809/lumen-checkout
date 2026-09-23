import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ALLOWED_KEYS = [
  "PAYMENT_API_URL",
  "PAYMENT_PUBLIC_KEY",
  "PAYMENT_PRIVATE_KEY",
  "PAYMENT_INTEGRITY_SECRET",
  "PAYMENT_EVENTS_SECRET",
  "SESSION_SECRET",
] as const;

/** Loads only the secret allowlist. Never logs or returns secret values. */
export async function loadRuntimeSecrets(
  env: NodeJS.ProcessEnv = process.env,
  client?: Pick<SSMClient, "send">,
): Promise<void> {
  if (!env.PAYMENT_SECRET_PARAMETER) return;
  const response = await (client ?? new SSMClient({})).send(
    new GetParameterCommand({
      Name: env.PAYMENT_SECRET_PARAMETER,
      WithDecryption: true,
    }),
  );
  if (!response.Parameter?.Value)
    throw new Error("Payment secret parameter is missing a value");
  let values: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(response.Parameter.Value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("Invalid object");
    values = parsed as Record<string, unknown>;
  } catch {
    throw new Error("Payment secret parameter must contain a JSON object");
  }
  for (const key of ALLOWED_KEYS)
    if (typeof values[key] === "string") env[key] = values[key] as string;
}

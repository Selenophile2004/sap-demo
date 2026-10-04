export type AiProviderId = "groq" | "openai-compatible";

export interface AiRuntimeConfig {
  enabled: boolean;
  provider: AiProviderId;
  apiKey: string;
  model: string;
  baseUrl: string;
  authHeader: string;
  authScheme: string;
  timeoutMs: number;
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

function parseProvider(value: string | undefined): AiProviderId {
  const provider = value?.trim().toLowerCase() || "groq";
  if (provider === "groq" || provider === "openai-compatible") return provider;
  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseEnabled(value: string | undefined): boolean {
  return !["false", "0", "off", "no"].includes(value?.trim().toLowerCase() ?? "");
}

export function resolveAiRuntimeConfig(
  env: Readonly<Record<string, string | undefined>>,
): AiRuntimeConfig {
  const provider = parseProvider(env.AI_PROVIDER);
  const legacyApiKey = provider === "groq" ? env.GROQ_API_KEY : undefined;
  const legacyModel = provider === "groq" ? env.GROQ_MODEL : undefined;
  const baseUrl = firstNonEmpty(
    env.AI_BASE_URL,
    provider === "groq" ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1",
  ).replace(/\/+$/, "");

  return {
    enabled: parseEnabled(env.AI_ENABLED),
    provider,
    apiKey: firstNonEmpty(env.AI_API_KEY, legacyApiKey),
    model: firstNonEmpty(
      env.AI_MODEL,
      legacyModel,
      provider === "groq" ? "openai/gpt-oss-120b" : undefined,
    ),
    baseUrl,
    authHeader: firstNonEmpty(env.AI_AUTH_HEADER, "Authorization"),
    // Empty string is meaningful for providers that expect a raw API key.
    authScheme: env.AI_AUTH_SCHEME === undefined ? "Bearer" : env.AI_AUTH_SCHEME.trim(),
    timeoutMs: parsePositiveInteger(env.AI_TIMEOUT_MS, 15_000),
  };
}

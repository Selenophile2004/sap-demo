import type { AiProvider } from "./provider";
import type { AiRuntimeConfig } from "./runtimeConfig";
import { GroqProvider } from "./providers/groqProvider";
import { OpenAiCompatibleProvider } from "./providers/openAiCompatibleProvider";

interface ProviderDependencies {
  fetchImpl?: typeof fetch;
}

export function createAiProvider(
  config: AiRuntimeConfig,
  dependencies: ProviderDependencies = {},
): AiProvider | null {
  if (!config.enabled || !config.apiKey) return null;
  if (!config.model) {
    throw new Error(`AI_MODEL is required when AI_PROVIDER=${config.provider}`);
  }

  if (config.provider === "groq") {
    return new GroqProvider({
      apiKey: config.apiKey,
      model: config.model,
      timeoutMs: config.timeoutMs,
    });
  }

  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    model: config.model,
    baseUrl: config.baseUrl,
    authHeader: config.authHeader,
    authScheme: config.authScheme,
    timeoutMs: config.timeoutMs,
  }, dependencies.fetchImpl);
}

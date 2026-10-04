import {
  AiProviderError,
  type AiCompletionRequest,
  type AiProvider,
} from "../provider";

export interface OpenAiCompatibleProviderOptions {
  apiKey: string;
  model: string;
  baseUrl: string;
  authHeader: string;
  authScheme: string;
  timeoutMs: number;
}

interface OpenAiCompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export class OpenAiCompatibleProvider implements AiProvider {
  readonly id = "openai-compatible";
  readonly model: string;
  private readonly options: OpenAiCompatibleProviderOptions;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAiCompatibleProviderOptions, fetchImpl: typeof fetch = fetch) {
    this.options = { ...options, baseUrl: options.baseUrl.replace(/\/+$/, "") };
    this.model = options.model;
    this.fetchImpl = fetchImpl;
  }

  async complete(request: AiCompletionRequest): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    const authValue = this.options.authScheme
      ? `${this.options.authScheme} ${this.options.apiKey}`
      : this.options.apiKey;

    try {
      const response = await this.fetchImpl(`${this.options.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [this.options.authHeader]: authValue,
        },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
          response_format: request.responseFormat === "json_object"
            ? { type: "json_object" }
            : undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AiProviderError("AI provider request failed", {
          provider: this.id,
          status: response.status,
          retryable: response.status === 429 || response.status >= 500,
        });
      }

      const payload = await response.json() as OpenAiCompatibleResponse;
      return (payload.choices?.[0]?.message?.content ?? "").trim();
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError("AI provider request failed", {
        provider: this.id,
        retryable: true,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

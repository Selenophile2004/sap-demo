import Groq from "groq-sdk";
import {
  AiProviderError,
  type AiCompletionRequest,
  type AiProvider,
} from "../provider";

export interface GroqProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export class GroqProvider implements AiProvider {
  readonly id = "groq";
  readonly model: string;
  private readonly client: Groq;

  constructor(options: GroqProviderOptions) {
    this.model = options.model;
    this.client = new Groq({
      apiKey: options.apiKey,
      timeout: options.timeoutMs,
      maxRetries: 1,
    });
  }

  async complete(request: AiCompletionRequest): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: request.messages.map((message) => ({ ...message })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        response_format: request.responseFormat === "json_object"
          ? { type: "json_object" }
          : undefined,
      });

      return (response.choices[0]?.message?.content ?? "").trim();
    } catch (error) {
      if (error instanceof Groq.APIError) {
        throw new AiProviderError("AI provider request failed", {
          provider: this.id,
          status: error.status,
          retryable: error.status === 429 || error.status >= 500,
          cause: error,
        });
      }
      throw new AiProviderError("AI provider request failed", {
        provider: this.id,
        retryable: true,
        cause: error,
      });
    }
  }
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveAiRuntimeConfig } from "./runtimeConfig";
import { createAiProvider } from "./providerFactory";

describe("AI provider configuration", () => {
  it("keeps existing Groq deployments compatible with legacy environment variables", () => {
    const config = resolveAiRuntimeConfig({
      AI_ENABLED: "true",
      GROQ_API_KEY: "legacy-test-key",
      GROQ_MODEL: "legacy-test-model",
    });

    assert.equal(config.provider, "groq");
    assert.equal(config.apiKey, "legacy-test-key");
    assert.equal(config.model, "legacy-test-model");
  });

  it("prefers provider-neutral environment variables for a new deployment", () => {
    const config = resolveAiRuntimeConfig({
      AI_PROVIDER: "openai-compatible",
      AI_API_KEY: "provider-test-key",
      AI_MODEL: "provider-test-model",
      AI_BASE_URL: "https://llm.example/v1/",
      AI_AUTH_HEADER: "api-key",
      AI_AUTH_SCHEME: "",
    });

    assert.deepEqual(config, {
      enabled: true,
      provider: "openai-compatible",
      apiKey: "provider-test-key",
      model: "provider-test-model",
      baseUrl: "https://llm.example/v1",
      authHeader: "api-key",
      authScheme: "",
      timeoutMs: 15_000,
    });
  });

  it("returns no provider when AI is disabled while deterministic analytics stays available", () => {
    const config = resolveAiRuntimeConfig({
      AI_ENABLED: "false",
      AI_PROVIDER: "groq",
      AI_API_KEY: "unused-test-key",
      AI_MODEL: "unused-test-model",
    });

    assert.equal(createAiProvider(config), null);
  });

  it("fails fast for an unsupported provider name", () => {
    assert.throws(
      () => resolveAiRuntimeConfig({ AI_PROVIDER: "unknown-provider" }),
      /Unsupported AI_PROVIDER/,
    );
  });

  it("selects both supported adapters through the same interface", () => {
    const groq = createAiProvider(resolveAiRuntimeConfig({
      AI_PROVIDER: "groq",
      AI_API_KEY: "groq-test-key",
      AI_MODEL: "groq-test-model",
    }));
    const compatible = createAiProvider(resolveAiRuntimeConfig({
      AI_PROVIDER: "openai-compatible",
      AI_API_KEY: "compatible-test-key",
      AI_MODEL: "compatible-test-model",
      AI_BASE_URL: "https://llm.example/v1",
    }));

    assert.equal(groq?.id, "groq");
    assert.equal(compatible?.id, "openai-compatible");
    assert.equal(typeof groq?.complete, "function");
    assert.equal(typeof compatible?.complete, "function");
  });
});

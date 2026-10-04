import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AiProviderError } from "./provider";
import { OpenAiCompatibleProvider } from "./providers/openAiCompatibleProvider";

describe("OpenAiCompatibleProvider", () => {
  it("maps the neutral completion request to an OpenAI-compatible HTTP request", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fakeFetch: typeof fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(JSON.stringify({
        choices: [{ message: { content: "پاسخ آزمایشی" } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const provider = new OpenAiCompatibleProvider({
      apiKey: "test-key",
      model: "test-model",
      baseUrl: "https://llm.example/v1",
      authHeader: "Authorization",
      authScheme: "Bearer",
      timeoutMs: 5_000,
    }, fakeFetch);

    const result = await provider.complete({
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "user" },
      ],
      temperature: 0.4,
      responseFormat: "json_object",
    });

    assert.equal(result, "پاسخ آزمایشی");
    assert.equal(capturedUrl, "https://llm.example/v1/chat/completions");
    assert.equal(new Headers(capturedInit?.headers).get("Authorization"), "Bearer test-key");
    const body = JSON.parse(String(capturedInit?.body));
    assert.equal(body.model, "test-model");
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.equal(body.messages[1].content, "user");
  });

  it("supports providers that use a custom API-key header without an auth scheme", async () => {
    let capturedHeaders = new Headers();
    const fakeFetch: typeof fetch = async (_input, init) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
    };

    const provider = new OpenAiCompatibleProvider({
      apiKey: "custom-test-key",
      model: "test-model",
      baseUrl: "https://azure.example/openai/deployments/demo",
      authHeader: "api-key",
      authScheme: "",
      timeoutMs: 5_000,
    }, fakeFetch);

    await provider.complete({ messages: [{ role: "user", content: "hello" }] });

    assert.equal(capturedHeaders.get("api-key"), "custom-test-key");
  });

  it("normalizes upstream failures without exposing the response body", async () => {
    const fakeFetch: typeof fetch = async () => new Response("sensitive upstream details", { status: 429 });
    const provider = new OpenAiCompatibleProvider({
      apiKey: "test-key",
      model: "test-model",
      baseUrl: "https://llm.example/v1",
      authHeader: "Authorization",
      authScheme: "Bearer",
      timeoutMs: 5_000,
    }, fakeFetch);

    await assert.rejects(
      () => provider.complete({ messages: [{ role: "user", content: "hello" }] }),
      (error: unknown) => {
        if (!(error instanceof AiProviderError)) return false;
        assert.equal(error.provider, "openai-compatible");
        assert.equal(error.status, 429);
        assert.doesNotMatch(error.message, /sensitive upstream details/);
        return true;
      },
    );
  });
});

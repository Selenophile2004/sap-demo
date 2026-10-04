import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CorsOptions } from "cors";
import type { Request } from "express";
import { createCorsOptionsDelegate } from "./corsPolicy";

function requestWithHeaders(headers: Record<string, string>): Request {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    header(name: string) {
      return normalized[name.toLowerCase()];
    },
  } as Request;
}

function resolveOptions(
  allowedOrigins: string[],
  headers: Record<string, string>,
): Promise<CorsOptions> {
  const delegate = createCorsOptionsDelegate(allowedOrigins);

  return new Promise((resolve, reject) => {
    delegate(requestWithHeaders(headers), (error, options) => {
      if (error) return reject(error);
      if (!options) return reject(new Error("CORS delegate returned no options"));
      resolve(options);
    });
  });
}

describe("CORS policy", () => {
  it("allows the service's own origin even when the configured allowlist is stale", async () => {
    const options = await resolveOptions(
      ["https://sap-demo.onrender.com"],
      {
        origin: "https://sap-demo-qs5j.onrender.com",
        host: "sap-demo-qs5j.onrender.com",
      },
    );

    assert.equal(options.origin, "https://sap-demo-qs5j.onrender.com");
  });

  it("uses Render's forwarded host when checking a same-origin request", async () => {
    const options = await resolveOptions(
      [],
      {
        origin: "https://sap-demo-qs5j.onrender.com",
        host: "internal-service:10000",
        "x-forwarded-host": "sap-demo-qs5j.onrender.com",
      },
    );

    assert.equal(options.origin, "https://sap-demo-qs5j.onrender.com");
  });

  it("denies an unknown external origin without turning it into a server error", async () => {
    const options = await resolveOptions(
      ["https://trusted.example"],
      {
        origin: "https://untrusted.example",
        host: "sap-demo-qs5j.onrender.com",
      },
    );

    assert.equal(options.origin, false);
  });
});

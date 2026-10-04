import type { CorsOptionsDelegate } from "cors";
import type { Request } from "express";

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function requestHost(req: Request): string {
  const forwardedHost = req.header("x-forwarded-host")
    ?.split(",", 1)[0]
    ?.trim();

  return (forwardedHost || req.header("host") || "").toLowerCase();
}

export function createCorsOptionsDelegate(
  configuredOrigins: string[],
): CorsOptionsDelegate<Request> {
  const allowedOrigins = new Set(
    configuredOrigins
      .map((origin) => normalizeOrigin(origin))
      .filter((origin): origin is string => origin !== null),
  );

  return (req, callback) => {
    const origin = req.header("origin");

    // Navigation, health checks and server-to-server requests usually have no
    // Origin header and do not need CORS response headers.
    if (!origin) {
      callback(null, { origin: false });
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);
    const originHost = normalizedOrigin ? new URL(normalizedOrigin).host.toLowerCase() : "";
    const isSameHost = originHost !== "" && originHost === requestHost(req);
    const isConfiguredOrigin = normalizedOrigin !== null && allowedOrigins.has(normalizedOrigin);

    // A same-host ES module request is part of serving the application itself.
    // It must remain valid even if a manually-managed Render service still has
    // an older CORS_ORIGIN value. Unknown cross-origin callers receive no CORS
    // permission instead of being promoted to an HTTP 500 error.
    callback(null, {
      origin: isSameHost || isConfiguredOrigin ? origin : false,
    });
  };
}

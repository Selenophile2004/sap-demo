import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");

test("production entry renders a lightweight startup shell before loading the application", async () => {
  const html = await readFile(path.join(projectRoot, "dist", "index.html"), "utf8");
  const entryMatch = html.match(/<script[^>]+src="([^"]+\.js)"/);

  assert.ok(entryMatch, "production index.html must reference a JavaScript entry");

  const entryPath = path.join(projectRoot, "dist", entryMatch[1].replace(/^\//, ""));
  const [entrySource, entryStat] = await Promise.all([
    readFile(entryPath, "utf8"),
    stat(entryPath),
  ]);

  assert.ok(
    entryStat.size < 100_000,
    `startup entry must stay below 100 KB, received ${entryStat.size} bytes`,
  );
  assert.match(
    entrySource,
    /در حال بارگذاری سامانه/,
    "startup entry must render a visible loading state before importing the application",
  );
  assert.match(
    entrySource,
    /بارگذاری سامانه با خطا روبه‌رو شد/,
    "startup entry must render a visible failure state when the application import fails",
  );
});

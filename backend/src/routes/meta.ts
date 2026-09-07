import { Router } from "express";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { config } from "../config";

export const metaRouter = Router();

const DB_FILES: Record<string, string> = {
  sales: "sales.db",
  receivables: "receivables.db",
  pnl: "pnl.db",
  hr: "hr.db",
  targets: "targets.db",
  inventory: "inventory.db",
};

function readEtlMeta(dbFile: string): Record<string, string> | null {
  const dbPath = path.join(config.etlOutputDir, dbFile);
  if (!fs.existsSync(dbPath)) return null;
  const db = new Database(dbPath, { readonly: true });
  try {
    const rows = db.prepare("SELECT key, value FROM etl_meta").all() as { key: string; value: string }[];
    const meta: Record<string, string> = {};
    for (const r of rows) meta[r.key] = r.value;
    return meta;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

metaRouter.get("/", (_req, res) => {
  const result: Record<string, Record<string, string> | null> = {};
  for (const [moduleName, dbFile] of Object.entries(DB_FILES)) {
    result[moduleName] = readEtlMeta(dbFile);
  }
  res.json(result);
});

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let cached: Database.Database | null = null;

export function auditDb(): Database.Database {
  if (cached) return cached;
  cached = new Database(path.join(DATA_DIR, "audit.db"));
  cached.pragma("journal_mode = WAL");
  cached.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at DESC);
  `);
  return cached;
}

export function writeAudit(entry: {
  actor: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: unknown;
  ipAddress?: string;
}) {
  auditDb().prepare(`
    INSERT INTO audit_log(actor, action, entity_type, entity_id, details_json, ip_address)
    VALUES (@actor, @action, @entityType, @entityId, @detailsJson, @ipAddress)
  `).run({
    actor: entry.actor,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    detailsJson: entry.details === undefined ? null : JSON.stringify(entry.details),
    ipAddress: entry.ipAddress ?? null,
  });
}

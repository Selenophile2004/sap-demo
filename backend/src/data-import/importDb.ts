import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let cached: Database.Database | null = null;

export function importDb(): Database.Database {
  if (cached) return cached;
  cached = new Database(path.join(DATA_DIR, "imports.db"));
  cached.pragma("journal_mode = WAL");
  cached.exec(`
    CREATE TABLE IF NOT EXISTS import_jobs (
      id TEXT PRIMARY KEY,
      dataset_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      valid_rows INTEGER NOT NULL,
      duplicate_rows INTEGER NOT NULL,
      errors_json TEXT NOT NULL,
      rows_json TEXT NOT NULL,
      changes_json TEXT,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL,
      published_at TEXT,
      rolled_back_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON import_jobs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_import_jobs_hash ON import_jobs(dataset_id, content_hash);
  `);
  return cached;
}

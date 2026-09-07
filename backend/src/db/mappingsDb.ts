import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// این دیتابیس برخلاف sales.db/receivables.db/... توسط ETL پایتون مدیریت نمی‌شود و
// هرگز حذف/بازسازی نمی‌شود — چون شامل تصمیمات دستی کاربر (گروه‌بندی کالا) است که
// باید در اجرای بعدی ETL هم دست‌نخورده بماند.
const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "mappings.db");

let _db: Database.Database | null = null;

export function mappingsDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS item_groups (
      name TEXT PRIMARY KEY,
      color TEXT,
      sort_order INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS item_group_overrides (
      item_code TEXT PRIMARY KEY,
      item_group TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return _db;
}

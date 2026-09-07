import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// این دیتابیس هم مثل mappings.db توسط ETL پایتون مدیریت نمی‌شود و هرگز حذف/بازسازی
// نمی‌شود — کامنت‌های کاربر روی هشدارها و نقاط کلیدی گزارش باید حتی بعد از
// بروزرسانی داده‌ها (و حتی اگر خودِ آن هشدار/عدد دیگر صادق نباشد) باقی بمانند، تا
// اگر گزارش بعداً به کس دیگری داده شود، تاریخچه‌ی بحث روی آن هم دیده شود.
const DATA_DIR = path.resolve(__dirname, "..", "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "comments.db");

let _db: Database.Database | null = null;

export function commentsDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_label TEXT,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target_type, target_id);
  `);
  return _db;
}

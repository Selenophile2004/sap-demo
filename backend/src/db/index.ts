import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { config } from "../config";

interface CachedDb {
  db: Database.Database;
  mtimeMs: number;
}

const cache = new Map<string, CachedDb>();

// روی هاست، بعد از هر آپدیت دیتا، فایل‌های etl/output/*.db از راه دور جایگزین
// می‌شوند (معمولاً با rename، نه ویرایش درجا) — کانکشن کش‌شده‌ی قدیمی همچنان به
// همان inode حذف‌شده می‌چسبد و دیتای بیات نشان می‌دهد. با چک mtime قبل از هر
// استفاده، جایگزینی فایل را تشخیص می‌دهیم و کانکشن را تازه می‌کنیم — بدون نیاز
// به ری‌استارت دستی اپ بعد از هر آپلود.
export function getDb(fileName: string): Database.Database {
  const filePath = path.join(config.etlOutputDir, fileName);
  const mtimeMs = fs.statSync(filePath).mtimeMs;
  const cached = cache.get(fileName);
  if (cached && cached.mtimeMs === mtimeMs) {
    return cached.db;
  }
  cached?.db.close();
  const db = new Database(filePath, { readonly: true, fileMustExist: true });
  cache.set(fileName, { db, mtimeMs });
  return db;
}

export const salesDb = () => getDb("sales.db");
export const receivablesDb = () => getDb("receivables.db");
export const pnlDb = () => getDb("pnl.db");
export const hrDb = () => getDb("hr.db");
export const targetsDb = () => getDb("targets.db");
export const inventoryDb = () => getDb("inventory.db");
export const financeDb = () => getDb("finance.db");

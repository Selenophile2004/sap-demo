import Database from "better-sqlite3";
import crypto from "node:crypto";
import path from "node:path";
import { config } from "../config";
import { importDb } from "./importDb";
import { prepareImport, type DatasetId, type ImportValidationError } from "./importCore";

export type ImportStatus = "ready" | "rejected" | "published" | "rolled_back";

interface ImportJobRow {
  id: string;
  dataset_id: DatasetId;
  file_name: string;
  content_hash: string;
  status: ImportStatus;
  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  errors_json: string;
  rows_json: string;
  changes_json: string | null;
  actor: string;
  created_at: string;
  published_at: string | null;
  rolled_back_at: string | null;
}

export interface ImportJob {
  id: string;
  datasetId: DatasetId;
  fileName: string;
  status: ImportStatus;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorCount: number;
  errors: ImportValidationError[];
  previewRows: Record<string, unknown>[];
  actor: string;
  createdAt: string;
  publishedAt: string | null;
  rolledBackAt: string | null;
}

interface DatasetTarget {
  fileName: string;
  table: string;
  keyColumns: string[];
  columns: string[];
}

const TARGETS: Record<DatasetId, DatasetTarget> = {
  sales: {
    fileName: "sales.db",
    table: "sales_lines",
    keyColumns: ["invoice_no", "item_code"],
    columns: [
      "record_source", "invoice_type", "item_code", "item_name", "unit_raw", "qty_raw", "sales_center",
      "customer_code", "customer_name", "canonical_customer_code", "visitor_name", "invoice_no", "invoice_date_jalali",
      "erp_base_unit_UNRELIABLE", "erp_base_qty_UNRELIABLE", "erp_base_unit_price_UNRELIABLE", "unit_price", "amount",
      "vat_amount", "discount_amount", "sign", "net_amount", "unit_family", "unit_conversion_ratio", "qty_normalized_count",
      "qty_normalized_kg", "qty_normalized_count_signed", "qty_normalized_kg_signed", "carton_size",
      "qty_normalized_carton_signed", "item_group", "is_active_basket", "province",
    ],
  },
  inventory: {
    fileName: "inventory.db",
    table: "inventory_lines",
    keyColumns: ["item_code", "warehouse_code"],
    columns: ["item_code", "item_name", "cost_center", "warehouse_code", "warehouse_name", "on_hand_qty", "reserved_qty", "sellable_qty"],
  },
  finance: {
    fileName: "finance.db",
    table: "finance_monthly",
    keyColumns: ["year_jalali", "month_num"],
    columns: ["year_jalali", "month_num", "month_name", "month_seq", "total_assets_rial", "total_liabilities_rial", "cash_balance_rial", "company_value_rial", "budget_target_rial", "budget_actual_rial", "roi_pct"],
  },
};

function toJob(row: ImportJobRow, includeDetails = true): ImportJob {
  const errors = JSON.parse(row.errors_json) as ImportValidationError[];
  const rows = JSON.parse(row.rows_json) as Record<string, unknown>[];
  return {
    id: row.id,
    datasetId: row.dataset_id,
    fileName: row.file_name,
    status: row.status,
    totalRows: row.total_rows,
    validRows: row.valid_rows,
    duplicateRows: row.duplicate_rows,
    errorCount: errors.length,
    errors: includeDetails ? errors : [],
    previewRows: includeDetails ? rows.slice(0, 20) : [],
    actor: row.actor,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    rolledBackAt: row.rolled_back_at,
  };
}

export function createImportPreview(input: { datasetId: DatasetId; fileName: string; csvContent: string; actor: string }): ImportJob {
  if (Buffer.byteLength(input.csvContent, "utf8") > 5 * 1024 * 1024) throw new Error("حجم فایل بیشتر از ۵ مگابایت است.");
  const prepared = prepareImport({ datasetId: input.datasetId, fileName: path.basename(input.fileName), content: input.csvContent });
  if (prepared.totalRows > 2_000) throw new Error("برای نسخه دمو حداکثر ۲۰۰۰ ردیف در هر بار قابل ورود است.");
  const db = importDb();
  const contentHash = crypto.createHash("sha256").update(input.csvContent).digest("hex");
  const publishedDuplicate = db.prepare(
    "SELECT id FROM import_jobs WHERE dataset_id = ? AND content_hash = ? AND status = 'published' LIMIT 1"
  ).get(input.datasetId, contentHash) as { id: string } | undefined;
  const errors = [...prepared.errors];
  if (publishedDuplicate) {
    errors.push({ row: 0, field: "file", code: "duplicate", message: "این فایل قبلاً منتشر شده و انتشار دوباره آن مجاز نیست." });
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status: ImportStatus = errors.length === 0 && prepared.validRows.length > 0 ? "ready" : "rejected";
  db.prepare(`
    INSERT INTO import_jobs(id, dataset_id, file_name, content_hash, status, total_rows, valid_rows, duplicate_rows,
      errors_json, rows_json, actor, created_at)
    VALUES (@id, @datasetId, @fileName, @contentHash, @status, @totalRows, @validRows, @duplicateRows,
      @errorsJson, @rowsJson, @actor, @createdAt)
  `).run({
    id, datasetId: input.datasetId, fileName: path.basename(input.fileName), contentHash, status,
    totalRows: prepared.totalRows, validRows: prepared.validRows.length, duplicateRows: prepared.duplicateRows,
    errorsJson: JSON.stringify(errors), rowsJson: JSON.stringify(prepared.validRows), actor: input.actor, createdAt: now,
  });
  return getImportJob(id)!;
}

export function listImportJobs(limit = 30): ImportJob[] {
  const rows = importDb().prepare("SELECT * FROM import_jobs ORDER BY created_at DESC LIMIT ?").all(Math.min(Math.max(limit, 1), 100)) as ImportJobRow[];
  return rows.map((row) => toJob(row, false));
}

export function getImportJob(id: string): ImportJob | null {
  const row = importDb().prepare("SELECT * FROM import_jobs WHERE id = ?").get(id) as ImportJobRow | undefined;
  return row ? toJob(row) : null;
}

function targetDb(datasetId: DatasetId): Database.Database {
  return new Database(path.join(config.etlOutputDir, TARGETS[datasetId].fileName));
}

function whereFor(target: DatasetTarget): string {
  return target.keyColumns.map((column) => `${column} = @${column}`).join(" AND ");
}

function keyParams(target: DatasetTarget, row: Record<string, unknown>) {
  return Object.fromEntries(target.keyColumns.map((column) => [column, row[column]]));
}

export function publishImport(id: string): ImportJob {
  const managementDb = importDb();
  const job = managementDb.prepare("SELECT * FROM import_jobs WHERE id = ?").get(id) as ImportJobRow | undefined;
  if (!job) throw new Error("درخواست ورود داده پیدا نشد.");
  if (job.status !== "ready") throw new Error("فقط فایل معتبر و آماده انتشار قابل انتشار است.");
  const target = TARGETS[job.dataset_id];
  const rows = JSON.parse(job.rows_json) as Record<string, unknown>[];
  const db = targetDb(job.dataset_id);
  const where = whereFor(target);
  const selectPrevious = db.prepare(`SELECT * FROM ${target.table} WHERE ${where}`);
  const deleteCurrent = db.prepare(`DELETE FROM ${target.table} WHERE ${where}`);
  const columnsSql = target.columns.join(", ");
  const valuesSql = target.columns.map((column) => `@${column}`).join(", ");
  const insert = db.prepare(`INSERT INTO ${target.table} (${columnsSql}) VALUES (${valuesSql})`);
  const changes: { key: Record<string, unknown>; previousRows: Record<string, unknown>[] }[] = [];

  const publish = db.transaction(() => {
    for (const row of rows) {
      const key = keyParams(target, row);
      const previousRows = selectPrevious.all(key) as Record<string, unknown>[];
      changes.push({ key, previousRows });
      deleteCurrent.run(key);
      insert.run(Object.fromEntries(target.columns.map((column) => [column, row[column] ?? null])));
    }
    const count = (db.prepare(`SELECT COUNT(*) AS count FROM ${target.table}`).get() as { count: number }).count;
    db.prepare("INSERT INTO etl_meta(key, value) VALUES ('row_count', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(count));
    db.prepare("INSERT INTO etl_meta(key, value) VALUES ('last_manual_import_iso', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(new Date().toISOString());
  });

  try {
    publish();
  } finally {
    db.close();
  }
  managementDb.prepare("UPDATE import_jobs SET status = 'published', changes_json = ?, published_at = ? WHERE id = ?")
    .run(JSON.stringify(changes), new Date().toISOString(), id);
  return getImportJob(id)!;
}

export function rollbackImport(id: string): ImportJob {
  const managementDb = importDb();
  const job = managementDb.prepare("SELECT * FROM import_jobs WHERE id = ?").get(id) as ImportJobRow | undefined;
  if (!job) throw new Error("درخواست ورود داده پیدا نشد.");
  if (job.status !== "published" || !job.changes_json) throw new Error("فقط انتشار فعال قابل بازگردانی است.");
  const newer = managementDb.prepare(
    "SELECT id FROM import_jobs WHERE dataset_id = ? AND status = 'published' AND published_at > ? LIMIT 1"
  ).get(job.dataset_id, job.published_at) as { id: string } | undefined;
  if (newer) throw new Error("ابتدا باید انتشار جدیدتر این مجموعه داده بازگردانی شود.");

  const target = TARGETS[job.dataset_id];
  const changes = JSON.parse(job.changes_json) as { key: Record<string, unknown>; previousRows: Record<string, unknown>[] }[];
  const db = targetDb(job.dataset_id);
  const remove = db.prepare(`DELETE FROM ${target.table} WHERE ${whereFor(target)}`);
  const insert = db.prepare(`INSERT INTO ${target.table} (${target.columns.join(", ")}) VALUES (${target.columns.map((column) => `@${column}`).join(", ")})`);
  const rollback = db.transaction(() => {
    for (const change of [...changes].reverse()) {
      remove.run(change.key);
      for (const previous of change.previousRows) insert.run(Object.fromEntries(target.columns.map((column) => [column, previous[column] ?? null])));
    }
    const count = (db.prepare(`SELECT COUNT(*) AS count FROM ${target.table}`).get() as { count: number }).count;
    db.prepare("INSERT INTO etl_meta(key, value) VALUES ('row_count', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(count));
    db.prepare("INSERT INTO etl_meta(key, value) VALUES ('last_manual_import_iso', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(new Date().toISOString());
  });
  try {
    rollback();
  } finally {
    db.close();
  }
  managementDb.prepare("UPDATE import_jobs SET status = 'rolled_back', rolled_back_at = ? WHERE id = ?").run(new Date().toISOString(), id);
  return getImportJob(id)!;
}

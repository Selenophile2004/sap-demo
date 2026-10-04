import fs from "fs";
import path from "path";
import type Database from "better-sqlite3";
import { jalaaliMonthLength, toGregorian } from "jalaali-js";
import { config } from "../config";
import { financeDb, hrDb, inventoryDb, pnlDb, receivablesDb, salesDb } from "../db";
import { buildDataHealthReport, type DataHealthReport, type DatasetProfile } from "./dataHealth";

interface DatasetRule {
  id: string;
  label: string;
  file: string;
  table: string;
  db: () => Database.Database;
  requiredColumns: string[];
  duplicateSql: string;
  invalidSql: string;
  latestPeriodSql: string;
  freshnessMode: "day" | "month" | "file";
  expectedFreshnessHours: number;
}

const RULES: DatasetRule[] = [
  { id: "sales", label: "فروش", file: "sales.db", table: "sales_lines", db: salesDb,
    requiredColumns: ["invoice_no", "invoice_date_jalali", "item_code", "customer_code", "net_amount"],
    duplicateSql: "SELECT COUNT(*) count FROM (SELECT invoice_no, item_code, record_source FROM sales_lines GROUP BY invoice_no, item_code, record_source HAVING COUNT(*) > 1)",
    invalidSql: "SELECT COUNT(*) count FROM sales_lines WHERE qty_raw IS NULL OR unit_price < 0",
    latestPeriodSql: "SELECT MAX(invoice_date_jalali) value FROM sales_lines", freshnessMode: "day", expectedFreshnessHours: 72 },
  { id: "receivables", label: "مطالبات", file: "receivables.db", table: "receivable_invoices", db: receivablesDb,
    requiredColumns: ["invoice_no", "invoice_date_jalali", "customer_code", "invoice_net_amount", "amount_unpaid"],
    duplicateSql: "SELECT COUNT(*) count FROM (SELECT invoice_no FROM receivable_invoices GROUP BY invoice_no HAVING COUNT(*) > 1)",
    invalidSql: "SELECT COUNT(*) count FROM receivable_invoices WHERE amount_unpaid < 0 OR amount_paid < 0",
    latestPeriodSql: "SELECT MAX(invoice_date_jalali) value FROM receivable_invoices", freshnessMode: "day", expectedFreshnessHours: 120 },
  { id: "finance", label: "مالی و بودجه", file: "finance.db", table: "finance_monthly", db: financeDb,
    requiredColumns: ["year_jalali", "month_num", "cash_balance_rial", "budget_target_rial", "budget_actual_rial"],
    duplicateSql: "SELECT COUNT(*) count FROM (SELECT year_jalali, month_num FROM finance_monthly GROUP BY year_jalali, month_num HAVING COUNT(*) > 1)",
    invalidSql: "SELECT COUNT(*) count FROM finance_monthly WHERE month_num NOT BETWEEN 1 AND 12 OR budget_target_rial < 0",
    latestPeriodSql: "SELECT MAX(year_jalali || '/' || printf('%02d', month_num)) value FROM finance_monthly", freshnessMode: "month", expectedFreshnessHours: 1080 },
  { id: "hr", label: "سرمایه انسانی", file: "hr.db", table: "headcount_by_month", db: hrDb,
    requiredColumns: ["year_jalali", "month_num", "headcount"],
    duplicateSql: "SELECT COUNT(*) count FROM (SELECT year_jalali, month_num FROM headcount_by_month GROUP BY year_jalali, month_num HAVING COUNT(*) > 1)",
    invalidSql: "SELECT COUNT(*) count FROM headcount_by_month WHERE month_num NOT BETWEEN 1 AND 12 OR headcount < 0",
    latestPeriodSql: "SELECT MAX(year_jalali || '/' || printf('%02d', month_num)) value FROM headcount_by_month", freshnessMode: "month", expectedFreshnessHours: 1080 },
  { id: "inventory", label: "انبار", file: "inventory.db", table: "inventory_lines", db: inventoryDb,
    requiredColumns: ["item_code", "warehouse_code", "on_hand_qty", "reserved_qty", "sellable_qty"],
    duplicateSql: "SELECT COUNT(*) count FROM (SELECT item_code, warehouse_code FROM inventory_lines GROUP BY item_code, warehouse_code HAVING COUNT(*) > 1)",
    invalidSql: "SELECT COUNT(*) count FROM inventory_lines WHERE reserved_qty < 0 OR sellable_qty != on_hand_qty - reserved_qty",
    latestPeriodSql: "SELECT NULL value", freshnessMode: "file", expectedFreshnessHours: 168 },
  { id: "pnl", label: "سود و زیان", file: "pnl.db", table: "pnl_long", db: pnlDb,
    requiredColumns: ["item", "category", "year_jalali", "month_num", "amount_rial"],
    duplicateSql: "SELECT COUNT(*) count FROM (SELECT item, year_jalali, month_num FROM pnl_long GROUP BY item, year_jalali, month_num HAVING COUNT(*) > 1)",
    invalidSql: "SELECT COUNT(*) count FROM pnl_long WHERE month_num NOT BETWEEN 1 AND 12",
    latestPeriodSql: "SELECT MAX(year_jalali || '/' || printf('%02d', month_num)) value FROM pnl_long", freshnessMode: "month", expectedFreshnessHours: 1080 },
];

function jalaliIso(value: string, mode: "day" | "month"): string {
  const [year, month, suppliedDay] = value.split("/").map(Number);
  const day = mode === "month" ? jalaaliMonthLength(year, month) : suppliedDay;
  const gregorian = toGregorian(year, month, day);
  return new Date(Date.UTC(gregorian.gy, gregorian.gm - 1, gregorian.gd, 12)).toISOString();
}

function scalar(db: Database.Database, sql: string, field: string): number {
  const row = db.prepare(sql).get() as Record<string, unknown> | undefined;
  return Number(row?.[field] ?? 0);
}

function profile(rule: DatasetRule): DatasetProfile {
  const db = rule.db();
  const rowCount = scalar(db, `SELECT COUNT(*) count FROM ${rule.table}`, "count");
  const missingExpression = rule.requiredColumns.map((column) => `CASE WHEN ${column} IS NULL OR TRIM(CAST(${column} AS TEXT)) = '' THEN 1 ELSE 0 END`).join(" + ");
  const missing = scalar(db, `SELECT COALESCE(SUM(${missingExpression}), 0) count FROM ${rule.table}`, "count");
  const latest = db.prepare(rule.latestPeriodSql).get() as { value?: string | null } | undefined;
  const filePath = path.join(config.etlOutputDir, rule.file);
  const fileUpdatedAt = fs.statSync(filePath).mtime.toISOString();
  const latestPeriod = latest?.value ?? null;
  const updatedAt = latestPeriod && rule.freshnessMode !== "file"
    ? jalaliIso(latestPeriod, rule.freshnessMode)
    : fileUpdatedAt;
  return {
    id: rule.id, label: rule.label, source: `${rule.file} / ${rule.table}`, rowCount,
    requiredValueCount: rowCount * rule.requiredColumns.length, missingRequiredValueCount: missing,
    duplicateKeyCount: scalar(db, rule.duplicateSql, "count"), invalidValueCount: scalar(db, rule.invalidSql, "count"),
    updatedAt, latestPeriod, expectedFreshnessHours: rule.expectedFreshnessHours,
  };
}

export function gatherDataHealthReport(): DataHealthReport {
  return buildDataHealthReport(RULES.map(profile));
}

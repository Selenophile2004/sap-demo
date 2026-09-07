import { Router } from "express";
import { pnlDb } from "../db";

export const pnlRouter = Router();

const KEY_ITEMS = [
  "فروش خالص",
  "بهاي تمام شده كالاي فروش رفته تولیدی",
  "سود و (زیان )",
  "سود و (زیان ) خالص",
];

function toStringArray(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  const arr = Array.isArray(v) ? v : [v];
  const strs = arr.filter((x): x is string => typeof x === "string" && x.length > 0);
  return strs.length ? strs : undefined;
}

interface LineFilters {
  dateFrom?: string;
  dateTo?: string;
  years?: string[];
  months?: string[];
  activeBasketOnly?: boolean;
}

function parseLineFilters(q: Record<string, unknown>): LineFilters {
  return {
    dateFrom: typeof q.dateFrom === "string" ? q.dateFrom : undefined,
    dateTo: typeof q.dateTo === "string" ? q.dateTo : undefined,
    years: toStringArray(q.years),
    months: toStringArray(q.months),
    activeBasketOnly: q.activeBasketOnly === "true" || q.activeBasketOnly === "1",
  };
}

function inClause(column: string, values: string[], prefix: string, params: Record<string, string>) {
  const names = values.map((v, i) => {
    const key = `${prefix}${i}`;
    params[key] = v;
    return `@${key}`;
  });
  return `${column} IN (${names.join(",")})`;
}

/** برای pnl_product_marketer_lines که تاریخ روزانه (invoice_date_jalali) دارد. */
function buildLineWhere(f: LineFilters) {
  const clauses: string[] = [];
  const params: Record<string, string> = {};
  if (f.dateFrom) {
    clauses.push("invoice_date_jalali >= @dateFrom");
    params.dateFrom = f.dateFrom;
  }
  if (f.dateTo) {
    clauses.push("invoice_date_jalali <= @dateTo");
    params.dateTo = f.dateTo;
  }
  if (f.years?.length) clauses.push(inClause("substr(invoice_date_jalali,1,4)", f.years, "year", params));
  if (f.months?.length) clauses.push(inClause("substr(invoice_date_jalali,6,2)", f.months, "month", params));
  // «سبد فعال» — رجوع کنید به کامنت مشابه در sales.ts/buildWhere.
  if (f.activeBasketOnly) clauses.push("is_active_basket = 1");
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

/** برای pnl_center_lines که یک تاریخ ماهانه (period_date، مثل «1405/02/01») دارد. */
function buildCenterWhere(f: LineFilters) {
  const clauses: string[] = [];
  const params: Record<string, string> = {};
  if (f.dateFrom) {
    clauses.push("period_date >= @dateFrom");
    params.dateFrom = f.dateFrom;
  }
  if (f.dateTo) {
    clauses.push("period_date <= @dateTo");
    params.dateTo = f.dateTo;
  }
  if (f.years?.length) clauses.push(inClause("substr(period_date,1,4)", f.years, "year", params));
  if (f.months?.length) clauses.push(inClause("substr(period_date,6,2)", f.months, "month", params));
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

/** برای pnl_long که سال/ماه به‌صورت ستون عددی جدا دارد. */
function buildPnlLongYearMonthWhere(f: LineFilters, extraClause?: string) {
  const clauses: string[] = extraClause ? [extraClause] : [];
  const params: Record<string, string> = {};
  if (f.years?.length) clauses.push(inClause("CAST(CAST(year_jalali AS INTEGER) AS TEXT)", f.years, "year", params));
  if (f.months?.length)
    clauses.push(inClause("substr('0' || CAST(month_num AS INTEGER), -2, 2)", f.months, "month", params));
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

pnlRouter.get("/summary", (_req, res) => {
  const db = pnlDb();
  const maxSeqRow = db.prepare("SELECT MAX(month_seq) AS maxSeq FROM pnl_long").get() as { maxSeq: number };
  const latestSeq = maxSeqRow.maxSeq;
  const prevSeq = latestSeq - 1;

  function itemsForSeq(seq: number) {
    const rows = db
      .prepare("SELECT item, amount_rial FROM pnl_long WHERE month_seq = ?")
      .all(seq) as { item: string; amount_rial: number }[];
    const map = new Map(rows.map((r) => [r.item, r.amount_rial]));
    return map;
  }

  const latest = itemsForSeq(latestSeq);
  const prev = itemsForSeq(prevSeq);

  const netSales = latest.get("فروش خالص") ?? 0;
  const prevNetSales = prev.get("فروش خالص") ?? 0;
  const cogs = latest.get("بهاي تمام شده كالاي فروش رفته تولیدی") ?? 0;
  const netProfit = latest.get("سود و (زیان ) خالص") ?? latest.get("سود و (زیان )") ?? 0;
  const prevNetProfit = prev.get("سود و (زیان ) خالص") ?? prev.get("سود و (زیان )") ?? 0;

  // مجموع کل هزینه‌ها = مجموع همه‌ی ردیف‌های «هزینه» (بر اساس دسته‌بندی)
  const expenseRows = db
    .prepare(
      `SELECT SUM(amount_rial) AS total FROM pnl_long
       WHERE month_seq = ? AND category LIKE '%هزینه%'`
    )
    .get(latestSeq) as { total: number | null };

  const meta = db
    .prepare("SELECT year_jalali, month_num, month_name FROM pnl_long WHERE month_seq = ? LIMIT 1")
    .get(latestSeq) as { year_jalali: number; month_num: number; month_name: string };

  res.json({
    period: meta,
    netSales,
    netSalesGrowthPct: prevNetSales > 0 ? ((netSales - prevNetSales) / prevNetSales) * 100 : null,
    totalExpenses: expenseRows.total ?? 0,
    netProfit,
    netProfitGrowthPct:
      prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : null,
    netProfitMarginPct: netSales > 0 ? (netProfit / netSales) * 100 : null,
    cogsToSalesPct: netSales > 0 ? (cogs / netSales) * 100 : null,
  });
});

pnlRouter.get("/monthly-key-items", (req, res) => {
  const db = pnlDb();
  const filters = parseLineFilters(req.query as Record<string, unknown>);
  const placeholders = KEY_ITEMS.map((_, i) => `@item${i}`).join(",");
  const itemParams: Record<string, string> = {};
  KEY_ITEMS.forEach((item, i) => (itemParams[`item${i}`] = item));

  const { sql: extraWhere, params: yearMonthParams } = buildPnlLongYearMonthWhere(
    filters,
    `item IN (${placeholders})`
  );

  const rows = db
    .prepare(
      `SELECT year_jalali, month_num, month_name, month_seq, item, amount_rial
       FROM pnl_long ${extraWhere}
       ORDER BY month_seq`
    )
    .all({ ...itemParams, ...yearMonthParams });
  res.json(rows);
});

pnlRouter.get("/expense-breakdown", (_req, res) => {
  const db = pnlDb();
  const maxSeqRow = db.prepare("SELECT MAX(month_seq) AS maxSeq FROM pnl_long").get() as { maxSeq: number };
  const rows = db
    .prepare(
      `SELECT item, amount_rial FROM pnl_long
       WHERE month_seq = ? AND category LIKE '%هزینه%' AND amount_rial > 0
       ORDER BY amount_rial DESC`
    )
    .all(maxSeqRow.maxSeq);
  res.json(rows);
});

// عمداً از pnl_center_lines خوانده می‌شود (شیت اختصاصی «11سرجمع فروش به مرکز
// سایر هزینه» در فایل سود و زیان محصول و بازاریاب)، نه از تجمیع
// pnl_product_marketer_lines: چون منبع اصلی (صفحه‌ی «سود و زیان مراکز فروش» در
// Report Forosh.pbix، جدول «سود و زیان مرکز فروش») هم دقیقاً همین ستون‌های
// آماده را SUM می‌زند و شامل هزینه‌های پرسنلی/اجاره/رهن/سایر هزینه است که در
// pnl_product_marketer_lines اصلاً وجود ندارد — یعنی «profitLoss» اینجا سود
// خالص واقعی بعد از همه‌ی هزینه‌هاست، نه فقط حاشیه‌ی سود ناخالص کالا.
pnlRouter.get("/by-center", (req, res) => {
  const db = pnlDb();
  const { sql: where, params } = buildCenterWhere(parseLineFilters(req.query as Record<string, unknown>));
  const rows = db
    .prepare(
      `SELECT sales_center AS center,
              SUM(net_sales) AS netSales,
              SUM(net_profit) AS profitLoss,
              SUM(gross_profit) AS grossProfit,
              SUM(other_expense) AS otherExpense,
              SUM(rent_expense) AS rentExpense,
              SUM(salary_total) AS salaryTotal,
              MAX(headcount) AS headcount
       FROM pnl_center_lines ${where} GROUP BY sales_center ORDER BY netSales DESC`
    )
    .all(params);
  res.json(rows);
});

pnlRouter.get("/by-marketer", (req, res) => {
  const db = pnlDb();
  const { sql: where, params } = buildLineWhere(parseLineFilters(req.query as Record<string, unknown>));
  const rows = db
    .prepare(
      `SELECT employee_name AS marketer, SUM(net_sales) AS netSales, SUM(profit_loss) AS profitLoss
       FROM pnl_product_marketer_lines ${where} GROUP BY employee_name ORDER BY netSales DESC LIMIT 20`
    )
    .all(params);
  res.json(rows);
});

pnlRouter.get("/by-item", (req, res) => {
  const db = pnlDb();
  const { sql: where, params } = buildLineWhere(parseLineFilters(req.query as Record<string, unknown>));
  const rows = db
    .prepare(
      `SELECT item_name AS item, SUM(net_sales) AS netSales, SUM(profit_loss) AS profitLoss
       FROM pnl_product_marketer_lines ${where} GROUP BY item_name ORDER BY netSales DESC LIMIT 20`
    )
    .all(params);
  res.json(rows);
});

pnlRouter.get("/by-customer", (req, res) => {
  const db = pnlDb();
  const { sql: where, params } = buildLineWhere(parseLineFilters(req.query as Record<string, unknown>));
  const rows = db
    .prepare(
      `SELECT customer_name AS customer, SUM(net_sales) AS netSales, SUM(profit_loss) AS profitLoss
       FROM pnl_product_marketer_lines ${where} GROUP BY customer_name ORDER BY netSales DESC LIMIT 20`
    )
    .all(params);
  res.json(rows);
});

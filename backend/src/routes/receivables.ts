import { Router } from "express";
import { receivablesDb, salesDb } from "../db";

// نگاشت دستیِ نام شعبه بین دو منبع مستقل (مانده مطالبات کوتاه می‌نویسد، فروش کامل
// می‌نویسد) — تأییدشده با بررسی واقعی داده؛ اگر نام مراکز فروش در آینده عوض شود،
// این نگاشت هم باید به‌روز شود.
const BRANCH_TO_SALES_CENTER: Record<string, string> = {
  "اصفهان": "مرکز فعالیت مویرگی اصفهان",
  "خراسان": "مرکز فعالیت خراسان",
  "خرده فروشی": "مرکز فعالیت مشهد خرده فروشی1",
  "رشت": "مرکز فعالیت مویرگی رشت",
  "زنجیره‌ای": "مرکز فعالیت مشهد زنجیره ای",
  "قزوین": "مرکز فعالیت مویرگی قزوین",
  "مصلی": "مرکز فعالیت مصلی",
};

export const receivablesRouter = Router();

interface Filters {
  branch?: string[];
  visitor?: string[];
  dateFrom?: string;
  dateTo?: string;
  years?: string[];
  months?: string[];
}

function toStringArray(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  const arr = Array.isArray(v) ? v : [v];
  const strs = arr.filter((x): x is string => typeof x === "string" && x.length > 0);
  return strs.length ? strs : undefined;
}

function parseFilters(q: Record<string, unknown>): Filters {
  return {
    branch: toStringArray(q.branch),
    visitor: toStringArray(q.visitor),
    dateFrom: typeof q.dateFrom === "string" ? q.dateFrom : undefined,
    dateTo: typeof q.dateTo === "string" ? q.dateTo : undefined,
    years: toStringArray(q.years),
    months: toStringArray(q.months),
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

function buildWhere(f: Filters) {
  const clauses: string[] = [];
  const params: Record<string, string> = {};
  if (f.branch?.length) clauses.push(inClause("branch", f.branch, "branch", params));
  if (f.visitor?.length) clauses.push(inClause("visitor_name", f.visitor, "visitor", params));
  if (f.dateFrom) {
    clauses.push("invoice_date_jalali >= @dateFrom");
    params.dateFrom = f.dateFrom;
  }
  if (f.dateTo) {
    clauses.push("invoice_date_jalali <= @dateTo");
    params.dateTo = f.dateTo;
  }
  if (f.years?.length) clauses.push(inClause("invoice_year_jalali", f.years, "year", params));
  if (f.months?.length) clauses.push(inClause("invoice_month_jalali", f.months, "month", params));
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

receivablesRouter.get("/kpis", (req, res) => {
  const db = receivablesDb();
  const { sql: where, params } = buildWhere(parseFilters(req.query as Record<string, unknown>));

  const totals = db
    .prepare(
      `SELECT
         SUM(amount_unpaid) AS totalUnpaid,
         SUM(invoice_net_amount) AS totalNetInvoiced,
         SUM(amount_paid) AS totalPaid,
         SUM(collection_delay_penalty) AS totalPenalty,
         COUNT(DISTINCT CASE WHEN amount_unpaid > 0 THEN customer_code END) AS debtorCustomers,
         AVG(invoice_debt_age_days) AS avgDebtAgeDays,
         SUM(CASE WHEN due_bucket_15d = 'زیر 15 روز' THEN amount_unpaid ELSE 0 END) AS unpaidUnder15,
         SUM(CASE WHEN due_bucket_15d = 'بالای 15 روز' THEN amount_unpaid ELSE 0 END) AS unpaidOver15
       FROM receivable_invoices ${where}`
    )
    .get(params) as {
    totalUnpaid: number | null;
    totalNetInvoiced: number | null;
    totalPaid: number | null;
    totalPenalty: number | null;
    debtorCustomers: number;
    avgDebtAgeDays: number | null;
    unpaidUnder15: number | null;
    unpaidOver15: number | null;
  };

  const collectionRatePct =
    totals.totalNetInvoiced && totals.totalNetInvoiced > 0
      ? ((totals.totalPaid ?? 0) / totals.totalNetInvoiced) * 100
      : null;

  res.json({
    totalUnpaid: totals.totalUnpaid ?? 0,
    totalPenalty: totals.totalPenalty ?? 0,
    debtorCustomers: totals.debtorCustomers,
    avgDebtAgeDays: totals.avgDebtAgeDays ?? 0,
    unpaidUnder15: totals.unpaidUnder15 ?? 0,
    unpaidOver15: totals.unpaidOver15 ?? 0,
    collectionRatePct,
  });
});

receivablesRouter.get("/by-branch", (req, res) => {
  const db = receivablesDb();
  const { sql: where, params } = buildWhere(parseFilters(req.query as Record<string, unknown>));
  const rows = db
    .prepare(
      `SELECT branch, SUM(amount_unpaid) AS totalUnpaid
       FROM receivable_invoices ${where}
       GROUP BY branch ORDER BY totalUnpaid DESC`
    )
    .all(params) as { branch: string; totalUnpaid: number }[];
  const total = rows.reduce((s, r) => s + r.totalUnpaid, 0);
  res.json(
    rows.map((r, i) => ({
      ...r,
      rank: i + 1,
      sharePct: total > 0 ? (r.totalUnpaid / total) * 100 : 0,
    }))
  );
});

// چک‌های برگشتی (invoice_kind = 'چک برگشتي')، به تفکیک ویزیتور/مشتری/شعبه
receivablesRouter.get("/bounced-checks", (req, res) => {
  const db = receivablesDb();
  const { sql: where, params } = buildWhere(parseFilters(req.query as Record<string, unknown>));
  const bouncedClause = where ? `${where} AND invoice_kind = @kind` : "WHERE invoice_kind = @kind";
  const withKind = { ...params, kind: "چک برگشتي" };

  const totals = db
    .prepare(`SELECT COUNT(*) AS count, SUM(amount_unpaid) AS amount FROM receivable_invoices ${bouncedClause}`)
    .get(withKind) as { count: number; amount: number | null };

  const byVisitor = db
    .prepare(
      `SELECT visitor_name AS visitor, COUNT(*) AS count, SUM(amount_unpaid) AS amount
       FROM receivable_invoices ${bouncedClause} GROUP BY visitor_name ORDER BY amount DESC`
    )
    .all(withKind);

  const byCustomer = db
    .prepare(
      `SELECT customer_code, customer_name, COUNT(*) AS count, SUM(amount_unpaid) AS amount
       FROM receivable_invoices ${bouncedClause} GROUP BY customer_code ORDER BY amount DESC`
    )
    .all(withKind);

  const byBranch = db
    .prepare(
      `SELECT branch, COUNT(*) AS count, SUM(amount_unpaid) AS amount
       FROM receivable_invoices ${bouncedClause} GROUP BY branch ORDER BY amount DESC`
    )
    .all(withKind);

  res.json({
    totalCount: totals.count,
    totalAmount: totals.amount ?? 0,
    byVisitor,
    byCustomer,
    byBranch,
  });
});

// نسبت مانده مطالبات به فروش خالص — هم به تفکیک ویزیتور (تطبیق مستقیم نام)، هم
// به تفکیک شعبه (از طریق نگاشت دستی بالا، چون نام شعبه در دو فایل متفاوت است)
receivablesRouter.get("/ratio-to-sales", (req, res) => {
  const rdb = receivablesDb();
  const sdb = salesDb();
  const { sql: where, params } = buildWhere(parseFilters(req.query as Record<string, unknown>));

  const unpaidByVisitor = rdb
    .prepare(`SELECT visitor_name AS visitor, SUM(amount_unpaid) AS unpaid FROM receivable_invoices ${where} GROUP BY visitor_name`)
    .all(params) as { visitor: string; unpaid: number }[];
  const salesByVisitor = sdb
    .prepare(
      `SELECT visitor_name AS visitor, SUM(net_amount) AS sales FROM sales_lines
       GROUP BY visitor_name`
    )
    .all() as { visitor: string; sales: number }[];
  const salesVisitorMap = new Map(salesByVisitor.map((r) => [r.visitor, r.sales]));
  const byVisitor = unpaidByVisitor
    .map((r) => {
      const sales = salesVisitorMap.get(r.visitor) ?? 0;
      return { visitor: r.visitor, unpaid: r.unpaid, sales, ratioPct: sales > 0 ? (r.unpaid / sales) * 100 : null };
    })
    .sort((a, b) => (b.ratioPct ?? -1) - (a.ratioPct ?? -1));

  const unpaidByBranch = rdb
    .prepare(`SELECT branch, SUM(amount_unpaid) AS unpaid FROM receivable_invoices ${where} GROUP BY branch`)
    .all(params) as { branch: string; unpaid: number }[];
  const salesByCenter = sdb
    .prepare(
      `SELECT sales_center AS center, SUM(net_amount) AS sales FROM sales_lines
       GROUP BY sales_center`
    )
    .all() as { center: string; sales: number }[];
  const salesCenterMap = new Map(salesByCenter.map((r) => [r.center, r.sales]));
  const byBranch = unpaidByBranch.map((r) => {
    const mappedCenter = BRANCH_TO_SALES_CENTER[r.branch];
    const sales = mappedCenter ? salesCenterMap.get(mappedCenter) ?? 0 : 0;
    return { branch: r.branch, unpaid: r.unpaid, sales, ratioPct: sales > 0 ? (r.unpaid / sales) * 100 : null };
  });

  res.json({ byVisitor, byBranch });
});

receivablesRouter.get("/age-buckets", (req, res) => {
  const db = receivablesDb();
  const { sql: where, params } = buildWhere(parseFilters(req.query as Record<string, unknown>));
  const rows = db
    .prepare(
      `SELECT debt_age_bucket_detailed AS bucket, SUM(amount_unpaid) AS totalUnpaid
       FROM receivable_invoices ${where}
       GROUP BY debt_age_bucket_detailed`
    )
    .all(params);
  res.json(rows);
});

receivablesRouter.get("/by-visitor", (req, res) => {
  const db = receivablesDb();
  const { sql: where, params } = buildWhere(parseFilters(req.query as Record<string, unknown>));
  const rows = db
    .prepare(
      `SELECT visitor_name AS visitor, SUM(amount_unpaid) AS totalUnpaid, SUM(collection_delay_penalty) AS totalPenalty
       FROM receivable_invoices ${where}
       GROUP BY visitor_name ORDER BY totalUnpaid DESC LIMIT 20`
    )
    .all(params);
  res.json(rows);
});

receivablesRouter.get("/top-customers", (req, res) => {
  const db = receivablesDb();
  const { sql: where, params } = buildWhere(parseFilters(req.query as Record<string, unknown>));
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const rows = db
    .prepare(
      `SELECT customer_code, customer_name, SUM(amount_unpaid) AS totalUnpaid
       FROM receivable_invoices ${where}
       GROUP BY customer_code ORDER BY totalUnpaid DESC LIMIT ${limit}`
    )
    .all(params);
  res.json(rows);
});

receivablesRouter.get("/filters", (_req, res) => {
  const db = receivablesDb();
  const branches = db.prepare("SELECT DISTINCT branch FROM receivable_invoices ORDER BY branch").all();
  const visitors = db.prepare("SELECT DISTINCT visitor_name FROM receivable_invoices ORDER BY visitor_name").all();
  res.json({
    branches: branches.map((r: any) => r.branch).filter(Boolean),
    visitors: visitors.map((r: any) => r.visitor_name).filter(Boolean),
  });
});

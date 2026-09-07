import { Router } from "express";
import { salesDb, targetsDb } from "../db";
import { daysSince, lastCompleteMonth, previousYearMonth } from "../lib/jalali";

export const salesRouter = Router();

interface SalesFilters {
  dateFrom?: string;
  dateTo?: string;
  years?: string[];
  months?: string[];
  center?: string[];
  visitor?: string[];
  activeBasketOnly?: boolean;
}

function toStringArray(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  const arr = Array.isArray(v) ? v : [v];
  const strs = arr.filter((x): x is string => typeof x === "string" && x.length > 0);
  return strs.length ? strs : undefined;
}

function parseFilters(q: Record<string, unknown>): SalesFilters {
  return {
    dateFrom: typeof q.dateFrom === "string" ? q.dateFrom : undefined,
    dateTo: typeof q.dateTo === "string" ? q.dateTo : undefined,
    years: toStringArray(q.years),
    months: toStringArray(q.months),
    center: toStringArray(q.center),
    visitor: toStringArray(q.visitor),
    activeBasketOnly: q.activeBasketOnly === "true" || q.activeBasketOnly === "1",
  };
}

/** می‌سازد: "column IN (@prefix0,@prefix1,...)" و پارامترهای متناظر را در params می‌ریزد. */
function inClause(column: string, values: string[], prefix: string, params: Record<string, string>) {
  const names = values.map((v, i) => {
    const key = `${prefix}${i}`;
    params[key] = v;
    return `@${key}`;
  });
  return `${column} IN (${names.join(",")})`;
}

function buildWhere(f: SalesFilters, includeDateRange: boolean) {
  const clauses: string[] = [];
  const params: Record<string, string> = {};
  if (includeDateRange && f.dateFrom) {
    clauses.push("invoice_date_jalali >= @dateFrom");
    params.dateFrom = f.dateFrom;
  }
  if (includeDateRange && f.dateTo) {
    clauses.push("invoice_date_jalali <= @dateTo");
    params.dateTo = f.dateTo;
  }
  if (includeDateRange && f.years?.length) {
    clauses.push(inClause("substr(invoice_date_jalali,1,4)", f.years, "year", params));
  }
  if (includeDateRange && f.months?.length) {
    clauses.push(inClause("substr(invoice_date_jalali,6,2)", f.months, "month", params));
  }
  if (f.center?.length) {
    clauses.push(inClause("sales_center", f.center, "center", params));
  }
  if (f.visitor?.length) {
    clauses.push(inClause("visitor_name", f.visitor, "visitor", params));
  }
  // «سبد فعال» — دقیقاً همان ستون/اسلایسر «Forosh.سبد فعال» در فایل پاور بی‌آی
  // منبع (کالاهای دیگر تولیدنشده/از رده‌خارج را از تحلیل کنار می‌گذارد). چون این
  // یک فیلتر سطحِ ردیف است (نه فقط نمایشی)، عمداً در همین buildWhere مرکزی اعمال
  // می‌شود تا روی همه‌ی خروجی‌های این فایل (KPI، روند، تفکیک مرکز/ویزیتور، ...)
  // یکنواخت اثر بگذارد — دقیقاً مثل رفتار اسلایسر سطح صفحه در پاور بی‌آی.
  if (f.activeBasketOnly) {
    clauses.push("is_active_basket = 1");
  }
  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

salesRouter.get("/kpis", (req, res) => {
  const db = salesDb();
  const filters = parseFilters(req.query as Record<string, unknown>);
  const { sql: whereWithDate, params: paramsWithDate } = buildWhere(filters, true);
  const { sql: whereNoDate, params: paramsNoDate } = buildWhere(filters, false);

  const totals = db
    .prepare(
      `SELECT
         SUM(net_amount) AS totalNetAmount,
         SUM(CASE WHEN record_source = 'نهایی' THEN net_amount ELSE 0 END) AS finalizedNetAmount,
         SUM(qty_normalized_count_signed) AS totalNetQtyCount,
         COUNT(DISTINCT invoice_no) AS totalInvoices,
         COUNT(DISTINCT visitor_name) AS distinctVisitors
       FROM sales_lines ${whereWithDate}`
    )
    .get(paramsWithDate) as {
    totalNetAmount: number | null;
    finalizedNetAmount: number | null;
    totalNetQtyCount: number | null;
    totalInvoices: number;
    distinctVisitors: number;
  };

  const avgInvoiceAmount =
    totals.totalInvoices > 0 ? (totals.totalNetAmount ?? 0) / totals.totalInvoices : 0;

  // سرانه فروش به ازای ویزیتور: فروش خالص کل ÷ تعداد ویزیتورهای یکتای دارای فروش در
  // بازه‌ی انتخابی — دقیقاً منطبق با measure «Sales per Employee» در پاور بی‌آی منبع
  // (DIVIDE(Sum_Total_Rial, DISTINCTCOUNT(Visitor[نام بازاریاب])))
  const salesPerVisitor =
    totals.distinctVisitors > 0 ? (totals.totalNetAmount ?? 0) / totals.distinctVisitors : 0;

  // وضعیت مشتریان (فعال/غیرفعال): آستانه‌ی ۶۰ روز، دقیقاً منطبق با ستون [وضعیت] در
  // پاور بی‌آی منبع (IF([روز از آخرین خرید] > 60, "غیرفعال", "فعال")) — بر اساس کل
  // تاریخچه، نه بازه‌ی زمانی انتخابی. گروه‌بندی بر مبنای canonical_customer_code
  // (نه customer_code خام) تا مشتریِ دارای دو کد (کد قدیمی رهاشده + کد جدید) یک نفر
  // حساب شود و بر اساس آخرین خریدش با هر کد، درست «فعال/غیرفعال» تشخیص داده شود.
  const lastPurchaseRows = db
    .prepare(
      `SELECT canonical_customer_code, MAX(invoice_date_jalali) AS lastDate
       FROM sales_lines ${whereNoDate}
       GROUP BY canonical_customer_code`
    )
    .all(paramsNoDate) as { canonical_customer_code: string; lastDate: string }[];

  let active = 0,
    inactive = 0;
  let daysSum = 0,
    daysCount = 0;
  for (const row of lastPurchaseRows) {
    const days = daysSince(row.lastDate);
    if (days === null) continue;
    daysSum += days;
    daysCount += 1;
    if (days <= 60) active += 1;
    else inactive += 1;
  }
  const totalCustomers = active + inactive;
  const avgDaysSinceLastPurchase = daysCount > 0 ? daysSum / daysCount : 0;

  // نرخ حفظ مشتری: مقایسه‌ی ماهانه (آخرین ماهِ «کامل» در برابر ماه قبل از آن).
  // اگر آخرین تاریخ داده وسط یک ماه باشد (مثلاً روز ۴ام)، آن ماه هنوز کامل نشده و
  // مقایسه با آن گمراه‌کننده است؛ در این حالت یک ماه به عقب برمی‌گردیم.
  const maxDateRow = db
    .prepare(`SELECT MAX(invoice_date_jalali) AS maxDate FROM sales_lines ${whereNoDate}`)
    .get(paramsNoDate) as { maxDate: string | null };

  let retentionRatePct: number | null = null;
  if (maxDateRow.maxDate) {
    const latest = lastCompleteMonth(maxDateRow.maxDate);
    const prev = previousYearMonth(latest.year, latest.month);
    const latestYm = `${latest.year}/${String(latest.month).padStart(2, "0")}`;
    const prevYm = `${prev.year}/${String(prev.month).padStart(2, "0")}`;

    const prevCustomers = db
      .prepare(
        `SELECT DISTINCT canonical_customer_code FROM sales_lines
         ${whereNoDate ? whereNoDate + " AND" : "WHERE"} substr(invoice_date_jalali,1,7) = @ym`
      )
      .all({ ...paramsNoDate, ym: prevYm }) as { canonical_customer_code: string }[];

    const prevSet = new Set(prevCustomers.map((r) => r.canonical_customer_code));

    const latestCustomers = db
      .prepare(
        `SELECT DISTINCT canonical_customer_code FROM sales_lines
         ${whereNoDate ? whereNoDate + " AND" : "WHERE"} substr(invoice_date_jalali,1,7) = @ym`
      )
      .all({ ...paramsNoDate, ym: latestYm }) as { canonical_customer_code: string }[];

    const retained = latestCustomers.filter((r) => prevSet.has(r.canonical_customer_code)).length;
    retentionRatePct = prevSet.size > 0 ? (retained / prevSet.size) * 100 : null;
  }

  res.json({
    totalNetAmount: totals.totalNetAmount ?? 0,
    finalizedNetAmount: totals.finalizedNetAmount ?? 0,
    pendingNetAmount: (totals.totalNetAmount ?? 0) - (totals.finalizedNetAmount ?? 0),
    totalNetQtyCount: totals.totalNetQtyCount ?? 0,
    totalInvoices: totals.totalInvoices,
    avgInvoiceAmount,
    salesPerVisitor,
    customerActive: active,
    customerInactive: inactive,
    customerInactivePct: totalCustomers > 0 ? (inactive / totalCustomers) * 100 : 0,
    avgDaysSinceLastPurchase,
    retentionRatePct,
  });
});

salesRouter.get("/monthly-trend", (req, res) => {
  const db = salesDb();
  const filters = parseFilters(req.query as Record<string, unknown>);
  const { sql: where, params } = buildWhere(filters, true);
  const rows = db
    .prepare(
      `SELECT substr(invoice_date_jalali,1,7) AS ym,
              SUM(net_amount) AS netAmount,
              SUM(qty_normalized_count_signed) AS netQty,
              COUNT(DISTINCT invoice_no) AS invoiceCount
       FROM sales_lines ${where}
       GROUP BY ym ORDER BY ym`
    )
    .all(params) as { ym: string; netAmount: number; netQty: number; invoiceCount: number }[];
  res.json(
    rows.map((r) => ({
      ...r,
      avgInvoiceAmount: r.invoiceCount > 0 ? r.netAmount / r.invoiceCount : 0,
    }))
  );
});

salesRouter.get("/by-center", (req, res) => {
  const db = salesDb();
  const filters = parseFilters(req.query as Record<string, unknown>);
  const { sql: where, params } = buildWhere(filters, true);
  const rows = db
    .prepare(
      `SELECT sales_center AS center,
              SUM(net_amount) AS netAmount,
              SUM(qty_normalized_count_signed) AS netQty
       FROM sales_lines ${where}
       GROUP BY sales_center ORDER BY netAmount DESC`
    )
    .all(params);
  res.json(rows);
});

salesRouter.get("/by-province", (req, res) => {
  const db = salesDb();
  const filters = parseFilters(req.query as Record<string, unknown>);
  const { sql: where, params } = buildWhere(filters, true);
  const rows = db
    .prepare(
      `SELECT province,
              SUM(net_amount) AS netAmount,
              SUM(qty_normalized_count_signed) AS netQty
       FROM sales_lines
       ${where ? `${where} AND province IS NOT NULL` : "WHERE province IS NOT NULL"}
       GROUP BY province ORDER BY netAmount DESC`
    )
    .all(params);
  res.json(rows);
});

salesRouter.get("/customer-status-scatter", (req, res) => {
  const db = salesDb();
  const filters = parseFilters(req.query as Record<string, unknown>);
  const { sql: where, params } = buildWhere(filters, false);
  const rows = db
    .prepare(
      `SELECT canonical_customer_code, MAX(customer_name) AS customer_name, MAX(invoice_date_jalali) AS lastDate,
              SUM(net_amount) AS netAmount, COUNT(DISTINCT invoice_no) AS invoiceCount
       FROM sales_lines ${where}
       GROUP BY canonical_customer_code`
    )
    .all(params) as {
    canonical_customer_code: string;
    customer_name: string;
    lastDate: string;
    netAmount: number;
    invoiceCount: number;
  }[];

  const result = rows.map((r) => {
    const days = daysSince(r.lastDate) ?? 0;
    const status = days <= 60 ? "active" : "inactive";
    return {
      customerCode: r.canonical_customer_code,
      customerName: r.customer_name,
      daysSinceLastPurchase: days,
      netAmount: r.netAmount,
      invoiceCount: r.invoiceCount,
      status,
    };
  });
  res.json(result);
});

salesRouter.get("/top-customers", (req, res) => {
  const db = salesDb();
  const filters = parseFilters(req.query as Record<string, unknown>);
  const { sql: where, params } = buildWhere(filters, true);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const rows = db
    .prepare(
      `SELECT canonical_customer_code AS customer_code, MAX(customer_name) AS customer_name,
              SUM(net_amount) AS netAmount,
              COUNT(DISTINCT invoice_no) AS invoiceCount
       FROM sales_lines ${where}
       GROUP BY canonical_customer_code
       ORDER BY netAmount DESC
       LIMIT ${limit}`
    )
    .all(params);
  res.json(rows);
});

salesRouter.get("/marketer-scorecard", (req, res) => {
  const db = salesDb();
  const filters = parseFilters(req.query as Record<string, unknown>);
  const { sql: where, params } = buildWhere(filters, true);

  const actualRows = db
    .prepare(
      `SELECT visitor_name,
              substr(invoice_date_jalali,1,4) AS year,
              CAST(substr(invoice_date_jalali,6,2) AS INTEGER) AS month,
              item_group,
              SUM(qty_normalized_count_signed) AS actualQty,
              SUM(qty_normalized_carton_signed) AS actualQtyCarton,
              SUM(net_amount) AS actualAmount
       FROM sales_lines ${where}
       GROUP BY visitor_name, year, month, item_group`
    )
    .all(params) as {
    visitor_name: string;
    year: string;
    month: number;
    item_group: string | null;
    actualQty: number;
    actualQtyCarton: number | null;
    actualAmount: number;
  }[];

  const tdb = targetsDb();
  const targetRows = tdb
    .prepare(
      `SELECT visitor_name, year_jalali AS year, month_num AS month, item_group, SUM(target_qty) AS targetQty
       FROM target_visitor GROUP BY visitor_name, year_jalali, month_num, item_group`
    )
    .all() as { visitor_name: string; year: number; month: number; item_group: string; targetQty: number }[];

  // تارگت‌ها بر مبنای کارتن تعیین می‌شوند (طبق منبع مبنا: SUM(Forosh[مقدار خالص به کارتن])
  // در برابر SUM(Target Visitor[تارگت]))، به تفکیک گروه کالا: دقیقاً مثل کارنامه‌ی
  // بازاریاب، تحقق هر بازاریاب باید فقط از فروشِ همان گروه‌های کالایی محاسبه شود که
  // برایشان تارگتی تعریف شده (تا سقف ۱۲۰٪ تارگتِ همان گروه) — فروشِ گروه‌های
  // بدون‌تارگت در تحقق لحاظ نمی‌شود، وگرنه درصد تحقق به‌شدت اریب می‌شود (تأیید شد با
  // مقایسه‌ی مستقیم با measure «Sum120Darsad_Visitor» در فایل پاور بی‌آی منبع).
  const targetByGroup = new Map<string, Map<string, number>>(); // key: visitor|year|month → group → target
  const targetTotalByKey = new Map<string, number>(); // key: visitor|year|month
  for (const t of targetRows) {
    const key = `${t.visitor_name}|${t.year}|${t.month}`;
    if (!targetByGroup.has(key)) targetByGroup.set(key, new Map());
    targetByGroup.get(key)!.set(t.item_group, t.targetQty);
    targetTotalByKey.set(key, (targetTotalByKey.get(key) ?? 0) + (t.targetQty ?? 0));
  }

  const actualByVYM = new Map<
    string,
    { visitorName: string; year: number; month: number; actualQty: number; actualAmount: number; byGroup: Map<string, number> }
  >();
  for (const r of actualRows) {
    const key = `${r.visitor_name}|${r.year}|${r.month}`;
    if (!actualByVYM.has(key)) {
      actualByVYM.set(key, {
        visitorName: r.visitor_name,
        year: Number(r.year),
        month: r.month,
        actualQty: 0,
        actualAmount: 0,
        byGroup: new Map(),
      });
    }
    const entry = actualByVYM.get(key)!;
    entry.actualQty += r.actualQty ?? 0;
    entry.actualAmount += r.actualAmount ?? 0;
    entry.byGroup.set(r.item_group ?? "", r.actualQtyCarton ?? 0);
  }

  const result = Array.from(actualByVYM.values()).map((e) => {
    const key = `${e.visitorName}|${e.year}|${e.month}`;
    const targetTotal = targetTotalByKey.get(key) ?? 0;
    let achievedCapped = 0;
    if (targetTotal > 0) {
      for (const [group, target] of targetByGroup.get(key) ?? []) {
        if (!target) continue;
        const actual = e.byGroup.get(group) ?? 0;
        achievedCapped += Math.min(actual, target * 1.2);
      }
    }
    return {
      visitorName: e.visitorName,
      year: e.year,
      month: e.month,
      actualQty: e.actualQty,
      actualQtyCarton: achievedCapped,
      actualAmount: e.actualAmount,
      targetQty: targetTotal > 0 ? targetTotal : null,
      achievementPct: targetTotal > 0 ? (achievedCapped / targetTotal) * 100 : null,
    };
  });
  res.json(result);
});

salesRouter.get("/daily", (req, res) => {
  const db = salesDb();
  const filters = parseFilters(req.query as Record<string, unknown>);
  // فروش روزانه: همیشه فقط ماه جاری، بدون فیلتر بازه‌ی زمانی (طبق مشخصات)
  const maxDateRow = db.prepare("SELECT MAX(invoice_date_jalali) AS maxDate FROM sales_lines").get() as {
    maxDate: string | null;
  };
  if (!maxDateRow.maxDate) return res.json([]);
  const currentYm = maxDateRow.maxDate.slice(0, 7);

  const { sql: extraWhere, params } = buildWhere(
    { center: filters.center, visitor: filters.visitor, activeBasketOnly: filters.activeBasketOnly },
    false
  );
  const clause = extraWhere ? `${extraWhere} AND substr(invoice_date_jalali,1,7) = @ym` : "WHERE substr(invoice_date_jalali,1,7) = @ym";

  const rows = db
    .prepare(
      `SELECT invoice_date_jalali AS date,
              SUM(net_amount) AS netAmount,
              SUM(qty_normalized_count_signed) AS netQty
       FROM sales_lines ${clause}
       GROUP BY invoice_date_jalali ORDER BY invoice_date_jalali`
    )
    .all({ ...params, ym: currentYm });
  res.json(rows);
});

salesRouter.get("/filters", (_req, res) => {
  const db = salesDb();
  const centers = db.prepare("SELECT DISTINCT sales_center FROM sales_lines ORDER BY sales_center").all();
  const visitors = db.prepare("SELECT DISTINCT visitor_name FROM sales_lines ORDER BY visitor_name").all();
  res.json({
    centers: centers.map((r: any) => r.sales_center).filter(Boolean),
    visitors: visitors.map((r: any) => r.visitor_name).filter(Boolean),
  });
});

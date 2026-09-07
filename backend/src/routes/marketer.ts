import { Router } from "express";
import { toJalaali, jalaaliMonthLength } from "jalaali-js";
import { salesDb, receivablesDb, targetsDb } from "../db";
import { getMarketerStatus } from "../lib/marketerStatus";

export const marketerRouter = Router();

interface PeriodFilters {
  dateFrom?: string;
  dateTo?: string;
  years?: string[];
  months?: string[];
  activeBasketOnly?: boolean;
}

function toStringArray(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  const arr = Array.isArray(v) ? v : [v];
  const strs = arr.filter((x): x is string => typeof x === "string" && x.length > 0);
  return strs.length ? strs : undefined;
}

function parsePeriodFilters(q: Record<string, unknown>): PeriodFilters {
  return {
    dateFrom: typeof q.dateFrom === "string" ? q.dateFrom : undefined,
    dateTo: typeof q.dateTo === "string" ? q.dateTo : undefined,
    years: toStringArray(q.years),
    months: toStringArray(q.months),
    activeBasketOnly: q.activeBasketOnly === "true" || q.activeBasketOnly === "1",
  };
}

/** «AND is_active_basket = 1» یا رشته‌ی خالی — برای الحاق به یک WHERE از قبل
 * موجود روی sales_lines. عمداً فقط روی نماهای توصیفی (KPI، پراکندگی کالایی،
 * هیستوگرام فاکتور، مشتریان) اعمال می‌شود، نه روی محاسبه‌ی تحقق تارگت
 * (actualByMonthGroup) — چون تارگت هر گروه‌کالا برای کل آن گروه تعریف شده، نه
 * فقط زیرمجموعه‌ی «فعالِ» آن، و فیلترکردنش باعث می‌شد تحقق به‌ناحق کمتر از واقع
 * نشان داده شود (مغایر با همان محاسبه‌ای که قبلاً در برابر پاور بی‌آی تأیید شد). */
function activeBasketClause(f: PeriodFilters): string {
  return f.activeBasketOnly ? " AND is_active_basket = 1" : "";
}

function hasActiveFilter(f: PeriodFilters): boolean {
  return !!(f.dateFrom || f.dateTo || f.years?.length || f.months?.length);
}

function inClause(column: string, values: string[], prefix: string, params: Record<string, string>) {
  const names = values.map((v, i) => {
    const key = `${prefix}${i}`;
    params[key] = v;
    return `@${key}`;
  });
  return `${column} IN (${names.join(",")})`;
}

/** برای sales_lines که تاریخ روزانه (invoice_date_jalali) دارد. */
function buildSalesPeriodWhere(f: PeriodFilters, params: Record<string, string>): string {
  const clauses: string[] = [];
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
  return clauses.length ? " AND " + clauses.join(" AND ") : "";
}

/** برای receivable_invoices که تاریخ روزانه (invoice_date_jalali) دارد. */
function buildReceivablesPeriodWhere(f: PeriodFilters, params: Record<string, string>): string {
  const clauses: string[] = [];
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
  return clauses.length ? " AND " + clauses.join(" AND ") : "";
}

/**
 * صفحه‌ی «کارنامه بازاریاب» — بازسازی دقیق همان صفحه در فایل پاور بی‌آی منبع
 * (فیلترها، کارت‌های KPI، نمودار ترکیبی تارگت/تحقق، روند مشتریان، پراکندگی گروه
 * کالایی، هیستوگرام اندازه‌ی فاکتور، و مانده مطالبات به تفکیک ویزیتور) به‌علاوه‌ی یک
 * بخش تحلیل/هشدار کوتاه مخصوص هر بازاریاب که در پاور بی‌آی وجود نداشت.
 *
 * بازه‌های اندازه‌ی فاکتور دقیقاً همان بازه‌های جدول «InvoiceBins» در فایل منبع است.
 */
const INVOICE_BINS = [
  { label: "زیر ۲ میلیون", min: 0, max: 2_000_000 },
  { label: "۲ تا ۵ میلیون", min: 2_000_000, max: 5_000_000 },
  { label: "۵ تا ۱۵ میلیون", min: 5_000_000, max: 15_000_000 },
  { label: "۱۵ تا ۳۰ میلیون", min: 15_000_000, max: 30_000_000 },
  { label: "۳۰ تا ۵۰ میلیون", min: 30_000_000, max: 50_000_000 },
  { label: "بالای ۵۰ میلیون", min: 50_000_000, max: Infinity },
];

marketerRouter.get("/list", (_req, res) => {
  const db = salesDb();
  const rows = db
    .prepare(
      `SELECT visitor_name, SUM(net_amount) AS total FROM sales_lines
       WHERE visitor_name IS NOT NULL
       GROUP BY visitor_name ORDER BY total DESC`
    )
    .all() as { visitor_name: string; total: number }[];
  res.json(rows.map((r) => ({ name: r.visitor_name, status: getMarketerStatus(r.visitor_name) })));
});

marketerRouter.get("/scorecard", (req, res) => {
  const visitor = String(req.query.visitor ?? "");
  if (!visitor) {
    res.status(400).json({ error: "پارامتر visitor لازم است" });
    return;
  }
  const sdb = salesDb();
  const tdb = targetsDb();
  const rdb = receivablesDb();

  const periodFilters = parsePeriodFilters(req.query as Record<string, unknown>);
  const filterActive = hasActiveFilter(periodFilters);

  // ---------- KPI ها (همه بر اساس فیلتر زمانی سراسری، اگر فعال باشد) ----------
  // عمداً محدود به «نهایی» نیست: هر ۴ منبع لحاظ می‌شود (نهایی + ماه جاری + درخواست/
  // حواله‌ی موقت)، دقیقاً مثل جدول ترکیبی «Forosh» در فایل پاور بی‌آی منبع که همه‌ی
  // measureهای Sum_Total_Rial/Total_Customers/... از روی آن حساب می‌شوند — نه فقط
  // «Forosh Nahayi». برای ماه‌های بسته‌شده این هیچ فرقی نمی‌کند (همه‌چیز تا آن‌موقع
  // قبلاً «نهایی» شده)؛ فقط باعث می‌شود ماه در حال سپری‌شدن هم دیده شود.
  const salesParams: Record<string, string> = { visitor };
  const salesPeriodClause = buildSalesPeriodWhere(periodFilters, salesParams);
  const totals = sdb
    .prepare(
      `SELECT
         COUNT(DISTINCT CASE WHEN net_amount > 0 THEN canonical_customer_code END) AS customersCount,
         SUM(net_amount) AS totalAmount,
         COUNT(DISTINCT CASE WHEN net_amount > 1 THEN invoice_no END) AS validInvoices,
         SUM(CASE WHEN net_amount > 1 THEN 1 ELSE 0 END) AS validLines
       FROM sales_lines WHERE visitor_name = @visitor${salesPeriodClause}${activeBasketClause(periodFilters)}`
    )
    .get(salesParams) as {
    customersCount: number;
    totalAmount: number | null;
    validInvoices: number;
    validLines: number;
  };
  const avgLinesPerInvoice = totals.validInvoices > 0 ? totals.validLines / totals.validInvoices : 0;

  // ---------- تارگت و تحقق به تفکیک ماه و گروه کالا ----------
  // تحقق تارگت باید به تفکیک هر گروه کالا محاسبه شود، نه در کل: فایل پاور بی‌آی
  // منبع (measure «Sum120Darsad_Visitor») برای هر گروه کالا که برای آن بازاریاب/ماه
  // تارگتی تعریف شده، فروش همان گروه را تا سقف ۱۲۰٪ تارگتِ همان گروه لحاظ می‌کند و
  // این‌ها را جمع می‌زند؛ فروشِ گروه‌هایی که اصلاً تارگتی ندارند، در تحقق لحاظ
  // نمی‌شود. اگر این کار در سطح «کل» (بدون تفکیک گروه) انجام شود، فروش گروه‌های
  // بدون‌تارگت به‌ناحق روی تحقق سوار می‌شود و درصد تحقق چند صد برابر واقعی درمی‌آید
  // (تأیید شد با شبیه‌سازی دقیق همین DAX روی داده‌ی خام پاور بی‌آی).
  const targetByMonthGroup = tdb
    .prepare(
      `SELECT year_jalali AS year, month_num AS month, item_group, SUM(target_qty) AS target
       FROM target_visitor WHERE visitor_name = @visitor GROUP BY year_jalali, month_num, item_group`
    )
    .all({ visitor }) as { year: number; month: number; item_group: string; target: number }[];

  const actualByMonthGroup = sdb
    .prepare(
      `SELECT substr(invoice_date_jalali,1,4) AS year, CAST(substr(invoice_date_jalali,6,2) AS INTEGER) AS month,
              item_group, SUM(qty_normalized_carton_signed) AS actual
       FROM sales_lines WHERE visitor_name = @visitor
       GROUP BY year, month, item_group`
    )
    .all({ visitor }) as { year: string; month: number; item_group: string; actual: number }[];

  const targetByYM = new Map<string, Map<string, number>>();
  for (const r of targetByMonthGroup) {
    const key = `${r.year}/${r.month}`;
    if (!targetByYM.has(key)) targetByYM.set(key, new Map());
    targetByYM.get(key)!.set(r.item_group, r.target);
  }
  const actualByYM = new Map<string, Map<string, number>>();
  for (const r of actualByMonthGroup) {
    const key = `${r.year}/${r.month}`;
    if (!actualByYM.has(key)) actualByYM.set(key, new Map());
    actualByYM.get(key)!.set(r.item_group, r.actual);
  }
  const targetMonthTotals = Array.from(targetByYM.entries()).map(([key, groups]) => {
    const [y, m] = key.split("/").map(Number);
    return { year: y, month: m, target: Array.from(groups.values()).reduce((s, v) => s + v, 0) };
  });
  const actualMonthTotals = Array.from(actualByYM.entries()).map(([key, groups]) => {
    const [y, m] = key.split("/").map(Number);
    return { year: y, month: m, actual: Array.from(groups.values()).reduce((s, v) => s + v, 0) };
  });
  const latestYear =
    periodFilters.years?.length === 1
      ? Number(periodFilters.years[0])
      : targetMonthTotals.length
        ? Math.max(...targetMonthTotals.map((r) => r.year))
        : actualMonthTotals.length
          ? Math.max(...actualMonthTotals.map((r) => r.year))
          : null;

  // برای ماه جاری (هنوز تمام نشده)، تارگت را نسبت به «امروز» متناسب‌سازی می‌کنیم
  // (روزهای سپری‌شده ÷ کل روزهای ماه) — دقیقاً همان ایده‌ی TargetRozaneh/
  // DarsadTahaghoghTaRooz در فایل منبع، ساده‌شده بر مبنای روز تقویمی (چون تقویم
  // روز کاری/تعطیل مستقل در دیتای ما موجود نیست). ماه‌های گذشته دست‌نخورده می‌مانند.
  const today = toJalaali(new Date());

  /** جمع تارگت + «تحقق سقف‌شده به تفکیک گروه» برای مجموعه‌ای از ماه‌ها (هر ماه با
   * ضریب پرو-ریت خودش، فقط اگر همان ماهِ جاریِ واقعی باشد). */
  function computeGroupCappedAchievement(months: { year: number; month: number }[]) {
    let targetTotal = 0;
    let achievedTotal = 0;
    for (const { year, month } of months) {
      const isRealCurrentMonth = year === today.jy && month === today.jm;
      const dayFraction = isRealCurrentMonth ? today.jd / jalaaliMonthLength(year, month) : 1;
      const targetGroups = targetByYM.get(`${year}/${month}`);
      const actualGroups = actualByYM.get(`${year}/${month}`);
      if (!targetGroups) continue;
      for (const [group, fullTarget] of targetGroups) {
        if (!fullTarget) continue;
        const proratedTarget = fullTarget * dayFraction;
        targetTotal += proratedTarget;
        const actual = actualGroups?.get(group) ?? 0;
        achievedTotal += Math.min(actual, proratedTarget * 1.2);
      }
    }
    return { targetTotal, achievedTotal };
  }

  // کارت‌های KPI بالای صفحه یک عدد از جمع‌زدنِ چند ماهِ نامرتبط با هم نمی‌سازند
  // (جمع‌زدن تارگت/تحقق چند ماه مختلف و بعد یک درصد از حاصل‌جمع درآوردن، عددی
  // بی‌معنی و گمراه‌کننده است). به‌جایش: اگر فیلتر زمانی سراسری فعال باشد، دقیقاً
  // همان بازه‌ی انتخابی (یک یا چند ماهِ مشخص‌شده توسط خودِ کاربر) محاسبه می‌شود؛
  // وگرنه پیش‌فرض «ماه جاری» است. برای «تارگت محقق‌شده به تفکیک هر ماه» به‌صورت
  // جداگانه، نمودار «تارگت در برابر تحقق — ماهانه» پایین همین صفحه مرجع است.
  let scopedMonths: { year: number; month: number }[];
  if (filterActive) {
    const yearsInScope = periodFilters.years?.length
      ? periodFilters.years.map(Number)
      : Array.from(new Set(targetByMonthGroup.map((r) => r.year)));
    const monthsInScope = periodFilters.months?.length
      ? periodFilters.months.map(Number)
      : Array.from({ length: 12 }, (_, i) => i + 1);
    const dateFromNum = periodFilters.dateFrom ? Number(periodFilters.dateFrom.replace(/\//g, "")) : null;
    const dateToNum = periodFilters.dateTo ? Number(periodFilters.dateTo.replace(/\//g, "")) : null;
    scopedMonths = yearsInScope.flatMap((year) =>
      monthsInScope
        .filter((month) => {
          // ۳۱ به‌عنوان بیشینه‌ی امن روزهای ماه (نه ۲۸) تا برای ماه‌های ۳۱روزه (۱ تا ۶)
          // با dateFrom روزهای پایانی ماه (۲۹ تا ۳۱)، آن ماه به‌اشتباه از بازه حذف نشود.
          if (dateFromNum !== null && year * 10000 + month * 100 + 31 < dateFromNum) return false;
          if (dateToNum !== null && year * 10000 + month * 100 + 1 > dateToNum) return false;
          return true;
        })
        .map((month) => ({ year, month }))
    );
  } else {
    scopedMonths = [{ year: today.jy, month: today.jm }];
  }
  const { targetTotal: targetQtyTotal, achievedTotal: achievedCapped120 } =
    computeGroupCappedAchievement(scopedMonths);
  const achievementPct = targetQtyTotal > 0 ? (achievedCapped120 / targetQtyTotal) * 100 : null;

  const recvParams: Record<string, string> = { visitor };
  const recvPeriodClause = buildReceivablesPeriodWhere(periodFilters, recvParams);
  const recvAgg = rdb
    .prepare(`SELECT SUM(amount_unpaid) AS total FROM receivable_invoices WHERE visitor_name = @visitor${recvPeriodClause}`)
    .get(recvParams) as { total: number | null };

  const monthlyTargetVsActual = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
    const fullTarget = latestYear
      ? targetMonthTotals.find((r) => r.year === latestYear && r.month === month)?.target ?? 0
      : 0;
    const isCurrentMonth = latestYear === today.jy && month === today.jm;
    const proratedTarget =
      isCurrentMonth && fullTarget > 0
        ? fullTarget * (today.jd / jalaaliMonthLength(today.jy, today.jm))
        : fullTarget;
    const { achievedTotal } = latestYear ? computeGroupCappedAchievement([{ year: latestYear, month }]) : { achievedTotal: 0 };
    return {
      month,
      target: proratedTarget,
      fullMonthTarget: fullTarget,
      isCurrentMonth,
      actual: achievedTotal,
      achievementPct: proratedTarget > 0 ? (achievedTotal / proratedTarget) * 100 : null,
    };
  });

  // ---------- روند مشتریان فعال، به تفکیک ماه و سال ----------
  const customerTrendRaw = sdb
    .prepare(
      `SELECT substr(invoice_date_jalali,1,4) AS year, CAST(substr(invoice_date_jalali,6,2) AS INTEGER) AS month,
              COUNT(DISTINCT canonical_customer_code) AS customers
       FROM sales_lines WHERE visitor_name = @visitor
       GROUP BY year, month ORDER BY year, month`
    )
    .all({ visitor }) as { year: string; month: number; customers: number }[];
  const years = Array.from(new Set(customerTrendRaw.map((r) => r.year))).sort();
  const customerTrendByYear = years.map((y) => ({
    year: y,
    points: Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
      month: m,
      customers: customerTrendRaw.find((r) => r.year === y && r.month === m)?.customers ?? 0,
    })),
  }));

  // ---------- پراکندگی کالایی (۱۲ کالای برتر بر اساس تعداد) ----------
  const byItemRows = sdb
    .prepare(
      `SELECT item_name, SUM(qty_normalized_count_signed) AS qty
       FROM sales_lines WHERE visitor_name = @visitor${activeBasketClause(periodFilters)}
       GROUP BY item_name ORDER BY qty DESC LIMIT 12`
    )
    .all({ visitor }) as { item_name: string; qty: number }[];

  // ---------- هیستوگرام اندازه‌ی فاکتور ----------
  const invoiceTotals = sdb
    .prepare(
      `SELECT invoice_no, SUM(net_amount) AS total FROM sales_lines
       WHERE visitor_name = @visitor${activeBasketClause(periodFilters)}
       GROUP BY invoice_no`
    )
    .all({ visitor }) as { invoice_no: string; total: number }[];
  const invoiceBins = INVOICE_BINS.map((b) => ({
    label: b.label,
    count: invoiceTotals.filter((i) => i.total >= b.min && i.total < b.max).length,
  }));

  // ---------- مانده مطالبات به تفکیک همه‌ی ویزیتورها (برای مقایسه) ----------
  const receivablesByVisitor = rdb
    .prepare(
      `SELECT visitor_name AS visitor, SUM(amount_unpaid) AS unpaid FROM receivable_invoices
       GROUP BY visitor_name ORDER BY unpaid DESC LIMIT 20`
    )
    .all() as { visitor: string; unpaid: number }[];

  // ---------- مشتریان این بازاریاب (برای «مشتری به تفکیک بازاریاب») ----------
  // «lastDate» عمداً از هر ۴ منبع محاسبه می‌شود، وگرنه مشتری‌ای که همین هفته خرید
  // کرده (فاکتور هنوز نهایی‌نشده) با تاریخ چند هفته قدیمی‌تر نمایش داده می‌شود.
  const customers = sdb
    .prepare(
      `SELECT canonical_customer_code AS code, MAX(customer_name) AS name,
              SUM(net_amount) AS totalAmount, MAX(invoice_date_jalali) AS lastDate,
              COUNT(DISTINCT invoice_no) AS invoiceCount
       FROM sales_lines WHERE visitor_name = @visitor
       GROUP BY canonical_customer_code ORDER BY totalAmount DESC`
    )
    .all({ visitor }) as { code: string; name: string; totalAmount: number; lastDate: string; invoiceCount: number }[];

  // ---------- تحلیل کوتاه + هشدارهای مخصوص این بازاریاب ----------
  const periodLabel = filterActive ? "این بازه" : "این ماه";
  const analysisLines: string[] = [];
  if (achievementPct !== null) {
    if (achievementPct >= 100) analysisLines.push(`تارگت کارتنی ${periodLabel} با ${achievementPct.toFixed(0)}٪ تحقق، پوشش داده شده.`);
    else if (achievementPct >= 70) analysisLines.push(`تحقق تارگت ${periodLabel} ${achievementPct.toFixed(0)}٪ است — فاصله تا هدف قابل جبران به‌نظر می‌رسد.`);
    else analysisLines.push(`تحقق تارگت ${periodLabel} فقط ${achievementPct.toFixed(0)}٪ است — فاصله‌ی زیادی تا هدف وجود دارد.`);
  } else {
    analysisLines.push(`برای این بازاریاب تارگتی برای ${periodLabel} ثبت نشده.`);
  }
  const unpaid = recvAgg.total ?? 0;
  const totalSalesAmount = totals.totalAmount ?? 0;
  const ratioToSalesPct = totalSalesAmount > 0 ? (unpaid / totalSalesAmount) * 100 : null;
  if (unpaid > 0) {
    analysisLines.push(`${(unpaid / 1e9).toFixed(1)} میلیارد ریال مانده‌ی پرداخت‌نشده از مشتریان این بازاریاب وجود دارد.`);
    if (ratioToSalesPct !== null) analysisLines.push(`نسبت مانده به فروش کل این بازاریاب: ${ratioToSalesPct.toFixed(1)}٪.`);
  }
  analysisLines.push(`${totals.customersCount} مشتری فعال، با میانگین ${avgLinesPerInvoice.toFixed(1)} قلم کالا در هر فاکتور.`);

  res.json({
    visitor,
    employmentStatus: getMarketerStatus(visitor),
    kpis: {
      customersCount: totals.customersCount,
      targetQtyTotal,
      achievedCapped120,
      achievementPct,
      avgLinesPerInvoice,
      outstandingReceivables: unpaid,
      receivablesToSalesRatioPct: ratioToSalesPct,
    },
    monthlyTargetVsActual: { year: latestYear, points: monthlyTargetVsActual },
    customerTrendByYear,
    byItem: byItemRows,
    invoiceBins,
    receivablesByVisitor,
    customers,
    analysis: analysisLines,
  });
});

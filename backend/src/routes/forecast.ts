import { Router } from "express";
import { salesDb, receivablesDb, pnlDb } from "../db";
import { mappingsDb } from "../db/mappingsDb";
import { lastCompleteMonth, previousYearMonth } from "../lib/jalali";
import { average, stddev, momGrowthRates, linearRegression, clamp, nextYearMonth } from "../lib/stats";

export const forecastRouter = Router();

/**
 * ماژول «چشم‌انداز آینده» — کاملاً بر پایه‌ی داده‌های موجود (فروش، مانده مطالبات،
 * سود و زیان) به‌علاوه‌ی یک لایه‌ی تعدیل تورمی/ارزی قابل‌تنظیم توسط کاربر (نه یک عدد
 * ثابت هاردکد‌شده). با فعال شدن ماژول‌های دیگر (انبار، تولید، تامین)، محورهای بیشتری
 * به این تحلیل اضافه خواهد شد.
 *
 * مفروضات کلان پیش‌فرض (قابل تغییر با پارامتر ورودی؛ منبع: بانک مرکزی/مرکز آمار ایران
 * و گزارش‌های نرخ ارز بازار آزاد، تیر ۱۴۰۵ / ژوئیه ۲۰۲۶):
 *   - تورم سالانه‌ی عمومی: حدود ۶۰٪ (میانگین بازه‌ی گزارش‌شده‌ی بانک مرکزی ۵۸٪ و
 *     مرکز آمار ۶۲٪)
 *   - تورم مواد غذایی (مرتبط‌تر با کسب‌وکار پخش مواد غذایی): به‌مراتب بالاتر از تورم
 *     عمومی؛ چون هیچ منبع واحد و قطعی برای این رقم مشخص نیست، به کاربر امکان تنظیم
 *     مستقل آن داده شده.
 *   - کاهش ارزش ریال: حدود ۲۸٪ طی ۶ ماه (ژانویه تا ژوئیه ۲۰۲۶) که تقریباً معادل ۵۶٪
 *     سالانه (ساده، بدون ترکیب) است.
 * این اعداد صرفاً «پیش‌فرض شروع کار»اند، نه واقعیت قطعی؛ چون منابع رسمی ایران
 * (بانک مرکزی/مرکز آمار) با هم اختلاف دارند و داده‌ها به‌سرعت تغییر می‌کنند.
 */

const DEFAULT_ANNUAL_INFLATION_PCT = 60;
const DEFAULT_ANNUAL_FX_DEPRECIATION_PCT = 56;

interface ForecastQuery {
  recencyWeight: number; // 0..100 — وزن روند اخیر (۳ ماه) در برابر میانگین کل تاریخچه
  categoryWeight: number; // 0..100 — وزن برآورد «پایین به بالا» (مجموع مراکز فروش) در برابر روند کلی
  concentrationWeight: number; // 0..100 — حساسیت امتیاز سلامت کسب‌وکار به ریسک تمرکز مشتریان
  inflationPct: number; // درصد تورم سالانه‌ی فرضی
  horizonMonths: number; // ۱ تا ۶ ماه آینده
}

function parseQuery(q: Record<string, unknown>): ForecastQuery {
  const num = (v: unknown, def: number, min: number, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? clamp(n, min, max) : def;
  };
  return {
    recencyWeight: num(q.recencyWeight, 50, 0, 100),
    categoryWeight: num(q.categoryWeight, 50, 0, 100),
    concentrationWeight: num(q.concentrationWeight, 50, 0, 100),
    inflationPct: num(q.inflationPct, DEFAULT_ANNUAL_INFLATION_PCT, 0, 300),
    horizonMonths: Math.round(num(q.horizonMonths, 3, 1, 6)),
  };
}

interface MonthRow {
  year: number;
  month: number;
  ym: string;
}

function ymRange(from: { year: number; month: number }, count: number): MonthRow[] {
  const out: MonthRow[] = [];
  let cur = from;
  for (let i = 0; i < count; i++) {
    out.push({ year: cur.year, month: cur.month, ym: `${cur.year}/${String(cur.month).padStart(2, "0")}` });
    cur = nextYearMonth(cur.year, cur.month);
  }
  return out;
}

/** ماه‌های شمسی که واقعاً در سری‌ی مقدار حضور دارند را با صفر پر می‌کند تا سری پیوسته باشد. */
function fillSeries(rows: { ym: string; value: number }[], months: MonthRow[]): number[] {
  const map = new Map(rows.map((r) => [r.ym, r.value]));
  return months.map((m) => map.get(m.ym) ?? 0);
}

forecastRouter.get("/overview", (req, res) => {
  const q = parseQuery(req.query as Record<string, unknown>);
  const monthlyInflation = q.inflationPct / 100 / 12;

  // --------- فروش: تاریخچه‌ی ماهانه، فقط فروش نهایی (نه موقت/درحال‌بررسی) ---------
  const sdb = salesDb();
  const maxDateRow = sdb.prepare("SELECT MAX(invoice_date_jalali) AS maxDate FROM sales_lines").get() as {
    maxDate: string | null;
  };
  if (!maxDateRow.maxDate) {
    res.status(503).json({ error: "داده‌ی فروش موجود نیست" });
    return;
  }
  const lastComplete = lastCompleteMonth(maxDateRow.maxDate);

  const HISTORY_MONTHS = 18;
  let cursor = lastComplete;
  for (let i = 0; i < HISTORY_MONTHS - 1; i++) cursor = previousYearMonth(cursor.year, cursor.month);
  const historyMonths = ymRange(cursor, HISTORY_MONTHS);

  const salesRowsRaw = sdb
    .prepare(
      `SELECT substr(invoice_date_jalali,1,7) AS ym, SUM(net_amount) AS value
       FROM sales_lines WHERE record_source = 'نهایی'
       GROUP BY ym`
    )
    .all() as { ym: string; value: number }[];
  const nominalHistory = fillSeries(salesRowsRaw, historyMonths);

  // تبدیل به ارزش «واقعی» (تعدیل‌شده با تورم فرضی)، بر مبنای قدرت خرید آخرین ماه
  const n = nominalHistory.length;
  const realHistory = nominalHistory.map((v, i) => v * (1 + monthlyInflation) ** (n - 1 - i));

  const realGrowthRates = momGrowthRates(realHistory);
  const recentRealGrowthRates = realGrowthRates.slice(-3);
  const longTermRealGrowth = average(realGrowthRates);
  const recentRealGrowth = average(recentRealGrowthRates);
  const w = q.recencyWeight / 100;
  const blendedRealGrowth = recentRealGrowth * w + longTermRealGrowth * (1 - w);
  const growthVolatility = stddev(realGrowthRates);

  // --------- برآورد «پایین به بالا»: مجموع روند مستقل هر مرکز فروش ---------
  const byCenterRowsRaw = sdb
    .prepare(
      `SELECT sales_center AS center, substr(invoice_date_jalali,1,7) AS ym, SUM(net_amount) AS value
       FROM sales_lines WHERE record_source = 'نهایی' AND sales_center IS NOT NULL
       GROUP BY sales_center, ym`
    )
    .all() as { center: string; ym: string; value: number }[];
  const centers = Array.from(new Set(byCenterRowsRaw.map((r) => r.center)));
  let bottomUpNextReal = 0;
  const byCenterSummary = centers.map((center) => {
    const rows = byCenterRowsRaw.filter((r) => r.center === center);
    const nominalSeries = fillSeries(rows, historyMonths);
    const realSeries = nominalSeries.map((v, i) => v * (1 + monthlyInflation) ** (n - 1 - i));
    const rates = momGrowthRates(realSeries);
    const recentRates = rates.slice(-3);
    const g = average(recentRates.length ? recentRates : rates);
    const lastReal = realSeries.at(-1) ?? 0;
    bottomUpNextReal += lastReal * (1 + g);
    const prev3 = realSeries.slice(-6, -3).reduce((s, v) => s + v, 0);
    const last3 = realSeries.slice(-3).reduce((s, v) => s + v, 0);
    return {
      center,
      recentGrowthPct: prev3 > 0 ? ((last3 - prev3) / prev3) * 100 : null,
      lastMonthNominal: nominalSeries.at(-1) ?? 0,
    };
  });
  byCenterSummary.sort((a, b) => (b.recentGrowthPct ?? -999) - (a.recentGrowthPct ?? -999));

  const lastReal = realHistory.at(-1) ?? 0;
  const topDownNextReal = lastReal * (1 + blendedRealGrowth);
  const cw = q.categoryWeight / 100;
  const blendedNextReal = topDownNextReal * (1 - cw) + bottomUpNextReal * cw;

  // برون‌یابی چند ماه آینده (نامی و واقعی)، با باند عدم‌قطعیت ساده بر مبنای انحراف‌معیار رشد
  const forecastMonths = ymRange(nextYearMonth(lastComplete.year, lastComplete.month), q.horizonMonths);
  let runningReal = blendedNextReal;
  const forecast = forecastMonths.map((m, idx) => {
    if (idx > 0) runningReal = runningReal * (1 + blendedRealGrowth);
    const monthsAhead = idx + 1;
    const nominal = runningReal / (1 + monthlyInflation) ** monthsAhead; // ارزش اسمی موردانتظار در همان ماه آینده
    const band = runningReal * growthVolatility * Math.sqrt(monthsAhead);
    return {
      ...m,
      nominal: Math.round(nominal),
      real: Math.round(runningReal),
      nominalLow: Math.round(Math.max(0, (runningReal - band) / (1 + monthlyInflation) ** monthsAhead)),
      nominalHigh: Math.round((runningReal + band) / (1 + monthlyInflation) ** monthsAhead),
    };
  });

  // --------- گروه‌های کالایی: برترین‌های در حال رشد/افت (نمایشی، اطلاعاتی) ---------
  const itemGroupRows = sdb
    .prepare(
      `SELECT item_code AS itemCode, substr(invoice_date_jalali,1,7) AS ym, SUM(net_amount) AS value
       FROM sales_lines WHERE record_source = 'نهایی'
       GROUP BY item_code, ym`
    )
    .all() as { itemCode: string; ym: string; value: number }[];
  const overrideRows = mappingsDb()
    .prepare("SELECT item_code AS itemCode, item_group AS itemGroup FROM item_group_overrides")
    .all() as { itemCode: string; itemGroup: string }[];
  const suggestedRows = pnlDb()
    .prepare(
      "SELECT item_code AS itemCode, item_group AS itemGroup FROM pnl_product_marketer_lines WHERE item_group IS NOT NULL GROUP BY item_code"
    )
    .all() as { itemCode: string; itemGroup: string }[];
  const overrideMap = new Map(overrideRows.map((r) => [r.itemCode, r.itemGroup]));
  const suggestedMap = new Map(suggestedRows.map((r) => [r.itemCode, r.itemGroup]));
  const groupOf = (code: string) => overrideMap.get(code) ?? suggestedMap.get(code) ?? "بدون گروه";

  const recentYms = new Set(historyMonths.slice(-3).map((m) => m.ym));
  const prevYms = new Set(historyMonths.slice(-6, -3).map((m) => m.ym));
  const groupRecent = new Map<string, number>();
  const groupPrev = new Map<string, number>();
  for (const r of itemGroupRows) {
    const g = groupOf(r.itemCode);
    if (recentYms.has(r.ym)) groupRecent.set(g, (groupRecent.get(g) ?? 0) + r.value);
    if (prevYms.has(r.ym)) groupPrev.set(g, (groupPrev.get(g) ?? 0) + r.value);
  }
  const groupMovers = Array.from(new Set([...groupRecent.keys(), ...groupPrev.keys()]))
    .filter((g) => g !== "بدون گروه")
    .map((g) => {
      const recent = groupRecent.get(g) ?? 0;
      const prev = groupPrev.get(g) ?? 0;
      return { group: g, recentAmount: recent, growthPct: prev > 0 ? ((recent - prev) / prev) * 100 : null };
    })
    .filter((r) => r.recentAmount > 0)
    .sort((a, b) => (b.growthPct ?? -999) - (a.growthPct ?? -999));

  // --------- تمرکز مشتریان (ریسک وابستگی به چند مشتری بزرگ) ---------
  const customerTotals = sdb
    .prepare(
      `SELECT canonical_customer_code, SUM(net_amount) AS total
       FROM sales_lines WHERE record_source = 'نهایی'
       GROUP BY canonical_customer_code ORDER BY total DESC`
    )
    .all() as { canonical_customer_code: string; total: number }[];
  const totalRevenue = customerTotals.reduce((s, r) => s + r.total, 0);
  const top5Share = totalRevenue > 0 ? (customerTotals.slice(0, 5).reduce((s, r) => s + r.total, 0) / totalRevenue) * 100 : 0;
  const top10Share = totalRevenue > 0 ? (customerTotals.slice(0, 10).reduce((s, r) => s + r.total, 0) / totalRevenue) * 100 : 0;

  // --------- مانده مطالبات: روند وصول ---------
  const rdb = receivablesDb();
  const recvRows = rdb
    .prepare(
      `SELECT invoice_year_month_jalali AS ym,
              SUM(amount_unpaid) AS unpaid,
              SUM(invoice_net_amount) AS invoiced,
              SUM(amount_paid) AS paid
       FROM receivable_invoices GROUP BY ym ORDER BY ym`
    )
    .all() as { ym: string; unpaid: number; invoiced: number; paid: number }[];
  const recvRecent = recvRows.slice(-6);
  const collectionRates = recvRecent.map((r) => (r.invoiced > 0 ? (r.paid / r.invoiced) * 100 : null)).filter((v): v is number => v !== null);
  const collectionTrend = collectionRates.length >= 2 ? linearRegression(collectionRates).slope : 0;

  // --------- سود و زیان: روند حاشیه سود ---------
  const pdb = pnlDb();
  const marginRows = pdb
    .prepare(
      `SELECT month_seq, month_name, year_jalali, item, amount_rial FROM pnl_long
       WHERE item IN ('فروش خالص', 'سود و (زیان ) خالص', 'سود و (زیان )')
       ORDER BY month_seq`
    )
    .all() as { month_seq: number; month_name: string; year_jalali: number; item: string; amount_rial: number }[];
  const bySeq = new Map<number, { month_name: string; year_jalali: number; sales?: number; profit?: number }>();
  for (const r of marginRows) {
    const e = bySeq.get(r.month_seq) ?? { month_name: r.month_name, year_jalali: r.year_jalali };
    if (r.item === "فروش خالص") e.sales = r.amount_rial;
    if (r.item === "سود و (زیان ) خالص" || r.item === "سود و (زیان )") e.profit = r.amount_rial;
    bySeq.set(r.month_seq, e);
  }
  const marginHistory = Array.from(bySeq.entries())
    .sort(([a], [b]) => a - b)
    .map(([seq, e]) => ({
      seq,
      label: `${e.month_name} ${e.year_jalali}`,
      marginPct: e.sales && e.sales > 0 ? ((e.profit ?? 0) / e.sales) * 100 : null,
    }))
    .filter((r) => r.marginPct !== null) as { seq: number; label: string; marginPct: number }[];
  const marginTrendSlope = marginHistory.length >= 2 ? linearRegression(marginHistory.map((m) => m.marginPct)).slope : 0;

  // --------- امتیاز سلامت کسب‌وکار (برای نمودار راداری) ---------
  const salesMomentumScore = clamp(50 + blendedRealGrowth * 300, 0, 100);
  const latestCollectionRate = collectionRates.at(-1) ?? 50;
  const receivablesHealthScore = clamp(latestCollectionRate, 0, 100);
  const marginTrendScore = clamp(50 + marginTrendSlope * 10, 0, 100);
  const concentrationPenalty = (top10Share / 100) * (q.concentrationWeight / 100) * 100;
  const customerConcentrationScore = clamp(100 - concentrationPenalty, 0, 100);

  res.json({
    meta: {
      lastCompleteYm: `${lastComplete.year}/${String(lastComplete.month).padStart(2, "0")}`,
      appliedWeights: q,
      macroAssumptions: {
        annualInflationPctUsed: q.inflationPct,
        annualInflationPctDefault: DEFAULT_ANNUAL_INFLATION_PCT,
        annualFxDepreciationPctReference: DEFAULT_ANNUAL_FX_DEPRECIATION_PCT,
        asOf: "تیر ۱۴۰۵ / ژوئیه ۲۰۲۶",
        sources: [
          "بانک مرکزی ایران — نرخ تورم نقطه‌به‌نقطه/سالانه خرداد ۱۴۰۵",
          "مرکز آمار ایران — نرخ تورم سالانه و تورم مواد غذایی خرداد ۱۴۰۵",
          "نرخ ارز بازار آزاد (دلار/ریال) — گزارش‌های تیر ۱۴۰۵",
        ],
      },
    },
    sales: {
      history: historyMonths.map((m, i) => ({ ...m, nominal: Math.round(nominalHistory[i]) })),
      forecast,
      recentRealGrowthPctMonthly: recentRealGrowth * 100,
      longTermRealGrowthPctMonthly: longTermRealGrowth * 100,
      blendedRealGrowthPctMonthly: blendedRealGrowth * 100,
    },
    byCenter: byCenterSummary,
    byProductGroup: groupMovers.slice(0, 8),
    concentration: {
      top5SharePct: top5Share,
      top10SharePct: top10Share,
      topCustomers: customerTotals.slice(0, 10).map((c) => ({
        code: c.canonical_customer_code,
        sharePct: totalRevenue > 0 ? (c.total / totalRevenue) * 100 : 0,
      })),
    },
    receivables: {
      history: recvRows.slice(-12),
      collectionRateTrendPctPerMonth: collectionTrend,
    },
    margin: {
      history: marginHistory,
      trendPctPerMonth: marginTrendSlope,
    },
    healthScore: {
      salesMomentum: salesMomentumScore,
      receivablesHealth: receivablesHealthScore,
      marginTrend: marginTrendScore,
      customerConcentration: customerConcentrationScore,
      overall: average([salesMomentumScore, receivablesHealthScore, marginTrendScore, customerConcentrationScore]),
    },
  });
});

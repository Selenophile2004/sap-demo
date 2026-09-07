import { Router } from "express";
import { toJalaali, jalaaliMonthLength } from "jalaali-js";
import { salesDb, receivablesDb, pnlDb, targetsDb } from "../db";
import { daysSince, lastCompleteMonth, previousYearMonth } from "../lib/jalali";

export const homeRouter = Router();

/**
 * داده‌های مخصوص صفحه‌ی اول (داشبورد مدیریتی) — برخلاف صفحات ماژول‌ها، این مسیرها
 * عمداً به فیلتر زمانی سراسری وابسته نیستند (دقیقاً مثل pnl/summary): چون قرار است
 * یک «عکس فوری وضعیت فعلی» برای مدیرعامل باشند، نه یک گزارش قابل‌فیلتر.
 */

const MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

// مقایسه‌ی فروش سال‌های مختلف در ماه‌های مختلف — هر ۴ منبع لحاظ می‌شود (نهایی + ماه
// جاری + درخواست/حواله‌ی موقت)، دقیقاً مثل جمع فروش خالص بالای همین صفحه؛ چون
// رکوردهای غیرنهایی فقط برای ماه در حال سپری‌شدن وجود دارند (هر ماه بسته‌شده تا
// امروز ۱۰۰٪ نهایی است)، این کار عدد هیچ ماه گذشته‌ای را عوض نمی‌کند و فقط باعث
// می‌شود ماه جاری هم در نمودار دیده شود.
homeRouter.get("/yoy-sales-by-month", (_req, res) => {
  const db = salesDb();
  const rows = db
    .prepare(
      `SELECT substr(invoice_date_jalali,1,4) AS year,
              CAST(substr(invoice_date_jalali,6,2) AS INTEGER) AS month,
              SUM(net_amount) AS netAmount,
              SUM(qty_normalized_count_signed) AS netQty
       FROM sales_lines
       GROUP BY year, month
       ORDER BY year, month`
    )
    .all();
  res.json(rows);
});

// ۵ ویزیتور برتر بر مبنای درصد تحقق تارگت (سقف‌شده در ۱۲۰٪ به تفکیک گروه کالا) —
// همیشه بر مبنای «امروز» (ماه واقعی جاری)، نه آخرین ماه نهایی‌شده: چون این صفحه
// قرار است عکس فوری وضعیت الان باشد، تارگت متناسب با روزهای سپری‌شده‌ی همین ماه
// پرو-ریت می‌شود و «فروش تا امروز» از هر ۴ منبع محاسبه می‌شود (نهایی + ماه جاری +
// درخواست/حواله‌ی موقت) — دقیقاً همان چیزی که فایل پاور بی‌آی منبع هم برای
// measure «Sum120Darsad_Visitor» از روی جدول ترکیبی «Forosh» حساب می‌کند، نه فقط
// زیرمجموعه‌ی نهایی‌شده. برای ماه‌های گذشته (بسته‌شده) این تفاوتی ایجاد نمی‌کند،
// چون تا وقتی ماهی بسته می‌شود همه‌ی ردیف‌هایش قبلاً «نهایی» شده‌اند.
homeRouter.get("/top-visitors", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const sdb = salesDb();

  const today = toJalaali(new Date());
  const dayFraction = today.jd / jalaaliMonthLength(today.jy, today.jm);

  const actualRows = sdb
    .prepare(
      `SELECT visitor_name, item_group,
              SUM(qty_normalized_carton_signed) AS actualQtyCarton,
              SUM(net_amount) AS actualAmount
       FROM sales_lines
       WHERE visitor_name IS NOT NULL
         AND substr(invoice_date_jalali,1,4) = @year
         AND CAST(substr(invoice_date_jalali,6,2) AS INTEGER) = @month
       GROUP BY visitor_name, item_group`
    )
    .all({ year: String(today.jy), month: today.jm }) as {
    visitor_name: string;
    item_group: string | null;
    actualQtyCarton: number | null;
    actualAmount: number;
  }[];

  const tdb = targetsDb();
  const targetRows = tdb
    .prepare(
      `SELECT visitor_name, item_group, SUM(target_qty) AS targetQty
       FROM target_visitor WHERE year_jalali = @year AND month_num = @month
       GROUP BY visitor_name, item_group`
    )
    .all({ year: today.jy, month: today.jm }) as { visitor_name: string; item_group: string; targetQty: number }[];

  const targetByVisitorGroup = new Map<string, Map<string, number>>();
  const targetTotalByVisitor = new Map<string, number>();
  for (const t of targetRows) {
    if (!targetByVisitorGroup.has(t.visitor_name)) targetByVisitorGroup.set(t.visitor_name, new Map());
    targetByVisitorGroup.get(t.visitor_name)!.set(t.item_group, t.targetQty);
    targetTotalByVisitor.set(t.visitor_name, (targetTotalByVisitor.get(t.visitor_name) ?? 0) + (t.targetQty ?? 0));
  }

  const byVisitor = new Map<string, { netAmount: number; byGroup: Map<string, number> }>();
  for (const r of actualRows) {
    if (!byVisitor.has(r.visitor_name)) byVisitor.set(r.visitor_name, { netAmount: 0, byGroup: new Map() });
    const e = byVisitor.get(r.visitor_name)!;
    e.netAmount += r.actualAmount ?? 0;
    e.byGroup.set(r.item_group ?? "", r.actualQtyCarton ?? 0);
  }

  const results = Array.from(byVisitor.entries()).map(([visitorName, e]) => {
    const fullTargetTotal = targetTotalByVisitor.get(visitorName) ?? 0;
    let proratedTargetTotal = 0;
    let achievedCapped = 0;
    for (const [group, fullTarget] of targetByVisitorGroup.get(visitorName) ?? []) {
      if (!fullTarget) continue;
      const proratedTarget = fullTarget * dayFraction;
      proratedTargetTotal += proratedTarget;
      const actual = e.byGroup.get(group) ?? 0;
      achievedCapped += Math.min(actual, proratedTarget * 1.2);
    }
    return {
      visitorName,
      netAmount: e.netAmount,
      targetQty: fullTargetTotal > 0 ? fullTargetTotal : null,
      achievementPct: proratedTargetTotal > 0 ? (achievedCapped / proratedTargetTotal) * 100 : null,
    };
  });

  const ranked = results
    .filter((r) => r.achievementPct !== null)
    .sort((a, b) => (b.achievementPct ?? 0) - (a.achievementPct ?? 0))
    .slice(0, limit);

  res.json({
    period: { year: today.jy, month: today.jm, monthLabel: MONTH_NAMES[today.jm - 1] },
    visitors: ranked,
  });
});

// تحلیل کلی روند سازمان — نتیجه‌گیری‌های خودکار مبتنی بر داده (نه متن ثابت)، به‌علاوه‌ی
// هشدار صریح اگر منبع دادهٔ هرکدام از ماژول‌های کلیدی مدت‌هاست به‌روزرسانی نشده باشد.
homeRouter.get("/narrative", (_req, res) => {
  const sdb = salesDb();
  const rdb = receivablesDb();
  const pdb = pnlDb();
  const tdb = targetsDb();

  type Tone = "positive" | "negative" | "neutral" | "warning";
  const bullets: { tone: Tone; text: string }[] = [];

  // ---------- ۱. رشد فروش (ماه کامل اخیر در برابر ماه قبل و همان ماه سال قبل) ----------
  // عمداً فقط «نهایی» — مقایسه‌ی رشد باید روی ماه‌های کاملاً بسته/قطعی باشد، نه ماه
  // جاری که هنوز فاکتورهایش کامل ثبت/تایید نشده (فایل منبع تا امروزِ همان ماه پرشده،
  // نه تا آخر ماه، پس مقایسه‌ی مستقیمش با یک ماه کامل قبلی گمراه‌کننده است).
  const maxSalesDateRow = sdb.prepare("SELECT MAX(invoice_date_jalali) AS d FROM sales_lines WHERE record_source = 'نهایی'").get() as {
    d: string | null;
  };
  let salesBlock: { netAmount: number; momGrowthPct: number | null; yoyGrowthPct: number | null; periodLabel: string } | null = null;
  if (maxSalesDateRow.d) {
    const latest = lastCompleteMonth(maxSalesDateRow.d);
    const prevMonth = previousYearMonth(latest.year, latest.month);
    const prevYear = { year: latest.year - 1, month: latest.month };

    function monthTotal(year: number, month: number): number {
      const ym = `${year}/${String(month).padStart(2, "0")}`;
      const row = sdb
        .prepare(
          `SELECT SUM(net_amount) AS total FROM sales_lines
           WHERE record_source = 'نهایی' AND substr(invoice_date_jalali,1,7) = @ym`
        )
        .get({ ym }) as { total: number | null };
      return row.total ?? 0;
    }

    const latestTotal = monthTotal(latest.year, latest.month);
    const prevMonthTotal = monthTotal(prevMonth.year, prevMonth.month);
    const prevYearTotal = monthTotal(prevYear.year, prevYear.month);
    const momGrowthPct = prevMonthTotal > 0 ? ((latestTotal - prevMonthTotal) / prevMonthTotal) * 100 : null;
    const yoyGrowthPct = prevYearTotal > 0 ? ((latestTotal - prevYearTotal) / prevYearTotal) * 100 : null;
    const periodLabel = `${MONTH_NAMES[latest.month - 1]} ${latest.year}`;

    salesBlock = { netAmount: latestTotal, momGrowthPct, yoyGrowthPct, periodLabel };

    if (momGrowthPct !== null) {
      const parts = [`فروش خالص ${periodLabel} نسبت به ماه قبل ${momGrowthPct >= 0 ? "رشدی معادل" : "کاهشی معادل"} ${Math.abs(momGrowthPct).toFixed(1)}٪ داشته`];
      if (yoyGrowthPct !== null) {
        parts.push(`و نسبت به ${periodLabel.split(" ")[0]} سال قبل ${yoyGrowthPct >= 0 ? "رشدی معادل" : "کاهشی معادل"} ${Math.abs(yoyGrowthPct).toFixed(1)}٪`);
      }
      bullets.push({
        tone: momGrowthPct < -15 ? "negative" : momGrowthPct >= 0 ? "positive" : "neutral",
        text: parts.join(" ") + ".",
      });
    }
  }

  // ---------- ۲. حاشیه‌ی سود ----------
  const maxSeqRow = pdb.prepare("SELECT MAX(month_seq) AS maxSeq FROM pnl_long").get() as { maxSeq: number | null };
  let pnlBlock: { netProfitMarginPct: number | null; netProfitGrowthPct: number | null; periodLabel: string } | null = null;
  if (maxSeqRow.maxSeq !== null) {
    function itemsForSeq(seq: number) {
      const rows = pdb.prepare("SELECT item, amount_rial FROM pnl_long WHERE month_seq = ?").all(seq) as {
        item: string;
        amount_rial: number;
      }[];
      return new Map(rows.map((r) => [r.item, r.amount_rial]));
    }
    const latest = itemsForSeq(maxSeqRow.maxSeq);
    const prev = itemsForSeq(maxSeqRow.maxSeq - 1);
    const netSales = latest.get("فروش خالص") ?? 0;
    const netProfit = latest.get("سود و (زیان ) خالص") ?? latest.get("سود و (زیان )") ?? 0;
    const prevNetProfit = prev.get("سود و (زیان ) خالص") ?? prev.get("سود و (زیان )") ?? 0;
    const netProfitMarginPct = netSales > 0 ? (netProfit / netSales) * 100 : null;
    const netProfitGrowthPct = prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : null;
    const meta = pdb
      .prepare("SELECT year_jalali, month_name FROM pnl_long WHERE month_seq = ? LIMIT 1")
      .get(maxSeqRow.maxSeq) as { year_jalali: number; month_name: string };
    const periodLabel = `${meta.month_name} ${meta.year_jalali}`;

    pnlBlock = { netProfitMarginPct, netProfitGrowthPct, periodLabel };

    if (netProfitMarginPct !== null) {
      bullets.push({
        tone: netProfitMarginPct < 0 ? "negative" : netProfitGrowthPct !== null && netProfitGrowthPct < 0 ? "neutral" : "positive",
        text: `حاشیه‌ی سود خالص ${periodLabel} حدود ${netProfitMarginPct.toFixed(1)}٪ فروش است${
          netProfitGrowthPct !== null
            ? ` (${netProfitGrowthPct >= 0 ? "رشد" : "کاهش"} ${Math.abs(netProfitGrowthPct).toFixed(1)}٪ نسبت به ماه قبل)`
            : ""
        }.`,
      });
    }
  }

  // ---------- ۳. مانده مطالبات و نرخ وصول ----------
  const recvTotals = rdb
    .prepare(
      `SELECT SUM(amount_unpaid) AS totalUnpaid, SUM(invoice_net_amount) AS totalNetInvoiced, SUM(amount_paid) AS totalPaid
       FROM receivable_invoices`
    )
    .get() as { totalUnpaid: number | null; totalNetInvoiced: number | null; totalPaid: number | null };
  const collectionRatePct =
    recvTotals.totalNetInvoiced && recvTotals.totalNetInvoiced > 0
      ? ((recvTotals.totalPaid ?? 0) / recvTotals.totalNetInvoiced) * 100
      : null;
  if (collectionRatePct !== null) {
    bullets.push({
      tone: collectionRatePct < 70 ? "warning" : collectionRatePct >= 85 ? "positive" : "neutral",
      text: `نرخ وصول مطالبات ${collectionRatePct.toFixed(1)}٪ است و مانده‌ی پرداخت‌نشده در حال حاضر ${(
        (recvTotals.totalUnpaid ?? 0) / 1e9
      ).toFixed(1)} میلیارد ریال است.`,
    });
  }

  // ---------- ۴. نرخ حفظ مشتری ----------
  let retentionRatePct: number | null = null;
  if (maxSalesDateRow.d) {
    const latest = lastCompleteMonth(maxSalesDateRow.d);
    const prev = previousYearMonth(latest.year, latest.month);
    const latestYm = `${latest.year}/${String(latest.month).padStart(2, "0")}`;
    const prevYm = `${prev.year}/${String(prev.month).padStart(2, "0")}`;
    const prevCustomers = sdb
      .prepare(
        `SELECT DISTINCT canonical_customer_code FROM sales_lines
         WHERE record_source = 'نهایی' AND substr(invoice_date_jalali,1,7) = @ym`
      )
      .all({ ym: prevYm }) as { canonical_customer_code: string }[];
    const prevSet = new Set(prevCustomers.map((r) => r.canonical_customer_code));
    const latestCustomers = sdb
      .prepare(
        `SELECT DISTINCT canonical_customer_code FROM sales_lines
         WHERE record_source = 'نهایی' AND substr(invoice_date_jalali,1,7) = @ym`
      )
      .all({ ym: latestYm }) as { canonical_customer_code: string }[];
    const retained = latestCustomers.filter((r) => prevSet.has(r.canonical_customer_code)).length;
    retentionRatePct = prevSet.size > 0 ? (retained / prevSet.size) * 100 : null;
    if (retentionRatePct !== null) {
      bullets.push({
        tone: retentionRatePct < 60 ? "warning" : retentionRatePct >= 80 ? "positive" : "neutral",
        text: `نرخ حفظ مشتریان نسبت به ماه قبل ${retentionRatePct.toFixed(1)}٪ است.`,
      });
    }
  }

  // ---------- ۵. تمرکز درآمد در ۵ مشتری برتر ----------
  const totalRevenueRow = sdb
    .prepare("SELECT SUM(net_amount) AS total FROM sales_lines WHERE record_source = 'نهایی'")
    .get() as { total: number | null };
  const top5Row = sdb
    .prepare(
      `SELECT SUM(t) AS top5 FROM (
         SELECT SUM(net_amount) AS t FROM sales_lines WHERE record_source = 'نهایی'
         GROUP BY canonical_customer_code ORDER BY t DESC LIMIT 5
       )`
    )
    .get() as { top5: number | null };
  const totalRevenue = totalRevenueRow.total ?? 0;
  const top5SharePct = totalRevenue > 0 ? ((top5Row.top5 ?? 0) / totalRevenue) * 100 : null;
  if (top5SharePct !== null && top5SharePct > 25) {
    bullets.push({
      tone: top5SharePct > 40 ? "warning" : "neutral",
      text: `${top5SharePct.toFixed(1)}٪ از کل فروش تاریخی شرکت از ۵ مشتری تشکیل شده — وابستگی درآمدی به تعداد کمی مشتری بزرگ قابل‌توجه است.`,
    });
  }

  // ---------- بررسی به‌روز بودن منابع داده ----------
  const freshness: { module: string; label: string; asOfDate: string | null; daysStale: number | null; stale: boolean; text: string }[] = [];

  // تازگی فروش باید روی کل داده حساب شود (نهایی + ماه جاری + درخواست/حواله‌ی موقت)،
  // نه فقط رکوردهای «نهایی» — چون فاکتورهای ماه جاری تا پایان/تسویه‌ی همان ماه به
  // بخش «نهایی» منتقل نمی‌شوند و این یک تاخیر عادی و همیشگی حسابداری است، نه
  // نشانه‌ی عقب‌افتادن فایل منبع. اگر اینجا هم فقط «نهایی» را چک می‌کردیم، همیشه
  // (در هر ماه) به‌اشتباه «داده قدیمی است» نشان می‌داد.
  const maxAnySalesDateRow = sdb.prepare("SELECT MAX(invoice_date_jalali) AS d FROM sales_lines").get() as {
    d: string | null;
  };
  if (maxAnySalesDateRow.d) {
    const days = daysSince(maxAnySalesDateRow.d) ?? 0;
    const stale = days > 3;
    freshness.push({
      module: "sales",
      label: "فروش",
      asOfDate: maxAnySalesDateRow.d,
      daysStale: days,
      stale,
      text: stale
        ? `داده‌ی فروش تا تاریخ ${maxAnySalesDateRow.d} به‌روز است (${days} روز قبل) — لطفاً فایل «گزارش فروش (کامل - شامل موقت).xlsx» را به‌روزرسانی کنید.`
        : `داده‌ی فروش تا تاریخ ${maxAnySalesDateRow.d} به‌روز است.`,
    });
  }

  const maxRecvDateRow = rdb.prepare("SELECT MAX(invoice_date_jalali) AS d FROM receivable_invoices").get() as {
    d: string | null;
  };
  if (maxRecvDateRow.d) {
    const days = daysSince(maxRecvDateRow.d) ?? 0;
    const stale = days > 5;
    freshness.push({
      module: "receivables",
      label: "مانده مطالبات",
      asOfDate: maxRecvDateRow.d,
      daysStale: days,
      stale,
      text: stale
        ? `داده‌ی مانده مطالبات تا تاریخ ${maxRecvDateRow.d} به‌روز است (${days} روز قبل) — لطفاً فایل مربوطه را به‌روزرسانی کنید.`
        : `داده‌ی مانده مطالبات تا تاریخ ${maxRecvDateRow.d} به‌روز است.`,
    });
  }

  if (pnlBlock) {
    const meta = pdb
      .prepare("SELECT year_jalali, month_num FROM pnl_long WHERE month_seq = ? LIMIT 1")
      .get(maxSeqRow.maxSeq) as { year_jalali: number; month_num: number };
    const lastDay = jalaaliMonthLength(meta.year_jalali, meta.month_num);
    const approxDateStr = `${meta.year_jalali}/${String(meta.month_num).padStart(2, "0")}/${String(lastDay).padStart(2, "0")}`;
    const days = daysSince(approxDateStr) ?? 0;
    const stale = days > 45;
    freshness.push({
      module: "pnl",
      label: "سود و زیان",
      asOfDate: `${pnlBlock.periodLabel}`,
      daysStale: days,
      stale,
      text: stale
        ? `آخرین ماهِ موجود در داده‌ی سود و زیان، ${pnlBlock.periodLabel} است (حدود ${days} روز قبل) — لطفاً فایل‌های سود و زیان را به‌روزرسانی کنید.`
        : `آخرین ماهِ موجود در داده‌ی سود و زیان، ${pnlBlock.periodLabel} است.`,
    });
  }

  const today = toJalaali(new Date());
  const currentMonthTargetRow = tdb
    .prepare("SELECT COUNT(*) AS cnt FROM target_visitor WHERE year_jalali = ? AND month_num = ?")
    .get(today.jy, today.jm) as { cnt: number };
  freshness.push({
    module: "targets",
    label: "تارگت ویزیتور",
    asOfDate: null,
    daysStale: null,
    stale: currentMonthTargetRow.cnt === 0,
    text:
      currentMonthTargetRow.cnt === 0
        ? `تارگت ماه جاری (${MONTH_NAMES[today.jm - 1]} ${today.jy}) هنوز در فایل «تارگت ویزیتور و لاین.xlsx» ثبت نشده.`
        : `تارگت ماه جاری (${MONTH_NAMES[today.jm - 1]} ${today.jy}) در سیستم موجود است.`,
  });

  res.json({
    sales: salesBlock,
    pnl: pnlBlock,
    receivables: { collectionRatePct, totalUnpaid: recvTotals.totalUnpaid ?? 0 },
    retentionRatePct,
    topCustomerConcentrationPct: top5SharePct,
    bullets,
    freshness,
  });
});

/**
 * فهرست‌های سودآوری — بر اساس pnl_product_marketer_lines («سود و زیان محصول و
 * بازاریاب»)، تنها منبعی که در کل پروژه سطح سود واقعی (profit_loss، بعد از کسر
 * بهای تمام‌شده) به تفکیک کالا/بازاریاب/مشتری دارد. این منبع مستقل از sales_lines
 * است و طبق تأیید صریح کارفرما عمداً با آن join نمی‌شود (رجوع کنید به کامنت بالای
 * pnl_etl.py) و فقط تا آخرین ماهی که در آن فایل موجود است به‌روز است (نه لزوماً تا
 * امروز) — به همین دلیل تاریخ پوشش داده هم در پاسخ برگردانده می‌شود تا فرانت بتواند
 * این محدودیت را صریحاً به کاربر نشان دهد.
 */
function pnlCoveragePeriod() {
  const pdb = pnlDb();
  const row = pdb
    .prepare("SELECT MIN(invoice_date_jalali) AS minDate, MAX(invoice_date_jalali) AS maxDate FROM pnl_product_marketer_lines")
    .get() as { minDate: string | null; maxDate: string | null };
  return row;
}

/** برای «کالای پرفروش» که عمداً از sales_lines می‌آید (نه pnl_product_marketer_lines)
 * — چون «پرفروش» ذاتاً یک شاخص فروش است و باید از منبع اصلی و همیشه به‌روزِ فروش
 * بیاید، نه از فایل سود و زیان که فقط تا چند ماه قبل به‌روز است. */
function salesCoveragePeriod() {
  const sdb = salesDb();
  const row = sdb
    .prepare("SELECT MIN(invoice_date_jalali) AS minDate, MAX(invoice_date_jalali) AS maxDate FROM sales_lines")
    .get() as { minDate: string | null; maxDate: string | null };
  return row;
}

// این دو باکس («کالای پرسود» و «کالای پرفروش») عمداً همیشه فقط سبد فعال را نشان
// می‌دهند (بدون سوییچ اختیاری) — طبق درخواست صریح کارفرما، چون هدف این بخش
// نشان‌دادن بهترین کالاهای «فعلاً در سبد فروش» است، نه کالاهای تاریخی/متوقف‌شده.
homeRouter.get("/top-profitable-items", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 5, 30);
  const pdb = pnlDb();
  const rows = pdb
    .prepare(
      `SELECT item_name, SUM(profit_loss) AS profitLoss, SUM(net_sales) AS netSales
       FROM pnl_product_marketer_lines WHERE item_name IS NOT NULL AND is_active_basket = 1
       GROUP BY item_name ORDER BY profitLoss DESC LIMIT ?`
    )
    .all(limit) as { item_name: string; profitLoss: number; netSales: number }[];
  res.json({ coverage: pnlCoveragePeriod(), items: rows });
});

homeRouter.get("/top-selling-items", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 30);
  const sdb = salesDb();
  const rows = sdb
    .prepare(
      `SELECT item_name, SUM(qty_normalized_count_signed) AS qty, SUM(net_amount) AS netSales
       FROM sales_lines WHERE item_name IS NOT NULL AND is_active_basket = 1
       GROUP BY item_name ORDER BY qty DESC LIMIT ?`
    )
    .all(limit) as { item_name: string; qty: number; netSales: number }[];
  res.json({ coverage: salesCoveragePeriod(), items: rows });
});

homeRouter.get("/top-profitable-marketers", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 30);
  const pdb = pnlDb();
  const rows = pdb
    .prepare(
      `SELECT employee_name, SUM(profit_loss) AS profitLoss, SUM(net_sales) AS netSales
       FROM pnl_product_marketer_lines WHERE employee_name IS NOT NULL
       GROUP BY employee_name ORDER BY profitLoss DESC LIMIT ?`
    )
    .all(limit) as { employee_name: string; profitLoss: number; netSales: number }[];
  res.json({ coverage: pnlCoveragePeriod(), items: rows });
});

homeRouter.get("/top-profitable-customers", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 30);
  const pdb = pnlDb();
  const rows = pdb
    .prepare(
      `SELECT customer_name, SUM(profit_loss) AS profitLoss, SUM(net_sales) AS netSales
       FROM pnl_product_marketer_lines WHERE customer_name IS NOT NULL
       GROUP BY customer_name ORDER BY profitLoss DESC LIMIT ?`
    )
    .all(limit) as { customer_name: string; profitLoss: number; netSales: number }[];
  res.json({ coverage: pnlCoveragePeriod(), items: rows });
});

import { Router } from "express";
import { salesDb, receivablesDb, pnlDb, hrDb } from "../db";
import { daysSince, lastCompleteMonth, previousYearMonth } from "../lib/jalali";
import { average } from "../lib/stats";
import { getMarketerStatus } from "../lib/marketerStatus";

export const alertsRouter = Router();

/**
 * صفحه‌ی «هشدارها» — قواعد کاملاً مبتنی بر داده‌های موجود (فروش نهایی، مانده مطالبات،
 * سود و زیان، پرسنل). هیچ آستانه‌ای هاردکد و غیرقابل‌توضیح نیست؛ همه بر اساس منطق
 * کسب‌وکاری قابل‌دفاع انتخاب شده‌اند (مستندشده در کامنت هر بخش). با فعال شدن ماژول‌های
 * دیگر (انبار، تولید، تامین)، قواعد بیشتری اضافه خواهد شد.
 */

type Severity = "critical" | "warning" | "notice";

interface Alert {
  id: string;
  category: "receivables" | "sales" | "customers" | "margin" | "hr" | "concentration" | "data";
  severity: Severity;
  title: string;
  description: string;
  metricValue: number;
  metricLabel: string;
  relatedEntity?: string;
}

const severityRank: Record<Severity, number> = { critical: 0, warning: 1, notice: 2 };

// دریل‌داون هشدارها: چون هشدارها هربار زنده محاسبه می‌شوند (ذخیره نمی‌شوند)، به‌جای
// شناسه‌ی پایدار، خودِ (دسته + نام موجودیت مرتبط) برای واکشی جزئیات کافی است — هم
// برای مشتری/بازاریاب کار می‌کند (فروش نهایی) و هم مبنای مانده مطالبات آن‌ها.
alertsRouter.get("/detail", (req, res) => {
  const category = String(req.query.category ?? "");
  const entity = String(req.query.entity ?? "");
  if (!entity) {
    res.status(400).json({ error: "entity لازم است" });
    return;
  }
  const sdb = salesDb();
  const rdb = receivablesDb();

  const isVisitorCategory = category === "sales" || category === "hr";
  const nameColumn = isVisitorCategory ? "visitor_name" : "customer_name";

  // عمداً به «نهایی» محدود نیست: این لیست باید واقعاً «آخرین فعالیت» را نشان بدهد،
  // وگرنه فاکتورهای ماه در حال سپری‌شدن (که هنوز نهایی نشده‌اند) از این drill-down
  // ناپدید می‌شوند و لیست «۱۵ فاکتور اخیر» عملاً چند هفته قدیمی‌تر از واقعیت می‌شود.
  const invoices = sdb
    .prepare(
      `SELECT invoice_no, invoice_date_jalali, item_name, net_amount, sales_center
       FROM sales_lines WHERE ${nameColumn} = @entity
       ORDER BY invoice_date_jalali DESC LIMIT 15`
    )
    .all({ entity });

  const monthlyTrend = sdb
    .prepare(
      `SELECT substr(invoice_date_jalali,1,7) AS ym, SUM(net_amount) AS amount
       FROM sales_lines WHERE ${nameColumn} = @entity
       GROUP BY ym ORDER BY ym DESC LIMIT 12`
    )
    .all({ entity });

  const receivableRows = rdb
    .prepare(
      `SELECT invoice_no, invoice_date_jalali, invoice_net_amount, amount_paid, amount_unpaid, invoice_kind
       FROM receivable_invoices WHERE ${isVisitorCategory ? "visitor_name" : "customer_name"} = @entity
       ORDER BY invoice_date_jalali DESC LIMIT 15`
    )
    .all({ entity });

  res.json({ invoices, monthlyTrend: monthlyTrend.reverse(), receivableRows });
});

alertsRouter.get("/", (_req, res) => {
  const alerts: Alert[] = [];
  const sdb = salesDb();
  const rdb = receivablesDb();
  const pdb = pnlDb();
  const hdb = hrDb();

  // ============ ۱. مطالبات پرخطر: مانده‌ی بیش از ۹۰ روز، به تفکیک مشتری ============
  const riskyDebtors = rdb
    .prepare(
      `SELECT customer_name, customer_code, SUM(amount_unpaid) AS unpaid
       FROM receivable_invoices
       WHERE debt_age_bucket_detailed = 'بیش از 90 روز' AND amount_unpaid > 0
       GROUP BY customer_code ORDER BY unpaid DESC LIMIT 8`
    )
    .all() as { customer_name: string; customer_code: string; unpaid: number }[];
  const totalUnpaidRow = rdb.prepare("SELECT SUM(amount_unpaid) AS total FROM receivable_invoices").get() as {
    total: number | null;
  };
  const totalUnpaid = totalUnpaidRow.total ?? 0;
  for (const d of riskyDebtors) {
    const sharePct = totalUnpaid > 0 ? (d.unpaid / totalUnpaid) * 100 : 0;
    alerts.push({
      id: `recv-${d.customer_code}`,
      category: "receivables",
      severity: sharePct > 5 ? "critical" : sharePct > 2 ? "warning" : "notice",
      title: `مطالبه‌ی پرخطر: ${d.customer_name}`,
      description: `${sharePct.toFixed(1)}٪ از کل مانده‌ی پرداخت‌نشده‌ی شرکت، بیش از ۹۰ روز سررسید گذشته و مربوط به همین یک مشتری است.`,
      metricValue: d.unpaid,
      metricLabel: "مانده‌ی بیش از ۹۰ روز (ریال)",
      relatedEntity: d.customer_name,
    });
  }

  // ============ ۲. مشتریان کلیدی در حال از دست رفتن (جزو ۳۰ مشتری برتر، ولی غیرفعال) ============
  // «آخرین خرید» عمداً از هر ۴ منبع محاسبه می‌شود، نه فقط «نهایی»: وگرنه مشتری‌ای که
  // همین هفته خرید کرده ولی فاکتورش هنوز نهایی نشده، به‌اشتباه «غیرفعال شده» اعلام
  // می‌شود (باگ واقعی که با داده‌ی زنده پیدا شد — چند مشتری برتر دقیقاً همین وضعیت
  // را داشتند).
  const topCustomers = sdb
    .prepare(
      `SELECT canonical_customer_code, MAX(customer_name) AS name, SUM(net_amount) AS total,
              MAX(invoice_date_jalali) AS lastDate
       FROM sales_lines
       GROUP BY canonical_customer_code ORDER BY total DESC LIMIT 30`
    )
    .all() as { canonical_customer_code: string; name: string; total: number; lastDate: string }[];
  for (const c of topCustomers) {
    const days = daysSince(c.lastDate);
    if (days !== null && days > 60) {
      alerts.push({
        id: `cust-${c.canonical_customer_code}`,
        category: "customers",
        severity: days > 120 ? "critical" : "warning",
        title: `مشتری کلیدی غیرفعال شده: ${c.name}`,
        description: `این مشتری یکی از ۳۰ مشتری برتر شرکت از نظر فروش تاریخی است، ولی ${days} روز است خریدی ثبت نکرده.`,
        metricValue: days,
        metricLabel: "روز از آخرین خرید",
        relatedEntity: c.name,
      });
    }
  }

  // ============ ۳. افت غیرعادی فروش به تفکیک ویزیتور (ماه اخیر در برابر ماه قبل) ============
  const maxDateRow = sdb.prepare("SELECT MAX(invoice_date_jalali) AS maxDate FROM sales_lines").get() as {
    maxDate: string | null;
  };
  if (maxDateRow.maxDate) {
    const latest = lastCompleteMonth(maxDateRow.maxDate);
    const prev = previousYearMonth(latest.year, latest.month);
    const latestYm = `${latest.year}/${String(latest.month).padStart(2, "0")}`;
    const prevYm = `${prev.year}/${String(prev.month).padStart(2, "0")}`;

    const byVisitor = sdb
      .prepare(
        `SELECT visitor_name,
                SUM(CASE WHEN substr(invoice_date_jalali,1,7) = @latestYm THEN net_amount ELSE 0 END) AS latestAmount,
                SUM(CASE WHEN substr(invoice_date_jalali,1,7) = @prevYm THEN net_amount ELSE 0 END) AS prevAmount
         FROM sales_lines WHERE record_source = 'نهایی' AND visitor_name IS NOT NULL
         GROUP BY visitor_name`
      )
      .all({ latestYm, prevYm }) as { visitor_name: string; latestAmount: number; prevAmount: number }[];

    // آستانه‌ی حجم: زیر ۵۰۰ میلیون ریال در ماه قبل نادیده گرفته می‌شود (نوسان طبیعی نمایندگان کوچک)
    const MIN_VOLUME = 500_000_000;
    for (const v of byVisitor) {
      if (v.prevAmount < MIN_VOLUME) continue;
      // بازاریابِ ترک‌کرده طبیعتاً فروش ماه بعدش صفر می‌شود — این یک «افت غیرعادی»
      // نیست، بلکه نتیجه‌ی مستقیم خروج است؛ جداگانه در بخش ۶ پوشش داده می‌شود.
      if (getMarketerStatus(v.visitor_name) === "ترک کار") continue;
      const changePct = ((v.latestAmount - v.prevAmount) / v.prevAmount) * 100;
      if (changePct < -30) {
        alerts.push({
          id: `sales-drop-${v.visitor_name}`,
          category: "sales",
          severity: changePct < -60 ? "critical" : changePct < -45 ? "warning" : "notice",
          title: `افت فروش ${v.visitor_name}`,
          description: `فروش این ویزیتور نسبت به ماه قبل ${Math.abs(changePct).toFixed(0)}٪ کاهش داشته.`,
          metricValue: changePct,
          metricLabel: "درصد تغییر نسبت به ماه قبل",
          relatedEntity: v.visitor_name,
        });
      }
    }
  }

  // ============ ۴. تمرکز درآمد (وابستگی به چند مشتری بزرگ) ============
  const allCustomerTotals = sdb
    .prepare(
      `SELECT SUM(net_amount) AS total FROM sales_lines WHERE record_source = 'نهایی'`
    )
    .get() as { total: number | null };
  const top5Total = sdb
    .prepare(
      `SELECT SUM(t) AS top5 FROM (
         SELECT SUM(net_amount) AS t FROM sales_lines WHERE record_source = 'نهایی'
         GROUP BY canonical_customer_code ORDER BY t DESC LIMIT 5
       )`
    )
    .get() as { top5: number | null };
  const totalRevenue = allCustomerTotals.total ?? 0;
  const top5SharePct = totalRevenue > 0 ? ((top5Total.top5 ?? 0) / totalRevenue) * 100 : 0;
  if (top5SharePct > 25) {
    alerts.push({
      id: "concentration-top5",
      category: "concentration",
      severity: top5SharePct > 40 ? "critical" : top5SharePct > 32 ? "warning" : "notice",
      title: "وابستگی بالا به ۵ مشتری بزرگ",
      description: `${top5SharePct.toFixed(1)}٪ از کل فروش شرکت از ۵ مشتری تشکیل شده — ریسک از دست دادن هرکدام اثر قابل‌توجهی روی کل درآمد دارد.`,
      metricValue: top5SharePct,
      metricLabel: "سهم ۵ مشتری برتر از کل فروش (٪)",
    });
  }

  // ============ ۵. افت حاشیه‌ی سود (دو ماه متوالی کاهشی) ============
  const marginRows = pdb
    .prepare(
      `SELECT month_seq, month_name, year_jalali, item, amount_rial FROM pnl_long
       WHERE item IN ('فروش خالص', 'سود و (زیان ) خالص', 'سود و (زیان )')
       ORDER BY month_seq`
    )
    .all() as { month_seq: number; month_name: string; year_jalali: number; item: string; amount_rial: number }[];
  const bySeq = new Map<number, { label: string; sales?: number; profit?: number }>();
  for (const r of marginRows) {
    const e = bySeq.get(r.month_seq) ?? { label: `${r.month_name} ${r.year_jalali}` };
    if (r.item === "فروش خالص") e.sales = r.amount_rial;
    if (r.item === "سود و (زیان ) خالص" || r.item === "سود و (زیان )") e.profit = r.amount_rial;
    bySeq.set(r.month_seq, e);
  }
  const marginSeries = Array.from(bySeq.entries())
    .sort(([a], [b]) => a - b)
    .map(([seq, e]) => ({ seq, label: e.label, marginPct: e.sales && e.sales > 0 ? ((e.profit ?? 0) / e.sales) * 100 : null }))
    .filter((r): r is { seq: number; label: string; marginPct: number } => r.marginPct !== null);
  const recentMargins = marginSeries.slice(-3);
  if (recentMargins.length === 3 && recentMargins[0].marginPct > recentMargins[1].marginPct && recentMargins[1].marginPct > recentMargins[2].marginPct) {
    const drop = recentMargins[0].marginPct - recentMargins[2].marginPct;
    alerts.push({
      id: "margin-decline",
      category: "margin",
      severity: drop > 8 ? "critical" : drop > 4 ? "warning" : "notice",
      title: "روند کاهشی حاشیه‌ی سود",
      description: `حاشیه‌ی سود خالص سه ماه متوالی (${recentMargins.map((m) => m.label).join("، ")}) پیوسته کاهش داشته: از ${recentMargins[0].marginPct.toFixed(1)}٪ به ${recentMargins[2].marginPct.toFixed(1)}٪.`,
      metricValue: drop,
      metricLabel: "افت حاشیه سود در ۳ ماه (واحد درصد)",
    });
  }

  // ============ ۶. جهش غیرعادی در خروج پرسنل ============
  try {
    const empRows = hdb
      .prepare(
        "SELECT termination_year_jalali AS y, termination_month_num AS m FROM employee_status WHERE termination_year_jalali IS NOT NULL"
      )
      .all() as { y: number; m: number }[];
    const countByYm = new Map<string, number>();
    for (const r of empRows) {
      const key = `${r.y}/${String(r.m).padStart(2, "0")}`;
      countByYm.set(key, (countByYm.get(key) ?? 0) + 1);
    }
    const sortedYms = Array.from(countByYm.keys()).sort();
    const last6 = sortedYms.slice(-7, -1).map((k) => countByYm.get(k) ?? 0);
    const latestYm = sortedYms.at(-1);
    const latestCount = latestYm ? countByYm.get(latestYm) ?? 0 : 0;
    const avgPrior = average(last6);
    if (latestYm && avgPrior > 0 && latestCount > avgPrior * 2 && latestCount >= 3) {
      alerts.push({
        id: "hr-attrition-spike",
        category: "hr",
        severity: latestCount > avgPrior * 3 ? "critical" : "warning",
        title: "جهش در تعداد پایان‌خدمت‌ها",
        description: `در ${latestYm}، ${latestCount} نفر پایان خدمت خورده‌اند در حالی‌که میانگین ۶ ماه قبل از آن ${avgPrior.toFixed(1)} نفر بوده.`,
        metricValue: latestCount,
        metricLabel: "تعداد پایان خدمت در ماه",
      });
    }
  } catch {
    // hr.db ممکن است هنوز بازسازی نشده باشد؛ این بخش را بی‌صدا رد کن
  }

  // ============ ۷. بازاریاب ترک‌کرده با مانده مطالبات باز (مشتریانش نیاز به واگذاری مجدد دارند) ============
  const unpaidByVisitorForDeparted = rdb
    .prepare(`SELECT visitor_name, SUM(amount_unpaid) AS unpaid FROM receivable_invoices GROUP BY visitor_name`)
    .all() as { visitor_name: string; unpaid: number }[];
  for (const v of unpaidByVisitorForDeparted) {
    if (v.unpaid <= 0) continue;
    if (getMarketerStatus(v.visitor_name) !== "ترک کار") continue;
    alerts.push({
      id: `departed-receivables-${v.visitor_name}`,
      category: "receivables",
      severity: v.unpaid > 5_000_000_000 ? "critical" : v.unpaid > 1_000_000_000 ? "warning" : "notice",
      title: `مانده مطالبات باز نزد بازاریاب ترک‌کرده: ${v.visitor_name}`,
      description: "این بازاریاب دیگر همکار شرکت نیست ولی مشتریانش هنوز مانده‌ی پرداخت‌نشده دارند — نیاز به واگذاری به بازاریاب جدید.",
      metricValue: v.unpaid,
      metricLabel: "مانده پرداخت‌نشده (ریال)",
      relatedEntity: v.visitor_name,
    });
  }

  // ============ ۸. چک برگشتی قابل‌توجه ============
  const bouncedByCustomer = rdb
    .prepare(
      `SELECT customer_name, SUM(amount_unpaid) AS unpaid, COUNT(*) AS cnt FROM receivable_invoices
       WHERE invoice_kind = 'چک برگشتي' GROUP BY customer_code ORDER BY unpaid DESC LIMIT 5`
    )
    .all() as { customer_name: string; unpaid: number; cnt: number }[];
  for (const b of bouncedByCustomer) {
    if (b.unpaid <= 0) continue;
    alerts.push({
      id: `bounced-check-${b.customer_name}`,
      category: "receivables",
      severity: b.cnt >= 3 ? "critical" : b.cnt === 2 ? "warning" : "notice",
      title: `چک برگشتی: ${b.customer_name}`,
      description: `${b.cnt} فقره چک برگشتی از این مشتری ثبت شده که هنوز ${(b.unpaid / 1e6).toFixed(0)} میلیون ریال آن وصول نشده.`,
      metricValue: b.unpaid,
      metricLabel: "مانده‌ی چک برگشتی (ریال)",
      relatedEntity: b.customer_name,
    });
  }

  // ============ ۹. کد کالای بدون گروه کالایی (خارج از محاسبه‌ی تحقق تارگت) ============
  // تحقق تارگت هر بازاریاب به تفکیک گروه کالا محاسبه می‌شود (نگاشت کد کالا → گروه
  // کالا از شیت Kala). اگر کالایی در آن شیت گروه نداشته باشد، فروشش در هیچ گروهی
  // لحاظ نمی‌شود و بی‌صدا از محاسبه‌ی تحقق تارگت بیرون می‌ماند — این هشدار همان
  // نقطه‌کور را زودتر لو می‌دهد تا کسی گیج نشود که چرا فروش واقعی‌اش بیشتر از عددی
  // است که در کارنامه‌ی بازاریاب دیده می‌شود.
  const ungroupedTotalRow = sdb
    .prepare(
      `SELECT COUNT(DISTINCT item_code) AS codes, SUM(net_amount) AS amount
       FROM sales_lines WHERE record_source = 'نهایی' AND item_group IS NULL AND net_amount > 0`
    )
    .get() as { codes: number; amount: number | null };
  if (ungroupedTotalRow.codes > 0 && (ungroupedTotalRow.amount ?? 0) > 0) {
    const totalFinalSalesRow = sdb
      .prepare(`SELECT SUM(net_amount) AS total FROM sales_lines WHERE record_source = 'نهایی' AND net_amount > 0`)
      .get() as { total: number | null };
    const totalFinalSales = totalFinalSalesRow.total ?? 0;
    const sharePct = totalFinalSales > 0 ? ((ungroupedTotalRow.amount ?? 0) / totalFinalSales) * 100 : 0;
    const topItems = sdb
      .prepare(
        `SELECT item_name, SUM(net_amount) AS amount
         FROM sales_lines WHERE record_source = 'نهایی' AND item_group IS NULL AND net_amount > 0
         GROUP BY item_name ORDER BY amount DESC LIMIT 3`
      )
      .all() as { item_name: string; amount: number }[];
    alerts.push({
      id: "data-ungrouped-items",
      category: "data",
      severity: sharePct > 5 ? "warning" : "notice",
      title: `${ungroupedTotalRow.codes} کد کالا بدون گروه کالایی`,
      description: `این کدهای کالا در شیت Kala هیچ «گروه کالا»یی ندارند (${sharePct.toFixed(1)}٪ از فروش نهایی)، پس فروششان در محاسبه‌ی تحقق تارگت بازاریابان لحاظ نمی‌شود. پرتکرارترین: ${topItems.map((i) => i.item_name).join("، ")}.`,
      metricValue: ungroupedTotalRow.amount ?? 0,
      metricLabel: "فروش نهاییِ خارج از محاسبه‌ی تارگت (ریال)",
    });
  }

  alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  res.json({
    generatedAt: new Date().toISOString(),
    alerts,
    summary: {
      critical: alerts.filter((a) => a.severity === "critical").length,
      warning: alerts.filter((a) => a.severity === "warning").length,
      notice: alerts.filter((a) => a.severity === "notice").length,
    },
  });
});

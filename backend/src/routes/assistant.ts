import { Router } from "express";
import Groq from "groq-sdk";
import { config } from "../config";
import { salesDb, receivablesDb, pnlDb, hrDb, financeDb, inventoryDb } from "../db";
import { commentsDb } from "../db/commentsDb";
import { daysSince, lastCompleteMonth, previousYearMonth } from "../lib/jalali";

export const assistantRouter = Router();

/**
 * «دستیار هوشمند» — نسخه‌ی سوم، متصل به Groq واقعی (API سازگار با OpenAI؛ جایگزین
 * نسخه‌ی دوم که به Gemini متصل بود — کلیدهای فعلی Gemini با فرمت جدید «AQ.» هستند
 * که مسیر REST/SDK استاندارد گوگل فعلاً رد می‌کند، یک باگ تاییدشده‌ی سمت گوگل، نه
 * کد ما؛ رجوع کنید به کامنت‌های config.ts). این ماژول هر بار که کاربر پیام
 * می‌فرستد، یک «عکس فوری» تازه از داده‌های زنده‌ی سازمان (دقیقاً با همان کوئری‌ها/
 * منطق تجمیعی routes/home.ts، routes/finance.ts و routes/alerts.ts) به‌علاوه‌ی همه‌ی
 * یادداشت‌های مدیریتی ثبت‌شده در commentsDb را به‌عنوان زمینه به مدل زبانی Groq
 * می‌دهد و از آن می‌خواهد بر همان مبنا (و نه از حافظه‌ی خودش) پاسخ بدهد.
 */

const MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

// ---------- فرمت‌دهی اعداد — دقیقاً همان قرارداد frontend/src/lib/format.ts (رقم
// فارسی + ریال خلاصه‌شده) تا لحن پاسخ مدل با بقیه‌ی متن‌های برنامه یکی باشد ----------
const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const faNumber1 = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });

function formatCompactRial(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "نامشخص";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${faNumber1.format(n / 1e12)} هزار میلیارد ریال`;
  if (abs >= 1e9) return `${faNumber1.format(n / 1e9)} میلیارد ریال`;
  if (abs >= 1e6) return `${faNumber1.format(n / 1e6)} میلیون ریال`;
  return `${faNumber.format(Math.round(n))} ریال`;
}

function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "نامشخص";
  return `${n >= 0 ? "+" : ""}${faNumber1.format(n)}٪`;
}

function formatInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "نامشخص";
  return faNumber.format(Math.round(n));
}

// ============================================================================
// بخش ۱: جمع‌آوری داده‌ی زنده برای زمینه‌ی پرامپت — هر تابع دقیقاً همان کوئری‌ها/
// منطقی را تکرار می‌کند که routes/home.ts، routes/finance.ts و نسخه‌ی قبلی همین
// فایل (routes/assistant.ts) برای همان موضوع استفاده می‌کردند؛ هیچ قانون کسب‌وکاری
// جدیدی اینجا تعریف نشده. هر بخش عمداً try/catch جداگانه دارد تا نبودن موقت یکی
// از دیتابیس‌های فیک (مثلاً hr.db) بقیه‌ی زمینه را خراب نکند.
// ============================================================================

function salesContext(): string {
  try {
    const sdb = salesDb();
    const maxDateRow = sdb
      .prepare("SELECT MAX(invoice_date_jalali) AS d FROM sales_lines WHERE record_source = 'نهایی'")
      .get() as { d: string | null };
    if (!maxDateRow.d) return "فروش: داده‌ای موجود نیست.";

    const latest = lastCompleteMonth(maxDateRow.d);
    const prevMonth = previousYearMonth(latest.year, latest.month);
    const prevYear = { year: latest.year - 1, month: latest.month };
    const periodLabel = `${MONTH_NAMES[latest.month - 1]} ${latest.year}`;

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
    const momPct = prevMonthTotal > 0 ? ((latestTotal - prevMonthTotal) / prevMonthTotal) * 100 : null;
    const yoyPct = prevYearTotal > 0 ? ((latestTotal - prevYearTotal) / prevYearTotal) * 100 : null;

    return (
      `فروش: فروش خالص ${periodLabel} برابر ${formatCompactRial(latestTotal)} بوده` +
      (momPct !== null ? `، نسبت به ماه قبل ${formatPercent(momPct)}` : "") +
      (yoyPct !== null ? `، نسبت به ${periodLabel.split(" ")[0]} سال قبل ${formatPercent(yoyPct)}` : "") +
      "."
    );
  } catch (err) {
    console.error("[assistant] خطا در خواندن زمینه‌ی فروش:", err);
    return "فروش: در حال حاضر در دسترس نیست.";
  }
}

function receivablesContext(): string {
  try {
    const rdb = receivablesDb();
    const totals = rdb
      .prepare(
        `SELECT SUM(amount_unpaid) AS totalUnpaid, SUM(invoice_net_amount) AS totalNetInvoiced, SUM(amount_paid) AS totalPaid
         FROM receivable_invoices`
      )
      .get() as { totalUnpaid: number | null; totalNetInvoiced: number | null; totalPaid: number | null };
    const collectionRatePct =
      totals.totalNetInvoiced && totals.totalNetInvoiced > 0
        ? ((totals.totalPaid ?? 0) / totals.totalNetInvoiced) * 100
        : null;
    const riskyRow = rdb
      .prepare(
        `SELECT COUNT(DISTINCT customer_code) AS cnt FROM receivable_invoices
         WHERE debt_age_bucket_detailed = 'بیش از 90 روز' AND amount_unpaid > 0`
      )
      .get() as { cnt: number };

    return (
      `مطالبات: مانده‌ی پرداخت‌نشده ${formatCompactRial(totals.totalUnpaid ?? 0)}` +
      (collectionRatePct !== null ? `، نرخ وصول کلی ${formatPercent(collectionRatePct)}` : "") +
      `، ${formatInt(riskyRow.cnt)} مشتری با مانده‌ی بیش از ۹۰ روز سررسیدگذشته.`
    );
  } catch (err) {
    console.error("[assistant] خطا در خواندن زمینه‌ی مطالبات:", err);
    return "مطالبات: در حال حاضر در دسترس نیست.";
  }
}

function pnlContext(): string {
  try {
    const pdb = pnlDb();
    const maxSeqRow = pdb.prepare("SELECT MAX(month_seq) AS maxSeq FROM pnl_long").get() as { maxSeq: number | null };
    if (maxSeqRow.maxSeq === null) return "سود و زیان: داده‌ای موجود نیست.";

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
    const marginPct = netSales > 0 ? (netProfit / netSales) * 100 : null;
    const growthPct = prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : null;
    const meta = pdb
      .prepare("SELECT year_jalali, month_name FROM pnl_long WHERE month_seq = ? LIMIT 1")
      .get(maxSeqRow.maxSeq) as { year_jalali: number; month_name: string };
    const periodLabel = `${meta.month_name} ${meta.year_jalali}`;

    return (
      `سود و زیان: سود خالص ${periodLabel} حدود ${formatCompactRial(netProfit)}` +
      (marginPct !== null ? `، حاشیه‌ی سود ${formatPercent(marginPct)} از فروش خالص` : "") +
      (growthPct !== null ? `، نسبت به ماه قبل ${formatPercent(growthPct)}` : "") +
      "."
    );
  } catch (err) {
    console.error("[assistant] خطا در خواندن زمینه‌ی سود و زیان:", err);
    return "سود و زیان: در حال حاضر در دسترس نیست.";
  }
}

function hrContext(): string {
  try {
    const hdb = hrDb();
    const headcountRow = hdb
      .prepare("SELECT headcount FROM headcount_by_month ORDER BY year_jalali DESC, month_num DESC LIMIT 1")
      .get() as { headcount: number } | undefined;
    if (!headcountRow) return "پرسنل: داده‌ای موجود نیست.";
    const salaryRow = hdb
      .prepare("SELECT * FROM salary_per_capita ORDER BY year_jalali DESC, month_num DESC LIMIT 1")
      .get() as { year_jalali: number; month_name: string; salary_per_capita_rial: number } | undefined;
    return (
      `پرسنل: تعداد فعلی ${formatInt(headcountRow.headcount)} نفر` +
      (salaryRow
        ? `، سرانه‌ی حقوق ${salaryRow.month_name} ${salaryRow.year_jalali} حدود ${formatCompactRial(salaryRow.salary_per_capita_rial)}.`
        : ".")
    );
  } catch (err) {
    console.error("[assistant] خطا در خواندن زمینه‌ی پرسنل:", err);
    return "پرسنل: در حال حاضر در دسترس نیست.";
  }
}

function financeContext(): string {
  try {
    const fdb = financeDb();
    const rows = fdb.prepare("SELECT * FROM finance_monthly ORDER BY month_seq").all() as {
      year_jalali: number;
      month_name: string;
      total_assets_rial: number;
      total_liabilities_rial: number;
      cash_balance_rial: number;
      company_value_rial: number;
      budget_target_rial: number;
      budget_actual_rial: number;
      roi_pct: number;
    }[];
    if (rows.length === 0) return "مالی/بودجه: داده‌ای موجود نیست.";
    const latest = rows[rows.length - 1];
    const ytdRows = rows.filter((r) => r.year_jalali === latest.year_jalali);
    const ytdTarget = ytdRows.reduce((s, r) => s + r.budget_target_rial, 0);
    const ytdActual = ytdRows.reduce((s, r) => s + r.budget_actual_rial, 0);
    const budgetPct = ytdTarget > 0 ? (ytdActual / ytdTarget) * 100 : null;
    const debtToAssetPct =
      latest.total_assets_rial > 0 ? (latest.total_liabilities_rial / latest.total_assets_rial) * 100 : null;
    const equity = latest.total_assets_rial - latest.total_liabilities_rial;

    return (
      `مالی/بودجه (${latest.month_name} ${latest.year_jalali}): موجودی نقدینگی ${formatCompactRial(
        latest.cash_balance_rial
      )}، ارزش شرکت ${formatCompactRial(latest.company_value_rial)}، حقوق صاحبان سهام ${formatCompactRial(equity)}` +
      (debtToAssetPct !== null ? `، نسبت بدهی به دارایی ${formatPercent(debtToAssetPct)}` : "") +
      `، ROI ${formatPercent(latest.roi_pct)}` +
      (budgetPct !== null
        ? `، تحقق بودجه‌ی سال ${latest.year_jalali} تا این ماه ${formatPercent(budgetPct)} (${formatCompactRial(
            ytdActual
          )} از ${formatCompactRial(ytdTarget)} هدف)`
        : "") +
      "."
    );
  } catch (err) {
    console.error("[assistant] خطا در خواندن زمینه‌ی مالی/بودجه:", err);
    return "مالی/بودجه: در حال حاضر در دسترس نیست.";
  }
}

function okrContext(): string {
  try {
    const fdb = financeDb();
    const objectives = fdb.prepare("SELECT * FROM okr_objectives ORDER BY sort_order").all() as {
      id: number;
      title: string;
      quarter_label: string;
    }[];
    if (objectives.length === 0) return "چشم‌انداز/OKR: داده‌ای موجود نیست.";
    const keyResults = fdb.prepare("SELECT * FROM okr_key_results ORDER BY objective_id, sort_order").all() as {
      objective_id: number;
      progress_pct: number;
    }[];
    const progressByObjective = new Map<number, number[]>();
    for (const kr of keyResults) {
      if (!progressByObjective.has(kr.objective_id)) progressByObjective.set(kr.objective_id, []);
      progressByObjective.get(kr.objective_id)!.push(kr.progress_pct);
    }
    const lines = objectives.map((o) => {
      const progresses = progressByObjective.get(o.id) ?? [];
      const avg = progresses.length > 0 ? progresses.reduce((s, p) => s + p, 0) / progresses.length : null;
      return `${o.title} (${o.quarter_label})${avg !== null ? `: میانگین پیشرفت ${formatPercent(avg)}` : ""}`;
    });
    return `چشم‌انداز/OKR:\n  - ${lines.join("\n  - ")}`;
  } catch (err) {
    console.error("[assistant] خطا در خواندن زمینه‌ی OKR:", err);
    return "چشم‌انداز/OKR: در حال حاضر در دسترس نیست.";
  }
}

function inventoryContext(): string {
  try {
    const idb = inventoryDb();
    const totalRow = idb
      .prepare("SELECT COUNT(DISTINCT item_code) AS skus, SUM(sellable_qty) AS qty FROM inventory_lines")
      .get() as { skus: number; qty: number | null };
    return `انبار: ${formatInt(totalRow.skus)} کد کالا ثبت‌شده، مجموع موجودی قابل‌فروش ${formatInt(totalRow.qty ?? 0)} واحد.`;
  } catch (err) {
    console.error("[assistant] خطا در خواندن زمینه‌ی انبار:", err);
    return "انبار: در حال حاضر در دسترس نیست.";
  }
}

function alertsSummaryContext(): string {
  try {
    const rdb = receivablesDb();
    const sdb = salesDb();
    const riskyRow = rdb
      .prepare(
        `SELECT COUNT(DISTINCT customer_code) AS cnt FROM receivable_invoices
         WHERE debt_age_bucket_detailed = 'بیش از 90 روز' AND amount_unpaid > 0`
      )
      .get() as { cnt: number };
    const topCustomers = sdb
      .prepare(
        `SELECT MAX(customer_name) AS name, MAX(invoice_date_jalali) AS lastDate
         FROM sales_lines GROUP BY canonical_customer_code ORDER BY SUM(net_amount) DESC LIMIT 30`
      )
      .all() as { name: string; lastDate: string }[];
    const inactiveCount = topCustomers.filter((c) => {
      const days = daysSince(c.lastDate);
      return days !== null && days > 60;
    }).length;
    return (
      `هشدارها (خلاصه): ${formatInt(riskyRow.cnt)} مشتری با مانده مطالبات پرخطر (بیش از ۹۰ روز)، ` +
      `${formatInt(inactiveCount)} مشتری کلیدی غیرفعال‌شده. فهرست کامل در صفحه‌ی «هشدارها».`
    );
  } catch (err) {
    console.error("[assistant] خطا در خواندن خلاصه‌ی هشدارها:", err);
    return "هشدارها: در حال حاضر در دسترس نیست.";
  }
}

interface CommentRow {
  id: number;
  target_type: string;
  target_id: string;
  target_label: string | null;
  author: string;
  text: string;
  created_at: string;
}

// همه‌ی کامنت‌های مدیریتی، تازه در همین درخواست خوانده می‌شوند (نه کش‌شده) — دقیقاً
// همان کوئری‌ای که routes/comments.ts برای GET /api/comments/all اجرا می‌کند.
function commentsContext(): string {
  try {
    const rows = commentsDb()
      .prepare("SELECT * FROM comments ORDER BY created_at DESC")
      .all() as CommentRow[];
    if (rows.length === 0) return "هیچ یادداشت مدیریتی‌ای هنوز روی هیچ هشدار/KPI‌ای ثبت نشده.";
    return rows
      .map((r) => {
        const label = r.target_label ? `${r.target_type} — ${r.target_label}` : r.target_type;
        return `- [${label}] ${r.author} در ${r.created_at}: «${r.text}»`;
      })
      .join("\n");
  } catch (err) {
    console.error("[assistant] خطا در خواندن یادداشت‌های مدیریتی:", err);
    return "خواندن یادداشت‌های مدیریتی با خطا مواجه شد.";
  }
}

function gatherLiveContext(): string {
  return [
    salesContext(),
    receivablesContext(),
    pnlContext(),
    hrContext(),
    financeContext(),
    okrContext(),
    inventoryContext(),
    alertsSummaryContext(),
  ].join("\n");
}

// ============================================================================
// بخش ۲: تعریف تابع ناوبری (function calling) — صفحاتی که واقعاً در این برنامه
// وجود دارند (frontend/src/app/menuConfig.tsx)، با توضیح یک‌خطی از محتوای هرکدام
// ============================================================================

const NAV_PAGES = [
  {
    value: "/",
    label: "داشبورد",
    description: "داشبورد مدیریتی — خلاصه‌ی وضعیت کلی شرکت: فروش، سود و زیان، مطالبات، هشدارهای برتر و تحلیل روند خودکار.",
  },
  {
    value: "/sales",
    label: "فروش",
    description: "جزئیات فروش به تفکیک استان/مرکز فروش/بازاریاب/گروه‌کالا/مشتری و روند ماهانه.",
  },
  {
    value: "/marketer-scorecard",
    label: "کارنامه بازاریاب",
    description: "عملکرد هر بازاریاب/ویزیتور نسبت به تارگت تعیین‌شده‌اش.",
  },
  {
    value: "/receivables",
    label: "مانده مطالبات",
    description: "وضعیت بدهی/مطالبات مشتریان، نرخ وصول، سررسیدهای معوق و چک‌های برگشتی.",
  },
  {
    value: "/pnl",
    label: "سود و زیان",
    description: "گزارش سود و زیان ماهانه‌ی شرکت.",
  },
  {
    value: "/hr",
    label: "پرسنل",
    description: "تعداد پرسنل، سرانه‌ی حقوق، ورود/خروج و پایان‌خدمت‌ها.",
  },
  {
    value: "/inventory",
    label: "رسوب انبار",
    description: "کالاهای راکد/کم‌گردش و وضعیت موجودی انبار.",
  },
  {
    value: "/alerts",
    label: "هشدارها",
    description: "فهرست کامل هشدارهای ریسک شناسایی‌شده در کل سازمان (مطالبات پرخطر، افت فروش، تمرکز مشتری، ...).",
  },
  {
    value: "/forecast",
    label: "چشم‌انداز آینده",
    description: "پیش‌بینی چند ماه آینده‌ی فروش/سود با فرض‌های تورمی و ارزی قابل‌تنظیم.",
  },
] as const;

type NavPageValue = (typeof NAV_PAGES)[number]["value"];

// شکل استاندارد «تابع/ابزار» در API سازگار با OpenAI (که Groq هم دقیقاً همین شکل را
// می‌پذیرد): {type:"function", function:{name, description, parameters:JSONSchema}}.
// عمداً بدون آنوتیشن صریح از تایپ‌های groq-sdk («Groq.Chat.ChatCompletionTool») چون
// این آبجکت literal دقیقاً با آن ساختار می‌خواند و در محل فراخوانی («client.chat.
// completions.create») به‌صورت ساختاری (structural typing) سنجیده می‌شود.
const navigateDeclaration = {
  type: "function" as const,
  function: {
    name: "navigate_to_section",
    description:
      "کاربر را به یکی از صفحات این برنامه‌ی مدیریتی منتقل می‌کند. فقط وقتی فراخوانی شود که کاربر صراحتاً بخواهد" +
      " داده‌ی یک بخش مشخص را «ببیند»/«نشانش بدهد»/به آن صفحه «برود» — نه برای سوالات معمولی که با متن قابل پاسخ‌دادن‌اند.",
    parameters: {
      type: "object",
      properties: {
        page: {
          type: "string",
          enum: NAV_PAGES.map((p) => p.value),
          description: "مسیر (route) صفحه‌ی مقصد در برنامه.",
        },
      },
      required: ["page"],
    },
  },
};

// ============================================================================
// بخش ۳: ساخت system instruction — زمینه‌ی زنده + یادداشت‌های مدیریتی + قواعد پاسخ
// ============================================================================

function buildSystemInstruction(): string {
  const navList = NAV_PAGES.map((p) => `- ${p.value} (${p.label}): ${p.description}`).join("\n");

  return `تو «دستیار هوشمند» یک داشبورد مدیریتی (BI) داخلی برای مدیرعامل یک شرکت پخش مواد غذایی هستی.
همیشه به فارسی، با لحن رسمی ولی صمیمی (دقیقاً مثل بقیه‌ی متن‌های همین برنامه) پاسخ بده.
برای عددها از همان قرارداد رایج این برنامه استفاده کن: مبالغ ریالی را به‌صورت خلاصه بنویس
(میلیون ریال / میلیارد ریال / هزار میلیارد ریال) و اعداد و درصدها را با رقم فارسی (۰۱۲۳...) بنویس، نه رقم لاتین.

# داده‌های زنده‌ی سازمان (در همین لحظه از دیتابیس‌های واقعی خوانده شده)
${gatherLiveContext()}

# یادداشت‌های مدیریتی (کامنت‌هایی که یک انسان — مدیر — روی هشدارها/KPIهای مشخص گذاشته)
این یادداشت‌ها را یک مدیر واقعی، دستی و بعد از دیدن عدد خام، روی همان هشدار/KPI ثبت کرده.
اگر پرسش کاربر به موضوع/هشدار/شخص/مشتری‌ای مرتبط بود که یکی از این یادداشت‌ها به آن اشاره دارد،
حتماً محتوای یادداشت را در پاسخت لحاظ کن و بگذار برداشت پیش‌فرض تو از عدد خام را کنار بزند یا تعدیل کند —
مثلاً اگر یادداشتی بگوید فلان هشدار قبلاً به‌صورت دستی پیگیری/حل شده، تو هم باید همین را به کاربر منعکس کنی،
نه اینکه صرفاً دوباره همان عدد خام هشدار را تکرار کنی و انگار آن یادداشت وجود ندارد.
${commentsContext()}

# پاسخ به سوالات فرضی («اگر... چی می‌شه؟» / what-if)
اگر کاربر سوال فرضی/سناریویی پرسید (مثلاً «اگر فروش ۲۰٪ بیشتر بشه چی می‌شه؟»)،
خودت مستقیماً از روی همین اعداد زمینه‌ی بالا یک محاسبه‌ی سرانگشتی و شفاف انجام بده؛ هیچ ابزار محاسباتی
جداگانه‌ای در کار نیست، فقط استدلال ریاضی ساده روی همین ارقام. فرض‌هایت را صریح بنویس
(مثلاً «با فرض ثابت ماندن حاشیه‌ی سود/سایر هزینه‌ها...»)، مراحل محاسبه را کوتاه نشان بده، و در پایان یک
برآورد عددی بده. همیشه تاکید کن این یک تخمین ساده‌ی سرانگشتی است، نه پیش‌بینی دقیق مالی.

# رفتن به صفحه‌ی مشخص (تابع navigate_to_section)
اگر کاربر آشکارا خواست به بخش/گزارش خاصی از برنامه برود یا داده‌ی آن را ببیند/نشانش بدهی،
تابع navigate_to_section را **واقعاً و فقط از طریق مکانیزم function calling** فراخوانی کن —
هرگز چیزی شبیه به یک تگ یا فراخوانی تابع را به‌صورت متن خام در پاسخت ننویس (مثلاً هرگز چیزی شبیه
navigate_to_section با پرانتز/تگ را در پاسخ متنی چاپ نکن؛ کاربر هرگز نباید نحو خام فراخوانی تابع
را ببیند). همزمان یک جمله‌ی کوتاه تاییدی هم در پاسخ متنی‌ات بنویس (مثلاً «الان می‌برمت به صفحه‌ی
مطالبات.»). صفحات موجود:
${navList}
اگر سوال کاربر صرفاً یک سوال معمولی است (نه درخواست رفتن به صفحه)، این تابع را فراخوانی نکن.

# قواعد کلی
- فقط بر اساس داده‌های بالا و تاریخچه‌ی همین گفتگو پاسخ بده؛ هیچ عدد یا واقعیتی از خودت نساز.
- اگر داده‌ای برای پاسخ دقیق کافی نیست، صادقانه همین را بگو.
- پاسخ‌ها را کوتاه، مشخص و کاربردی نگه دار — مثل یک دستیار مدیرعامل، نه یک مقاله‌ی طولانی.`;
}

// ============================================================================
// بخش ۴: فراخوانی واقعی Groq (API سازگار با OpenAI) + مدیریت خطا
// ============================================================================

// «groq-sdk» بر خلاف «@google/genai» یک بسته‌ی ESM-محض نیست — هم CJS و هم ESM را
// build می‌کند (به package.json آن رجوع کنید)، پس import ایستای معمولی در بالای
// همین فایل بدون نیاز به import() پویا یا resolution-mode جداگانه کار می‌کند.

let cachedClient: Groq | null = null;
function getClient(): Groq | null {
  if (!config.groqApiKey) return null;
  if (!cachedClient) {
    cachedClient = new Groq({ apiKey: config.groqApiKey });
  }
  return cachedClient;
}

const FALLBACK_UNAVAILABLE = "دستیار موقتاً در دسترس نیست — چند لحظه دیگه دوباره امتحان کن.";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AssistantReply {
  reply: string;
  navigateTo?: string;
}

/**
 * *** نقطه‌ی اتصال به هوش مصنوعی واقعی (Groq، API سازگار با OpenAI) ***
 * ورودی: پیام جدید کاربر + تاریخچه‌ی گفتگو (فرانت‌اند منبع حقیقت تاریخچه است، این
 * تابع هیچ session سمت سرور نگه نمی‌دارد). خروجی: متن پاسخ + مقصد ناوبری اختیاری.
 */
export async function generateReply(message: string, history: ChatTurn[] = []): Promise<AssistantReply> {
  const trimmed = message.trim();
  if (!trimmed) return { reply: "لطفاً سوال خود را بنویسید." };

  const ai = getClient();
  if (!ai) {
    // کلید تنظیم نشده — این را فقط سمت سرور لاگ می‌کنیم، به کاربر همان پیام عمومی
    // «موقتاً در دسترس نیست» را می‌دهیم تا هیچ جزییات پیکربندی به فرانت‌اند درز نکند.
    console.error("[assistant] GROQ_API_KEY تنظیم نشده — درخواست دستیار رد شد.");
    return { reply: FALLBACK_UNAVAILABLE };
  }

  // آخرین ۲۰ نوبت گفتگو کافی است (طبق طراحی: حافظه‌ی مکالمه، نه آرشیو کامل).
  // شکل پیام‌ها دقیقاً همان آرایه‌ی messages سازگار با OpenAI: یک پیام system
  // (زمینه‌ی زنده + یادداشت‌های مدیریتی + قواعد پاسخ)، بعد تاریخچه، بعد پیام کاربر.
  const historyMessages: Groq.Chat.ChatCompletionMessageParam[] = history.slice(-20).map((h) => ({
    role: h.role === "assistant" ? "assistant" : "user",
    content: h.text,
  }));
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemInstruction() },
    ...historyMessages,
    { role: "user", content: trimmed },
  ];

  try {
    const response = await ai.chat.completions.create({
      model: config.groqModel,
      messages,
      tools: [navigateDeclaration],
    });

    const choice = response.choices[0]?.message;
    const calls = choice?.tool_calls ?? [];
    const navCall = calls.find((c) => c.type === "function" && c.function.name === "navigate_to_section");
    let navigateTo: NavPageValue | undefined;
    if (navCall && navCall.type === "function") {
      try {
        const args = JSON.parse(navCall.function.arguments) as { page?: unknown };
        const match = typeof args.page === "string" ? NAV_PAGES.find((p) => p.value === args.page) : undefined;
        if (match) navigateTo = match.value;
      } catch (parseErr) {
        console.error("[assistant] خطا در پارس‌کردن آرگومان‌های navigate_to_section:", parseErr);
      }
    }

    let reply = (choice?.content ?? "").trim();

    // بعضی مدل‌ها (به‌خصوص روی Groq) گاهی به‌جای فراخوانی واقعی تابع از طریق مکانیزم
    // function calling، یک تگ شبه-XML شبیه <navigate_to_section page="..."> را
    // مستقیم داخل متن پاسخ می‌نویسند — یعنی همان چیزی که در دستورالعمل بالا صریحاً
    // ازش منع شده، ولی مدل گاهی رعایت نمی‌کند. این یک شبکه‌ی ایمنی است: اگر چنین
    // تگی در متن پاسخ دیده شد، مقدار «page» را از همانجا استخراج می‌کنیم (اگر
    // navigateTo از راه واقعی tool_calls قبلاً ست نشده باشد) و خودِ تگ خام را از
    // متنی که به کاربر نشان داده می‌شود پاک می‌کنیم — کاربر هرگز نباید نحو خام
    // فراخوانی تابع را ببیند.
    const leakedTagMatch = reply.match(/<navigate_to_section\s+page=["']([^"']+)["']\s*\/?>/i);
    if (leakedTagMatch) {
      if (!navigateTo) {
        const match = NAV_PAGES.find((p) => p.value === leakedTagMatch[1]);
        if (match) navigateTo = match.value;
      }
      reply = reply
        .replace(/<navigate_to_section\s+page=["'][^"']+["']\s*\/?>/gi, "")
        .replace(/^>\s*\*{0,2}(لینک|link)\*{0,2}:?\s*$/gim, "")
        .replace(/^>\s*$/gim, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    if (!reply) {
      if (navigateTo) {
        const target = NAV_PAGES.find((p) => p.value === navigateTo);
        reply = `الان شما را به صفحه‌ی «${target?.label ?? navigateTo}» می‌برم.`;
      } else {
        reply = "متوجه سوال نشدم؛ می‌شه با جزئیات بیشتری دوباره بپرسید؟";
      }
    }

    return navigateTo ? { reply, navigateTo } : { reply };
  } catch (err) {
    // خطای واقعی فقط سمت سرور لاگ می‌شود (برای دیباگ خودمان) — نه در پاسخ به فرانت‌اند،
    // تا نه جزییات فنی/کلید API درز کند و نه کاربر با stack trace خام روبه‌رو شود.
    if (err instanceof Groq.APIError) {
      console.error(`[assistant] خطای Groq API (status ${err.status}):`, err.message);
    } else {
      console.error("[assistant] خطای غیرمنتظره در فراخوانی دستیار:", err);
    }
    return { reply: FALLBACK_UNAVAILABLE };
  }
}

assistantRouter.post("/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  const rawHistory: unknown[] = Array.isArray(req.body?.history) ? (req.body.history as unknown[]) : [];
  const history: ChatTurn[] = rawHistory
    .filter(
      (h: unknown): h is { role: "user" | "assistant"; text: string } =>
        !!h &&
        typeof h === "object" &&
        typeof (h as { text?: unknown }).text === "string" &&
        ((h as { role?: unknown }).role === "user" || (h as { role?: unknown }).role === "assistant")
    )
    .map((h) => ({ role: h.role, text: h.text }));

  const result = await generateReply(message, history);
  res.json(result);
});

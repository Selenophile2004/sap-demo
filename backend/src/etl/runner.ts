import { spawn } from "child_process";
import path from "path";

const ETL_DIR = path.resolve(__dirname, "..", "..", "..", "etl");
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE ?? "python";

export const ETL_MODULES = {
  sales: "sales_etl.py",
  receivables: "receivables_etl.py",
  pnl: "pnl_etl.py",
  hr: "hr_etl.py",
  targets: "targets_etl.py",
  inventory: "inventory_etl.py",
} as const;

export type EtlModuleName = keyof typeof ETL_MODULES;

// ترتیب مهم است: hr_etl.py به pnl.db وابسته است، پس همیشه بعد از آن اجرا می‌شود
export const ETL_ORDER: EtlModuleName[] = ["sales", "receivables", "pnl", "hr", "targets", "inventory"];

export interface EtlRunResult {
  module: EtlModuleName;
  success: boolean;
  durationMs: number;
  output: string;
  error?: string;
}

function runScript(module: EtlModuleName): Promise<EtlRunResult> {
  const script = ETL_MODULES[module];
  const started = Date.now();

  return new Promise((resolve) => {
    const child = spawn(PYTHON_EXECUTABLE, [script], {
      cwd: ETL_DIR,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    // بدون این هندلر، اگر «python» اصلاً روی سیستم پیدا نشود (مثلاً روی هاست که
    // پایتون نصب نیست)، Node رویداد "error" را بدون listener پرتاب می‌کند و کل
    // پردازش بک‌اند کرش می‌کند — این باید همیشه به‌جای کرش، شکست را resolve کند.
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      resolve({
        module,
        success: false,
        durationMs: Date.now() - started,
        output: stdout,
        error: `اجرای ${PYTHON_EXECUTABLE} ممکن نشد: ${err.message}`,
      });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      resolve({
        module,
        success: code === 0,
        durationMs: Date.now() - started,
        output: stdout,
        error: code === 0 ? undefined : stderr,
      });
    });
  });
}

export interface EtlLastStatus {
  success: boolean;
  error?: string;
  ranAt: string;
  source: "manual" | "watcher";
}

// آخرین وضعیت اجرای هر ماژول (فقط در حافظه — با ری‌استارت بک‌اند پاک می‌شود، که
// برای این پروژه کافی است چون بک‌اند معمولاً بلندمدت روی یک ماشین اجرا می‌ماند).
// هم دکمه‌ی «به‌روزرسانی دستی» و هم واچرِ خودکار پوشه‌ی Data از همین یک منبع
// می‌نویسند، پس فرقی نمی‌کند خطا از کدام مسیر آمده — فرانت‌اند با یک درخواست به
// /api/refresh/status هر دو را می‌بیند.
export const lastRunStatus: Partial<Record<EtlModuleName, EtlLastStatus>> = {};

/** اجرای یک یا همه‌ی ماژول‌های ETL، به ترتیب صحیح وابستگی. */
export async function runEtl(
  modules: EtlModuleName[] = ETL_ORDER,
  source: "manual" | "watcher" = "manual"
): Promise<EtlRunResult[]> {
  const ordered = ETL_ORDER.filter((m) => modules.includes(m));
  const results: EtlRunResult[] = [];
  for (const m of ordered) {
    const r = await runScript(m);
    results.push(r);
    lastRunStatus[m] = { success: r.success, error: r.error, ranAt: new Date().toISOString(), source };
  }
  return results;
}

// نام‌ها باید دقیقاً با SOURCE_FILE هر اسکریپت ETL یکی باشند (etl/*.py)، وگرنه
// واچر پوشه‌ی Data تغییر فایل را نادیده می‌گیرد. قبلاً «گزارش فروش.xlsx» اینجا بود
// درحالی‌که نام واقعی فایل «گزارش فروش (کامل - شامل موقت).xlsx» است، و تارگت/انبار
// اصلاً ثبت نشده بودند — یعنی تغییر آن فایل‌ها نه با واچر خودکار و نه با دکمه‌ی
// «به‌روزرسانی دستی» اعمال می‌شد.
export const SOURCE_FILE_TO_MODULE: Record<string, EtlModuleName> = {
  "گزارش فروش (کامل - شامل موقت).xlsx": "sales",
  "مانده_مطالبات_یکپارچه.xlsx": "receivables",
  "سود_و_زیان_یکپارچه.xlsx": "pnl",
  "سود و زیان محصول و بازاریاب.xlsx": "pnl",
  "لیست پرسنل.xlsx": "hr",
  "تارگت ویزیتور و لاین.xlsx": "targets",
  "انبار.xlsx": "inventory",
};

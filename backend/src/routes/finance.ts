import { Router } from "express";
import { financeDb } from "../db";

export const financeRouter = Router();

/**
 * داده‌های مالی/ترازنامه‌ای صفحه‌ی اول — منبعی کاملاً جدا و مستقل از pnl.db/sales.db
 * (دقیقاً همان قرارداد بقیه‌ی این پروژه: هر ماژول از فایل منبع خودش می‌آید و لازم
 * نیست با بقیه join شود). این مسیرها هفت شاخص «به‌زودی» قبلی صفحه‌ی اول
 * (بودجه/بدهی/نسبت بدهی به دارایی/ارزش شرکت/دارایی‌ها/نقدینگی/ROI) را تغذیه
 * می‌کنند، به‌علاوه‌ی بخش جدید «چشم‌انداز و OKR».
 */

interface FinanceMonthlyRow {
  year_jalali: number;
  month_num: number;
  month_name: string;
  month_seq: number;
  total_assets_rial: number;
  total_liabilities_rial: number;
  cash_balance_rial: number;
  company_value_rial: number;
  budget_target_rial: number;
  budget_actual_rial: number;
  roi_pct: number;
}

function allMonthly(db: ReturnType<typeof financeDb>): FinanceMonthlyRow[] {
  return db.prepare("SELECT * FROM finance_monthly ORDER BY month_seq").all() as FinanceMonthlyRow[];
}

financeRouter.get("/kpis", (_req, res) => {
  const db = financeDb();
  const rows = allMonthly(db);
  if (rows.length === 0) {
    res.status(404).json({ error: "no finance data" });
    return;
  }
  const latest = rows[rows.length - 1];

  // تحقق بودجه سال: مجموع هدف/عملکرد از ابتدای همان سال شمسی تا ماه جاری (YTD)
  const ytdRows = rows.filter((r) => r.year_jalali === latest.year_jalali);
  const ytdTarget = ytdRows.reduce((s, r) => s + r.budget_target_rial, 0);
  const ytdActual = ytdRows.reduce((s, r) => s + r.budget_actual_rial, 0);
  const budgetRealizationPct = ytdTarget > 0 ? (ytdActual / ytdTarget) * 100 : null;

  const debtToAssetPct = latest.total_assets_rial > 0 ? (latest.total_liabilities_rial / latest.total_assets_rial) * 100 : null;
  const totalEquityRial = latest.total_assets_rial - latest.total_liabilities_rial;

  res.json({
    period: { year_jalali: latest.year_jalali, month_num: latest.month_num, month_name: latest.month_name },
    totalAssetsRial: latest.total_assets_rial,
    totalLiabilitiesRial: latest.total_liabilities_rial,
    totalEquityRial,
    debtToAssetPct,
    companyValueRial: latest.company_value_rial,
    cashBalanceRial: latest.cash_balance_rial,
    roiPct: latest.roi_pct,
    budgetRealizationPct,
    budgetTargetYtdRial: ytdTarget,
    budgetActualYtdRial: ytdActual,
  });
});

financeRouter.get("/monthly", (req, res) => {
  const db = financeDb();
  const months = Math.min(Number(req.query.months) || 12, 36);
  const rows = allMonthly(db);
  res.json(rows.slice(-months));
});

interface OkrObjectiveRow {
  id: number;
  title: string;
  owner: string;
  quarter_label: string;
  sort_order: number;
}
interface OkrKeyResultRow {
  id: number;
  objective_id: number;
  title: string;
  unit: string;
  target_value: number;
  actual_value: number;
  progress_pct: number;
  sort_order: number;
}

financeRouter.get("/okr", (_req, res) => {
  const db = financeDb();
  const objectives = db
    .prepare("SELECT * FROM okr_objectives ORDER BY sort_order")
    .all() as OkrObjectiveRow[];
  const keyResults = db
    .prepare("SELECT * FROM okr_key_results ORDER BY objective_id, sort_order")
    .all() as OkrKeyResultRow[];

  const byObjective = new Map<number, OkrKeyResultRow[]>();
  for (const kr of keyResults) {
    if (!byObjective.has(kr.objective_id)) byObjective.set(kr.objective_id, []);
    byObjective.get(kr.objective_id)!.push(kr);
  }

  res.json(
    objectives.map((o) => ({
      id: o.id,
      title: o.title,
      owner: o.owner,
      quarterLabel: o.quarter_label,
      keyResults: (byObjective.get(o.id) ?? []).map((kr) => ({
        id: kr.id,
        title: kr.title,
        unit: kr.unit,
        targetValue: kr.target_value,
        actualValue: kr.actual_value,
        progressPct: kr.progress_pct,
      })),
    }))
  );
});

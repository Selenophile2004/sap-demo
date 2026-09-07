import { Router } from "express";
import { hrDb } from "../db";

export const hrRouter = Router();

hrRouter.get("/kpis", (req, res) => {
  const db = hrDb();
  const year = req.query.year ? Number(req.query.year) : null;
  const month = req.query.month ? Number(req.query.month) : null;

  const headcountRow =
    year && month
      ? (db
          .prepare("SELECT headcount FROM headcount_by_month WHERE year_jalali = ? AND month_num = ?")
          .get(year, month) as { headcount: number } | undefined)
      : year
        ? (db
            .prepare(
              "SELECT headcount FROM headcount_by_month WHERE year_jalali = ? ORDER BY month_num DESC LIMIT 1"
            )
            .get(year) as { headcount: number } | undefined)
        : (db
            .prepare("SELECT headcount FROM headcount_by_month ORDER BY year_jalali DESC, month_num DESC LIMIT 1")
            .get() as { headcount: number } | undefined);

  // اگر سال انتخاب شده، سرانه حقوق هم باید همان سال را نشان دهد نه همیشه آخرین ماهِ
  // موجود در کل تاریخچه — وگرنه با انتخاب سال ۱۴۰۳ مثلاً، کارت «تعداد پرسنل» عدد
  // ۱۴۰۳ را نشان می‌دهد ولی کارت «سرانه حقوق» همچنان آخرین ماهِ ۱۴۰۵ را نشان می‌دهد
  // که دو کارت را از دو بازه‌ی زمانی متفاوت می‌کند.
  const latestSalary = (
    year
      ? db.prepare("SELECT * FROM salary_per_capita WHERE year_jalali = ? ORDER BY month_num DESC LIMIT 1").get(year)
      : db.prepare("SELECT * FROM salary_per_capita ORDER BY year_jalali DESC, month_num DESC LIMIT 1").get()
  ) as
    | {
        year_jalali: number;
        month_num: number;
        month_name: string;
        total_salary_cost_rial: number;
        headcount: number;
        salary_per_capita_rial: number;
      }
    | undefined;

  res.json({
    headcount: headcountRow?.headcount ?? 0,
    latestSalaryPerCapita: latestSalary?.salary_per_capita_rial ?? null,
    latestSalaryPeriod: latestSalary ? `${latestSalary.year_jalali}/${latestSalary.month_name}` : null,
  });
});

hrRouter.get("/headcount-trend", (req, res) => {
  const db = hrDb();
  // پیش‌فرض: فقط ماه‌های اخیر (سابقه‌ی کامل ممکن است چند دهه و عمدتاً خالی باشد،
  // مثلاً برای کارمندی با استخدام از سال ۱۳۷۶). با ?months=0 کل تاریخچه برمی‌گردد.
  const monthsParam = req.query.months !== undefined ? Number(req.query.months) : 36;
  const rows = db
    .prepare(
      `SELECT year_jalali, month_num, month_name, headcount FROM headcount_by_month
       ORDER BY year_jalali DESC, month_num DESC
       ${monthsParam > 0 ? "LIMIT ?" : ""}`
    )
    .all(...(monthsParam > 0 ? [monthsParam] : [])) as {
    year_jalali: number;
    month_num: number;
    month_name: string;
    headcount: number;
  }[];
  res.json(rows.reverse());
});

hrRouter.get("/salary-trend", (_req, res) => {
  const db = hrDb();
  const rows = db
    .prepare(
      "SELECT year_jalali, month_num, month_name, salary_per_capita_rial FROM salary_per_capita ORDER BY year_jalali, month_num"
    )
    .all();
  res.json(rows);
});

hrRouter.get("/org-unit-breakdown", (req, res) => {
  const db = hrDb();
  const year = req.query.year ? Number(req.query.year) : null;

  // اگر سال داده نشده، آخرین ماهِ موجود در headcount_by_month به‌عنوان «همین الان» در نظر گرفته می‌شود.
  const asOf = year
    ? { year, month: 12 }
    : (db
        .prepare("SELECT year_jalali AS year, month_num AS month FROM headcount_by_month ORDER BY year_jalali DESC, month_num DESC LIMIT 1")
        .get() as { year: number; month: number } | undefined) ?? { year: 9999, month: 12 };
  const asOfKey = asOf.year * 100 + asOf.month;

  // آخرین رکورد هر کارمند تا تاریخ مبنا — با ROW_NUMBER تضمین می‌شود org_unit دقیقاً از
  // همان ردیفِ آخرین تاریخ خوانده شود. سپس با employee_status، کارمندانی که تا آن تاریخ
  // «پایان خدمت» خورده‌اند حذف می‌شوند (وگرنه تسویه‌شده‌ها هم در ترکیب فعلی شمرده می‌شدند).
  const rows = db
    .prepare(
      `WITH ranked AS (
         SELECT personnel_code, org_unit,
                ROW_NUMBER() OVER (
                  PARTITION BY personnel_code
                  ORDER BY COALESCE(issue_date_jalali, hire_date_jalali) DESC
                ) AS rn
         FROM personnel_records
         WHERE issue_year <= @year OR (issue_year IS NULL AND hire_year <= @year)
       )
       SELECT ranked.org_unit AS org_unit, COUNT(*) AS count
       FROM ranked
       JOIN employee_status es ON es.personnel_code = ranked.personnel_code
       WHERE ranked.rn = 1
         AND (es.termination_year_jalali IS NULL OR (es.termination_year_jalali * 100 + es.termination_month_num) > @asOfKey)
       GROUP BY ranked.org_unit`
    )
    .all({ year: asOf.year, asOfKey }) as { org_unit: string | null; count: number }[];

  res.json(rows.map((r) => ({ orgUnit: r.org_unit ?? "نامشخص", count: r.count })));
});

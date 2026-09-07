import { hrDb } from "../db";

/**
 * وضعیت اشتغال بازاریاب‌ها — چون فایل پاور بی‌آی منبع (شیت Visitor) یک لیست
 * فعال/ترک‌کار جداگانه دارد که ما مستقیماً به آن دسترسی مداوم نداریم، این وضعیت
 * را مستقلاً از روی «لیست پرسنل.xlsx» (که در Data/ داریم) می‌سازیم: هر کارمندی که
 * سمتش «کارمند فروش ( بازاریاب )» است و بر اساس تاریخچه‌ی احکام حکم «پایان خدمت»
 * خورده، «ترک کار» علامت می‌خورد؛ وگرنه «فعال». بازاریاب‌هایی که در این لیست
 * پرسنل پیدا نشوند (چون VIP-routing‌اند یا نام متفاوتی ثبت شده) «نامشخص» می‌مانند.
 */
export type MarketerStatus = "فعال" | "ترک کار" | "نامشخص";

const SALES_REP_POSITION = "کارمند فروش ( بازاریاب )";

let cache: Map<string, MarketerStatus> | null = null;

export function getMarketerStatusMap(): Map<string, MarketerStatus> {
  if (cache) return cache;
  const db = hrDb();
  const rows = db
    .prepare(
      `SELECT DISTINCT pr.employee_name AS name, es.termination_year_jalali AS termYear
       FROM personnel_records pr
       JOIN employee_status es ON es.personnel_code = pr.personnel_code
       WHERE pr.position = @position`
    )
    .all({ position: SALES_REP_POSITION }) as { name: string; termYear: number | null }[];

  const map = new Map<string, MarketerStatus>();
  for (const r of rows) {
    map.set(r.name, r.termYear !== null ? "ترک کار" : "فعال");
  }
  cache = map;
  return map;
}

export function getMarketerStatus(visitorName: string): MarketerStatus {
  return getMarketerStatusMap().get(visitorName) ?? "نامشخص";
}

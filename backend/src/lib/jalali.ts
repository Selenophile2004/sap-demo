import { j2d, toJalaali, jalaaliMonthLength } from "jalaali-js";

/** رشته‌ی شمسی «1405/05/04» را به شماره‌ی روز ژولیَن (برای مقایسه/تفریق) تبدیل می‌کند. */
export function jalaliStrToJdn(dateStr: string): number | null {
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(dateStr.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  return j2d(Number(y), Number(mo), Number(d));
}

export function todayJdn(): number {
  const { jy, jm, jd } = toJalaali(new Date());
  return j2d(jy, jm, jd);
}

export function daysSince(dateStr: string): number | null {
  const jdn = jalaliStrToJdn(dateStr);
  if (jdn === null) return null;
  return todayJdn() - jdn;
}

/**
 * ماه-سال قبلی نسبت به (year, month) را برمی‌گرداند (با عبور صحیح از فروردین به اسفند سال قبل).
 */
export function previousYearMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/**
 * اگر «آخرین تاریخ داده» در وسط یک ماه باشد (نه نزدیک پایانش)، آن ماه هنوز کامل نشده و
 * مقایسه‌ی ماهانه (مثل نرخ حفظ مشتری) با آن گمراه‌کننده است. این تابع «آخرین ماه کامل»
 * را پیدا می‌کند: اگر روزِ آخرین تاریخ حداقل به اندازه‌ی (طول ماه - ۳) رسیده باشد همان ماه
 * را کامل در نظر می‌گیرد، وگرنه یک ماه به عقب برمی‌گردد.
 */
export function lastCompleteMonth(maxDateStr: string): { year: number; month: number } {
  const [yStr, mStr, dStr] = maxDateStr.split("/");
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const monthLength = jalaaliMonthLength(year, month);
  if (day >= monthLength - 3) {
    return { year, month };
  }
  return previousYearMonth(year, month);
}

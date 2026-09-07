/** کمک‌تابع‌های آماری عمومی برای ماژول چشم‌انداز آینده و هشدارها. */

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = average(values);
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** بازده‌ی ماه‌به‌ماه (درصد) از یک سری زمانی؛ طول خروجی یکی کمتر از ورودی است. */
export function momGrowthRates(values: number[]): number[] {
  const rates: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    if (prev !== 0) rates.push((values[i] - prev) / prev);
  }
  return rates;
}

/** رگرسیون خطی ساده (کمترین مربعات) روی نقاط با شاخص ۰..n-1؛ برای برون‌یابی خط روند. */
export function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  const xs = Array.from({ length: n }, (_, i) => i);
  const xMean = average(xs);
  const yMean = average(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function nextYearMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

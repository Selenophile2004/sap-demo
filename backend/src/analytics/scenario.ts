import type { AnalyticsSnapshot } from "./presentation";

export interface ScenarioInputs {
  salesChangePct: number;
  targetCollectionRatePct: number;
  grossMarginPct: number;
}

export interface ScenarioResult {
  generatedAt: string;
  baseline: { sales: number; collectionRatePct: number; unpaidReceivables: number; cashBalance: number };
  inputs: ScenarioInputs;
  projected: { sales: number; collectedCashProxy: number; grossProfitProxy: number; receivablesProxy: number };
  deltas: { sales: number; collectionRatePct: number; receivables: number };
  assumptions: string[];
}

function guard(name: keyof ScenarioInputs, value: number, min: number, max: number): void {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be between ${min} and ${max}`);
  }
}

const round = (value: number) => Math.round(value);

export function runScenario(snapshot: AnalyticsSnapshot, inputs: ScenarioInputs): ScenarioResult {
  guard("salesChangePct", inputs.salesChangePct, -50, 100);
  guard("targetCollectionRatePct", inputs.targetCollectionRatePct, 0, 100);
  guard("grossMarginPct", inputs.grossMarginPct, 0, 100);
  const sales = snapshot.sales.netAmount * (1 + inputs.salesChangePct / 100);
  const collectionRate = inputs.targetCollectionRatePct / 100;
  const receivables = sales * (1 - collectionRate);
  return {
    generatedAt: new Date().toISOString(),
    baseline: {
      sales: snapshot.sales.netAmount,
      collectionRatePct: snapshot.receivables.collectionRatePct,
      unpaidReceivables: snapshot.receivables.unpaidAmount,
      cashBalance: snapshot.finance.cashBalance,
    },
    inputs: { ...inputs },
    projected: {
      sales: round(sales),
      collectedCashProxy: round(sales * collectionRate),
      grossProfitProxy: round(sales * (inputs.grossMarginPct / 100)),
      receivablesProxy: round(receivables),
    },
    deltas: {
      sales: round(sales - snapshot.sales.netAmount),
      collectionRatePct: inputs.targetCollectionRatePct - snapshot.receivables.collectionRatePct,
      receivables: round(receivables - snapshot.receivables.unpaidAmount),
    },
    assumptions: [
      "سناریو فقط شبیه‌سازی است و هیچ داده‌ای را در پایگاه داده تغییر نمی‌دهد.",
      "وصول نقدی، حاصل فروش سناریویی ضرب‌در نرخ وصول هدف است و زمان‌بندی جریان نقد را مدل نمی‌کند.",
      "سود ناخالص، برآورد فروش سناریویی ضرب‌در حاشیه سود فرضی است و جایگزین صورت سود و زیان نیست.",
    ],
  };
}

import { apiClient } from "./client";

export interface ForecastWeights {
  recencyWeight: number;
  categoryWeight: number;
  concentrationWeight: number;
  inflationPct: number;
  horizonMonths: number;
}

export interface ForecastMonthPoint {
  year: number;
  month: number;
  ym: string;
  nominal: number;
}

export interface ForecastProjectedPoint extends ForecastMonthPoint {
  real: number;
  nominalLow: number;
  nominalHigh: number;
}

export interface ForecastOverview {
  meta: {
    lastCompleteYm: string;
    appliedWeights: ForecastWeights;
    macroAssumptions: {
      annualInflationPctUsed: number;
      annualInflationPctDefault: number;
      annualFxDepreciationPctReference: number;
      asOf: string;
      sources: string[];
    };
  };
  sales: {
    history: ForecastMonthPoint[];
    forecast: ForecastProjectedPoint[];
    recentRealGrowthPctMonthly: number;
    longTermRealGrowthPctMonthly: number;
    blendedRealGrowthPctMonthly: number;
  };
  byCenter: { center: string; recentGrowthPct: number | null; lastMonthNominal: number }[];
  byProductGroup: { group: string; recentAmount: number; growthPct: number | null }[];
  concentration: {
    top5SharePct: number;
    top10SharePct: number;
    topCustomers: { code: string; sharePct: number }[];
  };
  receivables: {
    history: { ym: string; unpaid: number; invoiced: number; paid: number }[];
    collectionRateTrendPctPerMonth: number;
  };
  margin: {
    history: { seq: number; label: string; marginPct: number }[];
    trendPctPerMonth: number;
  };
  healthScore: {
    salesMomentum: number;
    receivablesHealth: number;
    marginTrend: number;
    customerConcentration: number;
    overall: number;
  };
}

export const forecastApi = {
  overview: (weights: Partial<ForecastWeights>) =>
    apiClient.get<ForecastOverview>("/forecast/overview", { params: weights }).then((r) => r.data),
};

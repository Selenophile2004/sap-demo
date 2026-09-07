import { apiClient } from "./client";

export interface FinanceKpis {
  period: { year_jalali: number; month_num: number; month_name: string };
  totalAssetsRial: number;
  totalLiabilitiesRial: number;
  totalEquityRial: number;
  debtToAssetPct: number | null;
  companyValueRial: number;
  cashBalanceRial: number;
  roiPct: number;
  budgetRealizationPct: number | null;
  budgetTargetYtdRial: number;
  budgetActualYtdRial: number;
}

export interface FinanceMonthlyRow {
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

export interface OkrKeyResult {
  id: number;
  title: string;
  unit: string;
  targetValue: number;
  actualValue: number;
  progressPct: number;
}

export interface OkrObjective {
  id: number;
  title: string;
  owner: string;
  quarterLabel: string;
  keyResults: OkrKeyResult[];
}

export const financeApi = {
  kpis: () => apiClient.get<FinanceKpis>("/finance/kpis").then((r) => r.data),
  monthly: (months = 12) => apiClient.get<FinanceMonthlyRow[]>("/finance/monthly", { params: { months } }).then((r) => r.data),
  okr: () => apiClient.get<OkrObjective[]>("/finance/okr").then((r) => r.data),
};

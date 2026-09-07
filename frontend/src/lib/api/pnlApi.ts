import { apiClient } from "./client";

export interface PnlFilterParams {
  dateFrom?: string;
  dateTo?: string;
  years?: string[];
  months?: string[];
  activeBasketOnly?: boolean;
}

export interface PnlSummary {
  period: { year_jalali: number; month_num: number; month_name: string };
  netSales: number;
  netSalesGrowthPct: number | null;
  totalExpenses: number;
  netProfit: number;
  netProfitGrowthPct: number | null;
  netProfitMarginPct: number | null;
  cogsToSalesPct: number | null;
}

export interface MonthlyKeyItemRow {
  year_jalali: number;
  month_num: number;
  month_name: string;
  month_seq: number;
  item: string;
  amount_rial: number;
}

export interface ExpenseBreakdownRow {
  item: string;
  amount_rial: number;
}

export interface PnlBreakdownRow {
  center?: string;
  marketer?: string;
  item?: string;
  customer?: string;
  netSales: number;
  profitLoss: number;
  // فقط برای byCenter پر می‌شود (از pnl_center_lines، شیت اختصاصی مراکز فروش)
  grossProfit?: number;
  otherExpense?: number;
  rentExpense?: number;
  salaryTotal?: number;
  headcount?: number;
}

function toParams(f: PnlFilterParams) {
  const params: Record<string, string | string[]> = {};
  if (f.dateFrom) params.dateFrom = f.dateFrom;
  if (f.dateTo) params.dateTo = f.dateTo;
  if (f.years?.length) params.years = f.years;
  if (f.months?.length) params.months = f.months;
  if (f.activeBasketOnly) params.activeBasketOnly = "true";
  return params;
}

export const pnlApi = {
  summary: () => apiClient.get<PnlSummary>("/pnl/summary").then((r) => r.data),
  monthlyKeyItems: (f: PnlFilterParams = {}) =>
    apiClient.get<MonthlyKeyItemRow[]>("/pnl/monthly-key-items", { params: toParams(f) }).then((r) => r.data),
  expenseBreakdown: () => apiClient.get<ExpenseBreakdownRow[]>("/pnl/expense-breakdown").then((r) => r.data),
  byCenter: (f: PnlFilterParams = {}) =>
    apiClient.get<PnlBreakdownRow[]>("/pnl/by-center", { params: toParams(f) }).then((r) => r.data),
  byMarketer: (f: PnlFilterParams = {}) =>
    apiClient.get<PnlBreakdownRow[]>("/pnl/by-marketer", { params: toParams(f) }).then((r) => r.data),
  byItem: (f: PnlFilterParams = {}) =>
    apiClient.get<PnlBreakdownRow[]>("/pnl/by-item", { params: toParams(f) }).then((r) => r.data),
  byCustomer: (f: PnlFilterParams = {}) =>
    apiClient.get<PnlBreakdownRow[]>("/pnl/by-customer", { params: toParams(f) }).then((r) => r.data),
};

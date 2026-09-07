import { apiClient } from "./client";

export interface SalesFilterParams {
  dateFrom?: string;
  dateTo?: string;
  years?: string[];
  months?: string[];
  center?: string[];
  visitor?: string[];
  activeBasketOnly?: boolean;
}

export interface SalesKpis {
  totalNetAmount: number;
  finalizedNetAmount: number;
  pendingNetAmount: number;
  totalNetQtyCount: number;
  totalInvoices: number;
  avgInvoiceAmount: number;
  salesPerVisitor: number;
  customerActive: number;
  customerInactive: number;
  customerInactivePct: number;
  avgDaysSinceLastPurchase: number;
  retentionRatePct: number | null;
}

export interface MonthlyTrendRow {
  ym: string;
  netAmount: number;
  netQty: number;
  invoiceCount: number;
  avgInvoiceAmount: number;
}

export interface ByCenterRow {
  center: string;
  netAmount: number;
  netQty: number;
}

export interface ByProvinceRow {
  province: string;
  netAmount: number;
  netQty: number;
}

export interface TopCustomerRow {
  customer_code: string;
  customer_name: string;
  netAmount: number;
  invoiceCount: number;
}

export interface MarketerScoreRow {
  visitorName: string;
  year: number;
  month: number;
  actualQty: number;
  actualQtyCarton: number;
  actualAmount: number;
  targetQty: number | null;
  achievementPct: number | null;
}

export interface DailyRow {
  date: string;
  netAmount: number;
  netQty: number;
}

export interface CustomerScatterRow {
  customerCode: string;
  customerName: string;
  daysSinceLastPurchase: number;
  netAmount: number;
  invoiceCount: number;
  status: "active" | "inactive";
}

export interface SalesFilterOptions {
  centers: string[];
  visitors: string[];
}

function toParams(f: SalesFilterParams) {
  const params: Record<string, string | string[]> = {};
  if (f.dateFrom) params.dateFrom = f.dateFrom;
  if (f.dateTo) params.dateTo = f.dateTo;
  if (f.years?.length) params.years = f.years;
  if (f.months?.length) params.months = f.months;
  if (f.center?.length) params.center = f.center;
  if (f.visitor?.length) params.visitor = f.visitor;
  if (f.activeBasketOnly) params.activeBasketOnly = "true";
  return params;
}

export const salesApi = {
  kpis: (f: SalesFilterParams) => apiClient.get<SalesKpis>("/sales/kpis", { params: toParams(f) }).then((r) => r.data),
  monthlyTrend: (f: SalesFilterParams) =>
    apiClient.get<MonthlyTrendRow[]>("/sales/monthly-trend", { params: toParams(f) }).then((r) => r.data),
  byCenter: (f: SalesFilterParams) =>
    apiClient.get<ByCenterRow[]>("/sales/by-center", { params: toParams(f) }).then((r) => r.data),
  byProvince: (f: SalesFilterParams) =>
    apiClient.get<ByProvinceRow[]>("/sales/by-province", { params: toParams(f) }).then((r) => r.data),
  topCustomers: (f: SalesFilterParams, limit = 15) =>
    apiClient
      .get<TopCustomerRow[]>("/sales/top-customers", { params: { ...toParams(f), limit } })
      .then((r) => r.data),
  marketerScorecard: (f: SalesFilterParams) =>
    apiClient.get<MarketerScoreRow[]>("/sales/marketer-scorecard", { params: toParams(f) }).then((r) => r.data),
  daily: (f: Pick<SalesFilterParams, "center" | "visitor" | "activeBasketOnly">) =>
    apiClient.get<DailyRow[]>("/sales/daily", { params: toParams(f) }).then((r) => r.data),
  customerScatter: (f: SalesFilterParams) =>
    apiClient
      .get<CustomerScatterRow[]>("/sales/customer-status-scatter", { params: toParams(f) })
      .then((r) => r.data),
  filters: () => apiClient.get<SalesFilterOptions>("/sales/filters").then((r) => r.data),
};

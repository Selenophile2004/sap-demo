import { apiClient } from "./client";

export interface YoySalesRow {
  year: string;
  month: number;
  netAmount: number;
  netQty: number;
}

export interface TopVisitorRow {
  visitorName: string;
  netAmount: number;
  targetQty: number | null;
  achievementPct: number | null;
}

export interface TopVisitorsResponse {
  period: { year: number; month: number; monthLabel: string };
  visitors: TopVisitorRow[];
}

export type NarrativeTone = "positive" | "negative" | "neutral" | "warning";

export interface NarrativeBullet {
  tone: NarrativeTone;
  text: string;
}

export interface FreshnessItem {
  module: string;
  label: string;
  asOfDate: string | null;
  daysStale: number | null;
  stale: boolean;
  text: string;
}

export interface NarrativeResponse {
  sales: { netAmount: number; momGrowthPct: number | null; yoyGrowthPct: number | null; periodLabel: string } | null;
  pnl: { netProfitMarginPct: number | null; netProfitGrowthPct: number | null; periodLabel: string } | null;
  receivables: { collectionRatePct: number | null; totalUnpaid: number };
  retentionRatePct: number | null;
  topCustomerConcentrationPct: number | null;
  bullets: NarrativeBullet[];
  freshness: FreshnessItem[];
}

export interface PnlCoverage {
  minDate: string | null;
  maxDate: string | null;
}

export interface TopProfitableItemRow {
  item_name: string;
  profitLoss: number;
  netSales: number;
}

export interface TopSellingItemRow {
  item_name: string;
  qty: number;
  netSales: number;
}

export interface TopProfitableMarketerRow {
  employee_name: string;
  profitLoss: number;
  netSales: number;
}

export interface TopProfitableCustomerRow {
  customer_name: string;
  profitLoss: number;
  netSales: number;
}

export const homeApi = {
  yoySalesByMonth: () => apiClient.get<YoySalesRow[]>("/home/yoy-sales-by-month").then((r) => r.data),
  topVisitors: (limit = 5) =>
    apiClient.get<TopVisitorsResponse>("/home/top-visitors", { params: { limit } }).then((r) => r.data),
  narrative: () => apiClient.get<NarrativeResponse>("/home/narrative").then((r) => r.data),
  topProfitableItems: (limit = 5) =>
    apiClient
      .get<{ coverage: PnlCoverage; items: TopProfitableItemRow[] }>("/home/top-profitable-items", { params: { limit } })
      .then((r) => r.data),
  topSellingItems: (limit = 10) =>
    apiClient
      .get<{ coverage: PnlCoverage; items: TopSellingItemRow[] }>("/home/top-selling-items", { params: { limit } })
      .then((r) => r.data),
  topProfitableMarketers: (limit = 10) =>
    apiClient
      .get<{ coverage: PnlCoverage; items: TopProfitableMarketerRow[] }>("/home/top-profitable-marketers", { params: { limit } })
      .then((r) => r.data),
  topProfitableCustomers: (limit = 10) =>
    apiClient
      .get<{ coverage: PnlCoverage; items: TopProfitableCustomerRow[] }>("/home/top-profitable-customers", { params: { limit } })
      .then((r) => r.data),
};

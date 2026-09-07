import { apiClient } from "./client";

export type MarketerEmploymentStatus = "فعال" | "ترک کار" | "نامشخص";

export interface MarketerListItem {
  name: string;
  status: MarketerEmploymentStatus;
}

export interface MarketerCustomerRow {
  code: string;
  name: string;
  totalAmount: number;
  lastDate: string;
  invoiceCount: number;
}

export interface MarketerScorecard {
  visitor: string;
  employmentStatus: MarketerEmploymentStatus;
  kpis: {
    customersCount: number;
    targetQtyTotal: number;
    achievedCapped120: number;
    achievementPct: number | null;
    avgLinesPerInvoice: number;
    outstandingReceivables: number;
    receivablesToSalesRatioPct: number | null;
  };
  monthlyTargetVsActual: {
    year: number | null;
    points: {
      month: number;
      target: number;
      fullMonthTarget: number;
      isCurrentMonth: boolean;
      actual: number;
      achievementPct: number | null;
    }[];
  };
  customerTrendByYear: { year: string; points: { month: number; customers: number }[] }[];
  byItem: { item_name: string; qty: number }[];
  invoiceBins: { label: string; count: number }[];
  receivablesByVisitor: { visitor: string; unpaid: number }[];
  customers: MarketerCustomerRow[];
  analysis: string[];
}

export interface MarketerPeriodFilters {
  dateFrom?: string;
  dateTo?: string;
  years?: string[];
  months?: string[];
  activeBasketOnly?: boolean;
}

export const marketerApi = {
  list: () => apiClient.get<MarketerListItem[]>("/marketer/list").then((r) => r.data),
  scorecard: (visitor: string, filters: MarketerPeriodFilters = {}) =>
    apiClient
      .get<MarketerScorecard>("/marketer/scorecard", { params: { visitor, ...filters } })
      .then((r) => r.data),
};

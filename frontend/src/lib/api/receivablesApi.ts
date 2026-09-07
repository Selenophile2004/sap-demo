import { apiClient } from "./client";

export interface ReceivablesFilterParams {
  branch?: string[];
  visitor?: string[];
  dateFrom?: string;
  dateTo?: string;
  years?: string[];
  months?: string[];
}

export interface ReceivablesKpis {
  totalUnpaid: number;
  totalPenalty: number;
  debtorCustomers: number;
  avgDebtAgeDays: number;
  unpaidUnder15: number;
  unpaidOver15: number;
  collectionRatePct: number | null;
}

export interface ByBranchRow {
  branch: string;
  totalUnpaid: number;
  rank: number;
  sharePct: number;
}

export interface BouncedChecksSummary {
  totalCount: number;
  totalAmount: number;
  byVisitor: { visitor: string; count: number; amount: number }[];
  byCustomer: { customer_code: string; customer_name: string; count: number; amount: number }[];
  byBranch: { branch: string; count: number; amount: number }[];
}

export interface RatioToSalesResponse {
  byVisitor: { visitor: string; unpaid: number; sales: number; ratioPct: number | null }[];
  byBranch: { branch: string; unpaid: number; sales: number; ratioPct: number | null }[];
}

export interface AgeBucketRow {
  bucket: string;
  totalUnpaid: number;
}

export interface ByVisitorRow {
  visitor: string;
  totalUnpaid: number;
  totalPenalty: number;
}

export interface TopDebtorRow {
  customer_code: string;
  customer_name: string;
  totalUnpaid: number;
}

export interface ReceivablesFilterOptions {
  branches: string[];
  visitors: string[];
}

function toParams(f: ReceivablesFilterParams) {
  const params: Record<string, string | string[]> = {};
  if (f.branch?.length) params.branch = f.branch;
  if (f.visitor?.length) params.visitor = f.visitor;
  if (f.dateFrom) params.dateFrom = f.dateFrom;
  if (f.dateTo) params.dateTo = f.dateTo;
  if (f.years?.length) params.years = f.years;
  if (f.months?.length) params.months = f.months;
  return params;
}

export const receivablesApi = {
  kpis: (f: ReceivablesFilterParams) =>
    apiClient.get<ReceivablesKpis>("/receivables/kpis", { params: toParams(f) }).then((r) => r.data),
  byBranch: (f: ReceivablesFilterParams) =>
    apiClient.get<ByBranchRow[]>("/receivables/by-branch", { params: toParams(f) }).then((r) => r.data),
  ageBuckets: (f: ReceivablesFilterParams) =>
    apiClient.get<AgeBucketRow[]>("/receivables/age-buckets", { params: toParams(f) }).then((r) => r.data),
  byVisitor: (f: ReceivablesFilterParams) =>
    apiClient.get<ByVisitorRow[]>("/receivables/by-visitor", { params: toParams(f) }).then((r) => r.data),
  topDebtors: (f: ReceivablesFilterParams, limit = 15) =>
    apiClient
      .get<TopDebtorRow[]>("/receivables/top-customers", { params: { ...toParams(f), limit } })
      .then((r) => r.data),
  bouncedChecks: (f: ReceivablesFilterParams) =>
    apiClient.get<BouncedChecksSummary>("/receivables/bounced-checks", { params: toParams(f) }).then((r) => r.data),
  ratioToSales: (f: ReceivablesFilterParams) =>
    apiClient.get<RatioToSalesResponse>("/receivables/ratio-to-sales", { params: toParams(f) }).then((r) => r.data),
  filters: () => apiClient.get<ReceivablesFilterOptions>("/receivables/filters").then((r) => r.data),
};

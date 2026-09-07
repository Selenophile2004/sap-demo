import { apiClient } from "./client";

export interface HrKpis {
  headcount: number;
  latestSalaryPerCapita: number | null;
  latestSalaryPeriod: string | null;
}

export interface HeadcountTrendRow {
  year_jalali: number;
  month_num: number;
  month_name: string;
  headcount: number;
}

export interface SalaryTrendRow {
  year_jalali: number;
  month_num: number;
  month_name: string;
  salary_per_capita_rial: number;
}

export interface OrgUnitRow {
  orgUnit: string;
  count: number;
}

export const hrApi = {
  kpis: (year?: number, month?: number) =>
    apiClient
      .get<HrKpis>("/hr/kpis", { params: { ...(year ? { year } : {}), ...(month ? { month } : {}) } })
      .then((r) => r.data),
  headcountTrend: (months?: number) =>
    apiClient
      .get<HeadcountTrendRow[]>("/hr/headcount-trend", { params: months !== undefined ? { months } : {} })
      .then((r) => r.data),
  salaryTrend: () => apiClient.get<SalaryTrendRow[]>("/hr/salary-trend").then((r) => r.data),
  orgUnitBreakdown: (year?: number) =>
    apiClient.get<OrgUnitRow[]>("/hr/org-unit-breakdown", { params: year ? { year } : {} }).then((r) => r.data),
};

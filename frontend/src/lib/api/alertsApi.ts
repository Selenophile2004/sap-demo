import { apiClient } from "./client";

export type AlertSeverity = "critical" | "warning" | "notice";
export type AlertCategory = "receivables" | "sales" | "customers" | "margin" | "hr" | "concentration" | "data";

export interface AlertItem {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  metricValue: number;
  metricLabel: string;
  relatedEntity?: string;
}

export interface AlertsResponse {
  generatedAt: string;
  alerts: AlertItem[];
  summary: { critical: number; warning: number; notice: number };
}

export interface AlertDetail {
  invoices: { invoice_no: string; invoice_date_jalali: string; item_name: string; net_amount: number; sales_center: string }[];
  monthlyTrend: { ym: string; amount: number }[];
  receivableRows: {
    invoice_no: string;
    invoice_date_jalali: string;
    invoice_net_amount: number;
    amount_paid: number;
    amount_unpaid: number;
    invoice_kind: string;
  }[];
}

export const alertsApi = {
  list: () => apiClient.get<AlertsResponse>("/alerts").then((r) => r.data),
  detail: (category: string, entity: string) =>
    apiClient.get<AlertDetail>("/alerts/detail", { params: { category, entity } }).then((r) => r.data),
};

import { apiClient } from "./client";

export type DataHealthStatus = "healthy" | "warning" | "critical";

export interface DataHealthCheck {
  id: "completeness" | "uniqueness" | "validity" | "freshness";
  label: string;
  score: number;
  status: DataHealthStatus;
  affectedRows: number;
  affectedRatePct: number;
  detail: string;
}

export interface DatasetHealth {
  id: string;
  label: string;
  source: string;
  rowCount: number;
  latestPeriod: string | null;
  updatedAt: string;
  freshnessHours: number;
  expectedFreshnessHours?: number;
  score: number;
  status: DataHealthStatus;
  checks: DataHealthCheck[];
}

export interface DataHealthReport {
  generatedAt: string;
  score: number;
  status: DataHealthStatus;
  totalRows: number;
  staleDatasetCount: number;
  datasets: DatasetHealth[];
}

export const dataHealthApi = {
  get: () => apiClient.get<DataHealthReport>("/data-health").then((response) => response.data),
};

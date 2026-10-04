import { apiClient } from "./client";

export interface DatasetDescriptor {
  id: "sales" | "inventory" | "finance";
  title: string;
  description: string;
  targetTable: string;
  acceptedFormats: string[];
  requiredColumns: { key: string; label: string }[];
}

export interface ImportValidationError {
  row: number;
  field: string;
  code: "required" | "invalid" | "duplicate";
  message: string;
}

export interface ImportJob {
  id: string;
  datasetId: DatasetDescriptor["id"];
  fileName: string;
  status: "ready" | "rejected" | "published" | "rolled_back";
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorCount: number;
  errors: ImportValidationError[];
  previewRows: Record<string, unknown>[];
  actor: string;
  createdAt: string;
  publishedAt: string | null;
  rolledBackAt: string | null;
}

export interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details_json: string | null;
  ip_address: string | null;
  created_at: string;
}

export const dataManagementApi = {
  datasets: () => apiClient.get<DatasetDescriptor[]>("/data-management/datasets").then((response) => response.data),
  imports: () => apiClient.get<ImportJob[]>("/data-management/imports").then((response) => response.data),
  preview: (payload: { datasetId: DatasetDescriptor["id"]; fileName: string; content?: string; contentBase64?: string }) =>
    apiClient.post<ImportJob>("/data-management/imports/preview", payload).then((response) => response.data),
  publish: (id: string) => apiClient.post<ImportJob>(`/data-management/imports/${id}/publish`).then((response) => response.data),
  rollback: (id: string) => apiClient.post<ImportJob>(`/data-management/imports/${id}/rollback`).then((response) => response.data),
  template: (datasetId: DatasetDescriptor["id"]) =>
    apiClient.get(`/data-management/datasets/${datasetId}/template`, { responseType: "blob" }).then((response) => response.data as Blob),
  audit: () => apiClient.get<AuditEntry[]>("/audit", { params: { limit: 30 } }).then((response) => response.data),
};

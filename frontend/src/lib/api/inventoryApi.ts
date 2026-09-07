import { apiClient } from "./client";

export interface InventoryItem {
  itemCode: string;
  itemName: string;
  sellableQty: number;
  sellableCartons: number | null;
  avgDailySales: number;
  dio: number | null;
  status: string;
  estimatedValue: number;
}

export interface InventorySummary {
  totalSkus: number;
  totalEstimatedValue: number;
  byStatus: { status: string; count: number; estimatedValue: number }[];
  byWarehouse: { warehouse_name: string; itemCount: number; totalQty: number }[];
  stagnant: InventoryItem[];
  urgentRecharge: InventoryItem[];
}

export const inventoryApi = {
  summary: () => apiClient.get<InventorySummary>("/inventory/summary").then((r) => r.data),
  items: (search?: string) =>
    apiClient.get<InventoryItem[]>("/inventory/items", { params: search ? { search } : {} }).then((r) => r.data),
};

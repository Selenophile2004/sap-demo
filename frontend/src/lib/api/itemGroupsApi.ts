import { apiClient } from "./client";

export interface ItemGroupSummary {
  name: string;
  color: string;
  itemCount: number;
  totalAmount: number;
  totalQty: number;
}

export interface GroupsSummaryResponse {
  groups: ItemGroupSummary[];
  unassigned: ItemGroupSummary;
  totalItems: number;
  categorizedPct: number;
}

export interface ItemRow {
  itemCode: string;
  itemName: string;
  totalAmount: number;
  totalQty: number;
  suggestedGroup: string | null;
  assignedGroup: string | null;
  resolvedGroup: string;
}

export interface GroupDistributionRow {
  group: string;
  amount: number;
}

export const itemGroupsApi = {
  summary: () => apiClient.get<GroupsSummaryResponse>("/item-groups/summary").then((r) => r.data),
  items: (search?: string, group?: string, limit = 500) =>
    apiClient
      .get<ItemRow[]>("/item-groups/items", { params: { search, group, limit } })
      .then((r) => r.data),
  assign: (itemCode: string, group: string) =>
    apiClient.post("/item-groups/assign", { itemCode, group }).then((r) => r.data),
  createGroup: (name: string, color: string) =>
    apiClient.post("/item-groups/groups", { name, color }).then((r) => r.data),
  deleteGroup: (name: string) => apiClient.delete(`/item-groups/groups/${encodeURIComponent(name)}`).then((r) => r.data),
  distribution: () => apiClient.get<GroupDistributionRow[]>("/item-groups/distribution").then((r) => r.data),
};

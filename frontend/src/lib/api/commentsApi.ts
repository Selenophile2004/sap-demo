import { apiClient } from "./client";

export interface CommentRow {
  id: number;
  target_type: string;
  target_id: string;
  target_label: string | null;
  author: string;
  text: string;
  created_at: string;
}

export const commentsApi = {
  list: (targetType: string, targetId: string) =>
    apiClient.get<CommentRow[]>("/comments", { params: { targetType, targetId } }).then((r) => r.data),
  create: (targetType: string, targetId: string, text: string, targetLabel?: string) =>
    apiClient.post<CommentRow>("/comments", { targetType, targetId, targetLabel, text }).then((r) => r.data),
  remove: (id: number) => apiClient.delete(`/comments/${id}`),
};

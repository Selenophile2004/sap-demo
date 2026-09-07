import { apiClient } from "./client";

export interface AssistantHistoryTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AssistantChatResponse {
  reply: string;
  /** اگر مدل تشخیص دهد کاربر می‌خواهد به بخش مشخصی از برنامه برود، مسیر آن را برمی‌گرداند. */
  navigateTo?: string;
}

export const assistantApi = {
  chat: (message: string, history: AssistantHistoryTurn[]) =>
    apiClient
      .post<AssistantChatResponse>("/assistant/chat", { message, history })
      .then((r) => r.data),
};

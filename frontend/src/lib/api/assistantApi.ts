import { apiClient } from "./client";

export interface AssistantHistoryTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AssistantChatResponse {
  reply: string;
}

export const assistantApi = {
  chat: (message: string, history: AssistantHistoryTurn[]) =>
    apiClient
      .post<AssistantChatResponse>("/assistant/chat", { message, history })
      .then((r) => r.data),
};

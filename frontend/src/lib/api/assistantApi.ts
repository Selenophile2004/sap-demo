import { apiClient } from "./client";

export interface AssistantHistoryTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AssistantChatResponse {
  reply: string;
}

export interface OverviewKpi {
  label: string;
  value: string;
  trendPct: number | null;
  trendLabel: string | null;
}

export interface OverviewComparisonSide {
  label: string;
  value: string;
}

export interface OverviewComparison {
  label: string;
  a: OverviewComparisonSide;
  b: OverviewComparisonSide;
  insight: string;
}

export interface OverviewData {
  summary: string;
  kpis: OverviewKpi[];
  comparisons: OverviewComparison[];
  highlights: string[];
}

// بک‌اند یا شیء کامل OverviewData را برمی‌گرداند، یا در صورت هر خطایی (کلید Groq
// نبود، JSON بدشکل، خطای شبکه) یک شیء { error } — هرگز پرتاب/۵xx خام برای این
// مسیر نداریم (رجوع کنید به generateOverview در routes/assistant.ts بک‌اند).
export type OverviewResponse = OverviewData | { error: string };

export const assistantApi = {
  // hasImage: true فقط یک فلگ است، نه بایت‌های واقعی تصویر — مدل فعلی (Groq،
  // openai/gpt-oss-120b) قابلیت دیدن تصویر ندارد، پس بک‌اند اصلاً محتوایی از تصویر
  // نمی‌خواهد؛ فقط باید بداند یک تصویر پیوست شده تا صادقانه پاسخ بدهد که نمی‌تواند
  // آن را ببیند (رجوع کنید به IMAGE_UNAVAILABLE_REPLY در routes/assistant.ts).
  chat: (message: string, history: AssistantHistoryTurn[], hasImage = false) =>
    apiClient
      .post<AssistantChatResponse>("/assistant/chat", { message, history, hasImage })
      .then((r) => r.data),
  overview: () => apiClient.get<OverviewResponse>("/assistant/overview").then((r) => r.data),
};

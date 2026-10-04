import { apiClient } from "./client";
import type { AnalyticsPresentation } from "../../types/analytics";

export interface AssistantHistoryTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AssistantChatResponse {
  reply: string;
  presentation?: AnalyticsPresentation;
}

export interface AssistantStatus {
  languageModelAvailable: boolean;
  deterministicAnalyticsAvailable: boolean;
  mode: "hybrid" | "local";
  provider: "groq" | "openai-compatible";
  model: string | null;
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

// بک‌اند یا شیء کامل OverviewData را برمی‌گرداند، یا در صورت هر خطایی (نبود کلید
// Provider، JSON بدشکل یا خطای شبکه) یک شیء { error } — هرگز پرتاب/۵xx خام برای این
// مسیر نداریم (رجوع کنید به generateOverview در routes/assistant.ts بک‌اند).
export type OverviewResponse = OverviewData | { error: string };

export const assistantApi = {
  // hasImage: true فقط یک فلگ است، نه بایت‌های واقعی تصویر — قرارداد فعلی Provider
  // فقط متنی است، پس بک‌اند محتوای تصویر را دریافت نمی‌کند؛ فقط باید بداند تصویری
  // پیوست شده تا صادقانه پاسخ بدهد که نمی‌تواند
  // آن را ببیند (رجوع کنید به IMAGE_UNAVAILABLE_REPLY در routes/assistant.ts).
  chat: (message: string, history: AssistantHistoryTurn[], hasImage = false) =>
    apiClient
      .post<AssistantChatResponse>("/assistant/chat", { message, history, hasImage })
      .then((r) => r.data),
  overview: () => apiClient.get<OverviewResponse>("/assistant/overview").then((r) => r.data),
  presentation: (message: string) => apiClient.post<AnalyticsPresentation>("/assistant/presentation", { message }).then((r) => r.data),
  status: () => apiClient.get<AssistantStatus>("/assistant/status").then((r) => r.data),
};

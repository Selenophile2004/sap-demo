export interface KpiWidget {
  type: "kpi";
  metricId: string;
  title: string;
  value: number;
  unit: "rial" | "percent" | "count";
  trendPct?: number | null;
  trendLabel?: string;
}

export interface ChartWidget {
  type: "chart";
  chartType: "line" | "bar" | "donut";
  title: string;
  labels: string[];
  series: { name: string; values: number[]; unit: "rial" | "percent" | "count" }[];
}

export interface InsightWidget {
  type: "insight";
  title: string;
  text: string;
  tone: "positive" | "warning" | "neutral";
}

export type AnalyticsWidget = KpiWidget | ChartWidget | InsightWidget;

export interface AnalyticsPresentation {
  id: string;
  topic: "overview" | "sales" | "receivables" | "finance" | "hr" | "inventory";
  title: string;
  summary: string;
  generatedAt: string;
  sourceLabel: string;
  widgets: AnalyticsWidget[];
}

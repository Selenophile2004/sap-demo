import { getMetricDefinition } from "./metricCatalog";

export type AnalysisTopic = "overview" | "sales" | "receivables" | "finance" | "hr" | "inventory";

export interface AnalyticsSnapshot {
  generatedAt: string;
  sales: {
    netAmount: number;
    invoiceCount: number;
    previousNetAmount: number;
    monthly: { label: string; value: number }[];
  };
  receivables: { unpaidAmount: number; collectionRatePct: number };
  finance: { cashBalance: number; roiPct: number; budgetAchievementPct: number };
  hr: { headcount: number; monthly: { label: string; value: number }[] };
  inventory: { sellableQty: number; reservedQty: number };
}

export interface AnalysisIntent {
  topic: AnalysisTopic;
  wantsChart: boolean;
  wantsKpi: boolean;
}

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
  series: { metricId: string; name: string; values: number[]; unit: "rial" | "percent" | "count" }[];
}

export interface InsightWidget {
  type: "insight";
  title: string;
  text: string;
  tone: "positive" | "warning" | "neutral";
}

export type AnalyticsWidget = KpiWidget | ChartWidget | InsightWidget;

export interface ExplainabilityEvidence {
  metricId: string;
  label: string;
  definition: string;
  formula: string;
  source: string;
  asOf: string;
}

export interface AnalyticsPresentation {
  id: string;
  topic: AnalysisTopic;
  title: string;
  summary: string;
  generatedAt: string;
  sourceLabel: string;
  widgets: AnalyticsWidget[];
  explainability: {
    method: "deterministic-metrics";
    evidence: ExplainabilityEvidence[];
    caveats: string[];
  };
}

function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

export function detectAnalysisIntent(message: string): AnalysisIntent {
  const text = message.trim().toLowerCase();
  let topic: AnalysisTopic = "overview";
  if (containsAny(text, ["فروش", "فاکتور", "مشتری"])) topic = "sales";
  else if (containsAny(text, ["مطالبات", "وصول", "بدهی", "سررسید"])) topic = "receivables";
  else if (containsAny(text, ["نقدینگی", "بودجه", "مالی", "سرمایه", "roi"])) topic = "finance";
  else if (containsAny(text, ["پرسنل", "کارمند", "منابع انسانی", "سرانه"])) topic = "hr";
  else if (containsAny(text, ["انبار", "موجودی", "کالا", "رزرو"])) topic = "inventory";
  return {
    topic,
    wantsChart: containsAny(text, ["نمودار", "روند", "مقایسه", "نمایش"]),
    wantsKpi: containsAny(text, ["kpi", "شاخص", "کارت", "وضعیت", "چقدر", "میزان"]) || topic === "overview",
  };
}

function pctChange(current: number, previous: number): number | null {
  return previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100;
}

function overviewWidgets(snapshot: AnalyticsSnapshot): AnalyticsWidget[] {
  return [
    {
      type: "kpi",
      metricId: "sales.net_amount",
      title: "فروش خالص",
      value: snapshot.sales.netAmount,
      unit: "rial",
      trendPct: pctChange(snapshot.sales.netAmount, snapshot.sales.previousNetAmount),
      trendLabel: "نسبت به دوره قبل",
    },
    { type: "kpi", metricId: "receivables.unpaid_amount", title: "مطالبات باز", value: snapshot.receivables.unpaidAmount, unit: "rial" },
    { type: "kpi", metricId: "finance.cash_balance", title: "مانده نقد", value: snapshot.finance.cashBalance, unit: "rial" },
    { type: "kpi", metricId: "finance.roi", title: "بازده سرمایه", value: snapshot.finance.roiPct, unit: "percent" },
  ];
}

export function buildPresentation(message: string, snapshot: AnalyticsSnapshot): AnalyticsPresentation {
  const intent = detectAnalysisIntent(message);
  let title = "نبض مدیریتی سازمان";
  let summary = "تصویری یکپارچه از مهم‌ترین شاخص‌های عملیاتی و مالی بر پایه آخرین داده منتشرشده.";
  let widgets = overviewWidgets(snapshot);

  if (intent.topic === "sales") {
    title = "تحلیل پویا فروش";
    const growth = pctChange(snapshot.sales.netAmount, snapshot.sales.previousNetAmount);
    summary = growth === null
      ? "فروش جاری و روند ماهانه بر پایه داده قطعی فاکتورها نمایش داده شده است."
      : `فروش جاری نسبت به دوره قبل ${Math.abs(growth).toFixed(1)} درصد ${growth >= 0 ? "رشد" : "کاهش"} داشته است.`;
    widgets = [
      { type: "kpi", metricId: "sales.net_amount", title: "فروش خالص", value: snapshot.sales.netAmount, unit: "rial", trendPct: growth, trendLabel: "نسبت به دوره قبل" },
      { type: "kpi", metricId: "sales.invoice_count", title: "تعداد فاکتور", value: snapshot.sales.invoiceCount, unit: "count" },
      {
        type: "chart",
        chartType: "line",
        title: "روند ماهانه فروش",
        labels: snapshot.sales.monthly.map((point) => point.label),
        series: [{ metricId: "sales.net_amount", name: "فروش خالص", values: snapshot.sales.monthly.map((point) => point.value), unit: "rial" }],
      },
    ];
  } else if (intent.topic === "receivables") {
    title = "سلامت وصول مطالبات";
    summary = "مانده باز و نرخ وصول، بدون محاسبه مدل زبانی و مستقیماً از داده حساب‌ها استخراج شده‌اند.";
    widgets = [
      { type: "kpi", metricId: "receivables.unpaid_amount", title: "مطالبات باز", value: snapshot.receivables.unpaidAmount, unit: "rial" },
      { type: "kpi", metricId: "receivables.collection_rate", title: "نرخ وصول", value: snapshot.receivables.collectionRatePct, unit: "percent" },
      { type: "insight", title: "برداشت مدیریتی", text: snapshot.receivables.collectionRatePct >= 80 ? "نرخ وصول در محدوده مناسب قرار دارد." : "نرخ وصول نیازمند پیگیری مشتریان با مانده و سن بدهی بالاتر است.", tone: snapshot.receivables.collectionRatePct >= 80 ? "positive" : "warning" },
    ];
  } else if (intent.topic === "finance") {
    title = "نمای مالی و بودجه";
    summary = "نقدینگی، بازده سرمایه و تحقق بودجه بر پایه آخرین دوره مالی منتشرشده.";
    widgets = [
      { type: "kpi", metricId: "finance.cash_balance", title: "مانده نقد", value: snapshot.finance.cashBalance, unit: "rial" },
      { type: "kpi", metricId: "finance.roi", title: "بازده سرمایه", value: snapshot.finance.roiPct, unit: "percent" },
      { type: "kpi", metricId: "finance.budget_achievement", title: "تحقق بودجه", value: snapshot.finance.budgetAchievementPct, unit: "percent" },
    ];
  } else if (intent.topic === "hr") {
    title = "سرمایه انسانی";
    summary = "تعداد نیروی فعال و روند تغییر ظرفیت سازمان بر پایه داده منابع انسانی.";
    widgets = [
      { type: "kpi", metricId: "hr.headcount", title: "تعداد کارکنان", value: snapshot.hr.headcount, unit: "count" },
      { type: "chart", chartType: "line", title: "روند تعداد کارکنان", labels: snapshot.hr.monthly.map((point) => point.label), series: [{ metricId: "hr.headcount", name: "تعداد کارکنان", values: snapshot.hr.monthly.map((point) => point.value), unit: "count" }] },
    ];
  } else if (intent.topic === "inventory") {
    title = "وضعیت موجودی قابل فروش";
    summary = "موجودی قابل فروش و رزروشده به‌صورت قطعی از آخرین عکس انبار محاسبه شده‌اند.";
    widgets = [
      { type: "kpi", metricId: "inventory.sellable_qty", title: "موجودی قابل فروش", value: snapshot.inventory.sellableQty, unit: "count" },
      { type: "kpi", metricId: "inventory.reserved_qty", title: "موجودی رزروشده", value: snapshot.inventory.reservedQty, unit: "count" },
      { type: "chart", chartType: "donut", title: "ترکیب موجودی", labels: ["قابل فروش", "رزروشده"], series: [{ metricId: "inventory.sellable_qty", name: "موجودی", values: [snapshot.inventory.sellableQty, snapshot.inventory.reservedQty], unit: "count" }] },
    ];
  }

  const metricIds = [...new Set(widgets.flatMap((widget) => {
    if (widget.type === "kpi") return [widget.metricId];
    if (widget.type === "chart") return widget.series.map((series) => series.metricId);
    return [];
  }))];
  const evidence = metricIds.flatMap((metricId) => {
    const metric = getMetricDefinition(metricId);
    return metric ? [{
      metricId: metric.id,
      label: metric.label,
      definition: metric.description,
      formula: metric.formula,
      source: metric.source,
      asOf: snapshot.generatedAt,
    }] : [];
  });

  return {
    id: `analysis-${Date.now()}`,
    topic: intent.topic,
    title,
    summary,
    generatedAt: snapshot.generatedAt,
    sourceLabel: "داده تأییدشده داشبورد",
    widgets,
    explainability: {
      method: "deterministic-metrics",
      evidence,
      caveats: [
        "اعداد و نمودارها با قواعد قطعی از داده محاسبه می‌شوند؛ مدل زبانی اجازه ساخت یا تغییر عدد را ندارد.",
        "تفسیر متنی پیشنهاد مدیریتی است و باید همراه منبع، فرمول و زمان داده خوانده شود.",
      ],
    },
  };
}

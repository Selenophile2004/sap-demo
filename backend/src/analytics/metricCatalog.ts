export interface MetricDefinition {
  id: string;
  label: string;
  domain: "sales" | "receivables" | "finance" | "hr" | "inventory";
  unit: "rial" | "percent" | "count";
  aggregation: "sum" | "count_distinct" | "ratio" | "latest";
  allowedDimensions: readonly string[];
  official: boolean;
  description: string;
}

const METRICS: MetricDefinition[] = [
  { id: "sales.net_amount", label: "فروش خالص", domain: "sales", unit: "rial", aggregation: "sum", allowedDimensions: ["month", "sales_center", "province"], official: true, description: "جمع مبلغ خالص ردیف‌های فروش نهایی" },
  { id: "sales.invoice_count", label: "تعداد فاکتور", domain: "sales", unit: "count", aggregation: "count_distinct", allowedDimensions: ["month", "sales_center"], official: true, description: "تعداد یکتای شماره فاکتور" },
  { id: "receivables.unpaid_amount", label: "مطالبات باز", domain: "receivables", unit: "rial", aggregation: "sum", allowedDimensions: ["branch", "customer", "aging_bucket"], official: true, description: "جمع مبلغ پرداخت‌نشده فاکتورها" },
  { id: "receivables.collection_rate", label: "نرخ وصول", domain: "receivables", unit: "percent", aggregation: "ratio", allowedDimensions: ["branch", "month"], official: true, description: "مبلغ وصول‌شده تقسیم بر مبلغ فاکتورشده" },
  { id: "finance.cash_balance", label: "مانده نقد", domain: "finance", unit: "rial", aggregation: "latest", allowedDimensions: ["month"], official: true, description: "مانده نقد ثبت‌شده در آخرین دوره" },
  { id: "finance.roi", label: "بازده سرمایه", domain: "finance", unit: "percent", aggregation: "latest", allowedDimensions: ["month"], official: true, description: "نرخ بازگشت سرمایه دوره" },
  { id: "finance.budget_achievement", label: "تحقق بودجه", domain: "finance", unit: "percent", aggregation: "ratio", allowedDimensions: ["month"], official: true, description: "عملکرد واقعی تقسیم بر هدف بودجه" },
  { id: "hr.headcount", label: "تعداد کارکنان", domain: "hr", unit: "count", aggregation: "latest", allowedDimensions: ["month"], official: true, description: "تعداد نیروی فعال در آخرین دوره" },
  { id: "inventory.sellable_qty", label: "موجودی قابل فروش", domain: "inventory", unit: "count", aggregation: "sum", allowedDimensions: ["warehouse", "item"], official: true, description: "موجودی پس از کسر رزرو" },
  { id: "inventory.reserved_qty", label: "موجودی رزروشده", domain: "inventory", unit: "count", aggregation: "sum", allowedDimensions: ["warehouse", "item"], official: true, description: "جمع تعداد رزروشده" },
];

export const METRIC_CATALOG: readonly MetricDefinition[] = Object.freeze(
  METRICS.map((metric) => Object.freeze({ ...metric, allowedDimensions: Object.freeze([...metric.allowedDimensions]) }))
);

export function getMetricDefinition(id: string): MetricDefinition | null {
  return METRIC_CATALOG.find((metric) => metric.id === id) ?? null;
}

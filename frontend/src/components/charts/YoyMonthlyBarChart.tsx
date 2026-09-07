import ReactECharts from "echarts-for-react";
import { chartPalette, useEchartsTheme } from "./echartsTheme";
import { formatCompactRial, formatInt } from "../../lib/format";
import type { YoySalesRow } from "../../lib/api/homeApi";

const MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export type YoyMetric = "amount" | "qty";

interface Props {
  data: YoySalesRow[];
  metric?: YoyMetric;
}

export default function YoyMonthlyBarChart({ data, metric = "amount" }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const valueFormatter = metric === "amount" ? formatCompactRial : (v: number) => `${formatInt(v)} عدد`;
  const field = metric === "amount" ? "netAmount" : "netQty";

  const years = Array.from(new Set(data.map((r) => r.year))).sort();
  const byYearMonth = new Map<string, number>();
  for (const r of data) byYearMonth.set(`${r.year}|${r.month}`, r[field]);

  const series = years.map((year, i) => ({
    name: year,
    type: "bar",
    barMaxWidth: 16,
    itemStyle: { color: chartPalette[i % chartPalette.length], borderRadius: [4, 4, 0, 0] },
    data: Array.from({ length: 12 }, (_, m) => byYearMonth.get(`${year}|${m + 1}`) ?? null),
  }));

  const option = {
    textStyle: baseTextStyle,
    grid: { top: 40, right: 20, bottom: 30, left: 70 },
    legend: {
      top: 0,
      textStyle: { ...baseTextStyle, fontSize: 12 },
      itemWidth: 14,
      itemHeight: 10,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      ...tooltipCommon,
      valueFormatter: (v: number | null) => (v === null ? "بدون داده" : valueFormatter(v)),
    },
    xAxis: {
      type: "category",
      data: MONTH_NAMES,
      ...axisCommon,
    },
    yAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => valueFormatter(v) },
    },
    series,
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

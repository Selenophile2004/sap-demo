import ReactECharts from "echarts-for-react";
import { brand } from "../../app/theme/palette";
import { useEchartsTheme } from "./echartsTheme";
import { formatCompactRial } from "../../lib/format";
import type { FinanceMonthlyRow } from "../../lib/api/financeApi";

interface Props {
  data: FinanceMonthlyRow[];
}

// نمودار مقایسه‌ی هدف بودجه در مقابل تحقق واقعی به تفکیک ماه — از الگوی مشترک
// نمودارهای این پروژه (grid/tooltip/axisCommon از echartsTheme) پیروی می‌کند،
// دقیقاً مثل YoyMonthlyBarChart برای دو سری هم‌گروه.
export default function BudgetVsActualChart({ data }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const labels = data.map((d) => `${d.month_name} ${d.year_jalali}`);

  const option = {
    textStyle: baseTextStyle,
    grid: { top: 40, right: 16, bottom: 30, left: 70 },
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
      valueFormatter: (v: number) => formatCompactRial(v),
    },
    xAxis: { type: "category", data: labels, ...axisCommon },
    yAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => formatCompactRial(v) },
    },
    series: [
      {
        name: "هدف بودجه",
        type: "bar",
        barMaxWidth: 16,
        itemStyle: { color: "rgba(148,163,184,0.55)", borderRadius: [4, 4, 0, 0] },
        data: data.map((d) => d.budget_target_rial),
      },
      {
        name: "تحقق واقعی",
        type: "bar",
        barMaxWidth: 16,
        itemStyle: { color: brand.primary, borderRadius: [4, 4, 0, 0] },
        data: data.map((d) => d.budget_actual_rial),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

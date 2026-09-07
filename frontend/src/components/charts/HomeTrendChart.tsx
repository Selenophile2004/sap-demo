import ReactECharts from "echarts-for-react";
import type { MonthlyKeyItemRow } from "../../lib/api/pnlApi";
import { brand } from "../../app/theme/palette";
import { useEchartsTheme } from "./echartsTheme";
import { formatCompactRial } from "../../lib/format";

interface Props {
  data: MonthlyKeyItemRow[];
}

const SALES_ITEM = "فروش خالص";
const PROFIT_ITEM = "سود و (زیان ) خالص";

export default function HomeTrendChart({ data }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const months = Array.from(new Set(data.map((d) => d.month_seq))).sort((a, b) => a - b);
  const labels = months.map((seq) => data.find((d) => d.month_seq === seq)?.month_name ?? "");
  const byItem = (item: string) =>
    months.map((seq) => data.find((d) => d.month_seq === seq && d.item === item)?.amount_rial ?? 0);

  const option = {
    textStyle: baseTextStyle,
    grid: { top: 44, right: 20, bottom: 30, left: 65 },
    legend: { top: 0, textStyle: { color: baseTextStyle.color, fontFamily: "Vazirmatn" } },
    tooltip: { trigger: "axis", ...tooltipCommon, valueFormatter: (v: number) => formatCompactRial(v) },
    xAxis: { type: "category", data: labels, ...axisCommon },
    yAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => formatCompactRial(v) },
    },
    series: [
      {
        name: "فروش خالص",
        type: "line",
        data: byItem(SALES_ITEM),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: brand.primary, width: 3 },
        itemStyle: { color: brand.primary },
        areaStyle: { color: "rgba(234,34,40,0.10)" },
      },
      {
        name: "سود و (زیان) خالص",
        type: "line",
        data: byItem(PROFIT_ITEM),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: "#4ADE80", width: 3 },
        itemStyle: { color: "#4ADE80" },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

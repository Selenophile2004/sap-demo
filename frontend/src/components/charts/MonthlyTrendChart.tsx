import ReactECharts from "echarts-for-react";
import type { MonthlyTrendRow } from "../../lib/api/salesApi";
import { brand } from "../../app/theme/palette";
import { useEchartsTheme } from "./echartsTheme";
import { formatCompactRial, formatInt } from "../../lib/format";

interface Props {
  data: MonthlyTrendRow[];
  valueMode: "rial" | "quantity";
}

export default function MonthlyTrendChart({ data, valueMode }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const values = data.map((d) => (valueMode === "rial" ? d.netAmount : d.netQty));

  const option = {
    textStyle: baseTextStyle,
    grid: { top: 20, right: 20, bottom: 30, left: 60 },
    tooltip: {
      trigger: "axis",
      ...tooltipCommon,
      valueFormatter: (v: number) => (valueMode === "rial" ? formatCompactRial(v) : formatInt(v)),
    },
    xAxis: {
      type: "category",
      data: data.map((d) => d.ym),
      ...axisCommon,
    },
    yAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: {
        ...axisCommon.axisLabel,
        formatter: (v: number) => (valueMode === "rial" ? formatCompactRial(v) : formatInt(v)),
      },
    },
    series: [
      {
        type: "line",
        data: values,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: brand.primary, width: 3 },
        itemStyle: { color: brand.primary },
        areaStyle: { color: "rgba(121,0,221,0.12)" },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

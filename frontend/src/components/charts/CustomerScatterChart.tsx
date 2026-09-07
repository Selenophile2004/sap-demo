import ReactECharts from "echarts-for-react";
import type { CustomerScatterRow } from "../../lib/api/salesApi";
import { useEchartsTheme } from "./echartsTheme";
import { formatCompactRial, formatInt } from "../../lib/format";

interface Props {
  data: CustomerScatterRow[];
}

const STATUS_COLOR: Record<string, string> = {
  active: "#4ADE80",
  inactive: "#EA2228",
};

const STATUS_LABEL: Record<string, string> = {
  active: "فعال",
  inactive: "غیرفعال",
};

export default function CustomerScatterChart({ data }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon, pointBorder, pointBorderEmphasis } = useEchartsTheme();
  const series = ["active", "inactive"].map((status) => ({
    name: STATUS_LABEL[status],
    type: "scatter",
    symbolSize: (val: number[]) => Math.min(Math.max(Math.sqrt(val[2]) / 2200, 12), 56),
    itemStyle: {
      color: STATUS_COLOR[status],
      opacity: 0.82,
      borderColor: pointBorder,
      borderWidth: 1,
    },
    emphasis: {
      itemStyle: { opacity: 1, borderColor: pointBorderEmphasis, borderWidth: 1.5 },
    },
    data: data
      .filter((d) => d.status === status)
      .map((d) => [d.daysSinceLastPurchase, d.netAmount, d.netAmount, d.customerName]),
  }));

  const option = {
    textStyle: baseTextStyle,
    grid: { top: 30, right: 20, bottom: 40, left: 60 },
    legend: {
      top: 0,
      textStyle: { color: baseTextStyle.color, fontFamily: "Vazirmatn" },
    },
    tooltip: {
      ...tooltipCommon,
      formatter: (p: any) =>
        `${p.data[3]}<br/>روز از آخرین خرید: ${formatInt(p.data[0])}<br/>فروش خالص: ${formatCompactRial(p.data[1])}`,
    },
    xAxis: {
      type: "value",
      name: "روز از آخرین خرید",
      nameLocation: "middle",
      nameGap: 28,
      nameTextStyle: { color: axisCommon.axisLabel.color },
      ...axisCommon,
    },
    yAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => formatCompactRial(v) },
    },
    series,
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

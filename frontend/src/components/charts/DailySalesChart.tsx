import ReactECharts from "echarts-for-react";
import type { DailyRow } from "../../lib/api/salesApi";
import { brand } from "../../app/theme/palette";
import { useEchartsTheme } from "./echartsTheme";
import { formatCompactRial } from "../../lib/format";

interface Props {
  data: DailyRow[];
}

export default function DailySalesChart({ data }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const option = {
    textStyle: baseTextStyle,
    grid: { top: 20, right: 20, bottom: 30, left: 60 },
    tooltip: {
      trigger: "axis",
      ...tooltipCommon,
      valueFormatter: (v: number) => formatCompactRial(v),
    },
    xAxis: {
      type: "category",
      data: data.map((d) => d.date.split("/").slice(2).join("")),
      ...axisCommon,
    },
    yAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => formatCompactRial(v) },
    },
    series: [
      {
        type: "bar",
        data: data.map((d) => d.netAmount),
        itemStyle: { color: brand.secondary, borderRadius: [6, 6, 0, 0] },
        barMaxWidth: 26,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

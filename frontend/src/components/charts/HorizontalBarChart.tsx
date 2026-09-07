import ReactECharts from "echarts-for-react";
import { brand } from "../../app/theme/palette";
import { useEchartsTheme } from "./echartsTheme";
import { formatCompactRial } from "../../lib/format";

interface Props {
  labels: string[];
  values: number[];
  color?: string;
}

export default function HorizontalBarChart({ labels, values, color = brand.secondary }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const pairs = labels.map((l, i) => ({ l, v: values[i] })).sort((a, b) => a.v - b.v);

  const option = {
    textStyle: baseTextStyle,
    grid: { top: 10, right: 20, bottom: 10, left: 140 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      ...tooltipCommon,
      valueFormatter: (v: number) => formatCompactRial(v),
    },
    xAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => formatCompactRial(v) },
    },
    yAxis: { type: "category", data: pairs.map((p) => p.l), ...axisCommon },
    series: [
      {
        type: "bar",
        data: pairs.map((p) => p.v),
        itemStyle: { borderRadius: [0, 6, 6, 0], color },
        barMaxWidth: 18,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

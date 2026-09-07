import ReactECharts from "echarts-for-react";
import { brand } from "../../app/theme/palette";
import { useEchartsTheme } from "./echartsTheme";

interface Props {
  labels: string[];
  values: number[];
  valueFormatter: (v: number) => string;
  color?: string;
  highlightIndex?: number;
  highlightColor?: string;
}

export default function SimpleBarChart({ labels, values, valueFormatter, color, highlightIndex, highlightColor }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const option = {
    textStyle: baseTextStyle,
    grid: { top: 10, right: 20, bottom: 10, left: 130 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      ...tooltipCommon,
      valueFormatter: (v: number) => valueFormatter(v),
    },
    xAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, formatter: valueFormatter },
    },
    yAxis: { type: "category", data: labels, ...axisCommon },
    series: [
      {
        type: "bar",
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: i === highlightIndex ? (highlightColor ?? "#FBBF24") : (color ?? brand.secondary) },
        })),
        itemStyle: { borderRadius: [0, 6, 6, 0] },
        barMaxWidth: 18,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

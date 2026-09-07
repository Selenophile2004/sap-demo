import ReactECharts from "echarts-for-react";
import { brand } from "../../app/theme/palette";
import { useEchartsTheme } from "./echartsTheme";

interface Props {
  labels: string[];
  values: number[];
  valueFormatter?: (v: number) => string;
  color?: string;
}

export default function SimpleLineChart({ labels, values, valueFormatter, color = brand.primary }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const option = {
    textStyle: baseTextStyle,
    grid: { top: 20, right: 20, bottom: 30, left: 60 },
    tooltip: {
      trigger: "axis",
      ...tooltipCommon,
      valueFormatter: valueFormatter ?? ((v: number) => String(v)),
    },
    xAxis: { type: "category", data: labels, ...axisCommon },
    yAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, formatter: valueFormatter },
    },
    series: [
      {
        type: "line",
        data: values,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color, width: 3 },
        itemStyle: { color },
        areaStyle: { color: `${color}20` },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

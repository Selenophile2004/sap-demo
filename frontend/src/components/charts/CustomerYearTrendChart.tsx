import ReactECharts from "echarts-for-react";
import { chartPalette, useEchartsTheme } from "./echartsTheme";
import { formatInt } from "../../lib/format";

interface YearSeries {
  year: string;
  points: { month: number; customers: number }[];
}

interface Props {
  data: YearSeries[];
}

const MONTH_NAMES = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

export default function CustomerYearTrendChart({ data }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const option = {
    textStyle: baseTextStyle,
    grid: { top: 40, right: 20, bottom: 30, left: 50 },
    legend: {
      top: 0,
      data: data.map((d) => d.year),
      textStyle: { color: baseTextStyle.color, fontFamily: "Vazirmatn" },
    },
    tooltip: { trigger: "axis", ...tooltipCommon, valueFormatter: (v: number) => formatInt(v) },
    xAxis: { type: "category", data: MONTH_NAMES, ...axisCommon },
    yAxis: { type: "value", ...axisCommon, axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => formatInt(v) } },
    series: data.map((d, i) => ({
      name: d.year,
      type: "line",
      data: d.points.map((p) => p.customers),
      smooth: true,
      symbol: "circle",
      symbolSize: 5,
      lineStyle: { color: chartPalette[i % chartPalette.length], width: 2.5 },
      itemStyle: { color: chartPalette[i % chartPalette.length] },
    })),
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

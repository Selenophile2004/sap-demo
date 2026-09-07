import ReactECharts from "echarts-for-react";
import { brand } from "../../app/theme/palette";
import { useEchartsTheme } from "./echartsTheme";
import { formatCompactRial } from "../../lib/format";
import type { ForecastMonthPoint, ForecastProjectedPoint } from "../../lib/api/forecastApi";

interface Props {
  history: ForecastMonthPoint[];
  forecast: ForecastProjectedPoint[];
}

export default function ForecastBandChart({ history, forecast }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const labels = [...history.map((h) => h.ym), ...forecast.map((f) => f.ym)];
  const actual = [...history.map((h) => h.nominal), ...forecast.map(() => null)];
  const bridge = history.at(-1)?.nominal ?? null;
  const projected = [...history.map(() => null), bridge, ...forecast.slice(1).map((f) => f.nominal)];
  const lower = [...history.map(() => null), bridge, ...forecast.slice(1).map((f) => f.nominalLow)];
  const bandWidth = [
    ...history.map(() => null),
    0,
    ...forecast.slice(1).map((f) => Math.max(0, f.nominalHigh - f.nominalLow)),
  ];

  const option = {
    textStyle: baseTextStyle,
    grid: { top: 30, right: 20, bottom: 40, left: 70 },
    legend: {
      top: 0,
      data: ["واقعی", "پیش‌بینی", "بازه‌ی عدم‌قطعیت"],
      textStyle: { color: baseTextStyle.color, fontFamily: "Vazirmatn" },
    },
    tooltip: {
      trigger: "axis",
      ...tooltipCommon,
      valueFormatter: (v: number | null) => (v == null ? "-" : formatCompactRial(v)),
    },
    xAxis: { type: "category", data: labels, ...axisCommon },
    yAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => formatCompactRial(v) },
    },
    series: [
      {
        name: "واقعی",
        type: "line",
        data: actual,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: brand.primary, width: 3 },
        itemStyle: { color: brand.primary },
        areaStyle: { color: "rgba(121,0,221,0.08)" },
      },
      {
        name: "بازه‌ی عدم‌قطعیت",
        type: "line",
        data: lower,
        stack: "band",
        symbol: "none",
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        silent: true,
        tooltip: { show: false },
      },
      {
        name: "بازه‌ی عدم‌قطعیت",
        type: "line",
        data: bandWidth,
        stack: "band",
        symbol: "none",
        lineStyle: { opacity: 0 },
        areaStyle: { color: "rgba(96,165,250,0.15)" },
      },
      {
        name: "پیش‌بینی",
        type: "line",
        data: projected,
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: "#60A5FA", width: 3, type: "dashed" },
        itemStyle: { color: "#60A5FA" },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

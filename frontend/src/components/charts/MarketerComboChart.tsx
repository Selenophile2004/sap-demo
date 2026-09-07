import ReactECharts from "echarts-for-react";
import { brand } from "../../app/theme/palette";
import { useEchartsTheme } from "./echartsTheme";
import { formatInt, formatPercent } from "../../lib/format";

interface Point {
  month: number;
  target: number;
  actual: number;
  achievementPct: number | null;
}

interface Props {
  points: Point[];
}

const MONTH_NAMES = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

export default function MarketerComboChart({ points }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon, neutralFill } = useEchartsTheme();
  const labels = points.map((p) => MONTH_NAMES[p.month - 1]);

  const option = {
    textStyle: baseTextStyle,
    grid: { top: 40, right: 50, bottom: 30, left: 60 },
    legend: {
      top: 0,
      data: ["تحقق‌شده (سقف ۱۲۰٪)", "تارگت", "درصد تحقق"],
      textStyle: { color: baseTextStyle.color, fontFamily: "Vazirmatn" },
    },
    tooltip: { trigger: "axis", ...tooltipCommon },
    xAxis: { type: "category", data: labels, ...axisCommon },
    yAxis: [
      {
        type: "value",
        name: "کارتن",
        ...axisCommon,
        axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => formatInt(v) },
      },
      {
        type: "value",
        name: "درصد",
        ...axisCommon,
        splitLine: { show: false },
        axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => `${v}٪` },
      },
    ],
    series: [
      {
        name: "تحقق‌شده (سقف ۱۲۰٪)",
        type: "bar",
        data: points.map((p) => p.actual),
        itemStyle: { color: brand.primary, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 26,
      },
      {
        name: "تارگت",
        type: "bar",
        data: points.map((p) => p.target),
        itemStyle: { color: neutralFill, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 26,
      },
      {
        name: "درصد تحقق",
        type: "line",
        yAxisIndex: 1,
        data: points.map((p) => (p.achievementPct === null ? null : Math.min(p.achievementPct, 150))),
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: "#60A5FA", width: 3 },
        itemStyle: { color: "#60A5FA" },
        tooltip: { valueFormatter: (v: number | null) => (v == null ? "-" : formatPercent(v)) },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

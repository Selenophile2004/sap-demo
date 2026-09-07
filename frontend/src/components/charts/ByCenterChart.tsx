import ReactECharts from "echarts-for-react";
import type { ByCenterRow } from "../../lib/api/salesApi";
import { brand } from "../../app/theme/palette";
import { useEchartsTheme } from "./echartsTheme";
import { formatCompactRial, formatInt } from "../../lib/format";

interface Props {
  data: ByCenterRow[];
  valueMode: "rial" | "quantity";
}

export default function ByCenterChart({ data, valueMode }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const sorted = [...data].sort((a, b) =>
    valueMode === "rial" ? a.netAmount - b.netAmount : a.netQty - b.netQty
  );
  const labels = sorted.map((d) => d.center.replace("مرکز فعالیت ", ""));
  const values = sorted.map((d) => (valueMode === "rial" ? d.netAmount : d.netQty));

  const option = {
    textStyle: baseTextStyle,
    grid: { top: 10, right: 20, bottom: 10, left: 130 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      ...tooltipCommon,
      valueFormatter: (v: number) => (valueMode === "rial" ? formatCompactRial(v) : formatInt(v)),
    },
    xAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: {
        ...axisCommon.axisLabel,
        formatter: (v: number) => (valueMode === "rial" ? formatCompactRial(v) : formatInt(v)),
      },
    },
    yAxis: { type: "category", data: labels, ...axisCommon },
    series: [
      {
        type: "bar",
        data: values,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: brand.secondary,
        },
        barMaxWidth: 18,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

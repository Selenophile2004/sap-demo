import ReactECharts from "echarts-for-react";
import type { MonthlyKeyItemRow } from "../../lib/api/pnlApi";
import { brand } from "../../app/theme/palette";
import { useEchartsTheme } from "./echartsTheme";
import { formatCompactRial } from "../../lib/format";

interface Props {
  rows: MonthlyKeyItemRow[];
}

export default function PnlTrendChart({ rows }: Props) {
  const { baseTextStyle, axisCommon, tooltipCommon } = useEchartsTheme();
  const seqOrder = Array.from(new Set(rows.map((r) => r.month_seq))).sort((a, b) => a - b);
  const labels = seqOrder.map((seq) => {
    const row = rows.find((r) => r.month_seq === seq);
    return row ? `${row.month_name} ${row.year_jalali}` : String(seq);
  });

  function seriesFor(itemName: string) {
    return seqOrder.map((seq) => rows.find((r) => r.month_seq === seq && r.item === itemName)?.amount_rial ?? null);
  }

  const netSales = seriesFor("فروش خالص");
  const netProfit = seriesFor("سود و (زیان ) خالص");

  const option = {
    textStyle: baseTextStyle,
    grid: { top: 40, right: 20, bottom: 30, left: 60 },
    legend: {
      top: 0,
      data: ["فروش خالص", "سود و زیان خالص"],
      textStyle: { color: baseTextStyle.color, fontFamily: "Vazirmatn" },
    },
    tooltip: { trigger: "axis", ...tooltipCommon, valueFormatter: (v: number) => formatCompactRial(v) },
    xAxis: { type: "category", data: labels, ...axisCommon },
    yAxis: {
      type: "value",
      ...axisCommon,
      axisLabel: { ...axisCommon.axisLabel, formatter: (v: number) => formatCompactRial(v) },
    },
    series: [
      {
        name: "فروش خالص",
        type: "bar",
        data: netSales,
        itemStyle: { color: brand.secondary, borderRadius: [6, 6, 0, 0] },
      },
      {
        name: "سود و زیان خالص",
        type: "line",
        data: netProfit,
        smooth: true,
        lineStyle: { color: brand.primary, width: 3 },
        itemStyle: { color: brand.primary },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

import ReactECharts from "echarts-for-react";
import { useEchartsTheme, chartPalette } from "./echartsTheme";
import { formatInt } from "../../lib/format";

interface Props {
  data: { item_name: string; qty: number }[];
}

export default function ItemQtyTreemap({ data }: Props) {
  const { baseTextStyle, tooltipCommon, pageBg } = useEchartsTheme();
  const total = data.reduce((s, d) => s + Math.max(0, d.qty), 0);
  const sorted = [...data].filter((d) => d.qty > 0).sort((a, b) => b.qty - a.qty);

  const option = {
    textStyle: baseTextStyle,
    tooltip: {
      ...tooltipCommon,
      formatter: (p: any) => {
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0";
        return `${p.name}<br/>${formatInt(p.value)} عدد (${pct}٪)`;
      },
    },
    series: [
      {
        type: "treemap",
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: (p: any) => `${p.name}\n${formatInt(p.value)}`,
          color: "#fff",
          fontFamily: "Vazirmatn",
          fontSize: 11,
          fontWeight: 600,
        },
        upperLabel: { show: false },
        itemStyle: { borderColor: pageBg, borderWidth: 2, gapWidth: 2 },
        levels: [{ itemStyle: { borderColor: pageBg, borderWidth: 2, gapWidth: 3 } }],
        data: sorted.map((d, i) => ({
          name: d.item_name,
          value: d.qty,
          itemStyle: { color: chartPalette[i % chartPalette.length] },
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

import ReactECharts from "echarts-for-react";
import type { GroupDistributionRow } from "../../lib/api/itemGroupsApi";
import { useEchartsTheme, chartPalette } from "./echartsTheme";
import { formatCompactRial } from "../../lib/format";

interface Props {
  data: GroupDistributionRow[];
}

export default function GroupDistributionTreemap({ data }: Props) {
  const { baseTextStyle, tooltipCommon, pageBg } = useEchartsTheme();
  const total = data.reduce((s, d) => s + d.amount, 0);
  const sorted = [...data].filter((d) => d.amount > 0).sort((a, b) => b.amount - a.amount);

  const option = {
    textStyle: baseTextStyle,
    tooltip: {
      ...tooltipCommon,
      formatter: (p: any) => {
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : "0";
        return `${p.name}<br/>${formatCompactRial(p.value)} (${pct}٪)`;
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
          formatter: (p: any) => `${p.name}\n${formatCompactRial(p.value)}`,
          color: "#fff",
          fontFamily: "Vazirmatn",
          fontSize: 12,
          fontWeight: 600,
        },
        upperLabel: { show: false },
        itemStyle: { borderColor: pageBg, borderWidth: 2, gapWidth: 2 },
        levels: [{ itemStyle: { borderColor: pageBg, borderWidth: 2, gapWidth: 3 } }],
        data: sorted.map((d, i) => ({
          name: d.group,
          value: d.amount,
          itemStyle: { color: chartPalette[i % chartPalette.length] },
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

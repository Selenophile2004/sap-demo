import ReactECharts from "echarts-for-react";
import { useEchartsTheme } from "./echartsTheme";

interface Props {
  salesMomentum: number;
  receivablesHealth: number;
  marginTrend: number;
  customerConcentration: number;
}

export default function HealthRadarChart({ salesMomentum, receivablesHealth, marginTrend, customerConcentration }: Props) {
  const { baseTextStyle, tooltipCommon, axisCommon, splitArea } = useEchartsTheme();
  const indicators = [
    { name: "شتاب فروش", max: 100 },
    { name: "سلامت وصول مطالبات", max: 100 },
    { name: "روند حاشیه سود", max: 100 },
    { name: "پراکندگی مشتریان", max: 100 },
  ];
  const values = [salesMomentum, receivablesHealth, marginTrend, customerConcentration];

  const option = {
    textStyle: baseTextStyle,
    tooltip: { ...tooltipCommon },
    radar: {
      indicator: indicators,
      radius: "68%",
      center: ["50%", "54%"],
      splitNumber: 4,
      axisName: { color: baseTextStyle.color, fontFamily: "Vazirmatn", fontSize: 12 },
      splitLine: { lineStyle: { color: axisCommon.splitLine.lineStyle.color } },
      splitArea: { areaStyle: { color: splitArea } },
      axisLine: { lineStyle: { color: axisCommon.axisLine.lineStyle.color } },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: values,
            name: "امتیاز سلامت کسب‌وکار",
            areaStyle: { color: "rgba(234,34,40,0.25)" },
            lineStyle: { color: "#EA2228", width: 2 },
            itemStyle: { color: "#EA2228" },
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

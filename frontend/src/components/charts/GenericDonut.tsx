import ReactECharts from "echarts-for-react";
import { useEchartsTheme, chartPalette } from "./echartsTheme";
import { formatCompactRial } from "../../lib/format";

// این برچسب با fillText روی کنواس رسم می‌شود، نه به‌صورت متن معمولی HTML. رقم
// فارسی + نشانه‌ی «٪» با هم در یک بافر RTL به‌هم می‌ریزند (مثلاً «۴۳٫۷٪۲» به‌جای
// «۴۳٫۷۲٪»)؛ اول با کاراکترهای نامرئی LRM دور متن رفع شد، ولی آن کاراکترها در
// همین فونت/کنواس به‌صورت خط‌های ریز اضافه‌ی قابل‌مشاهده رندر می‌شدند (نه واقعاً
// نامرئی) و ظاهر عدد را خراب می‌کردند. ساده‌ترین و مطمئن‌ترین راه: همین‌جا از
// ارقام لاتین استفاده شود — دقیقاً هم‌شکل با برچسب‌های بیرونیِ همین نمودار
// («{d}٪» در ECharts که خودش با ارقام لاتین رندر می‌شود)، بدون هیچ ابهام bidi.
const canvasPercent = (n: number) => `${n.toFixed(1)}%`;

interface Props {
  labels: string[];
  values: number[];
  colors?: string[];
  valueFormatter?: (v: number) => string;
}

export default function GenericDonut({ labels, values, colors, valueFormatter = formatCompactRial }: Props) {
  const { baseTextStyle, tooltipCommon, pageBg, axisCommon } = useEchartsTheme();
  const data = labels
    .map((name, i) => ({
      name,
      value: values[i],
      itemStyle: { color: (colors ?? chartPalette)[i % (colors ?? chartPalette).length] },
    }))
    .sort((a, b) => b.value - a.value);

  const isDense = labels.length > 6;
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const top = data[0];
  const topPct = top && total > 0 ? (top.value / total) * 100 : 0;
  const centerX = isDense ? "68%" : "50%";
  const centerY = isDense ? "50%" : "45%";

  const option = {
    textStyle: baseTextStyle,
    tooltip: {
      trigger: "item",
      ...tooltipCommon,
      formatter: (p: any) => `${p.name}: ${valueFormatter(p.value)} (${p.percent}٪)`,
    },
    legend: isDense
      ? {
          type: "scroll",
          orient: "vertical",
          insetInlineStart: 0,
          left: 0,
          top: "middle",
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 8,
          textStyle: { color: baseTextStyle.color, fontFamily: "Vazirmatn", fontSize: 11 },
          pageIconColor: axisCommon.axisLabel.color,
          pageIconInactiveColor: axisCommon.splitLine.lineStyle.color,
          pageTextStyle: { color: axisCommon.axisLabel.color },
          formatter: (name: string) => (name.length > 16 ? name.slice(0, 16) + "…" : name),
        }
      : {
          type: "scroll",
          bottom: 0,
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 14,
          textStyle: { color: baseTextStyle.color, fontFamily: "Vazirmatn", fontSize: 12 },
        },
    graphic: top
      ? {
          elements: [
            {
              type: "text",
              left: centerX,
              top: centerY,
              style: {
                text: canvasPercent(topPct),
                fill: top.itemStyle.color,
                fontSize: 20,
                fontWeight: 800,
                fontFamily: "Vazirmatn",
                textAlign: "center",
                textVerticalAlign: "middle",
              },
            },
            {
              type: "text",
              left: centerX,
              top: centerY,
              style: {
                text: top.name.length > 12 ? top.name.slice(0, 12) + "…" : top.name,
                fill: baseTextStyle.color,
                opacity: 0.65,
                fontSize: 10.5,
                fontFamily: "Vazirmatn",
                textAlign: "center",
                textVerticalAlign: "middle",
                y: 18,
              },
            },
          ],
        }
      : undefined,
    series: [
      {
        type: "pie",
        radius: isDense ? ["45%", "68%"] : ["55%", "78%"],
        center: [centerX, centerY],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: pageBg, borderWidth: 2 },
        label: isDense
          ? { show: false }
          : { show: true, formatter: "{d}٪", color: baseTextStyle.color, fontSize: 12 },
        labelLine: { show: !isDense },
        data,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

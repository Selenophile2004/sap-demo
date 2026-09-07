import ReactECharts from "echarts-for-react";
import { useEchartsTheme } from "./echartsTheme";
import { formatInt } from "../../lib/format";

interface Props {
  active: number;
  inactive: number;
}

const CENTER: [string, string] = ["50%", "44%"];

// این برچسب با fillText روی کنواس رسم می‌شود، نه به‌صورت متن معمولی HTML. رقم
// فارسی + نشانه‌ی «٪» با هم در یک بافر RTL به‌هم می‌ریزند (مثلاً «۴۳٫۷٪۲» به‌جای
// «۴۳٫۷۲٪»)؛ اول با کاراکترهای نامرئی LRM دور متن رفع شد، ولی آن کاراکترها در
// همین فونت/کنواس به‌صورت خط‌های ریز اضافه‌ی قابل‌مشاهده رندر می‌شدند (نه واقعاً
// نامرئی) و ظاهر عدد را خراب می‌کردند. ساده‌ترین و مطمئن‌ترین راه: همین‌جا از
// ارقام لاتین استفاده شود — دقیقاً هم‌شکل با برچسب‌های بیرونیِ همین نمودار
// («{d}٪» در ECharts که خودش با ارقام لاتین رندر می‌شود)، بدون هیچ ابهام bidi.
const canvasPercent = (n: number) => `${n.toFixed(1)}%`;

export default function CustomerStatusDonut({ active, inactive }: Props) {
  const { baseTextStyle, tooltipCommon, pageBg } = useEchartsTheme();
  const data = [
    { value: active, name: "فعال", itemStyle: { color: "#4ADE80" } },
    { value: inactive, name: "غیرفعال", itemStyle: { color: "#EA2228" } },
  ];
  const total = active + inactive;
  const activePct = total > 0 ? (active / total) * 100 : 0;

  const option = {
    textStyle: baseTextStyle,
    tooltip: {
      trigger: "item",
      ...tooltipCommon,
      formatter: (p: any) => `${p.name}: ${formatInt(p.value)} (${p.percent}٪)`,
    },
    legend: {
      bottom: 4,
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 18,
      textStyle: { color: baseTextStyle.color, fontFamily: "Vazirmatn", fontSize: 12 },
    },
    graphic: {
      elements: [
        {
          type: "text",
          left: CENTER[0],
          top: CENTER[1],
          style: {
            text: canvasPercent(activePct),
            fill: "#4ADE80",
            fontSize: 22,
            fontWeight: 800,
            fontFamily: "Vazirmatn",
            textAlign: "center",
            textVerticalAlign: "middle",
          },
        },
        {
          type: "text",
          left: CENTER[0],
          top: CENTER[1],
          style: {
            text: "فعال",
            fill: baseTextStyle.color,
            opacity: 0.65,
            fontSize: 11,
            fontFamily: "Vazirmatn",
            textAlign: "center",
            textVerticalAlign: "middle",
            y: 20,
          },
        },
      ],
    },
    series: [
      {
        type: "pie",
        radius: ["55%", "76%"],
        center: CENTER,
        avoidLabelOverlap: true,
        itemStyle: { borderColor: pageBg, borderWidth: 2 },
        label: {
          show: true,
          formatter: "{d}٪",
          color: baseTextStyle.color,
          fontSize: 12,
        },
        data,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />;
}

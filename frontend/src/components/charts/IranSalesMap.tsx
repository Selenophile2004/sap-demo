import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { useMemo } from "react";
import { useEchartsTheme } from "./echartsTheme";
import { formatCompactRial, formatInt } from "../../lib/format";
import iranGeoJsonRaw from "../../data/iranProvinces.json";
import type { ByProvinceRow } from "../../lib/api/salesApi";

interface ProvinceFeatureCollection {
  type: "FeatureCollection";
  features: { type: "Feature"; properties: { name: string }; geometry: unknown }[];
}

const iranGeoJson = iranGeoJsonRaw as ProvinceFeatureCollection;

// نقشه فقط یک‌بار ثبت می‌شود (نه هر بار که این کامپوننت رندر می‌شود).
let mapRegistered = false;
function ensureMapRegistered() {
  if (mapRegistered) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  echarts.registerMap("IRAN_PROVINCES", iranGeoJson as any);
  mapRegistered = true;
}

// استانِ داخل sales.db (از شیت Moshtari) گاهی بدون پیشوند «استان» یا با فاصله‌ی
// اضافی نوشته شده (مثلاً «کهگیلویه و بویراحمد» در برابر «استان کهگیلویه و بویر
// احمد» در نقشه)؛ برای تطبیق درست با نام دقیقِ استانِ داخل GeoJSON، «استان» و
// همه‌ی فاصله‌ها حذف می‌شوند و مقایسه روی همین نسخه‌ی خلاصه‌شده انجام می‌شود.
function normalizeProvinceName(name: string): string {
  return name.replace(/استان/g, "").replace(/\s+/g, "").trim();
}

const GEOJSON_NAME_BY_NORMALIZED = new Map<string, string>(
  iranGeoJson.features.map((f) => [normalizeProvinceName(f.properties.name), f.properties.name])
);

interface Props {
  data: ByProvinceRow[];
  metric: "amount" | "qty";
}

export default function IranSalesMap({ data, metric }: Props) {
  ensureMapRegistered();
  const { baseTextStyle, tooltipCommon, pageBg } = useEchartsTheme();
  const valueFormatter = metric === "amount" ? formatCompactRial : formatInt;

  const { seriesData, unmatched } = useMemo(() => {
    const seriesData: { name: string; value: number }[] = [];
    let unmatchedAmount = 0;
    for (const row of data) {
      const value = metric === "amount" ? row.netAmount : row.netQty;
      const geoName = GEOJSON_NAME_BY_NORMALIZED.get(normalizeProvinceName(row.province));
      if (geoName) {
        seriesData.push({ name: geoName, value });
      } else {
        unmatchedAmount += row.netAmount;
      }
    }
    return { seriesData, unmatched: unmatchedAmount };
  }, [data, metric]);

  const maxValue = Math.max(1, ...seriesData.map((d) => d.value));

  const option = {
    textStyle: baseTextStyle,
    tooltip: {
      trigger: "item",
      ...tooltipCommon,
      formatter: (p: { name: string; value?: number }) =>
        `${p.name.replace(/^استان /, "")}: ${p.value !== undefined && p.value !== null ? valueFormatter(p.value) : "بدون فروش"}`,
    },
    visualMap: {
      min: 0,
      max: maxValue,
      show: true,
      orient: "vertical",
      right: 6,
      bottom: 10,
      itemWidth: 10,
      itemHeight: 90,
      calculable: false,
      inRange: { color: ["#4ADE80", "#FACC15", "#EA2228"] },
      textStyle: { color: baseTextStyle.color, fontFamily: "Vazirmatn", fontSize: 10 },
      formatter: (v: number) => valueFormatter(v),
    },
    series: [
      {
        type: "map",
        map: "IRAN_PROVINCES",
        roam: true,
        scaleLimit: { min: 1, max: 6 },
        layoutCenter: ["44%", "50%"],
        layoutSize: "92%",
        label: { show: false },
        itemStyle: {
          borderColor: pageBg,
          borderWidth: 0.75,
          areaColor: "rgba(148,163,184,0.18)",
        },
        emphasis: {
          label: { show: false },
          itemStyle: { areaColor: "#60A5FA" },
        },
        nameProperty: "name",
        data: seriesData,
      },
    ],
  };

  return (
    <>
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />
      {unmatched > 0 && (
        <div
          style={{
            position: "absolute",
            insetInlineStart: 8,
            bottom: 4,
            fontSize: 10.5,
            color: baseTextStyle.color,
            opacity: 0.55,
            fontFamily: "Vazirmatn",
          }}
        >
          خارج از نقشه (صادرات/نامشخص): {formatCompactRial(unmatched)}
        </div>
      )}
    </>
  );
}

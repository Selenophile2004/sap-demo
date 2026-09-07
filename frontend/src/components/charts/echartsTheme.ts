import { brand, paletteByMode } from "../../app/theme/palette";
import { useThemeModeStore } from "../../app/store/themeModeStore";

export const chartPalette = [brand.primary, brand.secondary, "#4ADE80", "#60A5FA", "#C084FC", "#F472B6", "#94A3B8"];

// رنگ‌های ECharts روی canvas رسم می‌شوند، پس برخلاف surface.xxx در palette.ts
// نمی‌توانند از متغیر CSS استفاده کنند (fillStyle مقدار var() را نمی‌فهمد) — هر
// نموداری که از این فایل استفاده می‌کند باید useEchartsTheme() را صدا بزند تا با
// تغییر حالت روشن/تیره دوباره رندر شود.
const THEMES = {
  dark: {
    baseTextStyle: { color: "rgba(245,245,245,0.85)", fontFamily: "Vazirmatn, Tahoma, sans-serif" },
    axisCommon: {
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.15)" } },
      axisLabel: { color: "rgba(245,245,245,0.6)", fontFamily: "Vazirmatn" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
    },
    tooltipCommon: {
      backgroundColor: "rgba(22,22,26,0.92)",
      borderColor: "rgba(255,255,255,0.12)",
      textStyle: { color: "#F5F5F5", fontFamily: "Vazirmatn" },
    },
    splitArea: ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.045)"],
    pointBorder: "rgba(255,255,255,0.35)",
    pointBorderEmphasis: "rgba(255,255,255,0.7)",
    pageBg: paletteByMode.dark.background,
    neutralFill: "rgba(255,255,255,0.16)",
  },
  light: {
    baseTextStyle: { color: "rgba(26,27,30,0.85)", fontFamily: "Vazirmatn, Tahoma, sans-serif" },
    axisCommon: {
      axisLine: { lineStyle: { color: "rgba(20,20,30,0.18)" } },
      axisLabel: { color: "rgba(26,27,30,0.62)", fontFamily: "Vazirmatn" },
      splitLine: { lineStyle: { color: "rgba(20,20,30,0.08)" } },
    },
    tooltipCommon: {
      backgroundColor: "rgba(255,255,255,0.97)",
      borderColor: "rgba(20,20,30,0.14)",
      textStyle: { color: "#1A1B1E", fontFamily: "Vazirmatn" },
    },
    splitArea: ["rgba(20,20,30,0.02)", "rgba(20,20,30,0.045)"],
    pointBorder: "rgba(20,20,30,0.3)",
    pointBorderEmphasis: "rgba(20,20,30,0.6)",
    pageBg: paletteByMode.light.background,
    neutralFill: "rgba(20,20,30,0.14)",
  },
} as const;

export function useEchartsTheme() {
  const mode = useThemeModeStore((s) => s.mode);
  return THEMES[mode];
}

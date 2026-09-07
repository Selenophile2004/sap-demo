export const brand = {
  primary: "#7900DD",
  primaryDark: "#5C00A8",
  primaryLight: "#A855F7",
  secondary: "#F8B17B",
  secondaryDark: "#D98F55",
};

// خاکستری برندِ ILIA (نمونه‌برداری‌شده از فایل «&»). فقط به‌صورت پراکنده و کم‌رنگ
// در متن‌های ثانویه، caption ها یا حاشیه/جداکننده‌های ظریف استفاده می‌شود — جایگزین
// سیستماتیک surface.* / textSecondary نیست.
export const brandGrey = "#C1C1C1";

// این مقادیر رنگ واقعی نیستند؛ به متغیرهای CSS اشاره می‌کنند که createAppTheme
// (در theme.ts) بسته به حالت روشن/تیره در سطح :root تعریف می‌کند. یعنی همه‌ی
// کامپوننت‌هایی که از قبل surface.xxx استفاده می‌کردند (سایدبار، فیلتر سراسری،
// جدول‌ها و ...) بدون هیچ تغییری بین دو حالت سوییچ می‌شوند.
export const surface = {
  background: "var(--ssap-bg)",
  glass: "var(--ssap-glass)",
  glassStrong: "var(--ssap-glass-strong)",
  glassHover: "var(--ssap-glass-hover)",
  border: "var(--ssap-border)",
  borderStrong: "var(--ssap-border-strong)",
  // پس‌زمینه‌ی کاملاً کدر برای هدر جدول‌های اسکرول‌شونده (نباید با محتوای زیرش قاطی شود)
  tableHeaderBg: "var(--ssap-table-header-bg)",
};

export const glassBlur = "blur(22px) saturate(160%)";

export interface PaletteModeValues {
  background: string;
  glass: string;
  glassStrong: string;
  glassHover: string;
  border: string;
  borderStrong: string;
  tableHeaderBg: string;
  textPrimary: string;
  textSecondary: string;
  chipBg: string;
  bodyGradient: string;
  paperShadow: string;
}

// مقادیر واقعیِ هر حالت — theme.ts این‌ها را هم مستقیماً در پالت MUI (متن/پس‌زمینه)
// و هم به‌صورت متغیر CSS در :root تزریق می‌کند.
export const paletteByMode: Record<"dark" | "light", PaletteModeValues> = {
  dark: {
    background: "#050506",
    glass: "rgba(22, 22, 26, 0.55)",
    glassStrong: "rgba(22, 22, 26, 0.75)",
    glassHover: "rgba(255, 255, 255, 0.06)",
    border: "rgba(255, 255, 255, 0.09)",
    borderStrong: "rgba(255, 255, 255, 0.14)",
    tableHeaderBg: "#1b1d23",
    textPrimary: "#F5F5F5",
    textSecondary: "rgba(245,245,245,0.65)",
    chipBg: "rgba(255,255,255,0.06)",
    bodyGradient: [
      "radial-gradient(circle at 12% 8%, rgba(121,0,221,0.16), transparent 40%)",
      "radial-gradient(circle at 88% 15%, rgba(248,177,123,0.10), transparent 42%)",
      "radial-gradient(circle at 50% 100%, rgba(121,0,221,0.08), transparent 50%)",
    ].join(", "),
    paperShadow: "0 8px 32px rgba(0,0,0,0.35)",
  },
  light: {
    background: "#F3F4F7",
    glass: "rgba(255, 255, 255, 0.75)",
    glassStrong: "rgba(255, 255, 255, 0.9)",
    glassHover: "rgba(15, 15, 25, 0.045)",
    border: "rgba(15, 15, 30, 0.10)",
    borderStrong: "rgba(15, 15, 30, 0.18)",
    tableHeaderBg: "#EBECF1",
    textPrimary: "#1A1B1E",
    textSecondary: "rgba(26,27,30,0.64)",
    chipBg: "rgba(15,15,30,0.055)",
    bodyGradient: [
      "radial-gradient(circle at 12% 8%, rgba(121,0,221,0.07), transparent 40%)",
      "radial-gradient(circle at 88% 15%, rgba(248,177,123,0.09), transparent 42%)",
      "radial-gradient(circle at 50% 100%, rgba(121,0,221,0.04), transparent 50%)",
    ].join(", "),
    paperShadow: "0 8px 28px rgba(20,20,45,0.08)",
  },
};

export type ModuleStatus = "active" | "coming-soon";

export interface ModuleManifestItem {
  id: string;
  label: string;
  path?: string;
  section?: string;
  requiredPermission?: string;
  status: ModuleStatus;
  description: string;
}

export const moduleManifest: readonly ModuleManifestItem[] = Object.freeze([
  { id: "dashboard", label: "داشبورد", path: "/", status: "active", description: "نبض مدیریتی و شاخص‌های اصلی سازمان" },
  { id: "sales", label: "فروش", path: "/sales", section: "فروش و بازاریابی", status: "active", description: "تحلیل فروش، مشتری، استان و مرکز فروش" },
  { id: "marketer-scorecard", label: "کارنامه بازاریاب", path: "/marketer-scorecard", status: "active", description: "عملکرد بازاریابان نسبت به هدف" },
  { id: "receivables", label: "مانده مطالبات", path: "/receivables", section: "مالی", status: "active", description: "مانده، سن بدهی و نرخ وصول" },
  { id: "pnl", label: "سود و زیان", path: "/pnl", status: "active", description: "صورت سود و زیان و حاشیه‌ها" },
  { id: "hr", label: "پرسنل", path: "/hr", section: "سازمان و عملیات", status: "active", description: "ظرفیت و روند سرمایه انسانی" },
  { id: "inventory", label: "رسوب انبار", path: "/inventory", status: "active", description: "موجودی، رزرو و ریسک رسوب" },
  { id: "alerts", label: "هشدارها", path: "/alerts", section: "تحلیل و آینده‌نگری", status: "active", description: "هشدارهای اولویت‌دار و اقدام‌پذیر" },
  { id: "forecast", label: "چشم‌انداز آینده", path: "/forecast", status: "active", description: "پیش‌بینی و روندهای آتی" },
  { id: "scenario", label: "تحلیل What-if", path: "/scenario-planner", status: "active", description: "شبیه‌سازی سناریو بدون تغییر داده اصلی" },
  { id: "executive-output", label: "خروجی مدیریتی", path: "/executive-output", status: "active", description: "نسخه آماده جلسه در قالب Excel و چاپ/PDF" },
  { id: "data-health", label: "مرکز سلامت داده", path: "/data-health", section: "اعتماد و حاکمیت", requiredPermission: "data:read", status: "active", description: "تازگی، کامل‌بودن، اعتبار و یکتایی منابع" },
  { id: "module-registry", label: "رجیستری ماژول‌ها", path: "/module-registry", status: "active", description: "نمای شفاف قابلیت‌های فعال این استقرار" },
  { id: "data-management", label: "مدیریت داده‌ها", path: "/data-management", section: "مدیریت سیستم", requiredPermission: "data:write", status: "active", description: "ورود، اعتبارسنجی، انتشار و بازگردانی داده" },
  { id: "customer-quality", label: "کیفیت و شکایات مشتریان", section: "قابل افزودن", status: "coming-soon", description: "نمونه ماژول اختیاری برای شرکت‌های خدماتی" },
  { id: "production", label: "گزارشات تولید", status: "coming-soon", description: "ماژول اختیاری برای شرکت‌های تولیدی" },
  { id: "supply", label: "گزارشات تامین", status: "coming-soon", description: "ماژول اختیاری زنجیره تامین" },
]);

const enabledIds = new Set(
  (import.meta.env.VITE_ENABLED_MODULES as string | undefined)?.split(",").map((id) => id.trim()).filter(Boolean) ?? [],
);

export function isModuleEnabled(item: ModuleManifestItem): boolean {
  return item.status === "active" && (enabledIds.size === 0 || enabledIds.has(item.id));
}

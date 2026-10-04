import "dotenv/config";
import path from "path";
import type { AppRole } from "./security/authorization";
import { resolveAiRuntimeConfig } from "./ai/runtimeConfig";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  companyName: process.env.COMPANY_NAME ?? "شرکت نمونه",
  dataDir: path.resolve(__dirname, "..", process.env.DATA_DIR ?? "../Data"),
  etlDir: path.resolve(__dirname, "..", "..", "etl"),
  // روی هاست، چیدمان پوشه‌ها با مونوریپوی لوکال فرق دارد (فقط etl/output آپلود
  // می‌شود، نه کل پوشه‌ی etl) — پس این مسیر باید قابل override با env باشد.
  etlOutputDir: process.env.ETL_OUTPUT_DIR
    ? path.resolve(__dirname, "..", process.env.ETL_OUTPUT_DIR)
    : path.resolve(__dirname, "..", "..", "etl", "output"),
  // مسیر فایل‌های استاتیک فرانت‌اند build‌شده (فقط روی هاست ست می‌شود؛ در حالت
  // dev لوکال فرانت‌اند از سرور Vite جداگانه سرو می‌شود و این مقدار خالی می‌ماند).
  publicDir: process.env.PUBLIC_DIR ? path.resolve(__dirname, "..", process.env.PUBLIC_DIR) : null,
  // روی هاست، پایتون/pandas نصب نیست و به شبکه‌ی داخلی شرکت (Y:\BI) هم دسترسی
  // نیست؛ پس واچر خودکار و اجرای ETL باید کاملاً غیرفعال شوند.
  etlEnabled: (process.env.ETL_ENABLED ?? "true") !== "false",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  // ارائه‌دهنده مدل پشت یک Interface مستقل قرار دارد. هر استقرار می‌تواند بدون
  // تغییر routeهای دستیار، Groq یا یک endpoint سازگار با OpenAI را انتخاب کند.
  // نبودن کلید نیز سرور را متوقف نمی‌کند؛ تحلیل قطعی KPI/نمودار همچنان فعال است.
  ai: resolveAiRuntimeConfig(process.env),
  users: [
    {
      username: required("CEO_USERNAME"),
      passwordHash: required("CEO_PASSWORD_HASH"),
      displayName: required("CEO_DISPLAY_NAME"),
      displayRole: required("CEO_DISPLAY_ROLE"),
      role: "admin" as AppRole,
    },
    {
      username: required("SINA_USERNAME"),
      passwordHash: required("SINA_PASSWORD_HASH"),
      displayName: required("SINA_DISPLAY_NAME"),
      displayRole: required("SINA_DISPLAY_ROLE"),
      role: "viewer" as AppRole,
    },
  ],
};

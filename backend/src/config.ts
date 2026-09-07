import "dotenv/config";
import path from "path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
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
  // کلید Gemini عمداً required() نیست: نبودن/نامعتبربودنش نباید کل سرور را از کار
  // بیندازد، فقط باعث می‌شود routes/assistant.ts پاسخ «موقتاً در دسترس نیست» بدهد
  // (رجوع کنید به همان فایل برای مدیریت خطا). gemini-2.0-flash مقدار حدسیِ فاز قبل
  // بود؛ gemini-2.5-flash نسخه‌ی پایدار (Stable) و تاییدشده‌ی سطح رایگان فعلی است.
  // *** غیرفعال: کلیدهای Gemini فعلی هر دو با فرمت جدید «AQ.» هستند که مسیر
  // REST/SDK استاندارد فعلاً آن‌ها را رد می‌کند (باگ سمت گوگل، تاییدشده در فروم
  // توسعه‌دهندگان گوگل، نه باگ کد ما). این دو متغیر عمداً نگه داشته شده‌اند (حذف
  // نشده‌اند) تا اگر گوگل این باگ را رفع کرد، بشود در آینده به Gemini برگشت، ولی
  // routes/assistant.ts دیگر این‌ها را صدا نمی‌زند. ***
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  // *** ارائه‌دهنده‌ی فعلی «دستیار هوشمند»: Groq (سطح رایگان واقعی، API سازگار با
  // OpenAI). کلید Groq هم عمداً required() نیست، به همان دلیل بالا (نبودش نباید
  // کل سرور را از کار بیندازد). llama-3.3-70b-versatile مقدار حدسیِ فاز قبل بود؛
  // آن مدل در ۲۶ مرداد ۱۴۰۵ (۱۷ آگوست ۲۰۲۶) از سطح رایگان/توسعه‌دهنده به «فقط
  // Enterprise/Contact Sales» منتقل شد (deprecated). openai/gpt-oss-120b جایگزین
  // رسمی توصیه‌شده‌ی خود Groq است: هنوز روی سطح رایگان در دسترس است، از
  // tool/function calling پشتیبانی می‌کند و برای استدلال/دنبال‌کردن دستورالعمل
  // مناسب است (رجوع کنید به console.groq.com/docs/deprecations).
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
  users: [
    {
      username: required("CEO_USERNAME"),
      passwordHash: required("CEO_PASSWORD_HASH"),
      displayName: required("CEO_DISPLAY_NAME"),
      displayRole: required("CEO_DISPLAY_ROLE"),
    },
    {
      username: required("SINA_USERNAME"),
      passwordHash: required("SINA_PASSWORD_HASH"),
      displayName: required("SINA_DISPLAY_NAME"),
      displayRole: required("SINA_DISPLAY_ROLE"),
    },
  ],
};

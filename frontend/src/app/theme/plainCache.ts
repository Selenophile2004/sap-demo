import createCache from "@emotion/cache";

// یک کشِ emotion بدون stylis-plugin-rtl — فقط برای زیردرخت‌هایی که با MUI Transition
// (Fade/Slide/Grow/...) کار می‌کنند. پلاگین RTL این پروژه، استایل‌های پویایی که خودِ
// MUI برای انیمیشن تزریق می‌کند (transform یا opacity) را دوباره میرور می‌کند و روی
// استایل inline صحیحی که MUI ست کرده overwrite می‌شود — نتیجه: پنل یا کاملاً بیرون
// از صفحه می‌ماند (Slide) یا opacity:0 می‌ماند حتی وقتی باز است (Fade). چیدمانِ
// فیزیکی (راست/چپ) در این زیردرخت باید صریح نوشته شود، نه با inset-inline-*، چون آن
// هم به‌طور طبیعی طبق direction مرورگر حل می‌شود و لازم نیست stylis آن را میرور کند.
export const plainCache = createCache({ key: "mui-plain" });

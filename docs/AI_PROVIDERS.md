# راهنمای تعویض ارائه‌دهنده هوش مصنوعی

منطق دستیار، KPI و نمودار به شرکت ارائه‌دهنده مدل وابسته نیست. Routeهای دستیار
فقط Interface مشترک `AiProvider` را فراخوانی می‌کنند و هر ارائه‌دهنده پشت یک
Adapter قرار می‌گیرد.

## تنظیمات مشترک

| متغیر | کاربرد |
|---|---|
| `AI_ENABLED` | فعال یا غیرفعال‌کردن تماس با مدل ابری |
| `AI_PROVIDER` | `groq` یا `openai-compatible` |
| `AI_API_KEY` | کلید ارائه‌دهنده؛ در حالت خالی، تحلیل قطعی محلی فعال می‌ماند |
| `AI_MODEL` | شناسه مدل در همان ارائه‌دهنده |
| `AI_BASE_URL` | آدرس پایه endpoint سازگار با OpenAI |
| `AI_AUTH_HEADER` | نام هدر کلید؛ پیش‌فرض `Authorization` |
| `AI_AUTH_SCHEME` | پیشوند کلید؛ پیش‌فرض `Bearer` و برای کلید خام رشته خالی |
| `AI_TIMEOUT_MS` | timeout هر درخواست مدل؛ پیش‌فرض ۱۵ ثانیه |

## Groq

```env
AI_ENABLED=true
AI_PROVIDER=groq
AI_API_KEY=replace-with-secret
AI_MODEL=openai/gpt-oss-120b
```

استقرارهای قدیمی که `GROQ_API_KEY` و `GROQ_MODEL` دارند بدون تغییر کار می‌کنند.
متغیرهای عمومی `AI_API_KEY` و `AI_MODEL` در صورت وجود اولویت دارند.

## OpenAI یا سرویس سازگار با OpenAI

```env
AI_ENABLED=true
AI_PROVIDER=openai-compatible
AI_API_KEY=replace-with-secret
AI_MODEL=replace-with-provider-model
AI_BASE_URL=https://api.openai.com/v1
AI_AUTH_HEADER=Authorization
AI_AUTH_SCHEME=Bearer
```

برای ارائه‌دهنده‌ای که کلید خام را در هدر `api-key` می‌خواهد:

```env
AI_AUTH_HEADER=api-key
AI_AUTH_SCHEME=
```

`AI_BASE_URL` باید آدرس پایه‌ای باشد که مسیر `/chat/completions` زیر آن قرار دارد.

## حالت بدون AI

```env
AI_ENABLED=false
```

در این حالت هیچ متن یا snapshot به ارائه‌دهنده خارجی ارسال نمی‌شود. ورود داده،
KPI، نمودار و تحلیل‌های قطعی محلی همچنان کار می‌کنند.

## اضافه‌کردن Provider غیرسازگار

برای ارائه‌دهنده‌ای مانند Gemini یا Anthropic فقط یک Adapter جدید لازم است:

1. Interface `AiProvider` را پیاده‌سازی کند.
2. خطاهای SDK را به `AiProviderError` تبدیل کند.
3. در `providerFactory.ts` ثبت شود.
4. تست قرارداد آن اضافه شود.

Routeهای گفتگو، خلاصه اجرایی، KPI و UI نباید تغییر کنند. کلیدها فقط در Secret
Manager یا Environment میزبان نگه‌داری می‌شوند و هرگز وارد frontend یا Git نمی‌شوند.

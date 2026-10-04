import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // این برنامه از یک entry HTML اجرا می‌شود. غیرفعال‌کردن chunking، ترتیب اجرای
    // React/MUI را در CDN پراکسی Render قطعی نگه می‌دارد و از توقف bootstrap قبل
    // از mount شدن #root جلوگیری می‌کند. lazy importها نیز داخل همین bundle قرار
    // می‌گیرند؛ برای دمو مدیریتی پایداری شروع برنامه بر اندازه chunk اولویت دارد.
    rolldownOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
})

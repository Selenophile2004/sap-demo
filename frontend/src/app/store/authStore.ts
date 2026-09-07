import { create } from "zustand";

export interface AuthUser {
  username: string;
  displayName: string;
  displayRole: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  // فقط بلافاصله بعد از یک ورود موفق true می‌شود — مصرف‌کننده‌اش مودال «خلاصه‌ی
  // اجرایی» است (ExecutiveOverviewModal) که با دیدنِ true آن را یک‌بار باز می‌کند
  // و بلافاصله با consumeJustLoggedIn پاکش می‌کند؛ در نتیجه ناوبری بین صفحات یا
  // بازسازی همین کامپوننت در طول همان نشست دیگر مودال را دوباره باز نمی‌کند —
  // فقط دوباره true می‌شود اگر setSession دوباره صدا زده شود (یعنی ورود دوباره).
  justLoggedIn: boolean;
  // true وقتی مودال «خلاصه‌ی اجرایی» (ExecutiveOverviewModal) روی صفحه باز است —
  // مصرف‌کننده‌اش حبابِ معرفیِ دستیار هوشمند (AssistantWidget) است تا هم‌زمان با آن
  // مودال روی صفحه ظاهر نشود (رجوع کنید به AssistantWidget.tsx).
  overviewOpen: boolean;
  // یک‌بار در هر نشست ورود true می‌شود (بعد از این‌که حباب معرفیِ دستیار هوشمند
  // نشان داده شد). عمداً اینجا و نه یک useRef داخل AssistantWidget نگه داشته
  // می‌شود: در حالت توسعه (StrictMode) افکت‌ها یک‌بار mount/cleanup/mount دوباره
  // می‌شوند و اگر گارد «قبلاً نشان داده شده» فقط یک ref محلیِ همان کامپوننت باشد،
  // این چرخه‌ی دوگانه می‌تواند باعث نمایش و بلافاصله محونشدنِ حباب شود (باگ واقعی
  // که هنگام تست دیده شد). چون این مقدار در استور مشترک است، نه در یک instance
  // خاص از کامپوننت، در برابر آن کاملاً مقاوم است.
  hintShown: boolean;
  setSession: (token: string, user: AuthUser) => void;
  consumeJustLoggedIn: () => void;
  setOverviewOpen: (open: boolean) => void;
  setHintShown: (shown: boolean) => void;
  logout: () => void;
}

// عمداً persist نمی‌شود: طبق درخواست کارفرما، هر بار که برنامه بارگذاری می‌شود
// (رفرش، بستن و بازکردن تب، و غیره) باید صفحه‌ی ورود نمایش داده شود و کاربر تا
// وارد نکردن دوباره‌ی نام کاربری/رمز عبور نتواند وارد شود — یعنی نشست فقط در
// حافظه‌ی همان تب زنده می‌ماند، نه در localStorage.
export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  justLoggedIn: false,
  overviewOpen: false,
  hintShown: false,
  setSession: (token, user) => set({ token, user, justLoggedIn: true, hintShown: false }),
  consumeJustLoggedIn: () => set({ justLoggedIn: false }),
  setOverviewOpen: (open) => set({ overviewOpen: open }),
  setHintShown: (shown) => set({ hintShown: shown }),
  logout: () => set({ token: null, user: null, justLoggedIn: false, overviewOpen: false, hintShown: false }),
}));

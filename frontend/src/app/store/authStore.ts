import { create } from "zustand";

export interface AuthUser {
  username: string;
  displayName: string;
  displayRole: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
}

// عمداً persist نمی‌شود: طبق درخواست کارفرما، هر بار که برنامه بارگذاری می‌شود
// (رفرش، بستن و بازکردن تب، و غیره) باید صفحه‌ی ورود نمایش داده شود و کاربر تا
// وارد نکردن دوباره‌ی نام کاربری/رمز عبور نتواند وارد شود — یعنی نشست فقط در
// حافظه‌ی همان تب زنده می‌ماند، نه در localStorage.
export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  setSession: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),
}));

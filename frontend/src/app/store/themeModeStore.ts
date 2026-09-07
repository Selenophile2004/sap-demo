import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "dark" | "light";

interface ThemeModeState {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

// این ترجیح فقط یک تنظیم ظاهری است (نه نشست ورود)، پس برخلاف authStore عمداً
// persist می‌شود تا کاربر هر بار مجبور نباشد دوباره حالت روشن/تیره را انتخاب کند.
export const useThemeModeStore = create<ThemeModeState>()(
  persist(
    (set) => ({
      mode: "dark",
      toggleMode: () => set((s) => ({ mode: s.mode === "dark" ? "light" : "dark" })),
      setMode: (mode) => set({ mode }),
    }),
    { name: "ssap-theme-mode" }
  )
);

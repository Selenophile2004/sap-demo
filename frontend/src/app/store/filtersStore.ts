import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GlobalFiltersState {
  dateFrom: string | null; // "YYYY/MM/DD" شمسی — null یعنی بدون محدودیت
  dateTo: string | null;
  years: string[]; // مثل ["1404","1405"]
  months: string[]; // شماره ماه دو‌رقمی مثل ["01","02"]
  setDateRange: (from: string | null, to: string | null) => void;
  setYears: (years: string[]) => void;
  setMonths: (months: string[]) => void;
  clearAll: () => void;
  isActive: () => boolean;
}

export const useGlobalFilters = create<GlobalFiltersState>()(
  persist(
    (set, get) => ({
      dateFrom: null,
      dateTo: null,
      years: [],
      months: [],
      setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo, years: [], months: [] }),
      setYears: (years) => set({ years, dateFrom: null, dateTo: null }),
      setMonths: (months) => set({ months, dateFrom: null, dateTo: null }),
      clearAll: () => set({ dateFrom: null, dateTo: null, years: [], months: [] }),
      isActive: () => {
        const s = get();
        return !!(s.dateFrom || s.dateTo || s.years.length || s.months.length);
      },
    }),
    { name: "ssap-global-filters" }
  )
);

export const PERSIAN_MONTHS: { value: string; label: string }[] = [
  { value: "01", label: "فروردین" },
  { value: "02", label: "اردیبهشت" },
  { value: "03", label: "خرداد" },
  { value: "04", label: "تیر" },
  { value: "05", label: "مرداد" },
  { value: "06", label: "شهریور" },
  { value: "07", label: "مهر" },
  { value: "08", label: "آبان" },
  { value: "09", label: "آذر" },
  { value: "10", label: "دی" },
  { value: "11", label: "بهمن" },
  { value: "12", label: "اسفند" },
];

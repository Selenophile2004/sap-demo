import { create } from "zustand";
import { apiClient } from "../../lib/api/client";

export type EtlModuleMeta = Record<string, string> | null;

export interface EtlLastStatus {
  success: boolean;
  error?: string;
  ranAt: string;
  source: "manual" | "watcher";
}

interface EtlMetaState {
  meta: Record<string, EtlModuleMeta>;
  lastRunStatus: Record<string, EtlLastStatus>;
  loading: boolean;
  refreshing: boolean;
  fetchMeta: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  refresh: () => Promise<boolean>;
  latestUpdateJalali: () => string | null;
  failedModules: () => string[];
}

export const useEtlMetaStore = create<EtlMetaState>((set, get) => ({
  meta: {},
  lastRunStatus: {},
  loading: false,
  refreshing: false,

  fetchMeta: async () => {
    set({ loading: true });
    try {
      const { data } = await apiClient.get("/meta");
      set({ meta: data });
    } finally {
      set({ loading: false });
    }
  },

  fetchStatus: async () => {
    try {
      const { data } = await apiClient.get("/refresh/status");
      set({ lastRunStatus: data?.lastRunStatus ?? {} });
    } catch {
      // خطای شبکه در چک وضعیت نباید کل هدر را خراب کند؛ فقط نادیده گرفته می‌شود
    }
  },

  refresh: async () => {
    set({ refreshing: true });
    try {
      const { data } = await apiClient.post("/refresh", {});
      await Promise.all([get().fetchMeta(), get().fetchStatus()]);
      return Boolean(data?.success);
    } catch {
      return false;
    } finally {
      set({ refreshing: false });
    }
  },

  latestUpdateJalali: () => {
    const values = Object.values(get().meta)
      .map((m) => m?.generated_at_jalali)
      .filter((v): v is string => Boolean(v));
    if (!values.length) return null;
    return values.sort().at(-1) ?? null;
  },

  failedModules: () => {
    return Object.entries(get().lastRunStatus)
      .filter(([, s]) => s && !s.success)
      .map(([module]) => module);
  },
}));

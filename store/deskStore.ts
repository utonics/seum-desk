"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LogResult } from "@/lib/logParser";
import type { RegMap } from "@/lib/regmap";
import type { TimingReport } from "@/lib/timing";
import { idbStorage } from "@/lib/idbStorage";

export type DataSource = "sample" | "local";

export interface Loaded<T> {
  data: T;
  source: DataSource;
  label: string;
  /** 연 시각 (ISO). 복원된 데이터임을 보여 줄 때 쓴다 */
  loadedAt?: string;
}

interface DeskState {
  logs: Loaded<LogResult[]> | null;
  /** 직전에 열었던 회귀 실행. 새 로그를 열면 그때의 logs가 여기로 옮겨진다 (기준 고정 시 제외) */
  prevLogs: Loaded<LogResult[]> | null;
  /** true면 새 로그를 열어도 prevLogs를 바꾸지 않는다 */
  prevPinned: boolean;
  regmapFrom: Loaded<RegMap> | null;
  regmapTo: Loaded<RegMap> | null;
  timing: Loaded<TimingReport[]> | null;
  setLogs: (v: Loaded<LogResult[]> | null) => void;
  clearPrevLogs: () => void;
  setPrevPinned: (pinned: boolean) => void;
  /** 지금 열어 둔 로그를 비교 기준으로 삼는다 */
  useCurrentAsPrev: () => void;
  setRegmapFrom: (v: Loaded<RegMap> | null) => void;
  setRegmapTo: (v: Loaded<RegMap> | null) => void;
  setTiming: (v: Loaded<TimingReport[]> | null) => void;
  clearAll: () => void;
}

const stamp = <T,>(v: Loaded<T> | null): Loaded<T> | null => (v ? { ...v, loadedAt: v.loadedAt ?? new Date().toISOString() } : null);

export const STORAGE_KEY = "seum-desk-data";

export const useDeskStore = create<DeskState>()(
  persist(
    (set) => ({
      logs: null,
      prevLogs: null,
      prevPinned: false,
      regmapFrom: null,
      regmapTo: null,
      timing: null,
      setLogs: (logs) =>
        set((st) => ({
          logs: stamp(logs),
          prevLogs: !st.prevPinned && st.logs && logs ? st.logs : st.prevLogs,
        })),
      clearPrevLogs: () => set({ prevLogs: null, prevPinned: false }),
      setPrevPinned: (prevPinned) => set({ prevPinned }),
      useCurrentAsPrev: () => set((st) => (st.logs ? { prevLogs: st.logs, prevPinned: true } : {})),
      setRegmapFrom: (regmapFrom) => set({ regmapFrom: stamp(regmapFrom) }),
      setRegmapTo: (regmapTo) => set({ regmapTo: stamp(regmapTo) }),
      setTiming: (timing) => set({ timing: stamp(timing) }),
      clearAll: () => set({ logs: null, prevLogs: null, prevPinned: false, regmapFrom: null, regmapTo: null, timing: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        logs: s.logs,
        prevLogs: s.prevLogs,
        prevPinned: s.prevPinned,
        regmapFrom: s.regmapFrom,
        regmapTo: s.regmapTo,
        timing: s.timing,
      }),
    },
  ),
);

export function formatLoadedAt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

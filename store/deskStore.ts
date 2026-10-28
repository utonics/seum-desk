"use client";

import { create } from "zustand";
import type { LogResult } from "@/lib/logParser";
import type { RegMap } from "@/lib/regmap";
import type { TimingReport } from "@/lib/timing";

export type DataSource = "sample" | "local";

export interface Loaded<T> {
  data: T;
  source: DataSource;
  label: string;
}

interface DeskState {
  logs: Loaded<LogResult[]> | null;
  /** 직전에 열었던 회귀 실행. 새 로그를 열면 그때의 logs가 여기로 옮겨진다 */
  prevLogs: Loaded<LogResult[]> | null;
  regmapFrom: Loaded<RegMap> | null;
  regmapTo: Loaded<RegMap> | null;
  timing: Loaded<TimingReport[]> | null;
  setLogs: (v: Loaded<LogResult[]> | null) => void;
  clearPrevLogs: () => void;
  setRegmapFrom: (v: Loaded<RegMap> | null) => void;
  setRegmapTo: (v: Loaded<RegMap> | null) => void;
  setTiming: (v: Loaded<TimingReport[]> | null) => void;
}

export const useDeskStore = create<DeskState>((set) => ({
  logs: null,
  prevLogs: null,
  regmapFrom: null,
  regmapTo: null,
  timing: null,
  setLogs: (logs) => set((st) => ({ logs, prevLogs: st.logs && logs ? st.logs : st.prevLogs })),
  clearPrevLogs: () => set({ prevLogs: null }),
  setRegmapFrom: (regmapFrom) => set({ regmapFrom }),
  setRegmapTo: (regmapTo) => set({ regmapTo }),
  setTiming: (timing) => set({ timing }),
}));

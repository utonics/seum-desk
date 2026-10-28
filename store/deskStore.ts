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
  regmapFrom: Loaded<RegMap> | null;
  regmapTo: Loaded<RegMap> | null;
  timing: Loaded<TimingReport[]> | null;
  setLogs: (v: Loaded<LogResult[]> | null) => void;
  setRegmapFrom: (v: Loaded<RegMap> | null) => void;
  setRegmapTo: (v: Loaded<RegMap> | null) => void;
  setTiming: (v: Loaded<TimingReport[]> | null) => void;
}

export const useDeskStore = create<DeskState>((set) => ({
  logs: null,
  regmapFrom: null,
  regmapTo: null,
  timing: null,
  setLogs: (logs) => set({ logs }),
  setRegmapFrom: (regmapFrom) => set({ regmapFrom }),
  setRegmapTo: (regmapTo) => set({ regmapTo }),
  setTiming: (timing) => set({ timing }),
}));

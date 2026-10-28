/** 회귀 결과 요약 · 필터 · CSV 내보내기 */
import { toCsv } from "./csv";
import { FAIL_TYPES, type FailType, type LogResult, type TestResult } from "./logParser";

export interface FailTypeCount {
  type: FailType;
  count: number;
}

export interface RegressSummary {
  total: number;
  pass: number;
  fail: number;
  /** 0~1. total이 0이면 0 */
  passRate: number;
  /** 건수 내림차순, 같으면 FAIL_TYPES 순 */
  byFailType: FailTypeCount[];
  byTest: { test: string; total: number; fail: number }[];
}

export function summarize(results: ReadonlyArray<LogResult>): RegressSummary {
  const counts = new Map<FailType, number>();
  const tests = new Map<string, { total: number; fail: number }>();
  let pass = 0;
  for (const r of results) {
    if (r.result === "PASS") pass++;
    else if (r.failType) counts.set(r.failType, (counts.get(r.failType) ?? 0) + 1);
    const t = tests.get(r.test) ?? { total: 0, fail: 0 };
    t.total++;
    if (r.result === "FAIL") t.fail++;
    tests.set(r.test, t);
  }
  const byFailType = FAIL_TYPES.map((type) => ({ type, count: counts.get(type) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || FAIL_TYPES.indexOf(a.type) - FAIL_TYPES.indexOf(b.type));
  const total = results.length;
  return {
    total,
    pass,
    fail: total - pass,
    passRate: total === 0 ? 0 : pass / total,
    byFailType,
    byTest: [...tests.entries()]
      .map(([test, v]) => ({ test, ...v }))
      .sort((a, b) => a.test.localeCompare(b.test)),
  };
}

export interface RegressFilter {
  result: TestResult | "ALL";
  failType: FailType | "ALL";
  test: string | "ALL";
  query: string;
}

export const EMPTY_FILTER: RegressFilter = { result: "ALL", failType: "ALL", test: "ALL", query: "" };

export function applyFilter(results: ReadonlyArray<LogResult>, f: RegressFilter): LogResult[] {
  const q = f.query.trim().toLowerCase();
  return results.filter((r) => {
    if (f.result !== "ALL" && r.result !== f.result) return false;
    if (f.failType !== "ALL" && r.failType !== f.failType) return false;
    if (f.test !== "ALL" && r.test !== f.test) return false;
    if (q) {
      const hay = `${r.file} ${r.test} ${r.seed} ${r.firstError ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function resultsToCsv(results: ReadonlyArray<LogResult>): string {
  return toCsv(
    ["file", "test", "seed", "result", "fail_type", "first_error"],
    results.map((r) => [r.file, r.test, r.seed ?? "", r.result, r.failType ?? "", r.firstError ?? ""]),
  );
}

export function formatPercent(rate: number, digits = 1): string {
  return `${(rate * 100).toFixed(digits)}%`;
}

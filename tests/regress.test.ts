import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "@/lib/csv";
import type { LogResult } from "@/lib/logParser";
import { summarize, applyFilter, EMPTY_FILTER, resultsToCsv } from "@/lib/regress";

const answer = parseCsv(readFileSync(join(__dirname, "..", "samples", "정답_로그요약.csv"), "utf8"));
const results: LogResult[] = answer.map((r) => ({
  file: r.file,
  test: r.test,
  seed: Number(r.seed),
  result: r.result as LogResult["result"],
  failType: (r.fail_type || null) as LogResult["failType"],
  firstError: null,
}));

describe("regress summary", () => {
  it("정답지 기준 통과 88 / 실패 12, 유형별 건수", () => {
    const s = summarize(results);
    expect(s.total).toBe(100);
    expect(s.pass).toBe(88);
    expect(s.fail).toBe(12);
    expect(s.passRate).toBeCloseTo(0.88);
    expect(s.byFailType).toEqual([
      { type: "DATA_MISMATCH", count: 5 },
      { type: "RESET_SEQ", count: 4 },
      { type: "TIMEOUT", count: 2 },
      { type: "UNKNOWN", count: 1 },
    ]);
    expect(s.byTest).toHaveLength(10);
  });

  it("필터", () => {
    expect(applyFilter(results, { ...EMPTY_FILTER, result: "FAIL" })).toHaveLength(12);
    expect(applyFilter(results, { ...EMPTY_FILTER, failType: "RESET_SEQ" })).toHaveLength(4);
    expect(applyFilter(results, { ...EMPTY_FILTER, test: "fifo_basic" })).toHaveLength(12);
    expect(applyFilter(results, { ...EMPTY_FILTER, query: "532476" })).toHaveLength(1);
  });

  it("CSV 내보내기는 헤더 + 100행", () => {
    const csv = resultsToCsv(results);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).trimEnd().split("\r\n");
    expect(lines).toHaveLength(101);
    expect(lines[0]).toBe("file,test,seed,result,fail_type,first_error");
  });
});

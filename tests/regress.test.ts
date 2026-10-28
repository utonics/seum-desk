import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "@/lib/csv";
import type { LogResult } from "@/lib/logParser";
import { summarize, applyFilter, EMPTY_FILTER, resultsToCsv, normalizeError, groupByError, reproCommands } from "@/lib/regress";

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

describe("원인별 묶기 · 재현 명령 모음", () => {
  it("normalizeError는 숫자·16진값만 지운다", () => {
    expect(normalizeError("uvm_test_top.env.scoreboard [CMP] deq_data mismatch exp=0x011 got=0x176 id=2")).toBe(
      "uvm_test_top.env.scoreboard [CMP] deq_data mismatch exp=0x… got=0x… id=N",
    );
    expect(normalizeError("[TIMEOUT] no deq transfer within 2000 cycles (enq pending 16)")).toBe("[TIMEOUT] no deq transfer within N cycles (enq pending N)");
  });

  it("같은 원인끼리 묶고 건수 내림차순", () => {
    const withErr = results.map((r) =>
      r.result === "FAIL"
        ? { ...r, firstError: r.failType === "DATA_MISMATCH" ? `[CMP] mismatch exp=0x${r.seed} got=0x1` : r.failType === "TIMEOUT" ? "[TIMEOUT] within 2000 cycles" : `[RST] at cycle ${r.seed}` }
        : r,
    );
    const g = groupByError(withErr);
    expect(g.map((x) => [x.count, x.failType])).toEqual([[5, "DATA_MISMATCH"], [5, "RESET_SEQ"], [2, "TIMEOUT"]]);
    expect(g[0].examples).toHaveLength(3);
  });

  it("재현 명령 모음은 실패만, 중복 없이, 정렬", () => {
    const lines = reproCommands(results).split("\n");
    expect(lines).toHaveLength(12);
    expect(lines[0]).toBe("make sim TEST=fifo_basic SEED=175110");
    expect(lines.every((l) => l.startsWith("make sim TEST="))).toBe(true);
  });
});

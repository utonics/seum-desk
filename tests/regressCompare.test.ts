import { describe, it, expect } from "vitest";
import type { LogResult } from "@/lib/logParser";
import { compareRuns } from "@/lib/regressCompare";

const mk = (test: string, seed: number | null, result: "PASS" | "FAIL"): LogResult => ({
  file: `${test}_s${seed}.log`,
  test,
  seed,
  result,
  failType: result === "FAIL" ? "UNKNOWN" : null,
  firstError: null,
});

describe("compareRuns", () => {
  it("새로 실패·고쳐짐·여전히 실패·사라짐·추가를 가른다", () => {
    const prev = [mk("a", 1, "PASS"), mk("b", 2, "FAIL"), mk("c", 3, "FAIL"), mk("d", 4, "PASS")];
    const curr = [mk("a", 1, "FAIL"), mk("b", 2, "PASS"), mk("c", 3, "FAIL"), mk("e", 5, "FAIL"), mk("f", 6, "PASS")];
    const c = compareRuns(prev, curr);
    expect(c.newlyFailed.map((r) => r.test)).toEqual(["a", "e"]);
    expect(c.fixed.map((r) => r.test)).toEqual(["b"]);
    expect(c.stillFailing.map((r) => r.test)).toEqual(["c"]);
    expect(c.missing.map((r) => r.test)).toEqual(["d"]);
    expect(c.added.map((r) => r.test)).toEqual(["e", "f"]);
  });

  it("같은 실행끼리 비교하면 변화가 없다", () => {
    const run = [mk("a", 1, "PASS"), mk("b", 2, "FAIL")];
    const c = compareRuns(run, run);
    expect(c).toEqual({ newlyFailed: [], fixed: [], stillFailing: [run[1]], missing: [], added: [] });
  });

  it("시드 없는 로그는 테스트명만으로 맞춘다", () => {
    const c = compareRuns([mk("smoke", null, "FAIL")], [mk("smoke", null, "PASS")]);
    expect(c.fixed).toHaveLength(1);
  });
});

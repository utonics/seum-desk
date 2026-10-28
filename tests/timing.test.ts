import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTimingReport, summarizeBuild, buildTrend, normalizeGroup } from "@/lib/timing";

const DIR = join(__dirname, "..", "samples", "timing");
const answer = JSON.parse(readFileSync(join(DIR, "timing_정답.json"), "utf8")).builds as Record<
  string,
  { date: string; paths: number; wns: number; tns: number; violations: number; by_group: Record<string, { violations: number; wns: number }> }
>;
const reports = ["b101", "b102", "b103"].map((b) => parseTimingReport(readFileSync(join(DIR, `build_${b}.rpt`), "utf8"), `build_${b}.rpt`));

describe("timing", () => {
  it("빌드 3개가 정답지(timing_정답.json)와 모두 일치한다", () => {
    for (const r of reports) {
      const s = summarizeBuild(r);
      const a = answer[s.build];
      expect(a, s.build).toBeDefined();
      expect({ date: s.date, paths: s.paths, wns: s.wns, tns: s.tns, violations: s.violations, by_group: s.by_group }).toEqual(a);
    }
  });

  it("b102: CLK_BUS와 clk_bus를 같은 그룹으로 센다", () => {
    const b102 = reports[1];
    expect(b102.paths.filter((p) => p.groupRaw === "CLK_BUS")).toHaveLength(2);
    const s = summarizeBuild(b102);
    expect(Object.keys(s.by_group)).toEqual(["clk_bus", "clk_core", "clk_io"]);
    expect(s.groupAliases).toEqual({ clk_bus: ["CLK_BUS", "clk_bus"] });
    expect(normalizeGroup("  CLK_Core ")).toBe("clk_core");
  });

  it("선언된 Total paths와 실제 경로 수가 같다", () => {
    for (const r of reports) expect(r.declaredTotal).toBe(r.paths.length);
  });

  it("추이는 빌드 순", () => {
    const trend = buildTrend([reports[2], reports[0], reports[1]]);
    expect(trend.map((t) => t.build)).toEqual(["b101", "b102", "b103"]);
    expect(trend.map((t) => t.violations)).toEqual([9, 5, 1]);
  });
});

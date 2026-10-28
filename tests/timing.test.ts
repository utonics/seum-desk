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

describe("위반 경로 · endpoint 추적", () => {
  it("위반 경로는 정답지의 빌드별 위반 수 합(9+5+1)과 같고 최악 slack이 먼저", async () => {
    const { violatingPaths } = await import("@/lib/timing");
    const v = violatingPaths(reports);
    expect(v).toHaveLength(15);
    expect(v[0]).toMatchObject({ build: "b102", slack: -0.173, endpoint: "u_irq/irq_q_reg[27]" });
    expect(v.filter((p) => p.build === "b103")).toHaveLength(1);
  });

  it("endpoint 추적: b103에서 아직 위반인 것이 맨 앞", async () => {
    const { endpointHistory } = await import("@/lib/timing");
    const h = endpointHistory(reports);
    expect(h[0]).toMatchObject({ endpoint: "u_bus/rdata_q_reg[10]", stillViolating: true, violatedBuilds: 1 });
    expect(h[0].slackByBuild).toEqual({ b101: null, b102: null, b103: -0.116 });
    expect(h.filter((x) => x.stillViolating)).toHaveLength(1);
    // u_lat/max_hit_reg: b101 MET(+0.161), b102 VIOLATED(-0.170), b103 MET(최악 +0.046)
    const m = h.find((x) => x.endpoint === "u_lat/max_hit_reg")!;
    expect(m.slackByBuild).toEqual({ b101: 0.161, b102: -0.17, b103: 0.046 });
    expect(m.stillViolating).toBe(false);
  });
});

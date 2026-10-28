import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRegmapYaml } from "@/lib/regmap";
import { diffRegmaps, describeChanges } from "@/lib/regmapDiff";

const SAMPLES = join(__dirname, "..", "samples");
const v09 = parseRegmapYaml(readFileSync(join(SAMPLES, "seumlink_regs_v0.9.yaml"), "utf8"));
const v10 = parseRegmapYaml(readFileSync(join(SAMPLES, "seumlink_regs_v1.0.yaml"), "utf8"));

describe("diffRegmaps", () => {
  it("v0.9 → v1.0 비교가 정답지(regs_diff_정답.json)와 일치한다", () => {
    const answer = JSON.parse(readFileSync(join(SAMPLES, "regs_diff_정답.json"), "utf8"));
    delete answer["_설명"];
    const diff = diffRegmaps(v09, v10);
    expect(diff).toEqual(answer);
  });

  it("같은 맵은 변경이 없다", () => {
    const d = diffRegmaps(v10, v10);
    expect(d.summary).toEqual({ added: 0, changed: 0, removed: 0 });
  });

  it("역방향(v1.0 → v0.9)은 삭제 1 · 변경 2", () => {
    const d = diffRegmaps(v10, v09);
    expect(d.summary).toEqual({ added: 0, changed: 2, removed: 1 });
    expect(d.removed[0].register).toBe("INT_MASK");
    expect(d.changed.map((c) => c.change)).toEqual(["필드 삭제", "기본값"]);
  });

  it("VERSION 제외를 끄면 VERSION 기본값 변경이 잡힌다", () => {
    const d = diffRegmaps(v09, v10, { excludeRegisters: [] });
    expect(d.excluded).toEqual([]);
    expect(d.changed.filter((c) => c.register === "VERSION").map((c) => c.field)).toEqual(["MINOR", "MAJOR"]);
  });

  it("설명 문구 변경은 기본으로 세지 않고, 옵션을 끄면 센다", () => {
    const d1 = diffRegmaps(v09, v10);
    expect(d1.changed.some((c) => c.change === "설명")).toBe(false);
    const d2 = diffRegmaps(v09, v10, { ignoreDesc: false });
    // LAT_MAX.MAX desc: "기본 20" → "기본 24 (v1.0 변경)"
    expect(d2.changed.some((c) => c.change === "설명" && c.field === "MAX")).toBe(true);
  });

  it("describeChanges는 추가·변경 순으로 한 줄씩", () => {
    const lines = describeChanges(diffRegmaps(v09, v10));
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("INT_MASK");
    expect(lines[1]).toContain("IRQ.OVF");
    expect(lines[2]).toContain("20 → 24");
  });
});

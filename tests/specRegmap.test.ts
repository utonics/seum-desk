import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSpec } from "@/lib/spec";
import { parseRegmapYaml } from "@/lib/regmap";
import { extractSpecRegmap, crossCheck } from "@/lib/specRegmap";

const S = join(__dirname, "..", "samples");
const doc = parseSpec(readFileSync(join(S, "02_SeumLink-F_인터페이스_명세서_v0.9.md"), "utf8"));
const v09 = parseRegmapYaml(readFileSync(join(S, "seumlink_regs_v0.9.yaml"), "utf8"));
const v10 = parseRegmapYaml(readFileSync(join(S, "seumlink_regs_v1.0.yaml"), "utf8"));

describe("extractSpecRegmap", () => {
  it("§10 표에서 레지스터 6개·베이스 주소를 읽는다", () => {
    const s = extractSpecRegmap(doc)!;
    expect(s.section).toBe("10");
    expect(s.baseAddr).toBe(0x40001000);
    expect(s.registers.map((r) => [r.name, r.offset])).toEqual([
      ["CTRL", 0x00], ["STATUS", 0x04], ["FIFO_LEVEL", 0x08], ["IRQ", 0x0c], ["LAT_MAX", 0x10], ["VERSION", 0x1c],
    ]);
    const ctrl = s.registers[0];
    expect(ctrl.fields.map((f) => [f.name, f.msb, f.lsb, f.access, f.reset])).toEqual([
      ["EN", 0, 0, "RW", 0], ["MODE", 2, 1, "RW", 1], ["FLUSH", 3, 3, "WO", 0],
    ]);
    // 접근·리셋값이 하나만 적힌 행은 모든 필드에 적용
    const irq = s.registers[3];
    expect(irq.fields.map((f) => [f.name, f.access, f.reset])).toEqual([["DONE", "W1C", 0], ["ERR", "W1C", 0], ["LAT", "W1C", 0]]);
    expect(s.registers[5].fields.map((f) => f.reset)).toEqual([0x09, 0x00]);
  });

  it("레지스터 맵 절이 없으면 null", () => {
    expect(extractSpecRegmap(parseSpec("# x\n\n## 1. 개요\n\n글\n"))).toBeNull();
  });
});

describe("crossCheck", () => {
  it("명세 v0.9 ↔ YAML v0.9는 불일치가 없다", () => {
    expect(crossCheck(extractSpecRegmap(doc)!, v09)).toEqual([]);
  });

  it("명세 v0.9 ↔ YAML v1.0: INT_MASK·OVF·LAT_MAX 리셋·VERSION 리셋이 어긋난다", () => {
    const m = crossCheck(extractSpecRegmap(doc)!, v10);
    const keys = m.map((x) => `${x.kind}:${x.register}${x.field ? "." + x.field : ""}`).sort();
    expect(keys).toEqual([
      "FIELD_ONLY_IN_YAML:IRQ.OVF",
      "REG_ONLY_IN_YAML:INT_MASK",
      "RESET:LAT_MAX.MAX",
      "RESET:VERSION.MAJOR",
      "RESET:VERSION.MINOR",
    ]);
    const lat = m.find((x) => x.kind === "RESET" && x.register === "LAT_MAX")!;
    expect([lat.spec, lat.yaml]).toEqual(["20", "24"]);
    expect(lat.line).toBeGreaterThan(0);
  });
});

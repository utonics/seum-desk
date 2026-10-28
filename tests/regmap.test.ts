import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRegmapYaml, validateRegmap, parseBits, hex } from "@/lib/regmap";

const SAMPLES = join(__dirname, "..", "samples");
const v09 = readFileSync(join(SAMPLES, "seumlink_regs_v0.9.yaml"), "utf8");
const v10 = readFileSync(join(SAMPLES, "seumlink_regs_v1.0.yaml"), "utf8");

describe("parseRegmapYaml", () => {
  it("v0.9: 레지스터 6개, 주소 계산", () => {
    const m = parseRegmapYaml(v09);
    expect(m.block).toBe("seumlink_f");
    expect(m.baseAddr).toBe(0x40001000);
    expect(m.dataWidth).toBe(32);
    expect(m.registers.map((r) => r.name)).toEqual(["CTRL", "STATUS", "FIFO_LEVEL", "IRQ", "LAT_MAX", "VERSION"]);
    expect(m.registers.map((r) => r.offset)).toEqual([0x00, 0x04, 0x08, 0x0c, 0x10, 0x1c]);
    expect(hex(m.registers[5].address)).toBe("0x4000101C");

    const ctrl = m.registers[0];
    expect(ctrl.fields.map((f) => [f.name, f.msb, f.lsb, f.access, f.reset])).toEqual([
      ["EN", 0, 0, "RW", 0],
      ["MODE", 2, 1, "RW", 1],
      ["FLUSH", 3, 3, "WO", 0],
    ]);
    expect(ctrl.fields[1].desc).toBe("0 bypass, 1 normal, 2 hold");
    const ver = m.registers[5];
    expect(ver.fields.map((f) => f.reset)).toEqual([0x09, 0x00]);
    expect(ver.fields[1].desc).toBe("");
  });

  it("v1.0: 레지스터 7개, INT_MASK 포함, IRQ 필드 4개", () => {
    const m = parseRegmapYaml(v10);
    expect(m.registers).toHaveLength(7);
    const irq = m.registers.find((r) => r.name === "IRQ")!;
    expect(irq.fields.map((f) => f.name)).toEqual(["DONE", "ERR", "LAT", "OVF"]);
    const mask = m.registers.find((r) => r.name === "INT_MASK")!;
    expect(mask.offset).toBe(0x14);
    expect(mask.fields.map((f) => f.name)).toEqual(["DONE_M", "ERR_M", "LAT_M"]);
    expect(m.registers.find((r) => r.name === "LAT_MAX")!.fields[0].reset).toBe(24);
  });

  it("parseBits", () => {
    expect(parseBits("7:0", "x")).toEqual([7, 0]);
    expect(parseBits("0:7", "x")).toEqual([7, 0]);
    expect(parseBits("3", "x")).toEqual([3, 3]);
    expect(parseBits(5, "x")).toEqual([5, 5]);
    expect(() => parseBits("a", "x")).toThrow();
  });
});

describe("validateRegmap", () => {
  it("샘플 두 버전은 문제가 없다", () => {
    expect(validateRegmap(parseRegmapYaml(v09))).toEqual([]);
    expect(validateRegmap(parseRegmapYaml(v10))).toEqual([]);
  });

  it("비트 겹침·32비트 초과·오프셋 중복·리셋값 초과를 잡는다", () => {
    const bad = `
block: t
base_addr: 0x0
data_width: 32
registers:
  - name: A
    offset: 0x00
    fields:
      - {name: X, bits: "3:0", access: RW, reset: 0}
      - {name: Y, bits: "5:2", access: RW, reset: 0}
      - {name: Z, bits: "33:31", access: RW, reset: 0}
      - {name: W, bits: "8", access: RW, reset: 2}
  - name: B
    offset: 0x00
    fields:
      - {name: Q, bits: "0", access: XX, reset: 0}
`;
    const issues = validateRegmap(parseRegmapYaml(bad));
    const kinds = issues.map((i) => i.kind).sort();
    expect(kinds).toEqual(["BAD_ACCESS", "DUP_OFFSET", "FIELD_OUT_OF_RANGE", "FIELD_OVERLAP", "RESET_TOO_WIDE"]);
    expect(issues.find((i) => i.kind === "FIELD_OVERLAP")).toMatchObject({ register: "A", field: "Y" });
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRegmapYaml } from "@/lib/regmap";
import { generateCHeader, generateVerilog } from "@/lib/regmapCodegen";

const v09 = parseRegmapYaml(readFileSync(join(__dirname, "..", "samples", "seumlink_regs_v0.9.yaml"), "utf8"));

describe("codegen", () => {
  it("C 헤더: 베이스·오프셋·필드 매크로", () => {
    const h = generateCHeader(v09);
    expect(h).toContain("#define SEUMLINK_F_BASE_ADDR 0x40001000U");
    expect(h).toContain("#define SEUMLINK_F_IRQ_OFFSET 0x0CU");
    expect(h).toContain("#define SEUMLINK_F_CTRL_MODE_SHIFT 1U");
    expect(h).toContain("#define SEUMLINK_F_CTRL_MODE_WIDTH 2U");
    expect(h).toContain("#define SEUMLINK_F_CTRL_MODE_MASK (0x03U << SEUMLINK_F_CTRL_MODE_SHIFT)");
    expect(h).toContain("#define SEUMLINK_F_LAT_MAX_MAX_RESET 0x14U");
    expect(h.trim().endsWith("#endif /* SEUMLINK_F_REGS_H */")).toBe(true);
  });

  it("Verilog: localparam", () => {
    const v = generateVerilog(v09);
    expect(v).toContain("localparam [31:0] SEUMLINK_F_BASE_ADDR = 32'h40001000;");
    expect(v).toContain("localparam [7:0] SEUMLINK_F_VERSION_OFFSET = 8'h1C;");
    expect(v).toContain("localparam integer SEUMLINK_F_STATUS_EMPTY_LSB = 1;");
    expect(v).toContain("localparam [7:0] SEUMLINK_F_LAT_MAX_MAX_RESET = 8'h14;  // RW");
  });
});

/** 레지스터 맵 → C 헤더 · Verilog 매개변수 텍스트 생성 */
import { fieldWidth, hex, type RegMap } from "./regmap";

function ident(s: string): string {
  return s.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
}

function mask(width: number): number {
  // 32비트 전체도 안전하게 (BigInt 리터럴 금지 — tsconfig ES2017)
  return width >= 32 ? 0xffffffff : (2 ** width - 1) >>> 0;
}

export function generateCHeader(map: RegMap): string {
  const blk = ident(map.block);
  const L: string[] = [];
  L.push(`/* ${map.block} 레지스터 맵 — 세움 데스크 자동 생성. 손으로 고치지 말 것. */`);
  L.push(`#ifndef ${blk}_REGS_H`);
  L.push(`#define ${blk}_REGS_H`);
  L.push("");
  L.push(`#define ${blk}_BASE_ADDR ${hex(map.baseAddr)}U`);
  L.push("");
  for (const r of map.registers) {
    const rn = `${blk}_${ident(r.name)}`;
    L.push(`/* ${r.name}${r.desc ? ` — ${r.desc}` : ""} */`);
    L.push(`#define ${rn}_OFFSET ${hex(r.offset, 2)}U`);
    L.push(`#define ${rn}_ADDR (${blk}_BASE_ADDR + ${rn}_OFFSET)`);
    for (const f of r.fields) {
      const fn = `${rn}_${ident(f.name)}`;
      const w = fieldWidth(f);
      L.push(`#define ${fn}_SHIFT ${f.lsb}U`);
      L.push(`#define ${fn}_WIDTH ${w}U`);
      L.push(`#define ${fn}_MASK (${hex(mask(w), w > 16 ? 8 : w > 8 ? 4 : 2)}U << ${fn}_SHIFT)`);
      L.push(`#define ${fn}_RESET ${hex(f.reset, w > 16 ? 8 : w > 8 ? 4 : 2)}U`);
    }
    L.push("");
  }
  L.push(`#endif /* ${blk}_REGS_H */`);
  return L.join("\n") + "\n";
}

export function generateVerilog(map: RegMap): string {
  const blk = ident(map.block);
  const aw = map.addrWidth;
  const L: string[] = [];
  L.push(`// ${map.block} 레지스터 맵 — 세움 데스크 자동 생성. 손으로 고치지 말 것.`);
  L.push(`\`ifndef ${blk}_REGS_VH`);
  L.push(`\`define ${blk}_REGS_VH`);
  L.push("");
  L.push(`localparam [31:0] ${blk}_BASE_ADDR = 32'h${map.baseAddr.toString(16).toUpperCase().padStart(8, "0")};`);
  L.push("");
  for (const r of map.registers) {
    const rn = `${blk}_${ident(r.name)}`;
    L.push(`// ${r.name}${r.desc ? ` — ${r.desc}` : ""}`);
    L.push(`localparam [${aw - 1}:0] ${rn}_OFFSET = ${aw}'h${r.offset.toString(16).toUpperCase().padStart(Math.ceil(aw / 4), "0")};`);
    for (const f of r.fields) {
      const fn = `${rn}_${ident(f.name)}`;
      const w = fieldWidth(f);
      L.push(`localparam integer ${fn}_LSB = ${f.lsb};`);
      L.push(`localparam integer ${fn}_MSB = ${f.msb};`);
      L.push(`localparam [${w - 1}:0] ${fn}_RESET = ${w}'h${f.reset.toString(16).toUpperCase()};  // ${f.access}`);
    }
    L.push("");
  }
  L.push("`endif");
  return L.join("\n") + "\n";
}

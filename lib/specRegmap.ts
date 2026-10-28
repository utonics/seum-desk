/**
 * 명세서 §10 레지스터 맵 표 ↔ 레지스터 YAML 교차 검사.
 * 명세 표 한 행: | 오프셋 | 이름 | 필드 (비트) | 접근 | 리셋값 | 설명 |
 *   예) | 0x0C | IRQ | DONE(0) · ERR(1) · LAT(2) | W1C | 0 | … |
 * 접근·리셋값이 하나만 적혀 있으면 모든 필드에 같은 값으로 본다.
 */
import { bitsLabel, parseBits, type RegMap } from "./regmap";
import type { SpecDoc } from "./spec";

export interface SpecField {
  name: string;
  msb: number;
  lsb: number;
  access: string;
  reset: number | null;
}

export interface SpecRegister {
  name: string;
  offset: number;
  fields: SpecField[];
  /** 명세서 줄 번호 (0부터) */
  line: number;
}

export interface SpecRegmap {
  section: string;
  baseAddr: number | null;
  registers: SpecRegister[];
}

function splitCells(row: string): string[] {
  const t = row.trim();
  if (!t.startsWith("|")) return [];
  return t
    .slice(1, t.endsWith("|") ? -1 : undefined)
    .split("|")
    .map((c) => c.trim());
}

function parseNumber(s: string): number | null {
  const t = s.trim().replace(/_/g, "");
  if (/^0x[0-9a-fA-F]+$/.test(t)) return parseInt(t, 16);
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  return null;
}

const DOT = /\s*[·•,]\s*/;

/** 명세서에서 레지스터 맵 표를 찾아 구조화한다. 표가 없으면 null. */
export function extractSpecRegmap(doc: SpecDoc): SpecRegmap | null {
  const sec = doc.sections.find((s) => /레지스터\s*맵|register\s*map/i.test(s.title));
  if (!sec) return null;
  const baseM = /0x[0-9a-fA-F_]+/.exec(sec.title);
  const baseAddr = baseM ? parseNumber(baseM[0]) : null;

  const registers: SpecRegister[] = [];
  for (const p of doc.paragraphs) {
    if (p.section !== sec.num) continue;
    const lines = p.text.split("\n");
    if (!lines[0].trim().startsWith("|")) continue;
    const header = splitCells(lines[0]).map((h) => h.toLowerCase());
    const col = (re: RegExp) => header.findIndex((h) => re.test(h));
    const ci = {
      offset: col(/오프셋|offset/),
      name: col(/이름|name/),
      fields: col(/필드|field/),
      access: col(/접근|access/),
      reset: col(/리셋|reset/),
    };
    if (ci.offset < 0 || ci.name < 0 || ci.fields < 0) continue;

    lines.slice(1).forEach((row, i) => {
      const cells = splitCells(row);
      if (cells.length === 0 || /^-+$/.test(cells[0])) return;
      const offset = parseNumber(cells[ci.offset] ?? "");
      const name = (cells[ci.name] ?? "").trim();
      if (offset === null || !name) return;
      const fieldSpecs = (cells[ci.fields] ?? "").split(DOT).filter(Boolean);
      const accesses = ci.access >= 0 ? (cells[ci.access] ?? "").split(DOT).filter(Boolean) : [];
      const resets = ci.reset >= 0 ? (cells[ci.reset] ?? "").split(DOT).filter(Boolean) : [];
      const pick = (arr: string[], k: number) => (arr.length === 1 ? arr[0] : (arr[k] ?? ""));
      const fields: SpecField[] = [];
      fieldSpecs.forEach((fs, k) => {
        const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)$/.exec(fs.trim());
        if (!m) return;
        let msb: number;
        let lsb: number;
        try {
          [msb, lsb] = parseBits(m[2], `${name}.${m[1]}`);
        } catch {
          return;
        }
        const resetRaw = pick(resets, k);
        fields.push({ name: m[1], msb, lsb, access: pick(accesses, k).trim(), reset: resetRaw ? parseNumber(resetRaw) : null });
      });
      registers.push({ name, offset, fields, line: p.line + 1 + i });
    });
  }
  return { section: sec.num, baseAddr, registers };
}

export type MismatchKind =
  | "REG_ONLY_IN_SPEC"
  | "REG_ONLY_IN_YAML"
  | "OFFSET"
  | "FIELD_ONLY_IN_SPEC"
  | "FIELD_ONLY_IN_YAML"
  | "BITS"
  | "ACCESS"
  | "RESET"
  | "BASE_ADDR";

export interface Mismatch {
  kind: MismatchKind;
  register: string;
  field?: string;
  spec: string;
  yaml: string;
  /** 명세서 줄 번호 (0부터). 없으면 undefined */
  line?: number;
}

const hex = (n: number) => "0x" + n.toString(16).toUpperCase().padStart(2, "0");

export function crossCheck(spec: SpecRegmap, map: RegMap): Mismatch[] {
  const out: Mismatch[] = [];
  if (spec.baseAddr !== null && spec.baseAddr !== map.baseAddr) {
    out.push({ kind: "BASE_ADDR", register: "(베이스)", spec: hex(spec.baseAddr), yaml: hex(map.baseAddr) });
  }
  const yamlByName = new Map(map.registers.map((r) => [r.name, r]));
  const specNames = new Set(spec.registers.map((r) => r.name));

  for (const s of spec.registers) {
    const y = yamlByName.get(s.name);
    if (!y) {
      out.push({ kind: "REG_ONLY_IN_SPEC", register: s.name, spec: hex(s.offset), yaml: "없음", line: s.line });
      continue;
    }
    if (s.offset !== y.offset) out.push({ kind: "OFFSET", register: s.name, spec: hex(s.offset), yaml: hex(y.offset), line: s.line });
    const yf = new Map(y.fields.map((f) => [f.name, f]));
    for (const sf of s.fields) {
      const f = yf.get(sf.name);
      if (!f) {
        out.push({ kind: "FIELD_ONLY_IN_SPEC", register: s.name, field: sf.name, spec: `[${bitsLabel(sf)}]`, yaml: "없음", line: s.line });
        continue;
      }
      if (sf.msb !== f.msb || sf.lsb !== f.lsb) out.push({ kind: "BITS", register: s.name, field: sf.name, spec: `[${bitsLabel(sf)}]`, yaml: `[${bitsLabel(f)}]`, line: s.line });
      if (sf.access && sf.access !== f.access) out.push({ kind: "ACCESS", register: s.name, field: sf.name, spec: sf.access, yaml: String(f.access), line: s.line });
      if (sf.reset !== null && sf.reset !== f.reset) out.push({ kind: "RESET", register: s.name, field: sf.name, spec: String(sf.reset), yaml: String(f.reset), line: s.line });
    }
    for (const f of y.fields) {
      if (!s.fields.some((sf) => sf.name === f.name)) {
        out.push({ kind: "FIELD_ONLY_IN_YAML", register: s.name, field: f.name, spec: "없음", yaml: `[${bitsLabel(f)}] ${f.access}`, line: s.line });
      }
    }
  }
  for (const y of map.registers) {
    if (!specNames.has(y.name)) out.push({ kind: "REG_ONLY_IN_YAML", register: y.name, spec: "없음", yaml: hex(y.offset) });
  }
  return out;
}

export const MISMATCH_LABEL: Record<MismatchKind, string> = {
  REG_ONLY_IN_SPEC: "명세에만 있음",
  REG_ONLY_IN_YAML: "YAML에만 있음",
  OFFSET: "오프셋 다름",
  FIELD_ONLY_IN_SPEC: "필드가 명세에만",
  FIELD_ONLY_IN_YAML: "필드가 YAML에만",
  BITS: "비트 다름",
  ACCESS: "접근 다름",
  RESET: "리셋값 다름",
  BASE_ADDR: "베이스 주소 다름",
};

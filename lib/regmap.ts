/**
 * 레지스터 맵 모델 · YAML 파서 · 검증기.
 */
import { parseYaml, type YamlValue } from "./yamlLite";

export const ACCESS_TYPES = ["RW", "RO", "WO", "W1C"] as const;
export type Access = (typeof ACCESS_TYPES)[number];

export interface Field {
  name: string;
  /** 최상위 비트 (포함) */
  msb: number;
  /** 최하위 비트 (포함) */
  lsb: number;
  access: Access | string;
  reset: number;
  desc: string;
}

export interface Register {
  name: string;
  /** 베이스 기준 오프셋(바이트) */
  offset: number;
  /** base_addr + offset */
  address: number;
  desc: string;
  fields: Field[];
}

export interface RegMap {
  block: string;
  baseAddr: number;
  dataWidth: number;
  addrWidth: number;
  registers: Register[];
}

export class RegmapParseError extends Error {}

type Obj = { [k: string]: YamlValue };

function isObj(v: YamlValue): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asNumber(v: YamlValue, what: string): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (/^0x[0-9a-fA-F]+$/.test(t)) return parseInt(t, 16);
    if (/^\d+$/.test(t)) return parseInt(t, 10);
  }
  throw new RegmapParseError(`${what}: 숫자가 아님 (${String(v)})`);
}

function asString(v: YamlValue, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

/** "7:0" → [7, 0], "3" → [3, 3] */
export function parseBits(spec: string | number, what: string): [number, number] {
  const s = String(spec).trim();
  const range = /^(\d+)\s*:\s*(\d+)$/.exec(s);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    return [Math.max(a, b), Math.min(a, b)];
  }
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return [n, n];
  }
  throw new RegmapParseError(`${what}: 비트 표기 오류 (${s})`);
}

export function fieldWidth(f: Pick<Field, "msb" | "lsb">): number {
  return f.msb - f.lsb + 1;
}

export function bitsLabel(f: Pick<Field, "msb" | "lsb">): string {
  return f.msb === f.lsb ? `${f.msb}` : `${f.msb}:${f.lsb}`;
}

export function parseRegmapYaml(src: string): RegMap {
  const root = parseYaml(src);
  if (!isObj(root)) throw new RegmapParseError("최상위가 매핑이 아님");
  const baseAddr = asNumber(root.base_addr ?? 0, "base_addr");
  const dataWidth = asNumber(root.data_width ?? 32, "data_width");
  const addrWidth = asNumber(root.addr_width ?? 8, "addr_width");
  const regsRaw = root.registers;
  if (!Array.isArray(regsRaw)) throw new RegmapParseError("registers 목록이 없음");

  const registers: Register[] = regsRaw.map((r, ri) => {
    if (!isObj(r)) throw new RegmapParseError(`registers[${ri}]가 매핑이 아님`);
    const name = asString(r.name);
    if (!name) throw new RegmapParseError(`registers[${ri}]: name이 없음`);
    const offset = asNumber(r.offset ?? 0, `${name}.offset`);
    const fieldsRaw = Array.isArray(r.fields) ? r.fields : [];
    const fields: Field[] = fieldsRaw.map((f, fi) => {
      if (!isObj(f)) throw new RegmapParseError(`${name}.fields[${fi}]가 매핑이 아님`);
      const fname = asString(f.name);
      if (!fname) throw new RegmapParseError(`${name}.fields[${fi}]: name이 없음`);
      const [msb, lsb] = parseBits(
        typeof f.bits === "number" || typeof f.bits === "string" ? f.bits : "",
        `${name}.${fname}.bits`,
      );
      return {
        name: fname,
        msb,
        lsb,
        access: asString(f.access, "RW"),
        reset: f.reset === null || f.reset === undefined ? 0 : asNumber(f.reset, `${name}.${fname}.reset`),
        desc: asString(f.desc),
      };
    });
    return {
      name,
      offset,
      address: baseAddr + offset,
      desc: asString(r.desc),
      fields,
    };
  });

  return {
    block: asString(root.block, "block"),
    baseAddr,
    dataWidth,
    addrWidth,
    registers,
  };
}

// ---------------------------------------------------------------- 검증기

export type IssueKind =
  | "FIELD_OVERLAP"
  | "FIELD_OUT_OF_RANGE"
  | "DUP_OFFSET"
  | "DUP_FIELD_NAME"
  | "RESET_TOO_WIDE"
  | "BAD_ACCESS";

export interface Issue {
  kind: IssueKind;
  register: string;
  field?: string;
  message: string;
}

export function validateRegmap(map: RegMap): Issue[] {
  const issues: Issue[] = [];
  const seenOffsets = new Map<number, string>();

  for (const reg of map.registers) {
    const prev = seenOffsets.get(reg.offset);
    if (prev !== undefined) {
      issues.push({
        kind: "DUP_OFFSET",
        register: reg.name,
        message: `오프셋 0x${reg.offset.toString(16).toUpperCase()}이(가) ${prev}와 겹침`,
      });
    } else {
      seenOffsets.set(reg.offset, reg.name);
    }

    const names = new Set<string>();
    const sorted = [...reg.fields].sort((a, b) => a.lsb - b.lsb);
    for (let i = 0; i < sorted.length; i++) {
      const f = sorted[i];
      if (names.has(f.name)) {
        issues.push({ kind: "DUP_FIELD_NAME", register: reg.name, field: f.name, message: `필드 이름 중복: ${f.name}` });
      }
      names.add(f.name);

      if (f.msb >= map.dataWidth || f.lsb < 0) {
        issues.push({
          kind: "FIELD_OUT_OF_RANGE",
          register: reg.name,
          field: f.name,
          message: `[${bitsLabel(f)}]가 ${map.dataWidth}비트를 넘음`,
        });
      }
      if (!ACCESS_TYPES.includes(f.access as Access)) {
        issues.push({ kind: "BAD_ACCESS", register: reg.name, field: f.name, message: `알 수 없는 접근 속성: ${f.access}` });
      }
      const width = fieldWidth(f);
      if (width < 31 && f.reset >= 2 ** width) {
        issues.push({
          kind: "RESET_TOO_WIDE",
          register: reg.name,
          field: f.name,
          message: `리셋값 ${f.reset}이(가) ${width}비트에 안 들어감`,
        });
      }
      if (i > 0) {
        const p = sorted[i - 1];
        if (f.lsb <= p.msb) {
          issues.push({
            kind: "FIELD_OVERLAP",
            register: reg.name,
            field: f.name,
            message: `${p.name}[${bitsLabel(p)}]와 ${f.name}[${bitsLabel(f)}] 비트가 겹침`,
          });
        }
      }
    }
  }
  return issues;
}

export function hex(n: number, digits = 8): string {
  return "0x" + n.toString(16).toUpperCase().padStart(digits, "0");
}

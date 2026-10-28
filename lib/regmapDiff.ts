/**
 * 레지스터 맵 두 버전의 변경점 비교 (추가 · 변경 · 삭제).
 * 사람이 정한 규칙(결정 로그 참고):
 *  - VERSION 레지스터는 '버전 표기'라 비교에서 뺀다 (excludeRegisters).
 *  - 설명 문구(desc) 변경은 세지 않는다 (ignoreDesc).
 */
import { bitsLabel, type Field, type RegMap, type Register } from "./regmap";

export interface DiffOptions {
  excludeRegisters: string[];
  ignoreDesc: boolean;
}

export const DEFAULT_DIFF_OPTIONS: DiffOptions = {
  excludeRegisters: ["VERSION"],
  ignoreDesc: true,
};

export interface AddedRegister {
  register: string;
  offset: string;
  fields: string[];
}

export type ChangeKind = "필드 추가" | "필드 삭제" | "기본값" | "비트" | "접근" | "오프셋" | "설명";

export interface ChangeEntry {
  register: string;
  offset: string;
  change: ChangeKind;
  field?: string;
  bits?: string;
  access?: string;
  from?: string | number;
  to?: string | number;
}

export interface RegmapDiff {
  summary: { added: number; changed: number; removed: number };
  added: AddedRegister[];
  changed: ChangeEntry[];
  removed: AddedRegister[];
  excluded: { register: string; reason: string }[];
}

function offsetHex(n: number): string {
  return "0x" + n.toString(16).toUpperCase().padStart(2, "0");
}

function regSummary(r: Register): AddedRegister {
  return { register: r.name, offset: offsetHex(r.offset), fields: r.fields.map((f) => f.name) };
}

function diffFields(reg: Register, from: Field[], to: Field[], opts: DiffOptions): ChangeEntry[] {
  const out: ChangeEntry[] = [];
  const offset = offsetHex(reg.offset);
  const toMap = new Map(to.map((f) => [f.name, f]));
  const fromMap = new Map(from.map((f) => [f.name, f]));

  for (const f of from) {
    const n = toMap.get(f.name);
    if (!n) {
      out.push({ register: reg.name, offset, change: "필드 삭제", field: f.name, bits: bitsLabel(f), access: String(f.access) });
      continue;
    }
    if (bitsLabel(f) !== bitsLabel(n)) {
      out.push({ register: reg.name, offset, change: "비트", field: f.name, from: bitsLabel(f), to: bitsLabel(n) });
    }
    if (f.access !== n.access) {
      out.push({ register: reg.name, offset, change: "접근", field: f.name, from: String(f.access), to: String(n.access) });
    }
    if (f.reset !== n.reset) {
      out.push({ register: reg.name, offset, change: "기본값", field: f.name, from: f.reset, to: n.reset });
    }
    if (!opts.ignoreDesc && f.desc !== n.desc) {
      out.push({ register: reg.name, offset, change: "설명", field: f.name, from: f.desc, to: n.desc });
    }
  }
  for (const n of to) {
    if (!fromMap.has(n.name)) {
      out.push({ register: reg.name, offset, change: "필드 추가", field: n.name, bits: bitsLabel(n), access: String(n.access) });
    }
  }
  return out;
}

export function diffRegmaps(from: RegMap, to: RegMap, options: Partial<DiffOptions> = {}): RegmapDiff {
  const opts: DiffOptions = { ...DEFAULT_DIFF_OPTIONS, ...options };
  const excludedSet = new Set(opts.excludeRegisters.map((s) => s.toUpperCase()));
  const isExcluded = (name: string) => excludedSet.has(name.toUpperCase());

  const fromRegs = from.registers.filter((r) => !isExcluded(r.name));
  const toRegs = to.registers.filter((r) => !isExcluded(r.name));
  const toMap = new Map(toRegs.map((r) => [r.name, r]));
  const fromMap = new Map(fromRegs.map((r) => [r.name, r]));

  const added: AddedRegister[] = [];
  const removed: AddedRegister[] = [];
  const changed: ChangeEntry[] = [];

  for (const r of fromRegs) {
    const n = toMap.get(r.name);
    if (!n) {
      removed.push(regSummary(r));
      continue;
    }
    if (r.offset !== n.offset) {
      changed.push({ register: r.name, offset: offsetHex(n.offset), change: "오프셋", from: offsetHex(r.offset), to: offsetHex(n.offset) });
    }
    if (!opts.ignoreDesc && r.desc !== n.desc) {
      changed.push({ register: r.name, offset: offsetHex(n.offset), change: "설명", from: r.desc, to: n.desc });
    }
    changed.push(...diffFields(n, r.fields, n.fields, opts));
  }
  for (const n of toRegs) {
    if (!fromMap.has(n.name)) added.push(regSummary(n));
  }

  const excludedNames = new Set<string>();
  for (const r of [...from.registers, ...to.registers]) {
    if (isExcluded(r.name)) excludedNames.add(r.name);
  }
  const excluded = [...excludedNames].map((register) => ({ register, reason: "버전 표기 변경은 비교에서 제외" }));

  return {
    summary: { added: added.length, changed: changed.length, removed: removed.length },
    added,
    changed,
    removed,
    excluded,
  };
}

/** 홈 요약 등에서 쓰는 한 줄 설명. 문서 순서(추가 → 변경 → 삭제)대로. */
export function describeChanges(diff: RegmapDiff): string[] {
  const lines: string[] = [];
  for (const a of diff.added) lines.push(`${a.register}(${a.offset}) 추가 — 필드 ${a.fields.join(", ")}`);
  for (const c of diff.changed) {
    const where = c.field ? `${c.register}.${c.field}` : c.register;
    switch (c.change) {
      case "필드 추가":
        lines.push(`${where} 필드 추가 — bit ${c.bits} · ${c.access}`);
        break;
      case "필드 삭제":
        lines.push(`${where} 필드 삭제 — bit ${c.bits} · ${c.access}`);
        break;
      default:
        lines.push(`${where} ${c.change} 변경 — ${String(c.from)} → ${String(c.to)}`);
    }
  }
  for (const r of diff.removed) lines.push(`${r.register}(${r.offset}) 삭제`);
  return lines;
}

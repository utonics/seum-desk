"use client";

import { bitsLabel, type Issue, type Register } from "@/lib/regmap";

const COLORS = ["#dbeafe", "#dcfce7", "#fef3c7", "#fae8ff", "#e0f2fe", "#fee2e2", "#ecfccb", "#ede9fe"];

/** 비트 필드 그림: 왼쪽이 MSB. 필드마다 색을 다르게, 빈 비트는 회색. */
export function BitFieldDiagram({ register, width, issues }: { register: Register; width: number; issues: Issue[] }) {
  const cell = 24;
  const h = 44;
  const total = width * cell;
  const badFields = new Set(issues.map((i) => i.field).filter(Boolean));

  const owner: (number | null)[] = Array.from({ length: width }, () => null);
  register.fields.forEach((f, fi) => {
    for (let b = f.lsb; b <= f.msb && b < width; b++) owner[b] = owner[b] === null ? fi : -1; // -1 = 겹침
  });

  return (
    <div className="overflow-x-auto">
      <svg width={total + 2} height={h + 18} className="block" role="img" aria-label={`${register.name} 비트 필드`}>
        {Array.from({ length: width }, (_, i) => {
          const bit = width - 1 - i;
          const o = owner[bit];
          const fill = o === null ? "#f5f5f5" : o === -1 ? "#fecaca" : COLORS[o % COLORS.length];
          return (
            <g key={bit}>
              <rect x={1 + i * cell} y={14} width={cell} height={h - 14} fill={fill} stroke="#d4d4d4" />
              <text x={1 + i * cell + cell / 2} y={10} fontSize={9} textAnchor="middle" fill="#737373">
                {bit}
              </text>
            </g>
          );
        })}
        {register.fields.map((f) => {
          const msb = Math.min(f.msb, width - 1);
          const x = 1 + (width - 1 - msb) * cell;
          const w = (msb - f.lsb + 1) * cell;
          const bad = badFields.has(f.name);
          return (
            <g key={f.name}>
              <rect x={x} y={14} width={w} height={h - 14} fill="none" stroke={bad ? "#b91c1c" : "#525252"} strokeWidth={bad ? 2 : 1} />
              <text x={x + w / 2} y={14 + (h - 14) / 2 + 4} fontSize={10} textAnchor="middle" fill="#171717" fontFamily="monospace">
                {w >= cell * f.name.length * 0.45 ? f.name : f.name.slice(0, Math.max(1, Math.floor(w / 7)))}
              </text>
              <text x={x + w / 2} y={h + 13} fontSize={9} textAnchor="middle" fill="#737373">
                [{bitsLabel(f)}] {f.access}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

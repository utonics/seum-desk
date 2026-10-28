"use client";

import { Badge, Card, ErrorBox } from "@/components/ui";
import { bitsLabel, hex, type Issue, type RegMap } from "@/lib/regmap";
import { BitFieldDiagram } from "./BitFieldDiagram";

export function RegisterTable({ map, issues }: { map: RegMap; issues: Issue[] }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="text-sm text-neutral-600 flex flex-wrap gap-x-6 gap-y-1">
          <span>
            블록 <b className="font-mono">{map.block}</b>
          </span>
          <span>
            베이스 <b className="font-mono">{hex(map.baseAddr)}</b>
          </span>
          <span>
            데이터 폭 <b>{map.dataWidth}</b>비트
          </span>
          <span>
            레지스터 <b>{map.registers.length}</b>개
          </span>
          <span>
            검증 {issues.length === 0 ? <Badge tone="pass">문제 없음</Badge> : <Badge tone="fail">문제 {issues.length}건</Badge>}
          </span>
        </div>
        {issues.length > 0 && (
          <div className="mt-3">
            <ErrorBox message={issues.map((i) => `[${i.kind}] ${i.register}${i.field ? "." + i.field : ""}: ${i.message}`).join("\n")} />
          </div>
        )}
      </Card>

      {map.registers.map((r) => {
        const regIssues = issues.filter((i) => i.register === r.name);
        return (
          <Card key={`${r.name}-${r.offset}`}>
            <div className="flex flex-wrap items-baseline gap-x-3 mb-2">
              <h3 className="font-semibold font-mono">{r.name}</h3>
              <span className="text-xs text-neutral-500 font-mono">
                +{hex(r.offset, 2)} → {hex(r.address)}
              </span>
              <span className="text-sm text-neutral-600">{r.desc}</span>
              {regIssues.length > 0 && <Badge tone="fail">문제 {regIssues.length}</Badge>}
            </div>
            <BitFieldDiagram register={r} width={map.dataWidth} issues={regIssues} />
            <table className="w-full text-sm mt-3">
              <thead className="text-xs text-neutral-500">
                <tr>
                  <th className="text-left py-1">필드</th>
                  <th className="text-left py-1">비트</th>
                  <th className="text-left py-1">접근</th>
                  <th className="text-left py-1">리셋값</th>
                  <th className="text-left py-1">설명</th>
                </tr>
              </thead>
              <tbody>
                {r.fields.map((f) => (
                  <tr key={f.name} className="border-t border-neutral-100">
                    <td className="py-1 font-mono">{f.name}</td>
                    <td className="py-1 font-mono">[{bitsLabel(f)}]</td>
                    <td className="py-1">
                      <Badge>{f.access}</Badge>
                    </td>
                    <td className="py-1 font-mono">{hex(f.reset, 2)}</td>
                    <td className="py-1 text-neutral-600">{f.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        );
      })}
    </div>
  );
}

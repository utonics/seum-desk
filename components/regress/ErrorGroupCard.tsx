"use client";

import { Badge, Card } from "@/components/ui";
import type { ErrorGroup } from "@/lib/regress";

export function ErrorGroupCard({ groups }: { groups: ErrorGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <Card title="원인별 건수 (첫 오류 메시지에서 숫자를 지워 묶음)">
      <table className="w-full text-sm">
        <thead className="text-xs text-neutral-500">
          <tr>
            <th className="text-right py-1 pr-3">건수</th>
            <th className="text-left py-1 pr-3">유형</th>
            <th className="text-left py-1">메시지 패턴 · 예</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.pattern} className="border-t border-neutral-100 align-top">
              <td className="py-1 pr-3 text-right font-semibold">{g.count}</td>
              <td className="py-1 pr-3">{g.failType && <Badge tone="warn">{g.failType}</Badge>}</td>
              <td className="py-1">
                <div className="font-mono text-xs">{g.pattern}</div>
                <div className="text-xs text-neutral-500 font-mono">
                  {g.examples.map((e) => `${e.test}#${e.seed ?? "–"}`).join(", ")}
                  {g.count > g.examples.length && ` 외 ${g.count - g.examples.length}`}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

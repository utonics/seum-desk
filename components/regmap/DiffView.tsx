"use client";

import { Badge, Card, Stat } from "@/components/ui";
import type { DiffOptions, RegmapDiff } from "@/lib/regmapDiff";

export function DiffView({
  diff,
  fromLabel,
  toLabel,
  opts,
  onOpts,
}: {
  diff: RegmapDiff;
  fromLabel: string;
  toLabel: string;
  opts: DiffOptions;
  onOpts: (o: DiffOptions) => void;
}) {
  const excludeVersion = opts.excludeRegisters.some((n) => n.toUpperCase() === "VERSION");
  return (
    <div className="space-y-4">
      <div className="text-sm text-neutral-600">
        <span className="font-mono">{fromLabel}</span> → <span className="font-mono">{toLabel}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="추가" value={diff.summary.added} />
        <Stat label="변경" value={diff.summary.changed} />
        <Stat label="삭제" value={diff.summary.removed} />
      </div>

      <Card title="비교 규칙 (사람이 정한 것)">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={excludeVersion}
            onChange={(e) => onOpts({ ...opts, excludeRegisters: e.target.checked ? ["VERSION"] : [] })}
          />
          VERSION 레지스터는 버전 표기라 비교에서 뺀다
        </label>
        <label className="flex items-center gap-2 text-sm mt-1">
          <input type="checkbox" checked={opts.ignoreDesc} onChange={(e) => onOpts({ ...opts, ignoreDesc: e.target.checked })} />
          설명 문구(desc) 변경은 세지 않는다
        </label>
      </Card>

      {diff.added.length > 0 && (
        <Card title="추가된 레지스터">
          <ul className="text-sm space-y-1">
            {diff.added.map((a) => (
              <li key={a.register}>
                <Badge tone="pass">추가</Badge> <span className="font-mono">{a.register}</span> <span className="text-neutral-500 font-mono">{a.offset}</span>
                <span className="text-neutral-600"> — 필드 {a.fields.join(", ")}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {diff.changed.length > 0 && (
        <Card title="변경된 레지스터">
          <table className="w-full text-sm">
            <thead className="text-xs text-neutral-500">
              <tr>
                <th className="text-left py-1">레지스터</th>
                <th className="text-left py-1">오프셋</th>
                <th className="text-left py-1">변경</th>
                <th className="text-left py-1">필드</th>
                <th className="text-left py-1">내용</th>
              </tr>
            </thead>
            <tbody>
              {diff.changed.map((c, i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="py-1 font-mono">{c.register}</td>
                  <td className="py-1 font-mono text-neutral-500">{c.offset}</td>
                  <td className="py-1">
                    <Badge tone="warn">{c.change}</Badge>
                  </td>
                  <td className="py-1 font-mono">{c.field ?? ""}</td>
                  <td className="py-1 font-mono text-xs">
                    {c.bits !== undefined ? `bit ${c.bits} · ${c.access}` : `${String(c.from)} → ${String(c.to)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {diff.removed.length > 0 && (
        <Card title="삭제된 레지스터">
          <ul className="text-sm space-y-1">
            {diff.removed.map((r) => (
              <li key={r.register}>
                <Badge tone="fail">삭제</Badge> <span className="font-mono">{r.register}</span> <span className="text-neutral-500 font-mono">{r.offset}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {diff.excluded.length > 0 && (
        <Card title="비교에서 제외">
          <ul className="text-sm text-neutral-600">
            {diff.excluded.map((e) => (
              <li key={e.register}>
                <span className="font-mono">{e.register}</span> — {e.reason}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {diff.summary.added + diff.summary.changed + diff.summary.removed === 0 && (
        <Card>
          <div className="text-sm text-neutral-500 text-center py-4">두 버전 사이에 변경이 없습니다.</div>
        </Card>
      )}
    </div>
  );
}

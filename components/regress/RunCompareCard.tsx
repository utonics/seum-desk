"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import type { LogResult } from "@/lib/logParser";
import type { RunComparison } from "@/lib/regressCompare";

type Key = keyof RunComparison;

const SECTIONS: { key: Key; label: string; tone: "fail" | "pass" | "warn" | "neutral" }[] = [
  { key: "newlyFailed", label: "새로 실패", tone: "fail" },
  { key: "fixed", label: "고쳐짐", tone: "pass" },
  { key: "stillFailing", label: "여전히 실패", tone: "warn" },
  { key: "missing", label: "사라짐", tone: "neutral" },
  { key: "added", label: "새 실행", tone: "neutral" },
];

function Row({ r }: { r: LogResult }) {
  return (
    <li className="font-mono text-xs flex gap-2">
      <span>{r.test}</span>
      <span className="text-neutral-500">{r.seed ?? "–"}</span>
      {r.failType && <span className="text-amber-800">{r.failType}</span>}
    </li>
  );
}

export function RunCompareCard({ comparison, prevLabel, onClear }: { comparison: RunComparison; prevLabel: string; onClear: () => void }) {
  const [open, setOpen] = useState<Key | null>(comparison.newlyFailed.length > 0 ? "newlyFailed" : null);
  return (
    <Card title={`이전 실행(${prevLabel})과 비교`}>
      <div className="flex flex-wrap items-center gap-2">
        {SECTIONS.map((s) => {
          const n = comparison[s.key].length;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setOpen(open === s.key ? null : s.key)}
              className={`px-2 py-1 rounded text-sm ${open === s.key ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
            >
              {s.label} <Badge tone={n > 0 ? s.tone : "neutral"}>{n}</Badge>
            </button>
          );
        })}
        <span className="flex-1" />
        <Button variant="ghost" onClick={onClear}>
          비교 끄기
        </Button>
      </div>
      {open && (
        <ul className="mt-3 space-y-1 max-h-48 overflow-y-auto">
          {comparison[open].length === 0 ? <li className="text-xs text-neutral-400">없음</li> : comparison[open].map((r) => <Row key={`${r.file}-${r.seed}`} r={r} />)}
        </ul>
      )}
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { copyText } from "@/lib/browserFiles";
import { reproCommand, type LogResult } from "@/lib/logParser";

const PAGE = 200;

export function ResultTable({ rows }: { rows: LogResult[] }) {
  const [shown, setShown] = useState(PAGE);
  const [copied, setCopied] = useState<{ key: string; ok: boolean } | null>(null);

  const visible = rows.slice(0, shown);

  const copy = async (r: LogResult, key: string) => {
    const ok = await copyText(reproCommand(r));
    setCopied({ key, ok });
    setTimeout(() => setCopied(null), 1500);
  };

  if (rows.length === 0) return <div className="text-sm text-neutral-500 py-6 text-center">조건에 맞는 로그가 없습니다.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-neutral-500">
          <tr>
            <th className="text-left py-1 pr-2">파일</th>
            <th className="text-left py-1 pr-2">테스트</th>
            <th className="text-right py-1 pr-2">시드</th>
            <th className="text-left py-1 pr-2">결과</th>
            <th className="text-left py-1 pr-2">실패 유형</th>
            <th className="text-left py-1 pr-2">첫 오류</th>
            <th className="text-left py-1">재현</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r, i) => {
            const key = `${r.file}#${i}`;
            return (
            <tr key={key} className="border-t border-neutral-100 align-top">
              <td className="py-1 pr-2 font-mono text-xs whitespace-nowrap">{r.file}</td>
              <td className="py-1 pr-2 font-mono text-xs">{r.test}</td>
              <td className="py-1 pr-2 font-mono text-xs text-right">{r.seed ?? <span className="text-neutral-400" title="시드를 찾지 못함">–</span>}</td>
              <td className="py-1 pr-2">
                <Badge tone={r.result === "PASS" ? "pass" : "fail"}>{r.result}</Badge>
              </td>
              <td className="py-1 pr-2">{r.failType && <Badge tone="warn">{r.failType}</Badge>}</td>
              <td className="py-1 pr-2 text-xs text-neutral-600 max-w-md">{r.firstError ?? ""}</td>
              <td className="py-1 whitespace-nowrap">
                <Button onClick={() => copy(r, key)} title={reproCommand(r)}>
                  {copied?.key === key ? (copied.ok ? "복사됨" : "복사 실패") : "명령 복사"}
                </Button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > shown && (
        <div className="text-center py-3">
          <Button onClick={() => setShown(shown + PAGE)}>
            더 보기 ({shown} / {rows.length})
          </Button>
        </div>
      )}
    </div>
  );
}

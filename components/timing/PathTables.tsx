"use client";

import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import type { EndpointHistory, ViolatingPath } from "@/lib/timing";

function SlackCell({ v }: { v: number | null }) {
  if (v === null) return <td className="py-1 text-right font-mono text-xs text-neutral-300">–</td>;
  return <td className={`py-1 text-right font-mono text-xs ${v < 0 ? "text-red-700 font-semibold" : "text-neutral-500"}`}>{v.toFixed(3)}</td>;
}

export function ViolatingPathTable({ paths, builds }: { paths: ViolatingPath[]; builds: string[] }) {
  const [build, setBuild] = useState<string>("ALL");
  const rows = build === "ALL" ? paths : paths.filter((p) => p.build === build);
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          위반 경로 ({rows.length})
          <select className="border rounded px-1 py-0.5 text-xs font-normal" value={build} onChange={(e) => setBuild(e.target.value)}>
            <option value="ALL">모든 빌드</option>
            {builds.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </span>
      }
    >
      {rows.length === 0 ? (
        <div className="text-sm text-neutral-500 py-3 text-center">위반 경로가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-neutral-500 sticky top-0 bg-white">
              <tr>
                <th className="text-left py-1 pr-2">빌드</th>
                <th className="text-right py-1 pr-2">#</th>
                <th className="text-left py-1 pr-2">그룹</th>
                <th className="text-left py-1 pr-2">Startpoint</th>
                <th className="text-left py-1 pr-2">Endpoint</th>
                <th className="text-right py-1">Slack</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={`${p.build}-${p.index}`} className="border-t border-neutral-100">
                  <td className="py-1 pr-2 font-mono text-xs">{p.build}</td>
                  <td className="py-1 pr-2 text-right text-xs text-neutral-500">{p.index}</td>
                  <td className="py-1 pr-2 font-mono text-xs">{p.group}</td>
                  <td className="py-1 pr-2 font-mono text-xs">{p.startpoint}</td>
                  <td className="py-1 pr-2 font-mono text-xs">{p.endpoint}</td>
                  <SlackCell v={p.slack} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function EndpointHistoryTable({ history, builds }: { history: EndpointHistory[]; builds: string[] }) {
  if (history.length === 0) return null;
  const still = history.filter((h) => h.stillViolating).length;
  return (
    <Card
      title={
        <span>
          endpoint별 추적 ({history.length}) · 최신 빌드에서 아직 위반 <Badge tone={still > 0 ? "fail" : "pass"}>{still}</Badge>
        </span>
      }
    >
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-neutral-500 sticky top-0 bg-white">
            <tr>
              <th className="text-left py-1 pr-2">Endpoint</th>
              <th className="text-left py-1 pr-2">그룹</th>
              {builds.map((b) => (
                <th key={b} className="text-right py-1 pr-2 font-mono">
                  {b}
                </th>
              ))}
              <th className="text-left py-1">상태</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.endpoint} className="border-t border-neutral-100">
                <td className="py-1 pr-2 font-mono text-xs">{h.endpoint}</td>
                <td className="py-1 pr-2 font-mono text-xs">{h.group}</td>
                {builds.map((b) => (
                  <SlackCell key={b} v={h.slackByBuild[b] ?? null} />
                ))}
                <td className="py-1">
                  {h.stillViolating ? <Badge tone="fail">아직 위반</Badge> : <Badge tone="pass">해소</Badge>}
                  <span className="text-xs text-neutral-400 ml-1">{h.violatedBuilds}빌드</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-neutral-500 mt-2">칸은 그 빌드에서 해당 endpoint의 최악 slack. 리포트에 없는 빌드는 –.</div>
    </Card>
  );
}

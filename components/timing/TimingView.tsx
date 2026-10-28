"use client";

import { useMemo, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Badge, Button, Card, Empty, ErrorBox } from "@/components/ui";
import { fetchSampleIndex, fetchSampleText, readTextFiles } from "@/lib/browserFiles";
import { buildTrend, parseTimingReport } from "@/lib/timing";
import { useDeskStore } from "@/store/deskStore";
import { TrendChart } from "./TrendChart";

export function TimingView() {
  const timing = useDeskStore((s) => s.timing);
  const setTiming = useDeskStore((s) => s.setTiming);
  const [error, setError] = useState<string | null>(null);

  const trend = useMemo(() => (timing ? buildTrend(timing.data) : []), [timing]);
  const groups = useMemo(() => [...new Set(trend.flatMap((t) => Object.keys(t.by_group)))].sort(), [trend]);
  const aliasNotes = trend.filter((t) => Object.keys(t.groupAliases).length > 0);

  const load = async (files: { name: string; text: string }[], source: "sample" | "local", label: string) => {
    try {
      const reports = files.map((f) => parseTimingReport(f.text, f.name)).filter((r) => r.paths.length > 0);
      if (reports.length === 0) throw new Error("경로(Path)가 들어 있는 리포트가 없습니다.");
      setTiming({ data: reports, source, label });
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onFiles = async (files: File[]) => load(await readTextFiles(files), "local", `내 파일 ${files.length}개`);
  const onSample = async () => {
    try {
      const idx = await fetchSampleIndex();
      load(await Promise.all(idx.timing.map((f) => fetchSampleText(`timing/${f}`))), "sample", "샘플 리포트");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">타이밍 요약</h1>
        {timing && (
          <span className="text-xs text-neutral-500">
            {timing.label} · 빌드 {trend.length}개
          </span>
        )}
      </div>
      <DropZone
        accept={[".rpt", ".txt"]}
        onFiles={onFiles}
        hint={<span>빌드 리포트(.rpt) 여러 개를 끌어다 놓으세요.</span>}
        extra={
          <Button onClick={onSample} variant="primary">
            샘플로 보기
          </Button>
        }
      />
      {error && <ErrorBox message={error} />}

      {trend.length === 0 ? (
        <Empty>리포트를 올리면 빌드별 WNS·TNS·위반 수와 추이가 나옵니다.</Empty>
      ) : (
        <>
          <Card title="빌드별 요약">
            <table className="w-full text-sm">
              <thead className="text-xs text-neutral-500">
                <tr>
                  <th className="text-left py-1">빌드</th>
                  <th className="text-left py-1">날짜</th>
                  <th className="text-right py-1">경로</th>
                  <th className="text-right py-1">WNS</th>
                  <th className="text-right py-1">TNS</th>
                  <th className="text-right py-1">위반</th>
                  {groups.map((g) => (
                    <th key={g} className="text-right py-1 font-mono">
                      {g}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trend.map((t) => (
                  <tr key={t.build} className="border-t border-neutral-100">
                    <td className="py-1 font-mono">{t.build}</td>
                    <td className="py-1 text-neutral-600">{t.date}</td>
                    <td className="py-1 text-right">{t.paths}</td>
                    <td className={`py-1 text-right font-mono ${t.wns < 0 ? "text-red-700" : "text-emerald-700"}`}>{t.wns.toFixed(3)}</td>
                    <td className={`py-1 text-right font-mono ${t.tns < 0 ? "text-red-700" : "text-emerald-700"}`}>{t.tns.toFixed(3)}</td>
                    <td className="py-1 text-right">
                      <Badge tone={t.violations > 0 ? "fail" : "pass"}>{t.violations}</Badge>
                    </td>
                    {groups.map((g) => {
                      const v = t.by_group[g];
                      return (
                        <td key={g} className="py-1 text-right font-mono text-xs">
                          {v ? (
                            <span title={`WNS ${v.wns.toFixed(3)}`} className={v.violations > 0 ? "text-red-700 font-semibold" : "text-neutral-500"}>
                              {v.violations} <span className="text-neutral-400">({v.wns.toFixed(3)})</span>
                            </span>
                          ) : (
                            "–"
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-neutral-500 mt-2">
              WNS = 가장 나쁜 slack · TNS = 음수 slack 합 · 위반 = slack &lt; 0 경로 수 · 그룹 칸은 위반 수(WNS). 단위 ns.
            </div>
            {aliasNotes.length > 0 && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-2">
                그룹 이름 표기가 섞여 있어 소문자로 합쳤습니다:{" "}
                {aliasNotes.map((t) => `${t.build}: ${Object.entries(t.groupAliases).map(([k, v]) => `${v.join(" / ")} → ${k}`).join(", ")}`).join(" · ")}
              </div>
            )}
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card title="위반 수 추이 (그룹별)">
              <TrendChart trend={trend} groups={groups} mode="violations" />
            </Card>
            <Card title="WNS · TNS 추이">
              <TrendChart trend={trend} groups={groups} mode="slack" />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

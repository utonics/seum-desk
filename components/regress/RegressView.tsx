"use client";

import { useMemo, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Button, Card, Empty, ErrorBox, Stat } from "@/components/ui";
import { copyText, fetchSampleIndex, fetchSampleText, readTextFiles, downloadText } from "@/lib/browserFiles";
import { parseLogs, FAIL_TYPES, type LogResult } from "@/lib/logParser";
import { applyFilter, EMPTY_FILTER, formatPercent, groupByError, reproCommands, resultsToCsv, summarize, type RegressFilter } from "@/lib/regress";
import { useDeskStore } from "@/store/deskStore";
import { compareRuns } from "@/lib/regressCompare";
import { FailTypeChart } from "./FailTypeChart";
import { RunCompareCard } from "./RunCompareCard";
import { ErrorGroupCard } from "./ErrorGroupCard";
import { ResultTable } from "./ResultTable";

export function RegressView() {
  const logs = useDeskStore((s) => s.logs);
  const setLogs = useDeskStore((s) => s.setLogs);
  const prevLogs = useDeskStore((s) => s.prevLogs);
  const clearPrevLogs = useDeskStore((s) => s.clearPrevLogs);
  const prevPinned = useDeskStore((s) => s.prevPinned);
  const setPrevPinned = useDeskStore((s) => s.setPrevPinned);
  const useCurrentAsPrev = useDeskStore((s) => s.useCurrentAsPrev);
  const [bulkCopied, setBulkCopied] = useState<"ok" | "fail" | null>(null);
  const [filter, setFilter] = useState<RegressFilter>(EMPTY_FILTER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const results: LogResult[] = useMemo(() => logs?.data ?? [], [logs]);
  const summary = useMemo(() => summarize(results), [results]);
  const filtered = useMemo(() => applyFilter(results, filter), [results, filter]);
  const tests = useMemo(() => [...new Set(results.map((r) => r.test))].sort(), [results]);
  const errorGroups = useMemo(() => groupByError(results), [results]);
  const comparison = useMemo(() => (prevLogs && logs ? compareRuns(prevLogs.data, logs.data) : null), [prevLogs, logs]);

  const load = async (fn: () => Promise<{ name: string; text: string }[]>, source: "sample" | "local", label: string) => {
    setBusy(true);
    setError(null);
    const t0 = performance.now();
    try {
      const files = await fn();
      const parsed = parseLogs(files.map((f) => ({ file: f.name, text: f.text })));
      setLogs({ data: parsed, source, label });
      setFilter(EMPTY_FILTER);
      setElapsedMs(Math.round(performance.now() - t0));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onFiles = (files: File[]) => load(() => readTextFiles(files), "local", `내 파일 ${files.length}개`);

  const onSample = () =>
    load(
      async () => {
        const idx = await fetchSampleIndex();
        return Promise.all(idx.logs.map((f) => fetchSampleText(`logs/${f}`)));
      },
      "sample",
      "샘플 로그",
    );

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">회귀 대시보드</h1>
        {logs && (
          <span className="text-xs text-neutral-500">
            {logs.label} · {results.length}건{elapsedMs !== null && ` · 읽기+파싱 ${elapsedMs}ms`}
          </span>
        )}
      </div>

      <DropZone
        accept={[".log"]}
        directory
        busy={busy}
        onFiles={onFiles}
        hint={<span>로그 폴더(.log)를 여기에 끌어다 놓으세요. zip은 지원하지 않습니다.</span>}
        extra={
          <Button onClick={onSample} disabled={busy} variant="primary">
            샘플로 보기
          </Button>
        }
      />

      {error && <ErrorBox message={error} />}

      {results.length === 0 ? (
        <Empty>{busy ? "읽는 중…" : "로그를 올리면 표·그래프가 여기에 나옵니다."}</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="전체" value={summary.total} />
            <Stat label="통과" value={summary.pass} sub={formatPercent(summary.passRate)} />
            <Stat label="실패" value={summary.fail} />
            <Stat label="테스트 종류" value={summary.byTest.length} />
          </div>

          {comparison && prevLogs && (
            <RunCompareCard comparison={comparison} prevLabel={prevLogs.label} pinned={prevPinned} onPin={setPrevPinned} onClear={clearPrevLogs} />
          )}
          {!comparison && (
            <div className="text-xs text-neutral-500">
              다음에 여는 로그와 비교하려면{" "}
              <button type="button" className="underline" onClick={useCurrentAsPrev}>
                지금 실행을 비교 기준으로
              </button>{" "}
              삼으세요. (기준을 따로 정하지 않아도 새 로그를 열면 직전 로그가 기준이 됩니다.)
            </div>
          )}

          <ErrorGroupCard groups={errorGroups} />

          <div className="grid md:grid-cols-2 gap-4">
            <Card title="실패 유형별 건수">
              <FailTypeChart data={summary.byFailType} />
            </Card>
            <Card title="테스트별 실패">
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500">
                  <tr>
                    <th className="text-left py-1">테스트</th>
                    <th className="text-right py-1">전체</th>
                    <th className="text-right py-1">실패</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byTest.map((t) => (
                    <tr key={t.test} className="border-t border-neutral-100">
                      <td className="py-1 font-mono">{t.test}</td>
                      <td className="py-1 text-right">{t.total}</td>
                      <td className={`py-1 text-right ${t.fail > 0 ? "text-red-700 font-semibold" : "text-neutral-400"}`}>{t.fail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Card>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <select className="border rounded px-2 py-1 text-sm" value={filter.result} onChange={(e) => setFilter({ ...filter, result: e.target.value as RegressFilter["result"] })}>
                <option value="ALL">결과: 전체</option>
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
              </select>
              <select className="border rounded px-2 py-1 text-sm" value={filter.failType} onChange={(e) => setFilter({ ...filter, failType: e.target.value as RegressFilter["failType"] })}>
                <option value="ALL">실패 유형: 전체</option>
                {FAIL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select className="border rounded px-2 py-1 text-sm" value={filter.test} onChange={(e) => setFilter({ ...filter, test: e.target.value })}>
                <option value="ALL">테스트: 전체</option>
                {tests.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className="border rounded px-2 py-1 text-sm flex-1 min-w-40"
                placeholder="파일명 · 시드 · 오류 메시지 검색"
                value={filter.query}
                onChange={(e) => setFilter({ ...filter, query: e.target.value })}
              />
              <Button onClick={() => setFilter(EMPTY_FILTER)} variant="ghost">
                초기화
              </Button>
              <Button onClick={() => downloadText("regress_summary.csv", resultsToCsv(filtered), "text/csv;charset=utf-8")}>
                CSV 내보내기 ({filtered.length})
              </Button>
              <Button
                disabled={!filtered.some((r) => r.result === "FAIL")}
                title="표에 보이는 실패 건의 make sim 명령을 한 줄씩 복사"
                onClick={async () => {
                  setBulkCopied((await copyText(reproCommands(filtered))) ? "ok" : "fail");
                  setTimeout(() => setBulkCopied(null), 1500);
                }}
              >
                {bulkCopied === "ok" ? "복사됨" : bulkCopied === "fail" ? "복사 실패" : `실패 재현 명령 모두 복사 (${filtered.filter((r) => r.result === "FAIL").length})`}
              </Button>
            </div>
            <ResultTable rows={filtered} />
          </Card>
        </>
      )}
    </div>
  );
}

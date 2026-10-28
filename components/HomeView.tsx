"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Stat } from "@/components/ui";
import { fetchSampleIndex, fetchSampleText } from "@/lib/browserFiles";
import { parseLogs } from "@/lib/logParser";
import { formatPercent, summarize } from "@/lib/regress";
import { parseRegmapYaml } from "@/lib/regmap";
import { describeChanges, diffRegmaps } from "@/lib/regmapDiff";
import { buildTrend } from "@/lib/timing";
import { formatLoadedAt, useDeskStore } from "@/store/deskStore";

const TOP_N = 2;
const RECENT_N = 3;

export function HomeView() {
  const logs = useDeskStore((s) => s.logs);
  const regmapFrom = useDeskStore((s) => s.regmapFrom);
  const regmapTo = useDeskStore((s) => s.regmapTo);
  const timing = useDeskStore((s) => s.timing);
  const setLogs = useDeskStore((s) => s.setLogs);
  const setRegmapFrom = useDeskStore((s) => s.setRegmapFrom);
  const setRegmapTo = useDeskStore((s) => s.setRegmapTo);
  const clearAll = useDeskStore((s) => s.clearAll);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => (logs ? summarize(logs.data) : null), [logs]);
  const topFails = summary ? summary.byFailType.slice(0, TOP_N) : [];
  const changes = useMemo(
    () => (regmapFrom && regmapTo ? describeChanges(diffRegmaps(regmapFrom.data, regmapTo.data)) : []),
    [regmapFrom, regmapTo],
  );
  const latestBuild = useMemo(() => {
    if (!timing) return null;
    const t = buildTrend(timing.data);
    return t[t.length - 1] ?? null;
  }, [timing]);

  const loadSamples = async () => {
    setBusy(true);
    setError(null);
    try {
      const idx = await fetchSampleIndex();
      const logFiles = await Promise.all(idx.logs.map((f) => fetchSampleText(`logs/${f}`)));
      setLogs({ data: parseLogs(logFiles.map((f) => ({ file: f.name, text: f.text }))), source: "sample", label: "샘플 로그" });
      const [a, b] = idx.regmaps;
      if (a) {
        const fa = await fetchSampleText(a);
        setRegmapFrom({ data: parseRegmapYaml(fa.text), source: "sample", label: fa.name });
      }
      if (b) {
        const fb = await fetchSampleText(b);
        setRegmapTo({ data: parseRegmapYaml(fb.text), source: "sample", label: fb.name });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const hasAny = logs || (regmapFrom && regmapTo) || timing;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">홈 요약</h1>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          {logs && (
            <span>
              로그: {logs.label} {formatLoadedAt(logs.loadedAt)}
            </span>
          )}
          {regmapFrom && regmapTo && (
            <span>
              레지스터: {regmapFrom.label} → {regmapTo.label}
            </span>
          )}
          <Button onClick={loadSamples} disabled={busy} variant={hasAny ? "default" : "primary"}>
            {busy ? "불러오는 중…" : "샘플로 보기"}
          </Button>
          {hasAny && (
            <Button onClick={clearAll} variant="ghost" title="이 브라우저에 저장된 파싱 결과를 지웁니다">
              모두 지우기
            </Button>
          )}
        </div>
      </div>
      {error && <div className="text-sm text-red-700">{error}</div>}
      {!hasAny && (
        <Card>
          <div className="text-sm text-neutral-600">
            아직 데이터가 없습니다. <b>샘플로 보기</b>를 누르거나, <Link href="/regress" className="underline">회귀</Link> ·{" "}
            <Link href="/regmap" className="underline">레지스터</Link> · <Link href="/timing" className="underline">타이밍</Link> 탭에서 내 파일을 열면 여기에 요약이 나옵니다.
            모든 숫자는 열어 둔 데이터에서 계산합니다. 파싱 결과는 이 브라우저 안(IndexedDB)에만 저장되어 새로고침해도 남습니다.
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card title="회귀 통과율">
          {summary ? (
            <>
              <div className="text-3xl font-semibold">{formatPercent(summary.passRate)}</div>
              <div className="text-sm text-neutral-500 mt-1">
                통과 {summary.pass} / 전체 {summary.total} · 실패 {summary.fail}
              </div>
              <Link href="/regress" className="text-xs underline text-neutral-500 mt-2 inline-block">
                회귀 대시보드 →
              </Link>
            </>
          ) : (
            <div className="text-sm text-neutral-400">로그 없음</div>
          )}
        </Card>

        <Card title={`실패 유형 Top ${TOP_N}`}>
          {summary ? (
            topFails.length === 0 ? (
              <div className="text-sm text-neutral-500">실패 없음</div>
            ) : (
              <ol className="space-y-2">
                {topFails.map((f, i) => (
                  <li key={f.type} className="flex items-center gap-2">
                    <span className="text-neutral-400 text-sm w-4">{i + 1}</span>
                    <Badge tone="warn">{f.type}</Badge>
                    <span className="text-sm">
                      {f.count}건 <span className="text-neutral-400">({formatPercent(f.count / summary.fail, 0)} of 실패)</span>
                    </span>
                  </li>
                ))}
              </ol>
            )
          ) : (
            <div className="text-sm text-neutral-400">로그 없음</div>
          )}
        </Card>

        <Card title={`최근 레지스터 변경 ${RECENT_N}줄`}>
          {regmapFrom && regmapTo ? (
            changes.length === 0 ? (
              <div className="text-sm text-neutral-500">변경 없음</div>
            ) : (
              <ul className="text-sm space-y-1.5">
                {changes.slice(0, RECENT_N).map((c) => (
                  <li key={c} className="font-mono text-xs leading-5">
                    {c}
                  </li>
                ))}
                {changes.length > RECENT_N && <li className="text-xs text-neutral-400">외 {changes.length - RECENT_N}건</li>}
              </ul>
            )
          ) : (
            <div className="text-sm text-neutral-400">두 버전 YAML 없음</div>
          )}
          <Link href="/regmap" className="text-xs underline text-neutral-500 mt-2 inline-block">
            레지스터 뷰어 →
          </Link>
        </Card>
      </div>

      {latestBuild && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={`최신 빌드 ${latestBuild.build}`} value={latestBuild.date} />
          <Stat label="WNS" value={latestBuild.wns.toFixed(3)} />
          <Stat label="TNS" value={latestBuild.tns.toFixed(3)} />
          <Stat label="위반" value={latestBuild.violations} sub={<Link href="/timing" className="underline">타이밍 →</Link>} />
        </div>
      )}
    </div>
  );
}

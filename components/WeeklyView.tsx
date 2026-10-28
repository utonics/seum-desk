"use client";

import { useMemo, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Button, Card, Empty, ErrorBox, Stat } from "@/components/ui";
import { copyText, downloadText, fetchSampleIndex, fetchSampleText, readTextFiles } from "@/lib/browserFiles";
import { buildWeekly, parseTasksCsv, weeklyToMarkdown, type Task } from "@/lib/weekly";

export function WeeklyView() {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => (tasks ? buildWeekly(tasks) : null), [tasks]);
  const md = useMemo(() => (report ? weeklyToMarkdown(report) : ""), [report]);

  const load = (name: string, text: string) => {
    const t = parseTasksCsv(text);
    if (t.length === 0) {
      setError(`${name}: 업무 행이 없습니다.`);
      return;
    }
    setTasks(t);
    setLabel(name);
    setError(null);
  };
  const onFiles = async (files: File[]) => {
    const [f] = await readTextFiles(files.slice(0, 1));
    if (f) load(f.name, f.text);
  };
  const onSample = async () => {
    try {
      const idx = await fetchSampleIndex();
      const f = await fetchSampleText(idx.tasks);
      load(f.name, f.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">주간보고 초안</h1>
      <DropZone
        accept={[".csv"]}
        multiple={false}
        onFiles={onFiles}
        hint={<span>업무 기록 CSV(날짜·프로젝트·업무·상태·시간·메모)를 여세요.</span>}
        extra={
          <Button onClick={onSample} variant="primary">
            샘플로 보기
          </Button>
        }
      />
      {error && <ErrorBox message={error} />}

      {!report || !tasks ? (
        <Empty>CSV를 열면 프로젝트별 주간보고 초안이 만들어집니다. AI 호출 없이 규칙으로만 만듭니다.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="기간" value={<span className="text-base">{report.dateFrom} ~ {report.dateTo}</span>} sub={label} />
            <Stat label="업무 건수" value={tasks.length} />
            <Stat label="프로젝트" value={report.groups.length} />
            <Stat label="시간 합계" value={report.totalHours.toFixed(1)} sub="시간" />
          </div>
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-neutral-600 flex-1">초안 (마크다운)</span>
              <Button
                variant="primary"
                onClick={async () => {
                  if (await copyText(md)) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }
                }}
              >
                {copied ? "복사됨" : "복사"}
              </Button>
              <Button onClick={() => downloadText(`weekly_${report.dateFrom}.md`, md, "text/markdown;charset=utf-8")}>다운로드</Button>
            </div>
            <pre className="text-sm bg-neutral-50 border border-neutral-200 rounded p-3 overflow-x-auto whitespace-pre-wrap leading-6">{md}</pre>
          </Card>
        </>
      )}
    </div>
  );
}

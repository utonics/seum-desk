"use client";

import { useMemo, useRef, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Badge, Button, Card, Empty, ErrorBox } from "@/components/ui";
import { fetchSampleIndex, fetchSampleText, readTextFiles } from "@/lib/browserFiles";
import { parseSpec, ruleMentions, searchSpec } from "@/lib/spec";

export function SpecView() {
  const [name, setName] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const lineRefs = useRef<Map<number, HTMLElement>>(new Map());

  const doc = useMemo(() => (lines.length ? parseSpec(lines.join("\n")) : null), [lines]);
  const hits = useMemo(() => (doc ? searchSpec(doc, query) : []), [doc, query]);
  const mentions = useMemo(() => (doc ? ruleMentions(doc) : new Map<string, string[]>()), [doc]);

  const load = (n: string, text: string) => {
    setName(n);
    setLines(text.split(/\r?\n/));
    setError(null);
  };
  const onFiles = async (files: File[]) => {
    const [f] = await readTextFiles(files.slice(0, 1));
    if (f) load(f.name, f.text);
  };
  const onSample = async () => {
    try {
      const idx = await fetchSampleIndex();
      const f = await fetchSampleText(idx.specs[0]);
      load(f.name, f.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const jump = (line: number) => {
    const el = lineRefs.current.get(line);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el) {
      el.classList.add("bg-yellow-100");
      setTimeout(() => el.classList.remove("bg-yellow-100"), 1500);
    }
  };

  const sectionOfLine = (line: number) => doc?.sections.find((s) => s.line === line);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">명세 용어</h1>
      <DropZone
        accept={[".md", ".markdown", ".txt"]}
        multiple={false}
        onFiles={onFiles}
        hint={<span>명세서 마크다운(.md)을 여세요.</span>}
        extra={
          <Button onClick={onSample} variant="primary">
            샘플로 보기
          </Button>
        }
      />
      {error && <ErrorBox message={error} />}

      {!doc ? (
        <Empty>명세서를 열면 § 목차 · 검색 · 규칙 ID 목록이 나옵니다.</Empty>
      ) : (
        <div className="grid md:grid-cols-[260px_1fr] gap-4">
          <aside className="space-y-4">
            <Card title="§ 목차">
              <ul className="text-sm space-y-1">
                {doc.sections.map((s) => (
                  <li key={s.num}>
                    <button type="button" onClick={() => jump(s.line)} className="text-left hover:underline">
                      <span className="text-neutral-500 font-mono">§{s.num}</span> {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title={`규칙 ID (${doc.rules.length})`}>
              <ul className="text-sm space-y-1.5">
                {doc.rules.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => jump(r.line)} className="text-left hover:underline">
                      <Badge tone={r.severity === "critical" ? "fail" : r.severity === "high" ? "warn" : "neutral"}>{r.id}</Badge>{" "}
                      <span className="font-mono text-neutral-500 text-xs">§{r.section}</span> {r.name}
                    </button>
                    <div className="text-xs text-neutral-400 pl-1">
                      심각도 {r.severity || "-"} · 언급 §{(mentions.get(r.id) ?? []).join(", §")}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>

          <div className="space-y-4 min-w-0">
            <Card>
              <input
                className="border rounded px-3 py-2 text-sm w-full"
                placeholder="용어 입력 (예: LAT-01, valid, W1C)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query.trim() && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-neutral-500">{hits.length}개 문단</div>
                  {hits.map((h) => (
                    <div key={h.line} className="border border-neutral-200 rounded p-2 text-sm">
                      <button type="button" onClick={() => jump(h.line)} className="text-xs font-mono text-blue-700 hover:underline">
                        §{h.section || "머리말"} · {h.line + 1}행
                      </button>
                      <pre className="whitespace-pre-wrap font-sans mt-1 text-neutral-800">{h.text}</pre>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title={`원문 — ${name}`}>
              <div className="text-sm leading-6 font-mono text-xs">
                {lines.map((l, i) => {
                  const sec = sectionOfLine(i);
                  return (
                    <div
                      key={i}
                      ref={(el) => {
                        if (el) lineRefs.current.set(i, el);
                        else lineRefs.current.delete(i);
                      }}
                      className={`whitespace-pre-wrap px-1 rounded transition-colors ${sec ? "font-bold mt-3 text-base" : ""}`}
                    >
                      {sec && <span className="text-neutral-400 mr-2">§{sec.num}</span>}
                      {l}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

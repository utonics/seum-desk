"use client";

import { useMemo, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Button, Card, Empty, ErrorBox } from "@/components/ui";
import { fetchSampleIndex, fetchSampleText, readTextFiles } from "@/lib/browserFiles";
import { parseRegmapYaml, validateRegmap, type RegMap } from "@/lib/regmap";
import { DEFAULT_DIFF_OPTIONS, diffRegmaps, type DiffOptions } from "@/lib/regmapDiff";
import { useDeskStore, type Loaded } from "@/store/deskStore";
import { RegisterTable } from "./RegisterTable";
import { CodePreview } from "./CodePreview";
import { DiffView } from "./DiffView";

type Slot = "from" | "to";

export function RegmapView() {
  const from = useDeskStore((s) => s.regmapFrom);
  const to = useDeskStore((s) => s.regmapTo);
  const setFrom = useDeskStore((s) => s.setRegmapFrom);
  const setTo = useDeskStore((s) => s.setRegmapTo);
  const [active, setActive] = useState<Slot>("from");
  const [error, setError] = useState<string | null>(null);
  const [opts, setOpts] = useState<DiffOptions>(DEFAULT_DIFF_OPTIONS);
  const [tab, setTab] = useState<"table" | "code" | "diff">("table");

  const current: Loaded<RegMap> | null = active === "from" ? from : to;
  const issues = useMemo(() => (current ? validateRegmap(current.data) : []), [current]);
  const diff = useMemo(() => (from && to ? diffRegmaps(from.data, to.data, opts) : null), [from, to, opts]);

  const put = (slot: Slot, v: Loaded<RegMap> | null) => (slot === "from" ? setFrom(v) : setTo(v));

  const loadText = (slot: Slot, name: string, text: string, source: "sample" | "local") => {
    try {
      const map = parseRegmapYaml(text);
      put(slot, { data: map, source, label: name });
      setActive(slot);
      setError(null);
    } catch (e) {
      setError(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const onFiles = async (slot: Slot, files: File[]) => {
    const [f] = await readTextFiles(files.slice(0, 1));
    if (f) loadText(slot, f.name, f.text, "local");
  };

  const onSample = async () => {
    try {
      const idx = await fetchSampleIndex();
      const [a, b] = idx.regmaps;
      if (!a) throw new Error("샘플 레지스터 YAML이 없습니다");
      const fa = await fetchSampleText(a);
      loadText("from", fa.name, fa.text, "sample");
      if (b) {
        const fb = await fetchSampleText(b);
        loadText("to", fb.name, fb.text, "sample");
      }
      setActive("from");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const slotLabel = (slot: Slot, v: Loaded<RegMap> | null) => (
    <button
      type="button"
      onClick={() => setActive(slot)}
      className={`px-3 py-1.5 rounded text-sm border ${
        active === slot ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-300 hover:bg-neutral-50"
      }`}
    >
      {slot === "from" ? "기준(이전)" : "비교(이후)"}: {v ? v.label : "없음"}
    </button>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">레지스터 뷰어</h1>

      <div className="grid md:grid-cols-2 gap-3">
        <DropZone
          accept={[".yaml", ".yml"]}
          multiple={false}
          onFiles={(f) => onFiles("from", f)}
          hint={<span>기준(이전) 버전 YAML</span>}
          extra={
            <Button onClick={onSample} variant="primary">
              샘플로 보기 (v0.9 ↔ v1.0)
            </Button>
          }
        />
        <DropZone accept={[".yaml", ".yml"]} multiple={false} onFiles={(f) => onFiles("to", f)} hint={<span>비교(이후) 버전 YAML — 변경점 비교에 쓰입니다</span>} />
      </div>

      {error && <ErrorBox message={error} />}

      {!from && !to ? (
        <Empty>YAML을 열면 레지스터 표·비트 필드·코드 미리보기가 나옵니다.</Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {slotLabel("from", from)}
            {slotLabel("to", to)}
            <span className="flex-1" />
            {(["table", "code", "diff"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded text-sm ${tab === t ? "bg-neutral-200 font-semibold" : "hover:bg-neutral-100"}`}
              >
                {t === "table" ? "레지스터 표" : t === "code" ? "C 헤더 / Verilog" : `변경점 비교${diff ? ` (${diff.summary.added + diff.summary.changed + diff.summary.removed})` : ""}`}
              </button>
            ))}
          </div>

          {tab === "table" && current && <RegisterTable map={current.data} issues={issues} />}
          {tab === "code" && current && <CodePreview map={current.data} label={current.label} />}
          {tab === "diff" &&
            (diff && from && to ? (
              <DiffView diff={diff} fromLabel={from.label} toLabel={to.label} opts={opts} onOpts={setOpts} />
            ) : (
              <Card>
                <Empty>비교하려면 기준·비교 YAML을 둘 다 열어 주세요.</Empty>
              </Card>
            ))}
        </>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Badge, Button, Card, Empty, ErrorBox } from "@/components/ui";
import { fetchSampleIndex, fetchSampleText, readTextFiles } from "@/lib/browserFiles";
import type { RegMap } from "@/lib/regmap";
import { parseSpec } from "@/lib/spec";
import { crossCheck, extractSpecRegmap, MISMATCH_LABEL } from "@/lib/specRegmap";

export function SpecCheck({ map, mapLabel }: { map: RegMap; mapLabel: string }) {
  const [spec, setSpec] = useState<{ name: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const specRegmap = useMemo(() => (spec ? extractSpecRegmap(parseSpec(spec.text)) : null), [spec]);
  const mismatches = useMemo(() => (specRegmap ? crossCheck(specRegmap, map) : []), [specRegmap, map]);

  const onFiles = async (files: File[]) => {
    const [f] = await readTextFiles(files.slice(0, 1));
    if (f) {
      setSpec(f);
      setError(null);
    }
  };
  const onSample = async () => {
    try {
      const idx = await fetchSampleIndex();
      setSpec(await fetchSampleText(idx.specs[0]));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-4">
      <DropZone
        accept={[".md", ".markdown", ".txt"]}
        multiple={false}
        onFiles={onFiles}
        hint={<span>명세서 마크다운(.md)의 레지스터 맵 표와 <b className="font-mono">{mapLabel}</b>을 대조합니다.</span>}
        extra={
          <Button onClick={onSample} variant="primary">
            샘플 명세로 대조
          </Button>
        }
      />
      {error && <ErrorBox message={error} />}

      {!spec ? (
        <Empty>명세서를 열면 오프셋·필드·비트·접근·리셋값을 YAML과 맞춰 봅니다.</Empty>
      ) : !specRegmap ? (
        <ErrorBox message={`${spec.name}: '레지스터 맵' 절(§)과 표를 찾지 못했습니다.`} />
      ) : (
        <Card
          title={
            <span>
              {spec.name} §{specRegmap.section} (레지스터 {specRegmap.registers.length}개) ↔ {mapLabel} (레지스터 {map.registers.length}개)
            </span>
          }
        >
          {mismatches.length === 0 ? (
            <div className="text-sm py-3">
              <Badge tone="pass">일치</Badge> <span className="text-neutral-600 ml-1">명세 표와 YAML이 모두 맞습니다.</span>
            </div>
          ) : (
            <>
              <div className="text-sm mb-2">
                <Badge tone="fail">불일치 {mismatches.length}건</Badge>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs text-neutral-500">
                  <tr>
                    <th className="text-left py-1">종류</th>
                    <th className="text-left py-1">레지스터</th>
                    <th className="text-left py-1">필드</th>
                    <th className="text-left py-1">명세</th>
                    <th className="text-left py-1">YAML</th>
                    <th className="text-right py-1">명세 행</th>
                  </tr>
                </thead>
                <tbody>
                  {mismatches.map((m, i) => (
                    <tr key={i} className="border-t border-neutral-100">
                      <td className="py-1">
                        <Badge tone="warn">{MISMATCH_LABEL[m.kind]}</Badge>
                      </td>
                      <td className="py-1 font-mono">{m.register}</td>
                      <td className="py-1 font-mono">{m.field ?? ""}</td>
                      <td className="py-1 font-mono text-xs">{m.spec}</td>
                      <td className="py-1 font-mono text-xs">{m.yaml}</td>
                      <td className="py-1 text-right text-xs text-neutral-500">{m.line !== undefined ? m.line + 1 : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

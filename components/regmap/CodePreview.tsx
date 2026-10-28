"use client";

import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { copyText, downloadText } from "@/lib/browserFiles";
import type { RegMap } from "@/lib/regmap";
import { generateCHeader, generateVerilog } from "@/lib/regmapCodegen";

export function CodePreview({ map, label }: { map: RegMap; label: string }) {
  const [lang, setLang] = useState<"c" | "verilog">("c");
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const code = useMemo(() => (lang === "c" ? generateCHeader(map) : generateVerilog(map)), [map, lang]);
  const base = label.replace(/\.ya?ml$/i, "") || map.block;
  const filename = lang === "c" ? `${base}_regs.h` : `${base}_regs.vh`;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button onClick={() => setLang("c")} variant={lang === "c" ? "primary" : "default"}>
          C 헤더
        </Button>
        <Button onClick={() => setLang("verilog")} variant={lang === "verilog" ? "primary" : "default"}>
          Verilog
        </Button>
        <span className="flex-1" />
        <Button
          onClick={async () => {
            setCopied((await copyText(code)) ? "ok" : "fail");
            setTimeout(() => setCopied(null), 1500);
          }}
        >
          {copied === "ok" ? "복사됨" : copied === "fail" ? "복사 실패" : "복사"}
        </Button>
        <Button onClick={() => downloadText(filename, code)}>다운로드 ({filename})</Button>
      </div>
      <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded p-3 overflow-x-auto leading-5">{code}</pre>
    </Card>
  );
}

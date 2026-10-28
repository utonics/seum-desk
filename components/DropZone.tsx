"use client";

import { useRef, useState, type DragEvent, type ChangeEvent, type ReactNode } from "react";
import { filesFromDataTransfer, filterByExtension } from "@/lib/browserFiles";

interface Props {
  /** 받을 확장자 (예: [".log"]) */
  accept: string[];
  /** 폴더 선택 허용 */
  directory?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  hint: ReactNode;
  /** 오른쪽에 둘 보조 버튼(예: 샘플로 보기) */
  extra?: ReactNode;
  busy?: boolean;
}

export function DropZone({ accept, directory = false, multiple = true, onFiles, hint, extra, busy }: Props) {
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (files: File[]) => {
    const picked = filterByExtension(files, accept);
    if (picked.length > 0) {
      setNotice(null);
      onFiles(picked);
    } else {
      setNotice(files.length === 0 ? "파일이 없습니다." : `${accept.join(", ")} 파일이 없습니다 (받은 ${files.length}개).`);
    }
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    handle(await filesFromDataTransfer(e.dataTransfer));
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    handle(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const dirProps = directory ? ({ webkitdirectory: "", directory: "" } as Record<string, string>) : {};

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`rounded-lg border-2 border-dashed p-5 flex flex-wrap items-center gap-3 justify-between transition-colors ${
        over ? "border-neutral-900 bg-neutral-50" : "border-neutral-300"
      }`}
    >
      <div className="text-sm text-neutral-600">
        {hint}
        <div className="text-xs text-neutral-400 mt-1">파일은 이 브라우저 안에서만 읽습니다. 어디로도 보내지 않습니다.</div>
        {notice && <div className="text-xs text-amber-700 mt-1">{notice}</div>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="px-3 py-1.5 rounded text-sm border border-neutral-300 bg-white hover:bg-neutral-50 disabled:text-neutral-400"
        >
          {directory ? "폴더 선택" : multiple ? "파일 선택" : "파일 열기"}
        </button>
        {extra}
        <input ref={inputRef} type="file" className="hidden" multiple={multiple} accept={accept.join(",")} onChange={onChange} {...dirProps} />
      </div>
    </div>
  );
}

/**
 * 브라우저 안에서만 파일을 읽는 도우미. 서버로 보내지 않는다.
 * (DOM API를 쓰므로 클라이언트 컴포넌트에서만 호출)
 */

export interface TextFile {
  name: string;
  text: string;
}

function readAllEntries(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = dir.createReader();
  const all: FileSystemEntry[] = [];
  return new Promise((resolve, reject) => {
    const step = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) resolve(all);
        else {
          all.push(...batch);
          step(); // readEntries는 한 번에 최대 100개만 돌려준다
        }
      }, reject);
    step();
  });
}

async function walkEntry(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    const f = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
    out.push(f);
  } else if (entry.isDirectory) {
    const children = await readAllEntries(entry as FileSystemDirectoryEntry);
    for (const c of children) await walkEntry(c, out);
  }
}

/** 드롭된 항목(파일·폴더)에서 파일을 모두 모은다. 폴더는 재귀로 들어간다. */
export async function filesFromDataTransfer(dt: DataTransfer): Promise<File[]> {
  const out: File[] = [];
  const items = Array.from(dt.items ?? []);
  const entries = items
    .map((it) => (typeof it.webkitGetAsEntry === "function" ? it.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => e !== null);
  if (entries.length > 0) {
    for (const e of entries) await walkEntry(e, out);
    return out;
  }
  return Array.from(dt.files ?? []);
}

export function filterByExtension(files: File[], exts: string[]): File[] {
  const lower = exts.map((e) => e.toLowerCase());
  return files.filter((f) => lower.some((e) => f.name.toLowerCase().endsWith(e)));
}

export async function readTextFiles(files: File[]): Promise<TextFile[]> {
  return Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() })));
}

/** 같은 출처(public/)의 샘플 파일을 가져온다. 외부 호출이 아니다. */
export async function fetchSampleText(path: string): Promise<TextFile> {
  const res = await fetch(`/samples/${path}`);
  if (!res.ok) throw new Error(`샘플을 읽지 못함: ${path} (${res.status})`);
  return { name: path.split("/").pop() ?? path, text: await res.text() };
}

export interface SampleIndex {
  logs: string[];
  timing: string[];
  regmaps: string[];
  specs: string[];
  tasks: string;
}

export async function fetchSampleIndex(): Promise<SampleIndex> {
  const res = await fetch("/samples/index.json");
  if (!res.ok) throw new Error("샘플 목록(index.json)을 읽지 못함");
  return (await res.json()) as SampleIndex;
}

export function downloadText(filename: string, text: string, mime = "text/plain;charset=utf-8"): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

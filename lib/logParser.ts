/**
 * UVM 시뮬레이션 로그 파서.
 * 로그 1개(파일명 + 본문) → 테스트명 · 시드 · 결과 · 실패 유형 · 첫 오류 메시지.
 */

export type TestResult = "PASS" | "FAIL";

export const FAIL_TYPES = [
  "TIMEOUT",
  "DATA_MISMATCH",
  "RESET_SEQ",
  "UNKNOWN",
] as const;
export type FailType = (typeof FAIL_TYPES)[number];

export interface LogResult {
  file: string;
  test: string;
  seed: number;
  result: TestResult;
  /** FAIL일 때만 값이 있다. PASS면 null */
  failType: FailType | null;
  /** 첫 UVM_ERROR/UVM_FATAL 줄의 메시지 부분. 없으면 null */
  firstError: string | null;
}

const RNTST_RE = /\[RNTST\]\s+Running test\s+(\S+?)(?:_test)?\s+with seed\s+(\d+)/;
const FILENAME_RE = /^(.*)_s(\d+)\.log$/;
const ERROR_LINE_RE = /^UVM_(?:ERROR|FATAL)\s*@\s*\d+:\s*(.*)$/;

/** 첫 오류 메시지의 UVM 태그로 실패 유형을 정한다 (결정론적 규칙). */
export function classifyFailure(firstError: string | null): FailType {
  if (!firstError) return "UNKNOWN";
  const tagMatch = /\[([A-Z_]+)\]/.exec(firstError);
  const tag = tagMatch ? tagMatch[1] : "";
  if (tag === "TIMEOUT" || /\btimeout\b/i.test(firstError)) return "TIMEOUT";
  if (tag === "RST" || /rst_n\s*=\s*0/.test(firstError)) return "RESET_SEQ";
  if (tag === "CMP" || /\bmismatch\b/i.test(firstError)) return "DATA_MISMATCH";
  return "UNKNOWN";
}

export function parseLog(file: string, text: string): LogResult {
  const lines = text.split(/\r?\n/);

  let test = "";
  let seed = NaN;
  let firstError: string | null = null;
  let passed = false;
  let failed = false;
  let uvmErrors = 0;
  let uvmFatals = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (!test) {
      const m = RNTST_RE.exec(line);
      if (m) {
        test = m[1];
        seed = Number(m[2]);
        continue;
      }
    }
    if (firstError === null) {
      const e = ERROR_LINE_RE.exec(line);
      if (e) firstError = e[1].trim();
    }
    if (line.includes("*** TEST PASSED ***")) passed = true;
    if (line.includes("*** TEST FAILED ***")) failed = true;

    const summary = /UVM_ERROR\s*:\s*(\d+)\s+UVM_FATAL\s*:\s*(\d+)/.exec(line);
    if (summary) {
      uvmErrors = Number(summary[1]);
      uvmFatals = Number(summary[2]);
    }
  }

  // 본문에 테스트명·시드가 없으면 파일명에서 보충한다.
  const base = file.split(/[\\/]/).pop() ?? file;
  const fm = FILENAME_RE.exec(base);
  if (!test && fm) test = fm[1];
  if (Number.isNaN(seed) && fm) seed = Number(fm[2]);

  const isFail =
    failed || (!passed && (firstError !== null || uvmErrors > 0 || uvmFatals > 0));
  const result: TestResult = isFail ? "FAIL" : passed ? "PASS" : "FAIL";

  return {
    file: base,
    test,
    seed,
    result,
    failType: result === "FAIL" ? classifyFailure(firstError) : null,
    firstError,
  };
}

export function parseLogs(
  inputs: ReadonlyArray<{ file: string; text: string }>,
): LogResult[] {
  return inputs.map((i) => parseLog(i.file, i.text));
}

export function reproCommand(r: Pick<LogResult, "test" | "seed">): string {
  return `make sim TEST=${r.test} SEED=${r.seed}`;
}

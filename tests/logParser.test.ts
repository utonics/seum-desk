import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseLog, parseLogs, classifyFailure, reproCommand } from "@/lib/logParser";
import { parseCsv } from "@/lib/csv";

const SAMPLES = join(__dirname, "..", "samples");
const LOG_DIR = join(SAMPLES, "logs");

function loadAnswer() {
  const text = readFileSync(join(SAMPLES, "정답_로그요약.csv"), "utf8");
  const rows = parseCsv(text);
  return rows.map((r) => ({
    file: r.file,
    test: r.test,
    seed: Number(r.seed),
    result: r.result,
    failType: r.fail_type === "" ? null : r.fail_type,
  }));
}

describe("logParser", () => {
  it("정답지 100행과 모두 일치한다", () => {
    const answer = loadAnswer();
    expect(answer).toHaveLength(100);

    const files = readdirSync(LOG_DIR).filter((f) => f.endsWith(".log"));
    expect(files).toHaveLength(100);

    const parsed = parseLogs(
      files.map((f) => ({ file: f, text: readFileSync(join(LOG_DIR, f), "utf8") })),
    );
    const byFile = new Map(parsed.map((p) => [p.file, p]));

    let matched = 0;
    const mismatches: string[] = [];
    for (const a of answer) {
      const p = byFile.get(a.file);
      if (
        p &&
        p.test === a.test &&
        p.seed === a.seed &&
        p.result === a.result &&
        p.failType === a.failType
      ) {
        matched++;
      } else {
        mismatches.push(`${a.file}: 기대 ${JSON.stringify(a)} 실제 ${JSON.stringify(p)}`);
      }
    }
    expect(mismatches).toEqual([]);
    expect(matched).toBe(100);
  });

  it("FAIL 로그는 첫 오류 메시지를 담는다", () => {
    const text = readFileSync(join(LOG_DIR, "fifo_full_s132937.log"), "utf8");
    const r = parseLog("fifo_full_s132937.log", text);
    expect(r.result).toBe("FAIL");
    expect(r.failType).toBe("TIMEOUT");
    expect(r.firstError).toMatch(/\[TIMEOUT\] no deq transfer/);
    expect(reproCommand(r)).toBe("make sim TEST=fifo_full SEED=132937");
  });

  it("PASS 로그는 실패 유형이 null이다", () => {
    const text = readFileSync(join(LOG_DIR, "fifo_basic_s106687.log"), "utf8");
    const r = parseLog("fifo_basic_s106687.log", text);
    expect(r).toMatchObject({ test: "fifo_basic", seed: 106687, result: "PASS", failType: null, firstError: null });
  });

  it("실패 유형 분류 규칙", () => {
    expect(classifyFailure("x [TIMEOUT] y")).toBe("TIMEOUT");
    expect(classifyFailure("x [CMP] deq_data mismatch")).toBe("DATA_MISMATCH");
    expect(classifyFailure("x [RST] valid asserted while rst_n=0")).toBe("RESET_SEQ");
    expect(classifyFailure("x [DRV] unexpected x on deq_rdy")).toBe("UNKNOWN");
    expect(classifyFailure(null)).toBe("UNKNOWN");
  });

  it("RNTST 줄이 없으면 파일명에서 테스트명·시드를 뽑는다", () => {
    const r = parseLog("dir/mode_hold_s42.log", "garbage\n*** TEST FAILED ***\n");
    expect(r).toMatchObject({ file: "mode_hold_s42.log", test: "mode_hold", seed: 42, result: "FAIL", failType: "UNKNOWN" });
  });
});

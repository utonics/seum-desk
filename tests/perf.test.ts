import { describe, it, expect } from "vitest";
import { generateLogs } from "../scripts/gen-logs.mjs";
import { parseLogs } from "@/lib/logParser";
import { summarize, applyFilter, EMPTY_FILTER } from "@/lib/regress";

/** 성능 회귀 방지. 파싱만 잰다(파일 읽기는 브라우저 몫). 느린 CI를 감안해 한도는 넉넉히 둔다. */
const COUNT = 1000;
const LIMIT_MS = 1000;

describe("성능: 가상 로그 1,000개", () => {
  const logs = generateLogs(COUNT);

  it("생성기는 결정론적이고 테스트명·시드·결과가 파서와 맞는다", () => {
    expect(logs).toHaveLength(COUNT);
    expect(generateLogs(5)).toEqual(logs.slice(0, 5));
    const parsed = parseLogs(logs);
    for (let i = 0; i < COUNT; i++) {
      expect(parsed[i]).toMatchObject(logs[i].expected);
    }
  });

  it(`파싱 + 요약 + 필터가 ${LIMIT_MS}ms 안에 끝난다`, () => {
    const t0 = performance.now();
    const parsed = parseLogs(logs);
    const s = summarize(parsed);
    const f = applyFilter(parsed, { ...EMPTY_FILTER, result: "FAIL" });
    const ms = performance.now() - t0;
    expect(s.total).toBe(COUNT);
    expect(f.length).toBe(s.fail);
    expect(ms).toBeLessThan(LIMIT_MS);
  });
});

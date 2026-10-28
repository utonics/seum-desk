/** 회귀 두 실행(이전 ↔ 현재) 비교. 같은 테스트+시드를 같은 실행으로 본다. */
import { runKey, type LogResult } from "./logParser";

export interface RunComparison {
  /** 이전엔 PASS(또는 없음), 지금은 FAIL */
  newlyFailed: LogResult[];
  /** 이전엔 FAIL, 지금은 PASS */
  fixed: LogResult[];
  /** 둘 다 FAIL */
  stillFailing: LogResult[];
  /** 이전엔 있었는데 지금 실행에 없는 것 */
  missing: LogResult[];
  /** 지금 실행에만 있는 것(이전에 없던 테스트+시드) */
  added: LogResult[];
}

export function compareRuns(prev: ReadonlyArray<LogResult>, curr: ReadonlyArray<LogResult>): RunComparison {
  const prevMap = new Map(prev.map((r) => [runKey(r), r]));
  const currKeys = new Set(curr.map(runKey));
  const out: RunComparison = { newlyFailed: [], fixed: [], stillFailing: [], missing: [], added: [] };

  for (const r of curr) {
    const p = prevMap.get(runKey(r));
    if (!p) {
      out.added.push(r);
      if (r.result === "FAIL") out.newlyFailed.push(r);
      continue;
    }
    if (r.result === "FAIL" && p.result === "FAIL") out.stillFailing.push(r);
    else if (r.result === "FAIL") out.newlyFailed.push(r);
    else if (p.result === "FAIL") out.fixed.push(r);
  }
  for (const p of prev) {
    if (!currKeys.has(runKey(p))) out.missing.push(p);
  }
  return out;
}

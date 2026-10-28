import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTasksCsv, buildWeekly, weeklyToMarkdown } from "@/lib/weekly";

const tasks = parseTasksCsv(readFileSync(join(__dirname, "..", "samples", "tasks.csv"), "utf8"));

describe("weekly", () => {
  it("업무 10건, 전체 13.0시간", () => {
    expect(tasks).toHaveLength(10);
    const r = buildWeekly(tasks);
    expect(r.totalHours).toBe(13.0);
    expect(r.groups.map((g) => [g.project, g.hours])).toEqual([
      ["SeumLink-F", 8.0],
      ["세움 데스크", 3.0],
      ["공통", 2.0],
    ]);
    expect(r.dateFrom).toBe("2026-10-19");
    expect(r.dateTo).toBe("2026-10-23");
  });

  it("완료 7 · 진행 3 · 다음 주 4 (진행 3 + 메모 '필요' 1)", () => {
    const r = buildWeekly(tasks);
    const done = r.groups.reduce((n, g) => n + g.done.length, 0);
    const prog = r.groups.reduce((n, g) => n + g.inProgress.length, 0);
    const next = r.groups.reduce((n, g) => n + g.next.length, 0);
    expect([done, prog, next]).toEqual([7, 3, 4]);
  });

  it("마크다운에 네 절과 합계가 들어 있다", () => {
    const md = weeklyToMarkdown(buildWeekly(tasks));
    expect(md).toContain("## 1. 이번 주 한 일 (완료)");
    expect(md).toContain("## 2. 진행 중");
    expect(md).toContain("## 3. 다음 주 할 일");
    expect(md).toContain("## 4. 프로젝트별 시간 합계");
    expect(md).toContain("| **합계** | **13.0** |");
    expect(md).toContain("다음 주 FPGA 보드 일정 확인 필요");
  });
});

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSpec, searchSpec, ruleMentions } from "@/lib/spec";

const doc = parseSpec(readFileSync(join(__dirname, "..", "samples", "02_SeumLink-F_인터페이스_명세서_v0.9.md"), "utf8"));

describe("spec", () => {
  it("§ 목차 12개", () => {
    expect(doc.title).toContain("SeumLink-F 인터페이스 명세서");
    expect(doc.sections.map((s) => s.num)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
    expect(doc.sections[7].title).toBe("지연 요구사항 (LAT)");
  });

  it("'LAT-01'을 찾으면 §8이 나온다", () => {
    const hits = searchSpec(doc, "LAT-01");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].section).toBe("8");
    expect(hits[0].text).toContain("최대 지연(max_latency)");
  });

  it("규칙 ID 6개와 심각도", () => {
    expect(doc.rules.map((r) => [r.id, r.section, r.severity])).toEqual([
      ["HS-01", "4", "medium"],
      ["HS-02", "4", "medium"],
      ["FIFO-01", "5", "high"],
      ["RST-01", "6", "critical"],
      ["ERR-01", "7", "critical"],
      ["LAT-01", "8", "high"],
    ]);
    expect(doc.rules[5].name).toBe("최대 지연(max_latency)");
  });

  it("규칙 언급 §: LAT-01은 §8·§10·§12", () => {
    expect(ruleMentions(doc).get("LAT-01")).toEqual(["8", "10", "12"]);
  });

  it("빈 검색어는 결과 없음", () => {
    expect(searchSpec(doc, "  ")).toEqual([]);
  });
});

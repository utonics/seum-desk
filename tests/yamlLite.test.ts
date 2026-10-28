import { describe, it, expect } from "vitest";
import { parseYaml } from "@/lib/yamlLite";

describe("yamlLite", () => {
  it("블록 매핑·시퀀스·플로우 매핑·주석·따옴표", () => {
    const v = parseYaml(`
# 주석
a: 1
b: 0x10          # 16진
c: "x: y"
d: 'it''s'
e:
  - 1
  - two
  - {k: v, n: "2:1", z: [1, 2]}
f:
  g: true
  h: ~
list:
  - name: A
    sub:
      - {x: 1}
  - name: B
`);
    expect(v).toEqual({
      a: 1,
      b: 16,
      c: "x: y",
      d: "it's",
      e: [1, "two", { k: "v", n: "2:1", z: [1, 2] }],
      f: { g: true, h: null },
      list: [{ name: "A", sub: [{ x: 1 }] }, { name: "B" }],
    });
  });

  it("빈 문서는 null", () => {
    expect(parseYaml("# nothing\n")).toBeNull();
  });

  it("들여쓰기 오류는 줄 번호와 함께 예외", () => {
    expect(() => parseYaml("a:\n  b: 1\n c: 2\n")).toThrow(/3행/);
  });
});

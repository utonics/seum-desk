/** 명세서(마크다운) 파서: § 목차 · 문단 검색 · 규칙 ID 목록 */

export interface Section {
  /** "8" 같은 § 번호 */
  num: string;
  title: string;
  /** 0부터 시작하는 줄 번호 */
  line: number;
}

export interface Paragraph {
  /** 속한 § 번호. 머리말이면 "" */
  section: string;
  line: number;
  text: string;
}

export interface Rule {
  id: string;
  name: string;
  severity: string;
  section: string;
  line: number;
}

export interface SpecDoc {
  title: string;
  sections: Section[];
  paragraphs: Paragraph[];
  rules: Rule[];
}

const SECTION_RE = /^##\s+(\d+(?:\.\d+)*)\.?\s+(.*)$/;
const RULE_DEF_RE = /^\*\*([A-Z]{2,5}-\d{2})\s+([^*]+?)\*\*\s*(?:[—–-]\s*심각도\s*(\w+))?/;
export const RULE_ID_RE = /\b([A-Z]{2,5}-\d{2})\b/g;

export function parseSpec(markdown: string): SpecDoc {
  const lines = markdown.split(/\r?\n/);
  const sections: Section[] = [];
  const paragraphs: Paragraph[] = [];
  const rules: Rule[] = [];
  let title = "";
  let current = "";
  let buf: string[] = [];
  let bufStart = -1;

  const flush = () => {
    if (buf.length > 0) {
      paragraphs.push({ section: current, line: bufStart, text: buf.join("\n") });
    }
    buf = [];
    bufStart = -1;
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!title && /^#\s+/.test(line)) {
      title = line.replace(/^#\s+/, "").trim();
      flush();
      return;
    }
    const sm = SECTION_RE.exec(line);
    if (sm) {
      flush();
      current = sm[1];
      sections.push({ num: sm[1], title: sm[2].trim(), line: i });
      return;
    }
    if (line.trim() === "") {
      flush();
      return;
    }
    if (buf.length === 0) bufStart = i;
    buf.push(line);

    const rm = RULE_DEF_RE.exec(line.trim());
    if (rm && !rules.some((r) => r.id === rm[1])) {
      rules.push({ id: rm[1], name: rm[2].trim(), severity: rm[3] ?? "", section: current, line: i });
    }
  });
  flush();

  return { title, sections, paragraphs, rules };
}

export interface SearchHit extends Paragraph {
  /** 검색어와 일치한 위치 (하이라이트용) */
  matchIndex: number;
}

export function searchSpec(doc: SpecDoc, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const p of doc.paragraphs) {
    const idx = p.text.toLowerCase().indexOf(q);
    if (idx >= 0) hits.push({ ...p, matchIndex: idx });
  }
  return hits;
}

/** 문서에 등장하는 모든 규칙 ID(정의 유무와 무관)와 등장 § 목록 */
export function ruleMentions(doc: SpecDoc): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const p of doc.paragraphs) {
    for (const match of p.text.matchAll(RULE_ID_RE)) {
      const id = match[1];
      const arr = m.get(id) ?? [];
      if (!arr.includes(p.section)) arr.push(p.section);
      m.set(id, arr);
    }
  }
  return m;
}

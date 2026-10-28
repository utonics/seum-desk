/**
 * 레지스터 맵 YAML을 위한 작은 YAML 파서 (외부 패키지 없음).
 * 지원: 블록 매핑 · 블록 시퀀스("- ") · 플로우 매핑("{a: 1, b: 2}") · 플로우 시퀀스("[a, b]")
 *       따옴표 문자열("..." / '...') · 주석(#) · 숫자(10진/16진) · true/false/null.
 * 미지원: 앵커·태그·멀티라인 스칼라(|, >)·복합 키. 레지스터 YAML에는 필요 없다.
 */

export type YamlValue =
  | string
  | number
  | boolean
  | null
  | YamlValue[]
  | { [key: string]: YamlValue };

interface Line {
  indent: number;
  text: string;
  no: number;
}

export class YamlError extends Error {
  constructor(
    message: string,
    public readonly line: number,
  ) {
    super(`YAML ${line}행: ${message}`);
  }
}

function stripComment(s: string): string {
  let inS = false;
  let inD = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === "#" && !inS && !inD && (i === 0 || /\s/.test(s[i - 1]))) {
      return s.slice(0, i);
    }
  }
  return s;
}

function tokenize(src: string): Line[] {
  const out: Line[] = [];
  src.split(/\r?\n/).forEach((raw, idx) => {
    const noComment = stripComment(raw).replace(/\s+$/, "");
    if (!noComment.trim()) return;
    const indent = noComment.length - noComment.trimStart().length;
    out.push({ indent, text: noComment.trim(), no: idx + 1 });
  });
  return out;
}

function parseScalar(s: string, line: number): YamlValue {
  const t = s.trim();
  if (t === "") return null;
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    if (t.length < 2) throw new YamlError("따옴표가 닫히지 않음", line);
    const inner = t.slice(1, -1);
    return t[0] === '"' ? inner.replace(/\\"/g, '"').replace(/\\n/g, "\n") : inner.replace(/''/g, "'");
  }
  if (t.startsWith("{")) return parseFlowMapping(t, line);
  if (t.startsWith("[")) return parseFlowSequence(t, line);
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null" || t === "~") return null;
  if (/^[-+]?0x[0-9a-fA-F]+$/.test(t)) return parseInt(t, 16);
  if (/^[-+]?\d+$/.test(t)) return parseInt(t, 10);
  if (/^[-+]?\d*\.\d+$/.test(t)) return parseFloat(t);
  return t;
}

/** 플로우 컬렉션 안에서 최상위 구분자(,)와 ':' 위치를 찾기 위한 분리기. */
function splitTopLevel(s: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inS = false;
  let inD = false;
  let cur = "";
  for (const c of s) {
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    if (!inS && !inD) {
      if (c === "{" || c === "[") depth++;
      if (c === "}" || c === "]") depth--;
      if (c === sep && depth === 0) {
        parts.push(cur);
        cur = "";
        continue;
      }
    }
    cur += c;
  }
  if (cur.trim() !== "") parts.push(cur);
  return parts;
}

function splitKeyValue(s: string): [string, string] | null {
  let inS = false;
  let inD = false;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    if (inS || inD) continue;
    if (c === "{" || c === "[") depth++;
    if (c === "}" || c === "]") depth--;
    if (c === ":" && depth === 0 && (i + 1 === s.length || /\s/.test(s[i + 1]))) {
      return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
    }
  }
  return null;
}

function parseFlowMapping(t: string, line: number): { [k: string]: YamlValue } {
  if (!t.endsWith("}")) throw new YamlError("'{'가 닫히지 않음", line);
  const body = t.slice(1, -1).trim();
  const obj: { [k: string]: YamlValue } = {};
  if (body === "") return obj;
  for (const part of splitTopLevel(body, ",")) {
    const kv = splitKeyValue(part.trim());
    if (!kv) throw new YamlError(`플로우 매핑 항목 형식 오류: ${part.trim()}`, line);
    obj[String(parseScalar(kv[0], line))] = parseScalar(kv[1], line);
  }
  return obj;
}

function parseFlowSequence(t: string, line: number): YamlValue[] {
  if (!t.endsWith("]")) throw new YamlError("'['가 닫히지 않음", line);
  const body = t.slice(1, -1).trim();
  if (body === "") return [];
  return splitTopLevel(body, ",").map((p) => parseScalar(p, line));
}

function parseBlock(lines: Line[], start: number, indent: number): [YamlValue, number] {
  if (start >= lines.length) return [null, start];
  const first = lines[start];
  if (first.text.startsWith("- ") || first.text === "-") {
    return parseSequence(lines, start, indent);
  }
  return parseMapping(lines, start, indent);
}

function parseSequence(lines: Line[], start: number, indent: number): [YamlValue[], number] {
  const arr: YamlValue[] = [];
  let i = start;
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.indent < indent) break;
    if (ln.indent > indent) throw new YamlError("들여쓰기가 맞지 않음", ln.no);
    if (!(ln.text.startsWith("- ") || ln.text === "-")) break;
    const rest = ln.text === "-" ? "" : ln.text.slice(2).trim();
    if (rest === "") {
      const [v, next] = parseBlock(lines, i + 1, lines[i + 1]?.indent ?? indent + 1);
      arr.push(v);
      i = next;
      continue;
    }
    // "- key: value" 꼴이면 이 항목은 매핑이고, 다음 줄들이 같은 매핑에 이어진다.
    const kv = rest.startsWith("{") || rest.startsWith("[") || rest.startsWith('"') || rest.startsWith("'") ? null : splitKeyValue(rest);
    if (kv) {
      const childIndent = indent + 2;
      const synthetic: Line = { indent: childIndent, text: rest, no: ln.no };
      const sub: Line[] = [synthetic];
      let j = i + 1;
      while (j < lines.length && lines[j].indent >= childIndent) {
        sub.push(lines[j]);
        j++;
      }
      const [v] = parseMapping(sub, 0, childIndent);
      arr.push(v);
      i = j;
      continue;
    }
    arr.push(parseScalar(rest, ln.no));
    i++;
  }
  return [arr, i];
}

function parseMapping(lines: Line[], start: number, indent: number): [{ [k: string]: YamlValue }, number] {
  const obj: { [k: string]: YamlValue } = {};
  let i = start;
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.indent < indent) break;
    if (ln.indent > indent) throw new YamlError("들여쓰기가 맞지 않음", ln.no);
    if (ln.text.startsWith("- ")) break;
    const kv = splitKeyValue(ln.text);
    if (!kv) throw new YamlError(`'키: 값' 형식이 아님: ${ln.text}`, ln.no);
    const [key, val] = kv;
    if (val === "") {
      const next = lines[i + 1];
      if (next && next.indent > indent) {
        const [v, after] = parseBlock(lines, i + 1, next.indent);
        obj[key] = v;
        i = after;
      } else if (next && next.indent === indent && next.text.startsWith("- ")) {
        // 같은 들여쓰기의 시퀀스를 값으로 허용 (YAML 표준 허용 형태)
        const [v, after] = parseSequence(lines, i + 1, indent);
        obj[key] = v;
        i = after;
      } else {
        obj[key] = null;
        i++;
      }
      continue;
    }
    obj[key] = parseScalar(val, ln.no);
    i++;
  }
  return [obj, i];
}

export function parseYaml(src: string): YamlValue {
  const lines = tokenize(src);
  if (lines.length === 0) return null;
  const [value, end] = parseBlock(lines, 0, lines[0].indent);
  if (end < lines.length) {
    throw new YamlError("문서 끝에 해석되지 않은 내용이 있음", lines[end].no);
  }
  return value;
}

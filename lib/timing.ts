/** 타이밍 요약 리포트(.rpt) 파서와 빌드별 요약 */

export interface TimingPath {
  index: number;
  startpoint: string;
  endpoint: string;
  /** 정규화된 그룹 이름 (소문자) */
  group: string;
  /** 리포트에 적힌 원래 표기 */
  groupRaw: string;
  required: number;
  arrival: number;
  slack: number;
  met: boolean;
}

export interface TimingReport {
  build: string;
  date: string;
  design: string;
  corner: string;
  paths: TimingPath[];
  /** 리포트 끝의 'Total paths' 값. 없으면 null */
  declaredTotal: number | null;
}

export interface GroupSummary {
  violations: number;
  wns: number;
}

export interface BuildSummary {
  build: string;
  date: string;
  paths: number;
  wns: number;
  tns: number;
  violations: number;
  by_group: Record<string, GroupSummary>;
  /** 원래 표기가 서로 달랐던 그룹들 (예: clk_bus ↔ CLK_BUS) */
  groupAliases: Record<string, string[]>;
}

/** 그룹 이름 정규화 규칙: 앞뒤 공백 제거 후 소문자. (결정 로그 참고) */
export function normalizeGroup(raw: string): string {
  return raw.trim().toLowerCase();
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function parseTimingReport(text: string, fileName = ""): TimingReport {
  const lines = text.split(/\r?\n/);
  let build = "";
  let date = "";
  let design = "";
  let corner = "";
  let declaredTotal: number | null = null;
  const paths: TimingPath[] = [];
  let cur: Partial<TimingPath> | null = null;

  const finish = () => {
    if (cur && cur.index !== undefined && cur.slack !== undefined) {
      paths.push({
        index: cur.index,
        startpoint: cur.startpoint ?? "",
        endpoint: cur.endpoint ?? "",
        groupRaw: cur.groupRaw ?? "",
        group: normalizeGroup(cur.groupRaw ?? ""),
        required: cur.required ?? NaN,
        arrival: cur.arrival ?? NaN,
        slack: cur.slack,
        met: cur.met ?? cur.slack >= 0,
      });
    }
    cur = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    let m: RegExpExecArray | null;
    if ((m = /^Design\s*:\s*(.+)$/.exec(line))) design = m[1].trim();
    else if ((m = /^Build\s*:\s*(\S+)\s+Date\s*:\s*(\S+)/.exec(line))) {
      build = m[1];
      date = m[2];
    } else if ((m = /^Corner\s*:\s*(.+)$/.exec(line))) corner = m[1].trim();
    else if ((m = /^Path\s+(\d+)\s*$/.exec(line))) {
      finish();
      cur = { index: Number(m[1]) };
    } else if (cur && (m = /^Startpoint\s*:\s*(.+)$/.exec(line))) cur.startpoint = m[1].trim();
    else if (cur && (m = /^Endpoint\s*:\s*(.+)$/.exec(line))) cur.endpoint = m[1].trim();
    else if (cur && (m = /^Path Group\s*:\s*(.+)$/.exec(line))) cur.groupRaw = m[1].trim();
    else if (cur && (m = /^Data required time\s*:\s*([-+]?\d*\.?\d+)/.exec(line))) cur.required = Number(m[1]);
    else if (cur && (m = /^Data arrival time\s*:\s*([-+]?\d*\.?\d+)/.exec(line))) cur.arrival = Number(m[1]);
    else if (cur && (m = /^Slack\s*:\s*([-+]?\d*\.?\d+)\s*(?:\((\w+)\))?/.exec(line))) {
      cur.slack = Number(m[1]);
      if (m[2]) cur.met = m[2].toUpperCase() === "MET";
    } else if ((m = /^Total paths\s*:\s*(\d+)/.exec(line))) declaredTotal = Number(m[1]);
  }
  finish();

  if (!build) {
    const fm = /(b\d+)/i.exec(fileName);
    if (fm) build = fm[1];
  }
  return { build, date, design, corner, paths, declaredTotal };
}

export function summarizeBuild(r: TimingReport): BuildSummary {
  let wns = Infinity;
  let tns = 0;
  let violations = 0;
  const groups = new Map<string, GroupSummary>();
  const aliases = new Map<string, Set<string>>();

  for (const p of r.paths) {
    if (p.slack < wns) wns = p.slack;
    if (p.slack < 0) {
      tns += p.slack;
      violations++;
    }
    const g = groups.get(p.group) ?? { violations: 0, wns: Infinity };
    if (p.slack < 0) g.violations++;
    if (p.slack < g.wns) g.wns = p.slack;
    groups.set(p.group, g);
    const a = aliases.get(p.group) ?? new Set<string>();
    a.add(p.groupRaw);
    aliases.set(p.group, a);
  }

  const by_group: Record<string, GroupSummary> = {};
  for (const name of [...groups.keys()].sort()) {
    const g = groups.get(name)!;
    by_group[name] = { violations: g.violations, wns: round3(g.wns) };
  }
  const groupAliases: Record<string, string[]> = {};
  for (const [name, set] of aliases) {
    if (set.size > 1) groupAliases[name] = [...set].sort();
  }

  return {
    build: r.build,
    date: r.date,
    paths: r.paths.length,
    wns: r.paths.length ? round3(wns) : 0,
    tns: round3(tns),
    violations,
    by_group,
    groupAliases,
  };
}

/** 빌드 이름 순(b101 < b102 …)으로 정렬한 추이 */
export function buildTrend(reports: ReadonlyArray<TimingReport>): BuildSummary[] {
  return reports
    .map(summarizeBuild)
    .sort((a, b) => a.build.localeCompare(b.build, undefined, { numeric: true }));
}

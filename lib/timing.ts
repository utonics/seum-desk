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

// ---------------------------------------------------------------- 위반 경로 · endpoint 추적

export interface ViolatingPath extends TimingPath {
  build: string;
}

/** 모든 빌드의 위반 경로. slack 오름차순(가장 나쁜 것 먼저), 같으면 빌드·경로 번호 순 */
export function violatingPaths(reports: ReadonlyArray<TimingReport>): ViolatingPath[] {
  const out: ViolatingPath[] = [];
  for (const r of reports) for (const p of r.paths) if (p.slack < 0) out.push({ ...p, build: r.build });
  return out.sort((a, b) => a.slack - b.slack || a.build.localeCompare(b.build, undefined, { numeric: true }) || a.index - b.index);
}

export interface EndpointHistory {
  endpoint: string;
  group: string;
  /** 빌드 → 그 빌드에서 이 endpoint의 최악 slack. 리포트에 없으면 null */
  slackByBuild: Record<string, number | null>;
  /** 위반한 빌드 수 */
  violatedBuilds: number;
  /** 가장 최근 빌드에서도 위반인가 */
  stillViolating: boolean;
}

/**
 * 어느 빌드에서든 한 번이라도 위반한 endpoint를 빌드별로 추적한다.
 * 정렬: 최근 빌드에서 아직 위반인 것 → 위반 빌드 수 많은 것 → 이름.
 */
export function endpointHistory(reports: ReadonlyArray<TimingReport>): EndpointHistory[] {
  const builds = [...reports].map((r) => r.build).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const latest = builds[builds.length - 1];
  const byEndpoint = new Map<string, { group: string; slack: Map<string, number> }>();

  for (const r of reports) {
    for (const p of r.paths) {
      const e = byEndpoint.get(p.endpoint) ?? { group: p.group, slack: new Map<string, number>() };
      const prev = e.slack.get(r.build);
      if (prev === undefined || p.slack < prev) e.slack.set(r.build, p.slack);
      byEndpoint.set(p.endpoint, e);
    }
  }

  const out: EndpointHistory[] = [];
  for (const [endpoint, e] of byEndpoint) {
    const slackByBuild: Record<string, number | null> = {};
    let violated = 0;
    for (const b of builds) {
      const s = e.slack.get(b);
      slackByBuild[b] = s === undefined ? null : s;
      if (s !== undefined && s < 0) violated++;
    }
    if (violated === 0) continue;
    const last = slackByBuild[latest];
    out.push({ endpoint, group: e.group, slackByBuild, violatedBuilds: violated, stillViolating: last !== null && last < 0 });
  }
  return out.sort(
    (a, b) => Number(b.stillViolating) - Number(a.stillViolating) || b.violatedBuilds - a.violatedBuilds || a.endpoint.localeCompare(b.endpoint),
  );
}

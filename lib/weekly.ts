/** 업무 기록 CSV → 프로젝트별 주간보고 초안(마크다운). AI 호출 없이 규칙으로만. */
import { parseCsv } from "./csv";

export interface Task {
  date: string;
  project: string;
  task: string;
  status: string;
  hours: number;
  note: string;
}

export function parseTasksCsv(text: string): Task[] {
  return parseCsv(text).map((r) => ({
    date: r.date ?? "",
    project: r.project ?? "",
    task: r.task ?? "",
    status: r.status ?? "",
    hours: Number(r.hours) || 0,
    note: r.note ?? "",
  }));
}

export const DONE = "완료";
export const IN_PROGRESS = "진행";
/** 메모에 이 낱말이 들어가면 '다음 주 할 일'로 올린다 */
export const NEXT_KEYWORD = "필요";

export interface ProjectGroup {
  project: string;
  done: Task[];
  inProgress: Task[];
  next: Task[];
  hours: number;
}

export interface WeeklyReport {
  groups: ProjectGroup[];
  totalHours: number;
  dateFrom: string;
  dateTo: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function isNextWeekItem(t: Task): boolean {
  return t.status === IN_PROGRESS || t.note.includes(NEXT_KEYWORD);
}

export function buildWeekly(tasks: ReadonlyArray<Task>): WeeklyReport {
  const order: string[] = [];
  const map = new Map<string, ProjectGroup>();
  for (const t of tasks) {
    if (!map.has(t.project)) {
      order.push(t.project);
      map.set(t.project, { project: t.project, done: [], inProgress: [], next: [], hours: 0 });
    }
    const g = map.get(t.project)!;
    if (t.status === DONE) g.done.push(t);
    if (t.status === IN_PROGRESS) g.inProgress.push(t);
    if (isNextWeekItem(t)) g.next.push(t);
    g.hours = round1(g.hours + t.hours);
  }
  const dates = tasks.map((t) => t.date).filter(Boolean).sort();
  return {
    groups: order.map((p) => map.get(p)!),
    totalHours: round1(tasks.reduce((s, t) => s + t.hours, 0)),
    dateFrom: dates[0] ?? "",
    dateTo: dates[dates.length - 1] ?? "",
  };
}

function bullet(t: Task, withNote: boolean): string {
  const note = withNote && t.note ? ` (${t.note})` : "";
  return `  - ${t.task}${note}`;
}

/** 다음 주 할 일 문장: 진행 중이면 '계속', 메모에 '필요'가 있으면 메모 그대로 */
function nextBullet(t: Task): string {
  if (t.note.includes(NEXT_KEYWORD)) return `  - ${t.note}`;
  return `  - ${t.task} 계속`;
}

export function weeklyToMarkdown(report: WeeklyReport): string {
  const L: string[] = [];
  const range = report.dateFrom ? ` (${report.dateFrom} ~ ${report.dateTo})` : "";
  L.push(`# 주간보고${range}`);
  L.push("");
  L.push("## 1. 이번 주 한 일 (완료)");
  for (const g of report.groups) {
    if (g.done.length === 0) continue;
    L.push(`- ${g.project}`);
    for (const t of g.done) L.push(bullet(t, true));
  }
  L.push("");
  L.push("## 2. 진행 중");
  for (const g of report.groups) {
    if (g.inProgress.length === 0) continue;
    L.push(`- ${g.project}`);
    for (const t of g.inProgress) L.push(bullet(t, true));
  }
  L.push("");
  L.push("## 3. 다음 주 할 일");
  for (const g of report.groups) {
    if (g.next.length === 0) continue;
    L.push(`- ${g.project}`);
    for (const t of g.next) L.push(nextBullet(t));
  }
  L.push("");
  L.push("## 4. 프로젝트별 시간 합계");
  L.push("| 프로젝트 | 시간 |");
  L.push("|---|---|");
  for (const g of report.groups) L.push(`| ${g.project} | ${g.hours.toFixed(1)} |`);
  L.push(`| **합계** | **${report.totalHours.toFixed(1)}** |`);
  L.push("");
  return L.join("\n");
}

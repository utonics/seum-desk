// samples/ → public/samples/ 복사 + 목록(index.json) 생성. Mac·Windows 공용 (node만 사용).
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "samples");
const dst = join(root, "public", "samples");

rmSync(dst, { recursive: true, force: true });
mkdirSync(join(dst, "logs"), { recursive: true });
mkdirSync(join(dst, "timing"), { recursive: true });

const logs = existsSync(join(src, "logs"))
  ? readdirSync(join(src, "logs")).filter((f) => f.endsWith(".log")).sort()
  : [];
for (const f of logs) cpSync(join(src, "logs", f), join(dst, "logs", f));

const timing = readdirSync(join(src, "timing")).filter((f) => f.endsWith(".rpt")).sort();
for (const f of timing) cpSync(join(src, "timing", f), join(dst, "timing", f));

const regmaps = readdirSync(src).filter((f) => f.endsWith(".yaml")).sort();
for (const f of regmaps) cpSync(join(src, f), join(dst, f));

const specs = readdirSync(src).filter((f) => f.endsWith(".md")).sort();
for (const f of specs) cpSync(join(src, f), join(dst, f));

cpSync(join(src, "tasks.csv"), join(dst, "tasks.csv"));

const index = { logs, timing, regmaps, specs, tasks: "tasks.csv" };
writeFileSync(join(dst, "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`복사 완료: 로그 ${logs.length} · 타이밍 ${timing.length} · 레지스터 ${regmaps.length} · 명세 ${specs.length}`);

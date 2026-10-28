// 성능 측정용 가상 로그 생성기. 실데이터 아님.
// 사용: node scripts/gen-logs.mjs [개수] [출력 폴더]   기본: 1000개 → perf/logs/ (perf/는 .gitignore)
// 테스트에서는 generateLogs()를 import해 메모리에서만 만든다.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TESTS = ["fifo_basic", "fifo_full", "fifo_order_rand", "flush_during_enq", "handshake_backpressure", "irq_w1c", "lat_max_boundary", "latency_stress", "mode_hold", "reset_mid_traffic"];
const ERRORS = [
  "UVM_ERROR @ {T}: uvm_test_top.env.scoreboard [TIMEOUT] no deq transfer within 2000 cycles (enq pending {N})",
  "UVM_ERROR @ {T}: uvm_test_top.env.scoreboard [CMP] deq_data mismatch exp=0x{A} got=0x{B} id={I}",
  "UVM_FATAL @ {T}: uvm_test_top.env.monitor [RST] valid asserted while rst_n=0 at cycle {C}",
  "UVM_ERROR @ {T}: uvm_test_top.env.driver [DRV] unexpected x on deq_rdy at cycle {C}",
];

/**
 * 결정론적(같은 입력 → 같은 출력) 가상 로그 생성.
 * @param {number} count
 * @param {number} [rngSeed]
 * @returns {{ file: string, text: string, expected: { test: string, seed: number, result: "PASS"|"FAIL" } }[]}
 */
export function generateLogs(count, rngSeed = 20261028) {
  let s = rngSeed;
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const ri = (n) => Math.floor(rnd() * n);
  const hex = (n) => n.toString(16).padStart(3, "0");
  const seen = new Set();
  const out = [];
  for (let i = 0; i < count; i++) {
    const test = TESTS[ri(TESTS.length)];
    let seed;
    do seed = 1000 + ri(999000);
    while (seen.has(`${test}_${seed}`));
    seen.add(`${test}_${seed}`);
    const fail = rnd() < 0.12;
    const half = 10000 + ri(40000);
    const end = half * 2;
    const L = [
      `UVM_INFO @ 0: reporter [RNTST] Running test ${test}_test with seed ${seed}...`,
      `UVM_INFO @ 0: uvm_test_top.env [BUILD] agents: enq, deq; scoreboard on`,
      `UVM_INFO @ 100: uvm_test_top.env.driver [DRV] reset released`,
      `UVM_INFO @ ${half}: uvm_test_top.env.scoreboard [SB] ${100 + ri(900)} transfers compared`,
    ];
    if (fail) {
      const e = ERRORS[ri(ERRORS.length)]
        .replace("{T}", String(end))
        .replace("{N}", String(1 + ri(16)))
        .replace("{A}", hex(ri(1024)))
        .replace("{B}", hex(ri(1024)))
        .replace("{I}", String(ri(4)))
        .replace("{C}", String(100 + ri(2000)));
      const fatal = e.startsWith("UVM_FATAL");
      L.push(e, `UVM_INFO @ ${end + 10}: reporter [TEST_DONE] *** TEST FAILED ***`, `--- UVM Report Summary --- UVM_ERROR : ${fatal ? 0 : 1}  UVM_FATAL : ${fatal ? 1 : 0}`);
    } else {
      L.push(`UVM_INFO @ ${end}: reporter [TEST_DONE] *** TEST PASSED ***`, `--- UVM Report Summary --- UVM_ERROR : 0  UVM_FATAL : 0`);
    }
    L.push(`Simulation finished at ${end + 20} ps, wall 0:0${ri(9)}:${String(ri(60)).padStart(2, "0")}`, "");
    out.push({ file: `${test}_s${seed}.log`, text: L.join("\n"), expected: { test, seed, result: fail ? "FAIL" : "PASS" } });
  }
  return out;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const count = Number(process.argv[2] ?? 1000);
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const outDir = process.argv[3] ? process.argv[3] : join(root, "perf", "logs");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const logs = generateLogs(count);
  for (const l of logs) writeFileSync(join(outDir, l.file), l.text);
  const fails = logs.filter((l) => l.expected.result === "FAIL").length;
  console.log(`생성 완료: ${count}개 (FAIL ${fails}) → ${outDir}`);
}

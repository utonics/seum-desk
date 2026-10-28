# SeumLink-F 인터페이스 명세서 (FIFO 채널 인터페이스)
문서번호 SS-SPEC-0042 · 버전 v0.9 (검토용) · 2026-09-12 · 작성 김민준 책임 · 검토 박도현 수석 · 등급 1급(공개 가능, 교육용 가상 명세)

## 1. 개요
SeumLink-F는 두 블록 사이에서 데이터를 **순서대로** 전달하는 FIFO 채널 인터페이스다. 보내는 쪽(enq, enqueue)과 받는 쪽(deq, dequeue) 두 채널이 각각 valid/ready 핸드셰이크로 동작하며, AMBA AXI 스트림과 같은 원칙을 따른다. 이 문서는 신호, 핸드셰이크 규칙, 순서·리셋·오류·지연 요구사항, 레지스터 맵, 검증에 쓰는 파형 파일 형식을 정의한다.

적용 범위: SeumLink-F 컨트롤러 IP v1.x. 클럭은 단일 동기 클럭 `clk`, 리셋은 active-low 비동기 `rst_n`.

## 2. 용어
| 용어 | 뜻 |
|---|---|
| 전송(transfer) | 같은 클럭 사이클에서 `valid=1`이고 `ready=1`인 사이클. 이 사이클에 payload가 넘어간다 |
| payload | 전송과 함께 넘어가는 데이터 신호 묶음. SeumLink-F에서는 `data[9:0]`와 `id[1:0]` |
| enq 채널 | 상위 블록이 FIFO에 항목을 넣는 채널 (enq_vld, enq_rdy, enq_data, enq_id) |
| deq 채널 | FIFO가 하위 블록으로 항목을 내보내는 채널 (deq_vld, deq_rdy, deq_data, deq_id) |
| latency | 어떤 항목의 enq 전송 사이클부터 같은 항목의 deq 전송 사이클까지의 사이클 수 |
| 사이클(cycle) | `clk` 상승 에지 1회. 시뮬레이션 파형에서는 0부터 번호를 붙인다 |

## 3. 신호 목록
| 신호 | 방향(컨트롤러 기준) | 폭 | 설명 |
|---|---|---|---|
| clk | 입력 | 1 | 동기 클럭. 예시 시뮬레이션 주기 250 ps |
| rst_n | 입력 | 1 | 리셋, active-low. 0이면 리셋 중 |
| enq_vld | 입력 | 1 | enq 채널 valid |
| enq_rdy | 출력 | 1 | enq 채널 ready (FIFO에 자리가 있으면 1) |
| enq_data | 입력 | 10 | enq payload 데이터 (16진 표기) |
| enq_id | 입력 | 2 | enq payload 식별자 |
| deq_vld | 출력 | 1 | deq 채널 valid (FIFO에 항목이 있으면 1) |
| deq_rdy | 입력 | 1 | deq 채널 ready |
| deq_data | 출력 | 10 | deq payload 데이터 |
| deq_id | 출력 | 2 | deq payload 식별자 |
| error | 출력 | 1 | 내부 오류 플래그. 정상 동작에서는 항상 0 |

## 4. 핸드셰이크 규칙 (HS)
**HS-01 valid 유지(valid_hold)** — 심각도 medium. `valid`를 1로 올렸으면 `ready`가 1이 되는 사이클까지 `valid`를 내리면 안 된다. 즉 `valid=1, ready=0`인 사이클 i의 다음 사이클 i+1에서 `valid=0`이면 위반이며, 위반 사이클은 i+1로 보고한다. (참고: AXI 명세 A3.2.1 — "once VALID is asserted it must remain asserted until the handshake occurs")

**HS-02 payload 안정(payload_stable)** — 심각도 medium. `valid=1`인 동안 전송이 끝나기 전에는 payload(`data`, `id`)를 바꿀 수 없다. `valid=1, ready=0`인 사이클 i의 다음 사이클 i+1에서 payload 값이 달라지면 위반이며, 위반 사이클은 i+1이다.

주의: `ready`는 `valid`와 무관하게 자유롭게 바뀌어도 된다. `ready`가 먼저 1이 되어 기다리는 것은 정상이다.

## 5. 순서 규칙 (FIFO)
**FIFO-01 순서 보존(fifo_order)** — 심각도 high. enq 채널로 들어간 (data, id) 쌍의 순서와 deq 채널로 나온 순서가 같아야 한다. deq 전송 시점에 큐의 맨 앞 항목과 비교해 다르면 위반이다. 빈 큐에서 deq 전송이 일어나면 위반이다.

## 6. 리셋 규칙 (RST)
**RST-01 리셋 중 정숙(reset_quiet)** — 심각도 critical. `rst_n=0`인 동안 모든 채널의 `valid`는 0이어야 한다. 리셋 해제 후 첫 전송까지 최소 1사이클을 둔다.

## 7. 오류 규칙 (ERR)
**ERR-01 오류 금지(signal_never)** — 심각도 critical. `error` 신호는 어떤 사이클에서도 1이 되면 안 된다. 1이 되는 사이클마다 위반 1건으로 센다.

## 8. 지연 요구사항 (LAT)
**LAT-01 최대 지연(max_latency)** — 심각도 high. 어떤 항목의 enq 전송부터 같은 항목의 deq 전송까지 latency가 **20 사이클을 초과**하면 위반이다(20이면 정상). 시뮬레이션이 끝날 때까지 deq되지 않은 항목은 마지막 사이클 기준 대기 시간으로 판정한다.

## 9. 성능 지표
| 지표 | 정의 |
|---|---|
| LAT | enq 전송 → 같은 항목 deq 전송까지 사이클 수의 min / avg / max |
| THR | 전체 사이클 대비 deq 전송이 일어난 사이클의 비율 (0~1) |

## 10. 레지스터 맵 (베이스 주소 0x4000_1000, 32비트)
| 오프셋 | 이름 | 필드 (비트) | 접근 | 리셋값 | 설명 |
|---|---|---|---|---|---|
| 0x00 | CTRL | EN(0) · MODE(2:1) · FLUSH(3) | RW · RW · WO | 0 · 1 · 0 | 동작 허용, 동작 모드(0 bypass, 1 normal, 2 hold), 1을 쓰면 FIFO 비움 |
| 0x04 | STATUS | BUSY(0) · EMPTY(1) · FULL(2) | RO | 0 · 1 · 0 | 상태 플래그 |
| 0x08 | FIFO_LEVEL | LEVEL(4:0) | RO | 0 | 현재 FIFO 항목 수 (0~16) |
| 0x0C | IRQ | DONE(0) · ERR(1) · LAT(2) | W1C | 0 | 1을 쓰면 해당 비트가 지워진다 |
| 0x10 | LAT_MAX | MAX(7:0) | RW | 20 | LAT-01 판정 한도(사이클) |
| 0x1C | VERSION | MINOR(7:0) · MAJOR(15:8) | RO | 0x09 · 0x00 | v0.9 |

접근 속성: RW 읽기·쓰기, RO 읽기 전용(쓰기는 무시), WO 쓰기 전용(읽으면 0), W1C 1을 쓰면 지워짐(0을 써도 변화 없음).

## 11. 검증용 파형 파일 형식
시뮬레이션 결과는 1행 = 1클럭의 CSV로 저장한다. 첫 행은 헤더이며 컬럼 순서는 `cycle, time_ps, rst_n, enq_vld, enq_rdy, enq_data, enq_id, deq_vld, deq_rdy, deq_data, deq_id, error` 이다. 제어 신호는 0/1, payload는 16진 문자열(소문자, 선행 0 없음)이다. 같은 내용의 VCD 파일도 허용하며 `clk` 상승 에지마다 한 행으로 샘플링한다. 교육용 데모 파형 `fifo_wave.csv`(200 사이클)에는 규칙 위반 4건이 의도적으로 들어 있다.

## 12. 개정 이력
| 버전 | 일자 | 변경 | 작성 |
|---|---|---|---|
| v0.7 | 2026-07-30 | 초안. HS·FIFO 규칙 | 김민준 |
| v0.8 | 2026-08-21 | RST-01, ERR-01 추가, 레지스터 맵 초안 | 김민준 |
| v0.9 | 2026-09-12 | LAT-01·성능 지표·파형 파일 형식 추가, IRQ W1C 명시. 검토 의견 반영 예정 항목: FLUSH 완료 시점, hold 모드 동작 | 김민준 · 박도현 |

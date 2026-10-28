# 5단계 점검 — 시니어 리뷰어 코드 리뷰 (2026-10-28)

대상: 1~4단계 + E1·E2·E3 탭 전체. 새 기능은 넣지 않았다.

## 리뷰 목록 (심각도 순)

| # | 심각도 | 위치 | 문제 | 조치 |
|---|---|---|---|---|
| 1 | 높음 | `components/regress/ResultTable.tsx` | 행 `key`가 파일명뿐이라 서로 다른 하위 폴더에 같은 이름의 로그가 있으면 React key 충돌 → 행이 잘못 재사용될 수 있음 | **고침** — `파일명#순번` 키 |
| 2 | 중간 | `components/regmap/BitFieldDiagram.tsx` | 1~2비트 필드가 이웃하면 아래 라벨(`[3] WO [2:1] RW [0] RW`)이 겹쳐 읽을 수 없음 (스크린샷으로 확인) | **고침** — 3칸 미만은 아래 라벨 생략, `<title>` 툴팁 추가 |
| 3 | 중간 | `components/DropZone.tsx` | 맞는 확장자가 하나도 없으면(예: zip을 떨어뜨림) 아무 반응이 없어 사용자가 멈춘 줄 안다 | **고침** — "…파일이 없습니다" 안내 |
| 4 | 중간 | `components/HomeView.tsx` | `useDeskStore()` 전체 구독 → 어느 조각이 바뀌어도 홈 전체 재렌더 | **고침** — 조각별 selector |
| 5 | 낮음 | 복사 버튼 3곳 | `navigator.clipboard`가 막힌 환경(http 사내망 등)에서 실패해도 표시가 없음 | **고침** — "복사 실패" 표시 |
| 6 | 낮음 | `lib/logParser.ts` | RNTST 줄도 없고 파일명도 `_s<seed>.log` 꼴이 아니면 `seed = NaN` → 재현 명령이 `SEED=NaN` | **보류** — 그런 로그는 형식 위반. 표에 NaN이 보이므로 눈에 띔. 별도 경고 열은 기능 추가라 5단계 범위 밖 |
| 7 | 낮음 | `components/SpecView.tsx` | 원문을 줄마다 `<div>`로 그려서 수천 줄짜리 명세에서는 느려질 수 있음 (샘플 80줄은 문제 없음) | **보류** — 실측 전까지 가상화 안 함 |
| 8 | 낮음 | `components/regress/RegressView.tsx` | 샘플 100개를 동시에 `fetch` — 같은 출처 정적 파일이라 문제 없지만 1,000개짜리 샘플이면 브라우저 동시 연결 제한에 걸림 | **보류** — 샘플은 100개 고정 |
| 9 | 정보 | 전체 | API Route 없음 · 외부 호출 없음 · 모든 파일 읽기는 `File.text()`/같은 출처 `fetch` — 절대 규칙 2 준수 확인 | 이상 없음 |
| 10 | 정보 | `lib/yamlLite.ts` | 앵커·멀티라인 스칼라 미지원. 레지스터 YAML 양식엔 불필요하나, 다른 양식 YAML을 열면 줄 번호와 함께 예외가 난다 | 이상 없음 (예외 메시지가 화면에 표시됨) |

## 성능 (로그 1,000개)

- 데이터: `npm run perf:gen` → `perf/logs/` 에 가상 로그 1,000개(FAIL 135). 결정론적 난수라 매번 같은 파일.
- 측정 방법: `/regress`에서 `<input type=file>`의 `change` 이벤트 시각 → "실패 유형별 건수" 카드가 DOM에 나타난 시각 (MutationObserver, Playwright로 폴더 업로드).
- 결과 (고치기 전 코드, 개발 서버, Chromium):

| 항목 | 측정값 |
|---|---|
| 파일 읽기 + 파싱 (`File.text()` 1,000개 + `parseLogs`) | 54 ms |
| 선택 → 화면 표시 | 111 ms |
| 목표 | 3,000 ms 이내 → 충족 |

- 표는 200행씩 "더 보기"로 끊어 그리므로 1,000행이 한 번에 DOM에 들어가지 않는다.
- 미검증: 10,000개 이상, 저사양 노트북, Windows + Edge.

## 완료 게이트

`npm test` 36/36 · `npm run build` 성공 · `npm run lint` 0 문제 (아래 보고 참조)

## 추천 사항 반영 (2026-10-28, 5단계 이후)

- 리뷰 #6 반영: 시드 없는 로그는 `seed: null`, 재현 명령은 `make sim TEST=<test>`만. RNTST 줄에 seed가 없어도 테스트명을 읽는다.
- `tests/perf.test.ts`: `scripts/gen-logs.mjs`의 `generateLogs(1000)`를 메모리에서 만들어 파싱+요약+필터 1초 이내를 고정. 측정값 18 ms(테스트 파일 전체).
- 회귀 탭 '이전 실행과 비교'(`lib/regressCompare.ts`): 새로 실패 · 고쳐짐 · 여전히 실패 · 사라짐 · 새 실행. 샘플 100개 → 가상 1,000개로 확인: 새로 실패 135 · 사라짐 100 · 새 실행 1000.
- Windows(Edge) 확인은 미검증으로 남음.

## 추천 작업 2차 반영 (2026-10-28, PR feature/recommendations)

1. 명세서 §10 ↔ YAML 교차 검사(`lib/specRegmap.ts`, 레지스터 뷰어 '명세 대조' 탭). 명세 v0.9 ↔ YAML v0.9 불일치 0, ↔ YAML v1.0 불일치 5(INT_MASK·IRQ.OVF·LAT_MAX 리셋·VERSION 리셋 2).
2. GitHub Actions CI(`.github/workflows/ci.yml`): Ubuntu·Windows에서 test · lint · build. Windows는 CI가 처음 돌 때 검증된다.
3. IndexedDB 보존(`lib/idbStorage.ts` + zustand persist). 브라우저에서 1,000개 로그·레지스터 2개를 연 뒤 새 페이지 로드 → 홈에 그대로 표시되는 것 확인.
4. 회귀: 원인별 건수·기준 고정·실패 재현 명령 모두 복사. 가상 1,000개에서 원인 4패턴(37·36·32·30) 확인.
5. 타이밍: endpoint별 추적(b103에서 아직 위반 1건 `u_bus/rdata_q_reg[10]`), 위반 경로 15건 표.

보류: 파형 규칙 검사기(`fifo_wave.csv` 샘플·정답지 없음), Playwright E2E(패키지 추가 허락 필요).

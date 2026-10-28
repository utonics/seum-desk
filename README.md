# 세움 데스크 (Seum Desk)

㈜세움실리콘(가상) 설계팀의 **개인 업무 데스크**. Next.js 웹앱을 내 노트북에서만 띄워 쓴다.
시뮬레이션 로그·레지스터 맵·타이밍 리포트·명세서·업무 기록을 브라우저에서 열어 표·그래프·초안으로 바꿔 준다.

> 데이터는 모두 교육용 가상 자료(SeumLink-F)다. 실제 사내 로그·RTL·리포트는 넣지 않는다.

## 빠르게 시작

```
npm install
npm run dev        # http://localhost:3000
```

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 로컬 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm test` | Vitest (정답지 비교 포함, 42건) |
| `npm run lint` | ESLint |
| `npm run samples:copy` | `samples/` → `public/samples/` 복사 + `index.json` 생성 ('샘플로 보기' 버튼용) |
| `npm run perf:gen` | 성능 측정용 가상 로그 1,000개를 `perf/logs/`에 생성 (git 제외) |

Node.js 22.12 이상. Mac·Windows 모두에서 돌도록 스크립트는 node만 쓴다.

## 화면

| 경로 | 이름 | 여는 파일 | 보여 주는 것 |
|---|---|---|---|
| `/` | 홈 요약 | (다른 탭에서 연 데이터) | 통과율 카드 · 실패 유형 Top 2 · 최근 레지스터 변경 3줄 · 최신 빌드 타이밍 |
| `/regress` | 회귀 대시보드 | 로그 폴더(.log) | 전체/통과/실패 · 실패 유형 막대그래프 · 테스트별 실패 · **원인별 건수**(오류 메시지 패턴) · 필터·검색 · 재현 명령 복사(건별·실패 전체) · CSV 내보내기 · **이전 실행과 비교**(새로 실패·고쳐짐·여전히 실패·사라짐·새 실행, 기준 고정) |
| `/regmap` | 레지스터 뷰어 | 레지스터 YAML 1~2개 (+ 명세서 .md) | 레지스터 표 · 비트 필드 그림 · 검증(비트 겹침·32비트 초과·오프셋 중복 등) · C 헤더/Verilog 미리보기·다운로드 · 두 버전 변경점 비교(추가·변경·삭제) · **명세 대조**(명세서 §10 표 ↔ YAML의 오프셋·필드·비트·접근·리셋값) |
| `/timing` | 타이밍 요약 | 빌드 리포트(.rpt) 여러 개 | 빌드별 WNS·TNS·위반 수 · 클럭 그룹별 위반 · 빌드 간 추이 그래프 · **endpoint별 추적**(아직 위반/해소) · 위반 경로 표 |
| `/spec` | 명세 용어 | 명세서 마크다운(.md) | § 목차 · 용어 검색(문단 + § 번호, 눌러서 원문 이동) · 규칙 ID(HS-01, LAT-01 …) 목록과 심각도 |
| `/weekly` | 주간보고 초안 | 업무 기록 CSV | 프로젝트별 완료/진행/다음 주 할 일/시간 합계 마크다운 초안 · 복사·다운로드 (AI 호출 없음) |

모든 탭에 **'샘플로 보기'** 버튼이 있어 `public/samples/`의 가상 자료로 바로 확인할 수 있다. zip 파일은 지원하지 않는다(풀어서 폴더를 올린다).

열어 둔 데이터의 **파싱 결과**는 브라우저 안 IndexedDB에 저장되어 새로고침해도 남는다(원본 텍스트는 저장하지 않음). 홈의 '모두 지우기'로 비운다.

## 절대 규칙 (CLAUDE.md 요약)

1. **판정은 코드로** — 통과/실패·유형 분류·변경점 계산은 `lib/`의 결정론적 코드가 한다. 컴포넌트에는 계산 로직을 두지 않는다.
2. **원본은 밖으로 안 나간다** — 파일은 `File.text()`로 브라우저 안에서만 읽는다. 업로드 API Route·외부 API 호출·분석 도구(telemetry)가 없다. '샘플로 보기'의 `fetch`는 같은 출처의 정적 파일이다.
3. **정답지로 검증** — `samples/`의 정답지와 비교하는 Vitest가 통과해야 단계 완료.
4. **한 번에 한 단계**, 5. **실데이터 금지**.

## 폴더 구조

```
app/            페이지 (App Router). 각 page.tsx는 components/의 View를 감싸기만 한다
components/     화면 컴포넌트 (Nav, DropZone, ui, regress/, regmap/, timing/, SpecView, WeeklyView, HomeView)
lib/            파서·계산 (모두 순수 함수, 테스트 대상)
  logParser.ts      UVM 로그 → 테스트명·시드·PASS/FAIL·실패 유형·첫 오류
  yamlLite.ts       외부 패키지 없는 YAML 부분집합 파서
  regmap.ts         레지스터 맵 모델·YAML 파서·검증기
  regmapDiff.ts     두 버전 비교 (VERSION 제외, 설명 문구 무시 옵션)
  regmapCodegen.ts  C 헤더 · Verilog 생성
  regress.ts        회귀 요약·필터·CSV
  regressCompare.ts 이전 실행과 비교
  specRegmap.ts     명세서 §10 표 ↔ YAML 교차 검사
  idbStorage.ts     IndexedDB 키-값 저장 (Zustand persist용)
  timing.ts         타이밍 리포트 파서·빌드 요약 (그룹 이름 소문자 정규화)
  spec.ts           명세서 § 목차·검색·규칙 ID
  weekly.ts         업무 기록 → 주간보고 마크다운
  csv.ts            CSV 읽기/쓰기
  browserFiles.ts   드롭된 폴더 걷기 · 파일 읽기 · 다운로드 · 복사 (브라우저 전용)
store/          Zustand 스토어 (열어 둔 로그·레지스터·타이밍을 탭 사이에서 공유)
tests/          Vitest. 정답지 비교 + 성능(1,000개 파싱 1초 이내)
.github/        GitHub Actions CI (Ubuntu·Windows에서 test · lint · build)
samples/        교육용 가상 자료와 정답지 (logs/는 logs.zip을 푼 것)
public/samples/ '샘플로 보기'용 복사본 (npm run samples:copy 로 생성)
scripts/        copy-samples.mjs · gen-logs.mjs
claudedocs/     분석·리뷰 문서 (stage5_코드리뷰.md)
```

## 정답지와 비교 (모두 일치)

| 항목 | 정답지 | 결과 |
|---|---|---|
| 로그 100개의 테스트명·시드·결과·실패 유형 | `samples/정답_로그요약.csv` | 100 / 100 |
| 레지스터 v0.9 → v1.0 (추가 1 · 변경 2 · 삭제 0, VERSION 제외) | `samples/regs_diff_정답.json` | JSON 전체 일치 |
| 타이밍 b101~b103 WNS·TNS·위반·그룹별 | `samples/timing/timing_정답.json` | 3개 빌드 일치 |
| 주간보고 시간 합계 | 13.0시간 | 13.0 |
| 명세 검색 'LAT-01' | §8 | §8 |

## 성능

가상 로그 1,000개(`npm run perf:gen`)를 `/regress`에 폴더로 올렸을 때 선택 → 화면 표시 약 110 ms (읽기+파싱 약 55 ms, Mac·Chromium·개발 서버). 목표 3초. 표는 200행씩 '더 보기'로 그린다. Windows·저사양 노트북은 미검증.

## 사람이 정한 규칙 (결정 로그는 CLAUDE.md)

- 레지스터 비교에서 **VERSION 레지스터는 뺀다**, **설명 문구(desc) 변경은 세지 않는다** — 화면 체크박스로 끌 수 있다.
- 타이밍 **그룹 이름은 소문자로 정규화**해 같은 그룹으로 센다(`CLK_BUS` = `clk_bus`). 합친 사실은 화면에 안내한다.
- YAML은 외부 패키지 없이 `lib/yamlLite.ts`로 읽는다(앵커·멀티라인 스칼라 미지원).
- 시드를 못 찾은 로그는 seed=null, 재현 명령에서 SEED를 뺀다.
- 회귀 '이전 실행'은 직전에 연 로그가 자동으로 된다. '기준 고정'을 켜면 새 로그를 열어도 기준이 바뀌지 않는다.
- 명세 대조는 명세서 표의 접근·리셋값이 하나만 적혀 있으면 모든 필드에 같은 값으로 본다(§10 IRQ 행처럼).

## 기술

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Vitest 3 · Recharts 3 · Zustand 5.
구글 폰트를 쓰지 않고(사내망 빌드 실패 방지) 시스템 글꼴, 밝은 테마만. tsconfig 대상이 ES2017이라 BigInt 리터럴을 쓰지 않는다.

## 만든 순서 (git log)

1. 시작 자료 · Next.js 초기화
2. stage-1 파서·검증기 (lib + 정답지 테스트)
3. stage-2 회귀 대시보드
4. stage-3 레지스터 뷰어
5. stage-4 홈 요약
6. 주간보고·명세·타이밍 탭 (카드 E1·E2·E3)
7. stage-5 코드 리뷰 반영 · 성능 측정 (`claudedocs/stage5_코드리뷰.md`)
8. 추천 사항 반영 (이전 실행 비교 · 시드 없는 로그 · 성능 테스트)
9. 명세 대조 · CI · 데이터 보존 · 회귀/타이밍 보강

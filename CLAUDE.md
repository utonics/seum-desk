# 세움 데스크 (Seum Desk) — 프로젝트 규칙

㈜세움실리콘(가상) 설계팀의 개인 업무 데스크. Next.js 웹앱을 **내 노트북에서만** 실행한다.

## 절대 규칙
1. **판정은 코드로** — 통과/실패·유형 분류·변경점 계산은 `lib/`의 결정론적 코드로만 한다.
2. **원본은 밖으로 안 나간다** — 파일은 브라우저 안에서만 읽는다. 업로드용 API Route, 외부 API 호출, 분석 도구(telemetry) 추가 금지.
3. **정답지로 검증** — `samples/`의 정답지와 비교하는 Vitest가 통과해야 단계 완료.
4. **한 번에 한 단계** — 지시받은 단계만 한다. 다음 단계 기능을 미리 만들지 않는다.
5. **실데이터 금지** — 샘플은 모두 가상. 사내 로그·RTL·리포트를 이 프로젝트에 넣지 않는다.

## 기술
- Next.js(App Router) · TypeScript · Tailwind · Vitest. 차트가 필요하면 Recharts, 상태는 Zustand.
- 구글 폰트(`next/font/google`) 쓰지 않는다 (사내망에서 빌드 실패). 시스템 글꼴 사용.
- 파서·계산은 `lib/`, 화면은 `app/`과 `components/`. 컴포넌트에 비즈니스 로직 넣지 않는다.
- 밝은 테마만 쓴다. 템플릿의 다크 모드(`prefers-color-scheme: dark`) CSS는 지운다 (다크 모드 노트북에서 흰 글씨가 안 보임).
- tsconfig 대상이 ES2017이라 BigInt 리터럴(`1n`)을 쓰지 않는다 (테스트는 통과해도 build가 실패).
- `useEffect` 안에서 setState를 바로 부르지 않는다 (React 19 린트 규칙).
- **test만 통과는 완료가 아니다.** `npm test` · `npm run build` · `npm run lint` 셋 다 통과해야 단계 완료.
- `package.json` 스크립트와 명령은 Mac · Windows 둘 다에서 돌게 쓴다. `VAR=값 명령` 꼴은 Windows 기본 셸에서 안 되니 쓰지 않는다. 새 패키지가 필요하면 먼저 묻는다.

## 명령
- `npm run dev` 로컬 실행 · `npm run build` 빌드 · `npm test` 테스트 · `npm run lint`

## 완료 보고 형식 (단계마다)
1. 바꾼 파일 목록 2. `npm test`·`npm run build`·`npm run lint` 결과 3. 정답지와 비교한 숫자 4. 내가 결정해야 할 것

## 결정 로그
- (날짜) 결정 내용 — 이유

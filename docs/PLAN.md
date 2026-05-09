# DopamineWheel — 진행 로그 (PLAN)

> **기간**: 2026-05-09 (단일 세션)
> **PRD 버전**: **v2.4.1** (... + 폭탄 fuse 2~5s 고정 범위)
> **현재 상태**: **Phase 1~5 + v1.4.1 + v1.4.2 + v1.5 (A1~A7) + 컴포넌트 통합 테스트 + v2.2 (카오스 레이스) + v2.3 (동물 밸런스) + v2.3.1 (메인 이모지) + v2.4 (폭탄 fuse 랜덤) + v2.4.1 (폭탄 fuse 2~5s) 완료**, Phase 6 (반응형 + 배포) 대기
> **테스트**: **118/118 통과** (시뮬·라이브러리 83건 + 컴포넌트 통합 35건)
> **빌드**: 417 KB JS / 135 KB gzip (참고 — v2.2 후 재측정 필요)

본 문서는 PRD §11 Phase 1~5 + v1.5 보강까지 실제 구현된 작업 로그입니다. PRD가 "무엇을 만들 것인가", PLAN은 "무엇을 만들었는가"를 정리합니다.

---

## Phase 1 — 기초 공사 ✅

### 환경
- Vite + React 18 + Zustand + Tailwind CSS + Framer Motion + matter.js + canvas-confetti
- TypeScript 미사용 (해커톤 속도 우선)
- Pretendard variable 폰트 self-host
- 디자인 토큰을 `tailwind.config.js`에 등록 — 시그니처 컬러 4종, 보조 팔레트 4종, semantic 컬러, spacing(4~96px), radius(2~12px)

### 핵심 라이브러리
- `src/lib/random.js` — `randInt`, `randFloat`, `shuffle`, `randSample`, `__setTestSeed` (mulberry32)
- `src/lib/parser.js` — 참가자 입력 파싱 (쉼표/줄바꿈/공백, 동명이인 자동 `#1` `#2` 접미, 50명 한도)
- `src/lib/emoji.js` — FNV-1a 해시 기반 이모지 풀 (60+종) 안정 매핑
- `src/lib/games.js` — 4게임 메타데이터 + `getGameAvailability(game, n)`
- `src/lib/theme.js` — JS 런타임용 시그니처/보조 팔레트, 컨페티 팔레트, `medalFor(rank)`, `textOnBg(bg)`

### 상태 관리
- `src/store/useGameStore.js` — Zustand 단일 store
- localStorage 영속 (`dopamine_wheel_v1`) — debounce 500ms + `flushPersist()` 동기 헬퍼
- 손상된 JSON 입력은 `try/catch` 후 키 삭제 → 기본값 fallback
- `isGameStartable()` — 인원 ≥ 2, k ∈ [1, n-1], custom 모드일 때 winnerRanks 길이 일치

### 테스트 인프라
- Vitest + jsdom v29 — `src/test/setup.js`에 Map 기반 Storage 폴리필 (jsdom v29 + vitest 2 조합 이슈 우회)
- `vite.config.js` setupFiles + `environmentOptions.jsdom.url = 'http://localhost/'`
- Phase 1 테스트: random 10건, parser 16건, emoji 7건, store 10건 (계 43건)

---

## Phase 2 — Editorial Mode 메인 화면 ✅

### 화면 구성
- `src/screens/HomeScreen.jsx` — 화이트 캔버스 + sticky top bar(64px, hairline 보더) + 96px section padding
- 최대 폭 1280px, 양옆 48px breathing room

### 컴포넌트
- `ParticipantsInput.jsx` — textarea, 50명 초과 경고, 잘림 카운트 표시
- `EmojiChips.jsx` — `rounded-full` 칩 그리드, 보조 팔레트 톤
- `KCounter.jsx` — `+` `-` 버튼 + 숫자 표시 (v1.4: 자유 입력, 빨간 경고만)
- `WinnerModeSelector.jsx` — 첫번째/마지막/직접 입력 라디오 + 직접 입력 칸 검증 표시
- `GameCardGrid.jsx` + `GameCard.jsx` — 시그니처 컬러 풀블리드 카드 4종, 호버 `translateY(-4px)` (그림자 없음, Airtable 철학)

### Hook
- `src/hooks/useEscapeToHome.js` (→ Phase 5에서 `useEscapeConfirm`으로 변경)

---

## Phase 3 — 게임 A (경주마 + 로또) ✅

### Phase 3-1 — Intro / Result 골격
- `src/screens/IntroScreen.jsx` — PRD §7.1 3.5초 시퀀스
  - 0.0~0.5s: 시그니처 컬러 페이드인 (Editorial 위)
  - 0.5~1.0s: 다크 베이스 #0d1218로 전환
  - 1.0~3.0s: 카운트다운 3-2-1 (각 0.7s, 줌인)
  - 3.0~3.3s: GO! 플래시 (시그니처 글로우)
  - 3.3~3.5s: 자동으로 play 화면 전환
- `src/screens/ResultScreen.jsx` — PRD §8 결과 화면
  - 헤드라인 3종 분기 (`first` / `last` / `custom`)
  - k별 그리드 (1=단일, 2~3=가로, 4=2×2, 5~6=3×2, 7~12=4×3, 13+=4열)
  - 메달 배지: 1=gold #ffd700, 2=silver #c0c0c0, 3=bronze #cd7f32, 4+=보조 톤
  - canvas-confetti 시그니처 팔레트, 3초간
  - 시그니처 컬러 펄스 배경
- `src/screens/PlayScreen.jsx` — selectedGame 분기 라우팅
- `App.jsx` — screen별 라우팅, intro 시 Home을 underlay로

### Phase 3-2 — 🐎 경주마 (Coral)
- `src/games/horseRace/simulation.js` — Step-based Random
  - `AVG_FINISH_SEC = 14`, 200ms마다 target velocity 추첨 U[0.5, 1.6] / 14
  - velocity lerp rate 4/s, 결승선 통과 시 `nextRank++`
  - `isPhotoFinish(state, threshold=0.18s)` — 1·2등 finishTime 차이로 판정
- `src/games/horseRace/HorseRaceGame.jsx`
  - 다크 베이스 + Coral 액센트 트랙, Gold 체커 결승선
  - 매 horse SVG 트랙 위 이동, 이름 라벨, 결승 시 Gold drop-shadow
  - 결승선 임박(`pos > 0.92`) 슬로우모션 0.4× + Gold 결승선 글로우
  - 사진판정 트리거 시 상단 Gold 배너
  - 막판 흔들림 (시각만)
- 테스트: 5건 (n=12 rank 1..12, n=8 모두 도착, 시간 budget, 결정성, 단일 horse)

### Phase 3-3 — 🎱 럭키 로또 (Forest)
- `src/games/lotto/simulation.js` — matter.js 기반
  - 60-segment 원형 챔버 + 18° 바닥 게이트 + 수직 출구 튜브
  - 전방향 랜덤 임펄스로 휘젓기, n에 따라 강도/주기 자동 조정
  - 추출 라인 통과 시 rank 부여 + 월드에서 제거
- `src/games/lotto/LottoGame.jsx`
  - SVG 챔버 (Forest 글로우 + 호 path), 출구 튜브, Gold 추출 라인
  - 공: 시그니처 팔레트(coral/peach/mint/yellow/mustard/cream) 순환, 이모지 + 이름 텍스트
  - 우측 추출 순서 보드 (실시간 누적, 최신 강조)
  - 튜브 진입 슬로우모션 0.45×
- 테스트: 5건 (n=2/6/12/30, 결정성)

---

## Phase 4 — 게임 B (폭탄 + 룰렛) ✅

### Phase 4-1 — 💣 폭탄 돌리기 (Surface Dark)
- `src/games/bomb/simulation.js`
  - `computeBombTimings(n)`: 라운드 수 = n-1, fuse + explosion 합산이 budget(10~24s) 안에 들어가도록 자동 산출
  - PASS_MIN 0.06s ~ PASS_MAX 0.32s 범위로 매 패스마다 인터벌 무작위 추첨 (자연스러운 가속/감속)
  - 5% 확률 패스 방향 반전 (PRD §7.3 fake-out)
  - n-1 폭발 + 1 생존자 = rank 1..n 자연 산출
- `src/games/bomb/BombGame.jsx`
  - 원형 좌석 SVG (시계방향, 12시 시작), 좌석 위치 고정
  - 폭탄: prevSeat→currentSeat 보간으로 hop 모션, 도화선 길이 = `fuseRemaining/fuseSec`, Coral 글로우
  - 폭발 시 화면 셰이크 + 흰색 플래시 + 해당 좌석 Coral 폭발 원
  - 직접 입력 모드: 노리는 순위 안내 + Gold 메달 강조 + 본문 헤더 캡션
- 테스트: 6건 (n=2/8/10/20, 결정성, `computeBombTimings` budget)

### Phase 4-2 — 🪂 운명의 낙하 (Mustard)
- `src/games/roulette/simulation.js`
  - 인원별 못 격자: ≤10명 8×7 / ≤25명 12×11 / ≤50명 16×15
  - 공 드롭 큐로 순차 투입 (전체 5초 안에 모두 투입)
  - 1.5초 stuck 감지 시 횡력 인가로 정체 방지
  - 빠지는 순서 = rank
- `src/games/roulette/RouletteGame.jsx`
  - SVG: 못(Mustard glow), 좌·우 벽, 바닥 8칸 그라데이션 (peach/mint/yellow/mustard 순환)
  - 공: 시그니처 팔레트 순환, 이모지 표시
  - 첫 공 exit 직전 슬로우모션 0.5× + 빠진 X 위치 칸 강조 600ms
  - 우측 추출 순서 보드 (로또와 동일 톤)
- 테스트: 5건 (n=2/5/15/30, 결정성)

---

## v1.4.1 — Mustard 컬러 보정 ✅

PRD §10.2 시그니처 컬러 중 Mustard `#d9a441` → `#946d12` (다크 머스타드).

- **WCAG AA 통과**: 화이트 텍스트 대비 약 **4.7:1** (이전 `#d9a441` 기준 2.1:1로 미달).
- **시각 통일**: 4개 게임 카드 모두 **화이트 텍스트**. Mustard만 ink였던 변칙 제거.
- 적용 파일: `tailwind.config.js`, `src/lib/theme.js` (LIGHT_BACKGROUNDS에서 mustard 제거 + glow shadow 갱신), `src/games/lotto/LottoGame.jsx` (BALL_PALETTE), `src/lib/games.js` (`text-on-dark`).

---

## P0 핫픽스 (2026-05-09 — Phase 5 직후) ✅

`docs/implementation_followup.md`의 잔여 P0 항목 일괄 정리.

- **§2.1** `ParticipantsInput.jsx:27` placeholder의 `\n` 리터럴 → 백틱 + 실제 줄바꿈으로 수정.
- **§2.2** `ResultScreen.jsx` useEffect cleanup에 `confetti.reset()` 추가 → 다음 화면에 잔존 입자 없음.
- **§2.3** k≥13 결과 레이아웃 → grid 단일 분기에서 **flex 분기**로 분리. 1등은 hero 박스(40vh)로 단독 노출, 2등 이하는 가로 스크롤(180px 카드 + scroll-snap). `WinnerBox` 서브컴포넌트로 hero / normal / compact 3종 사이즈 분기 구현. PRD §8.2 충족.
- **§2.4** `KCounter.jsx` `text-amber` + inline `#d92d20` 충돌 → tailwind config에 `danger: #d92d20` 토큰 추가하고 `text-danger` 단일 클래스로 통일. 숫자/메시지 모두 빨강.
- **§3.5** `tailwindcss-animate` 미사용 의존성 → `npm uninstall tailwindcss-animate`로 정리.

테스트 70/70 통과 유지. 빌드 408KB JS / 132KB gzip.

---

## Phase 5 — 도파민 연출 통합 + 마감 ✅

### ESC 확인 모달
- `src/components/ConfirmModal.jsx` — Dopamine Mode 톤 (백드롭 블러 + dark-elevated 시트, z-60)
  - ESC = 취소, Enter = 확인 키바인딩
  - autoFocus는 "취소"에 (실수 방지)
- `src/hooks/useEscapeToHome.js` → `useEscapeConfirm` — ESC 시 즉시 reset 대신 모달, `transitionWhite` 활성 중 ESC 무시
- `App.jsx`에서 모달 통합 + result 화면 ESC는 페이드를 거쳐 home 복귀

### Editorial ↔ Dopamine 페이드 (PRD §5.3)
- `useGameStore`에 `transitionWhite` 상태 + `fadeToHome(action)` 액션 추가
- 0.3s 페이드인 → action 실행 → 0.3s 페이드아웃 (총 0.6s)
- `App.jsx`가 z-55 흰색 오버레이 렌더 (`AnimatePresence`)
- `ResultScreen.jsx` "처음으로" 버튼이 `fadeToHome(resetForReplay)`을 통해 호출 (v1.5.1: 참가자·k·모드·순위 모두 유지, 게임 상태만 리셋)
- "다시 하기"는 페이드 없이 같은 게임 즉시 인트로 재진입 (v1.4.2: 이전 "게임 다시"가 Primary로 승격)

---

## v1.3 → v1.4 spec 변경 (Phase 5 도중 사용자 요청)

### 연출 강도 토글 + 광과민성 분기 전면 삭제
- `MotionLevelToggle.jsx` 삭제
- `usePrefersReducedMotion.js` 삭제
- store에서 `motionLevel`, `setMotionLevel` 제거
- localStorage 스키마에서 `motionLevel` 키 제거
- `IntroScreen` / `ResultScreen` / `HorseRaceGame` / `App.jsx` 참조 정리
- `index.css`의 `@media (prefers-reduced-motion: reduce)` 룰 삭제
- `ResultScreen`의 `matchMedia` 분기 제거
- 이제 **항상 Full 강도**

### KCounter 자유 입력
- `※ 1 ≤ k < n` 안내 문구 삭제
- `+` 버튼 상한 제거 (자유 입력)
- `-` 버튼은 k=1에서만 비활성
- `k ≥ n` 또는 `n < 2`일 때 빨간 경고 텍스트 + 카운터 색상도 amber로
- store `setWinnerCount`에서 `clampK` 제거 (1 미만 보정만 유지)
- 게임 카드 차단은 `isGameStartable`에서 그대로

### 인프라 — jsdom 테스트 수정
- 원인: vitest 2 + jsdom 29 조합에서 `window.localStorage`가 메서드 없는 빈 객체 `{}`로 노출
- 해결: `src/test/setup.js`에 Map 기반 Storage 폴리필, `vite.config.js`에 `setupFiles` 등록
- store에 `flushPersist()` 추가 (debounce 우회 동기 저장 — 테스트용)
- 테스트의 `setTimeout` 의존을 `flushPersist()`로 대체

### PRD.md 갱신
- 헤더, 정책 표, §3.4, §6.3 ASCII 목업, §6.4, §6.7, §7.2, §9.1, §9.2, §10.7, Phase 1·2·5 검증 포인트, 변경이력 테이블 모두 갱신
- v1.4 항목 변경이력 추가

---

## 파일 구조 (Phase 1~5 시점)

```
src/
├── App.jsx
├── main.jsx
├── index.css
├── components/
│   ├── CasterCaption.jsx           (v1.5)
│   ├── ConfirmModal.jsx
│   ├── EmojiChips.jsx
│   ├── GameCard.jsx
│   ├── GameCardGrid.jsx
│   ├── KCounter.jsx
│   ├── ParticipantsInput.jsx
│   └── WinnerModeSelector.jsx
├── hooks/
│   └── useEscapeToHome.js          (export: useEscapeConfirm)
├── games/
│   ├── horseRace/
│   │   ├── simulation.js
│   │   ├── simulation.test.js
│   │   └── HorseRaceGame.jsx
│   ├── lotto/
│   │   ├── simulation.js
│   │   ├── simulation.test.js
│   │   └── LottoGame.jsx
│   ├── bomb/
│   │   ├── simulation.js
│   │   ├── simulation.test.js
│   │   └── BombGame.jsx
│   └── roulette/
│       ├── simulation.js
│       ├── simulation.test.js
│       └── RouletteGame.jsx
├── lib/
│   ├── emoji.js + emoji.test.js
│   ├── games.js
│   ├── parser.js + parser.test.js
│   ├── random.js + random.test.js
│   └── theme.js
├── screens/
│   ├── HomeScreen.jsx
│   ├── IntroScreen.jsx
│   ├── PlayScreen.jsx
│   └── ResultScreen.jsx
├── store/
│   └── useGameStore.js + useGameStore.test.js
└── test/
    └── setup.js
```

---

## 테스트 현황

```
src/lib/*.test.js                          (random / parser / emoji)
src/store/useGameStore.test.js             (v1.5.1 resetForReplay로 통일)
src/games/horseRace/simulation.test.js
src/games/lotto/simulation.test.js         (v1.5 warmup 케이스 +3)
src/games/bomb/simulation.test.js
src/games/roulette/simulation.test.js
─────────────────────────────────────────────
Total                                 98 tests passing (v1.5 시점)
```

---

## v1.4.2 — 처음으로/다시 하기 액션 재정의 ✅

사용자 요청 — Result 화면 액션 시 참가자 이름은 항상 유지.

- `useGameStore.resetParticipants` 도입: 게임 결과 + k/모드/순위만 리셋, `rawInput` / `participants` / `dropped`는 그대로 유지.
- `ResultScreen.jsx`: "다시 하기"를 "같은 게임 즉시 재실행"(이전 "게임 다시")로 Primary 승격, "처음으로"는 페이드 후 Home + 옵션 리셋 + 이름 유지.
- `useGameStore.test.js`의 `resetParticipants` 테스트도 v1.4.2에 맞춰 갱신.

---

## v1.5.1 — "처음으로"는 사용자 입력 전부 유지 ✅

사용자 재요청 — "처음으로"는 단지 게임을 다시 고를 수 있게 게임 선택 페이지(Home)로 가는 것. 참가자뿐 아니라 **k·당첨 방식·순위 입력도 전부 유지**해야 함.

- `ResultScreen.jsx` "처음으로" 핸들러: `fadeToHome(resetParticipants)` → `fadeToHome(resetForReplay)`로 교체.
- `useGameStore.resetParticipants` 제거 — `resetForReplay`로 모든 "Home 복귀" 경로(ESC 모달 / 처음으로 버튼)가 통일됨.
- `useGameStore.test.js`: `resetParticipants` 테스트를 `resetForReplay` 보존 검증으로 재작성.
- 결과: ESC→확인과 "처음으로" 클릭이 동일 동작 (k·모드·순위·참가자 모두 유지, 게임 상태만 리셋).
- PRD §5.2 / §8.5 문구 정합화.

---

## v1.5 — PRD_feedback 결정 사항 반영 ✅

`docs/PRD_feedback.md`의 결정 사항을 PRD v1.5로 명세하고 7건의 작업으로 구현했다.

| # | 작업 | 영역 | 결과 |
|---|---|---|---|
| **A1** | PRD v1.5 갱신 | 문서 | ✅ 헤더 / §1.5 / §1.6 / §3.4 / §4 / §7.1.1 / §7.3a / §7.4 / §7.5 / §7.6 / §7.7 / §16 변경이력 |
| **A2** | 로또 2-phase warmup + 부력 + 공 텍스트 | `lotto/*` | ✅ 사용자 피드백 반영 (PIP는 미사용) |
| **A3** | 폭탄 디지털 타이머 + 라운드 인터미션 | `bomb/*` | ✅ |
| **A4** | 경주마 결승 ceremony + 페이크 아웃 4종 | `horseRace/*` | ✅ |
| **A5** | 룰렛 권장 35명 + 칸 폰트 실측치 | `roulette/*`, `games.js` | ✅ |
| **A6** | 캐스터 캡션 시스템 (4게임 공통) | 신규 컴포넌트 | ✅ |
| **A7** | 폭탄 인트로 Coral 침투 보강 | `IntroScreen.jsx` | ✅ |

### A2 — 로또 (Forest)
- `simulation.js`
  - **2-phase**: `phase: 'warmup' | 'extracting' | 'done'`, 출구 게이트 body, `WARMUP_MIN/MAX_SEC = 3/10`, warmup 종료 시 게이트 World.remove.
  - `ballRadius` 22 → **28** (식별성↑, 텍스트 가독성↑).
  - **부력 시뮬레이션** (사용자 피드백 — "공기가 많이 든 공처럼 위로 붕붕"):
    - gravity warmup 0.55 → extracting 1.4 동적 변경
    - density 0.0015 → 0.0011, frictionAir 0.005 → 0.008
    - 휘젓기 임펄스: warmup lift 1.4 (강한 위쪽 바이어스), extracting lift 0 + 임펄스 강도 0.4× (자연 낙하)
    - 휘젓기 인터벌 0.05~0.12s (n별)
- `LottoGame.jsx`
  - phase 배지 ("🌪 휘젓는 중" / "🎱 추출 중")
  - warmup → extracting 0.32s 흰색 플래시
  - 빈 트레이 메시지 phase별 분기 ("공이 충분히 섞이는 중…" / "곧 첫 공이 나옵니다…")
  - 공 텍스트: fontSize `Math.round(28 × 0.45)` = 13px, 7자 + ellipsis
  - **PIP 클로즈업은 사용자 피드백으로 미구현** — 우측 추출 순서 보드만 유지
- 신규 테스트 3건 (warmup 시작 0건 / warmupDuration 결정성 / phase 전환)

### A3 — 폭탄 (Surface Dark)
- `simulation.js`
  - `INTERMISSION_DUR_SEC = 0.3` 추가, `intermission` / `intermissionTimer` 상태.
  - `computeBombTimings(n)`이 fuse + explosion + intermission 합산을 budget 안에 분배.
  - 폭발 → exploding 0.55s → intermission 0.3s → 다음 라운드.
- `BombGame.jsx`
  - 폭탄 표면에 **Press Start 2P 카운트다운 정수** (Gold).
  - 인터미션 단계: 폭사자 좌석 1.25× scale 카메라 줌 + 큰 "💥 X등 — 이름" 배지 (Press Start 2P 32px).

### A4 — 경주마 (Coral)
- `simulation.js`
  - **페이크 아웃 4종 시스템** (PRD §7.3): `pickFakeOuts()` 0/1/2 추첨(25/55/20%), 무작위 종류 선택.
  - `darkhorse`: 게임 60% 시점, 후방 30% 중 1마리 선정 + 1초 노출.
  - `stun`: 게임 30~50% 무작위 시점, 중위권 1마리 + 0.5초 노출.
  - `wobble`: 페이크 추첨됐을 때만, leader 결승 5% 직전.
  - `getFakeOutState(state, horseId)`, `isFinaleWobbleActive(state)` helper.
- `HorseRaceGame.jsx`
  - 다크호스: Coral 글로우 + "🌟 DARK HORSE" 배지.
  - 스턴: ⭐ 회전 마커 + 좌우 미세 흔들림 + opacity 0.7.
  - 막판 흔들림: 페이크 추첨 시에만 작동.
  - **결승 ceremony**: 1등 통과 후에도 슬로우 0.45× 유지하며 2~3등 골인 ceremony 진행. 모든 도착 후 1.4초 정지.

### A5 — 룰렛 (Mustard)
- `games.js`
  - roulette `maxPlayers: 50` → **35** (권장).
  - `hardMaxPlayers: 50` 추가 (실제 한도, parser의 50명 cap과 일치).
  - 36~50명에서 `getGameAvailability`가 권장 초과 경고 배지 반환.
- `simulation.js`
  - **`ballConfigFor(n)`** 신설 — n별 ball 사이즈/이름 표시 정책:
    - n ≤ 10: ballRadius 16, fontSize 11, 5자 cut, 이름 표시
    - n ≤ 25: ballRadius 13, fontSize 9, 4자 cut, 이름 표시
    - n ≤ 35: ballRadius 11, 이모지만
    - n ≤ 50: ballRadius 10, 이모지만 (권장 초과)
  - 드롭 시 `state.ballConfig.ballRadius` 사용.
- `RouletteGame.jsx`
  - SVG 공 렌더가 `state.ballConfig`로 사이즈/이름 분기.

### A6 — 캐스터 캡션 시스템
- 신규 `src/components/CasterCaption.jsx`
  - 좌하단 1줄 자막 — `caption` 14px / 500.
  - 다크 카드 + backdrop blur + hairline border.
  - `<CasterCaption message={...} />` props로 호출, 메시지 변경 시 0.3s 페이드인 → 2.4s hold → 페이드아웃.
- 4게임 통합:
  - 경주마: 출발 / 다크호스 등장 / 스턴 / 사진판정 / 1·2·3등 골인
  - 로또: 추첨 시작 / 매 추출 N등-이름
  - 폭탄: Round X 시작 / 💥 X등-이름
  - 룰렛: 낙하 시작 / 매 추출 N등-이름

### A7 — 폭탄 인트로 시각 보강
- `IntroScreen.jsx`
  - `selectedGame === 'bomb'` 분기:
  - 시그니처 컬러 `#181d26`이 다크 베이스 `#0d1218`과 거의 동일해 1단계 페이드인이 안 보이던 문제 해결.
  - 0.0~0.5s: 다크 베이스 위로 **Coral radial 글로우** + 큰 💣 (clamp 96~240px) + 도화선 80px + 노란 불꽃 (Gold drop-shadow + 0.4s pulse)
  - 0.5~1.0s: 도화선 80px → 20px로 축소되며 다크 베이스로 흡수
  - 카운트다운(3-2-1-GO) 단계는 공통 시퀀스 그대로

---

## 추가 처리 후보 점검

다음 항목은 PRD에는 명시되어 있으나 코드 미구현 또는 보류 상태:

### Phase 6 — 반응형 + 배포 (PRD §11)
- ☐ 1024×768 / 1366×768 / 1920×1080 / 2560×1440 점검
- ☐ 50명 입력 + 직접 입력 [1, 25, 50] 극단 케이스
- ☐ 빌드 ≤ 1.5MB gzip 확인 (현재 135 KB ✅ 충분)
- ☐ 게임별 청크 lazy load (성능 최적화)
- ☐ GitHub Pages 배포 (`vite.config.js` `base: '/dopamine-wheel/'`)
- ☐ README.md 작성

### `docs/implementation_followup.md` 잔여
- ☐ §3.2 HorseRace `useMemo` 캡처 정리 — 동작상 이슈 없음, cosmetic. (보류 가능)

### `docs/PRD_feedback.md` 진행 상황 (v2 시리즈에서 대부분 반영됨)
- ✅ 시네마틱 카메라 / 카오스 레이스(구 경주마) 16명 확장 — v2 V1+V4
- ✅ 부스터 타일 (카오스 레이스) — v2 V3
- ✅ 추첨기 가속 페이크 (로또) — v2 V5
- ✅ 룰렛 중간 기믹 (점프대) — v2 V6, v2.1로 무작위 배치
- ✅ 카오스 레이스 동물 6종 + quirk + 부스터/장애물 — v2.2
- ✅ 카오스 레이스 동물 밸런스 (positive quirk 6종 + baseSpeed 재조정) — v2.3
- ✅ 카오스 레이스 메인 이모지 = 참가자 본인 이모지 — v2.3.1
- ⏸ 로또 PIP 클로즈업 (사용자 피드백으로 명시적 미사용)
- ⏸ 중반 이벤트 슬롯 (모든 게임 — 게임별 보강이 이미 반영되어 별도 슬롯 불필요)
- ⏸ 카메라 워크 follow-leader / pip-closeup

### 기타 잠재 항목
- ☐ Press Start 2P 폰트 self-host (현재 시스템 monospace로 fallback 중) — Phase 6에서 검토
- ☐ index.html `<title>` / favicon / OG 메타데이터 — Phase 6 (배포 시 필요)
- ☐ 결과 화면 키보드 단축키 (R = 다시 하기, Esc = 처음으로) — 선택 사항

---

## v2.5 — 로고 도입 + Dark Hero + 헤드라인 변경 (다음 작업)

### 동기
사용자 피드백:
> "그냥 화이트 캔버스에서 벗어나고 싶은데. 기존 색상 틀을 깨고 싶어. docs/resource 폴더에 로고 파일들을 넣어뒀어. 여기서 사용하는 색상과 비슷한 색상들을 사용하고 이 로고를 사용해서 게임 곳곳에 넣어두고 싶어. '도파민 수레바퀴, 오늘의 당첨자는 누구?' 라는 멘트로 맨 위에 '오늘의 운명, 누가 가져갈까?'라는 멘트를 바꾸고 싶고."

### 자산
- `docs/resource/dopamine_wheel_logo1.png` — Logo1: 6분할 휠 + 노란 스파크 + "DOPAMINE WHEEL" 텍스트
- `docs/resource/dopamine_wheel_logo2_3.png` — 좌우 합쳐진 두 로고 (CSS background-position으로 절반씩 사용)
  - 왼쪽 절반 → Logo2: 8분할 휠 + 화살표
  - 오른쪽 절반 → Logo3: 와류 + 헥사곤 베젤

### 신규 컬러 톤 — 카지노 네온 (PRD v1.0~v1.2 아카이브 + 사용자 "카지노" 피드백)

> "약간 도박장에 들어온 거 같은 색상이면 좋겠어. 카지노처럼!"
> "아카이브에 있는 PRD 중에 네온을 위주로 사용하자는 의견이 있을 텐데. 그런 색상으로 바꿔보는 건 어떨까?"

#### 베이스 (다크)
- `casino-base` `#0a0a0f` (PRD v1.0~v1.2 딥 다크 그대로)
- `casino-elevated` `#1a1a2e` (보조 배경, 카드/시트)
- `casino-felt` `#0d4d2c` (도박장 테이블 그린, 보조 액센트)

#### 네온 강조 (PRD v1.0~v1.2 + 로고 톤 융합)
- `neon-pink` `#ff2d92` (메인 강조)
- `neon-cyan` `#00f5ff` (보조 강조)
- `neon-purple` `#b026ff` (추가 강조)
- `neon-lime` `#84cc16` (로고 톤 — 시그니처 보조)
- `casino-gold` `#ffd700` (당첨 / 메달 / 잭팟 톤)
- `casino-red` `#e10600` (룰렛 빨강 / 위험)

#### 텍스트
- `casino-text` `#ffffff` (메인)
- `casino-text-soft` `#a0a0c0` (보조, 라이트 그레이)

PRD 게임별 시그니처 컬러 4종(coral/forest/surface-dark/mustard)은 **이번 단계에서는 유지** — 각 게임 정체성. 향후 카지노 톤으로 재매핑은 사용자 결정.

### 컨셉 — "카지노 살롱 + 네온 사인"

> "홈이 너무 심심해서 조금 더 도파민 터지는 방향으로 바꾸고 싶어. 배경은 어둡게, 카지노에 들어온 것처럼."

핵심 원칙:
1. **베이스는 카지노 felt 다크** — 검은 펠트 위 네온 사인이 켜진 라스베가스 카지노 풍
2. **곳곳에 네온 글로우** — 정적이지 않게, 펄스/글로우/그림자
3. **로고는 시각 앵커** — Hero에 큰 Logo1, top bar에 작은 LogoWheel, 곳곳에 LogoSpiral 워터마크
4. **시그니처 4색 dot** — Hero에 카지노 칩처럼 줄세움, 살짝 펄스
5. **헤드라인은 네온 사인** — 핑크/시안 글로우 셰이딩, 굵은 느낌

### 명세 — Home 요소별 도파민 보강

#### (1) 헤드라인 텍스트 변경
- "오늘의 운명, 누가 가져갈까?" → **"도파민 수레바퀴, 오늘의 당첨자는 누구?"**
- 적용 위치: Hero 영역 메인 타이틀

#### (2) Logo 컴포넌트 신설
- `src/assets/dopamine_wheel_logo1.png` + `src/assets/dopamine_wheel_logo2_3.png` (이미 복사됨)
- `src/components/Logo.jsx`
  - `<Logo variant="full" />`: logo1.png 그대로 (`<img>` 태그)
  - `<Logo variant="wheel" />`: logo2_3.png의 **왼쪽 절반** (background-image + `background-size: 200% 100%; background-position: 0 0`)
  - `<Logo variant="spiral" />`: 같은 PNG의 **오른쪽 절반** (`background-position: 100% 0`)
  - `size` prop으로 크기 가변, 1:1 정사각.

#### (3) Top bar (슬림한 네온 헤더)
- 베이스: `bg-casino-base` (#0a0a0f), 하단 `border-b border-neon-cyan/30` (네온 시안 보더 30%)
- 좌측: `<Logo variant="wheel" size={36} />` + 글자 "DopamineWheel"
  - 텍스트 색: 화이트, `text-shadow: 0 0 12px #ff2d92` (네온 핑크 글로우)
- 우측: 설정 버튼 — hover 시 네온 시안 글로우

#### (4) Hero (홈의 도파민 핵심)
- 영역: top bar 직하 ~ STEP 1 위, 풀 폭
- 베이스: `bg-casino-elevated` (#1a1a2e) `rounded-lg` `p-xxl`
- 가장자리 글로우: `box-shadow: 0 0 60px rgba(255, 45, 146, 0.25)` (네온 핑크 옅게)
- 좌측: 큰 Logo1 (`height: clamp(120px, 18vw, 180px)`)
- 우측 (md+) / 아래 (모바일): 텍스트 영역
  - 헤드라인: "도파민 수레바퀴, / 오늘의 당첨자는 누구?" (`display-lg` 화이트, **네온 핑크 텍스트 셰도우**)
  - 보조 카피: "이름을 적고 게임을 골라 — 단 한 번에 결정." (`text-casino-text-soft` 라이트 그레이)
  - **4 시그니처 컬러 dot** — 카지노 칩처럼 가로 정렬 (Coral / Forest / Surface Dark / Mustard) + 작은 펄스 (각각 0.4s 간격으로 어긋나게)
- 진입 시 페이드인 0.4s + y -10px → 0

#### (5) 참가자 입력 (Editorial 절제 → 다크 살롱)
- 라벨 "참가자 입력" — 화이트
- textarea: `bg-casino-elevated` + `border border-on-dark/10`
  - 포커스 시 `border-neon-cyan` + `box-shadow: 0 0 12px #00f5ff` (네온 시안 글로우)
  - placeholder는 라이트 그레이
- 카운터 "현재 N명" — 화이트 + 숫자만 `text-neon-pink` 강조 (현재 8명 형식)
- 50명 초과 경고 — `text-casino-red` (#e10600)

#### (6) EmojiChips (보조 톤 갱신)
- 카드 배경: `bg-casino-elevated` (대신 `signature-cream` 흰색 톤은 다크 톤에서 부조화)
- 텍스트: 화이트
- 큰 이모지(36px) 위 + 이름 아래 (v2.3 그대로)
- 호버 시 살짝 글로우 (`box-shadow: 0 0 8px rgba(255,45,146,0.5)`)

#### (7) KCounter (다크 카드 + 네온 보더)
- 컨테이너: `bg-casino-elevated rounded-md p-md border border-on-dark/10`
- 라벨 "당첨자 수" — 화이트
- +/- 버튼: 다크 + hover `border-neon-cyan` + cyan 글로우
- 숫자: 큰 텍스트, 정상 시 화이트 / 경고 시 `text-casino-red`
- 빨간 경고 텍스트도 `text-casino-red` + 좌측 `⚠` 아이콘

#### (8) WinnerModeSelector
- 배경: `bg-casino-elevated`
- 라디오 active 시 `border-neon-pink` + 핑크 글로우
- 직접 입력란 포커스 시 `border-neon-cyan`

#### (9) 게임 카드 그리드 (시그니처 컬러는 유지, 글로우 강화)
- 카드 자체 색은 그대로 (Coral / Forest / Surface Dark / Mustard)
- 호버 시 시그니처 글로우 강화 (`box-shadow: 0 0 32px {sig}80`)
- 카드 상단에 작은 LogoWheel/Spiral 워터마크는 **이번 단계 보류** (카드가 시그니처 정체성)

#### (10) Footer (네온 사인 마무리)
- `border-t border-neon-cyan/20`
- "공정성: Web Crypto API · 매 프레임 실시간 추첨" — `text-casino-text-soft` + 좌측 작은 네온 핑크 dot

#### (11) 배경 디테일
- 페이지 전체에 옅은 노이즈 패턴 또는 vignette (선택)
- 또는 좌상/우하단에 매우 옅은 네온 핑크/시안 radial glow (Hero 외 영역도 살짝 라이브함)

### 게임에서 반영할 네온 색상 가이드 (단계별 — 이번엔 미반영, 검토용)

> 각 게임 시그니처는 정체성이라 그대로 두되, **보조 액센트로 네온 추가** 검토.

| 게임 | 시그니처 (유지) | 추가 네온 액센트 (제안) |
|---|---|---|
| 카오스 레이스 (Coral) | 트랙 라인 / 결승선 | 트랙 lane 사이 가는 네온 핑크 라인 / 결승 통과 시 네온 핑크 폭발 |
| 럭키 로또 (Forest) | 챔버 글로우 / 출구 튜브 | warmup 단계 챔버 안 네온 시안 트레일 / 추출 라인 네온 시안 펄스 |
| 폭탄 돌리기 (Surface Dark) | 폭탄 본체 / 도화선 | 좌석 ring을 네온 퍼플 글로우로 / 폭발 시 네온 핑크 셰이크 |
| 운명의 낙하 (Mustard) | 못 글로우 / 칸 그라데이션 | 점프대를 네온 골드 + 시안 캡으로 / bin 진입 시 네온 핑크 펄스 |

→ 카지노 분위기와 어울리되 시그니처 정체성은 보존.

### 1단계 적용 범위 (이번 작업)
- ☑ 컬러 토큰 추가 (`tailwind.config.js`)
- ☑ Logo 컴포넌트 신설
- ☑ 헤드라인 텍스트 변경
- ☑ Top bar 다크 + 작은 LogoWheel
- ☑ Hero 박스 (큰 Logo1 + 헤드라인 + 4 dot)
- ☑ 참가자 입력 다크 톤
- ☑ EmojiChips 다크 톤
- ☑ KCounter / WinnerModeSelector 다크 카드
- ☑ Footer 다크 + 네온 dot

### 2단계 (사용자 피드백 후)
- ☐ 게임별 네온 액센트 (위 표)
- ☐ Intro/Result 로고 워터마크
- ☐ 결과 화면 confetti에 네온 핑크/시안/퍼플 추가

### 변경 파일
- `src/assets/` (신규) — 로고 PNG 2개
- `src/components/Logo.jsx` (신규)
- `src/screens/HomeScreen.jsx` — 헤드라인 변경 + hero 박스 + Logo 활용
- `src/screens/IntroScreen.jsx` — 우하단 워터마크
- `src/screens/ResultScreen.jsx` — 헤드라인 위 Logo
- `tailwind.config.js` — `logo-*` 컬러 토큰 8종 추가

### 단계별 적용 + 사용자 확인
- **1단계 (이번)**: 헤드라인 변경 + 컬러 토큰 추가 + Logo 컴포넌트 + **Home 전체 다크 카지노 톤** + Hero 박스. 게임 카드 시그니처 컬러는 그대로 유지. → 사용자 확인.
- **2단계 (피드백 후)**: 게임 카드 시그니처 컬러를 카지노 톤으로 재매핑할지 결정.
- **3단계 (피드백 후)**: Intro/Result 로고 워터마크.

---

## v2.4 — Home 화면 리디자인 (Hero + STEP UX) — ❌ 롤백

**시도 후 사용자 피드백으로 즉시 되돌림.** Hero + STEP UX 방향이 기대보다 더 별로였음.
- `src/screens/HomeScreen.jsx` — v2.3 시점 상태로 복귀
- `src/components/SectionHeader.jsx` — 삭제
- `src/components/GameCardGrid.jsx` — `hideHeading` prop 제거 (이전 시그니처로 복귀)
- 추후 Home 디자인 개선은 다른 방향(예: 미세 디테일 보강 / 카드 호버 모션 강화 등) 검토 필요.

### 동기
사용자 피드백:
> "홈 화면 디자인이 너무 안예뻐서 수정하고 싶어. 괜찮게 만들 수 있는 방법 없을까?"

현재 Home은 입력/옵션/게임 선택이 단조롭게 나열되어 시각 위계와 흐름이 약함. PRD §10 Editorial Mode (화이트 캔버스 + 시그니처 카드 임팩트) 철학 안에서 매력 강화.

### 명세
PRD §10.10 Don't (그라데이션 배경 / 폰트 weight 700 / Pill / 보조 액센트 컬러 추가) 모두 준수.

#### (1) Hero 섹션 신설 (top bar 직하)
- `display-lg` (40px / 400) 두 줄 헤드라인 — "오늘의 운명, / 누가 가져갈까?"
- 그 아래 보조 안내 1줄 — "이름을 적고 게임을 골라 — 단 한 번에 결정"
- **4 시그니처 컬러 dot 라인** — `signature-coral / forest / surface-dark / mustard` 12px 원 + 작은 라벨 "4가지 미니게임"
- 진입 시 0.4s 페이드인

#### (2) 섹션 헤더 통일 — `<SectionHeader>` 컴포넌트
- `eyebrow`: `text-caption` 14px / 500, uppercase, tracking-wider, `text-muted` — "STEP 1·2·3"
- `heading`: `text-display-md` 32px / 400, `text-ink` — "참가자" / "결정 옵션" / "게임 선택"

#### (3) 결정 옵션 카드 분할 (STEP 2)
- `KCounter` / `WinnerModeSelector`를 각각 `bg-surface-soft` + `rounded-md` + `p-lg` 카드로 감쌈
- 데스크톱(md+) 좌·우 분할, 모바일 1-up

#### (4) Top bar 슬림화 — 태그라인은 hero로 승격, 로고 + 설정 버튼만 남김

#### (5) Footer — `text-caption text-muted` "공정성: Web Crypto API · 매 프레임 실시간 추첨"

### 변경 파일
- `src/screens/HomeScreen.jsx` — 통째 리라이트
- `src/components/SectionHeader.jsx` (신규)

### 검증
- ☐ Hero 진입 페이드 자연스러움
- ☐ STEP 1·2·3 흐름 명확
- ☐ 옵션 카드 좌·우 분할 (md+) / 1-up (모바일)
- ☐ 시그니처 컬러 dot 4색 정확
- ☐ Footer 절제

---

## v2.3 — Home 이모지 칩 가독성 개선 ✅

### 동기
사용자 피드백:
> "홈 화면에서 내 이름에 해당하는 이모지가 어떤 건지 잘 보일 수 있으면 좋겠는데. 공에 이모지가 크다보니 어떤 게 내 이름인지 정확히 보이지 않는다는 단점이 있어서."

현재 `EmojiChips.jsx`는 `(이모지)(이름)` 가로 인라인 pill로 렌더 — 이모지가 작아 식별성↓. 게임 본편의 큰 이모지(공/말/좌석)와 매칭이 어려움.

### 명세 — 세로 카드 레이아웃
- 각 참가자를 **세로 카드**로 렌더 (`(큰 이모지)\n(이름)`).
- 큰 이모지: **32~40px** (현재 14px 캡션 인라인 대비 ~3배).
- 이름: caption (14px / 500), 이모지 아래 중앙 정렬.
- 카드 모양: `rounded-md` (`rounded-full` 폐기 — pill 형태가 세로 카드와 어울리지 않음).
- 배경: `signature-cream` 유지 (보조 톤).
- 폭: 자동 (이름 길이에 맞춤), min-width 64px.
- 패딩: `px-sm py-xs`.
- 잘림(truncated) 표시: 기존 title attribute 유지.

### Wrap 동작
- `flex-wrap` 그대로 — 폭에 따라 자동 줄바꿈.
- 카드 간격 `gap-xs` (8px).

### 검증
- `EmojiChips.test.jsx` 같은 통합 테스트 없음 — 시각 검증만.
- ☐ 50명 입력 시 5~6줄 wrap, 가독성 OK
- ☐ 동명이인 #1/#2/#3 이모지 차이 명확히 보임 (FNV-1a 매핑)

---

## v2.2 — 룰렛 동시 낙하 + 장애물 증가 ✅ (이전 작업)

### 동기
v2.1까지 룰렛은 `dropQueue`로 **순차 드롭** (0.12~0.6초 간격). 사용자 피드백:
> "첫번째로 떨어진 공이 가장 유리한건 어쩔 수 없을 것 같은데. 공이 하나씩 하나씩 하늘에서 출발하는 게 아니라 장애물을 더 많이 만들고 수평으로 여러 개를 동시에 떨어뜨리는 건 어때?"

문제: 먼저 떨어진 공일수록 충돌·튕김 적어 그대로 빨리 exit. 결과의 무작위성↓.

### 명세

#### (1) 동시 낙하 — Plinko Tournament 방식
- `dropQueue`/`nextDropAt`/`dropInterval` **제거**.
- `createRoulette()` 시점에 **모든 공을 월드에 동시 배치**.
- 시작 위치: 챔버 위쪽(Y < pegFieldTop)에 격자형으로 쌓음.
  - 가로: innerLeft + (col+0.5) × colSpacing
  - 세로: -30 - row × 35 (음수 Y = 챔버보다 위)
  - cols = `min(10, ceil(sqrt(n × 1.5)))` (n=10→4, n=25→7, n=50→9)
  - rows = `ceil(n / cols)`
- 동일 X 위치 첫 시작점은 랜덤 jitter ±3px로 미세 분산.

#### (2) 장애물 증가
- 못 격자: 각 row count +1 (n≤10: 8→**9** / n≤25: 12→**13** / n≤35: 16→**17**)
- 점프대 개수: 2~4 → **3~5** (`pickJumpers` 갱신)

#### (3) UX 영향
- 게임 길이는 살짝 늘어날 수 있음 (장애물↑) — 90초 budget 안에 들어가야 함.
- 캐스터 캡션 "🪂 낙하 시작!"은 그대로. (한 번에 떨어지므로 자연스러움)

#### (4) 검증
- 기존 5개 sim test + v2.1 jumper test 2건 유지.
- 신규: dropQueue가 비어 있고 모든 공이 즉시 ballsByLabel에 등록되는지.
- 신규: 시작 Y가 모두 0 미만(챔버 위)인지.

---

## v2.1 — 룰렛 점프대 무작위 배치 ✅ (이전 작업)

### 동기
v2 V6에서 추가한 점프대 2개가 **항상 동일한 위치(좌·우 30°/-30°, 가운데 행)**에 고정되어 있어 매 게임 동일한 패턴으로 보임. 사용자 피드백:
> "운명의 낙하에 있는 짝대기를 항상 고정된 가운데에 두 개 위치시키는 게 아니라 게임마다 다르게 여러 개를 배치하고 싶어. 최소 2개~4개로 임의의 위치에."

### 명세
- **점프대 개수**: 매 게임 시작 시 `randInt(3) + 2` → **2~4개** 무작위.
- **위치**: 못 격자 영역 내부 무작위. X 범위 `innerLeft + 15%~85% × fieldW`, Y 범위 `pegFieldTop + 25%~75% × fieldH`.
- **각도**: -45° ~ +45° 무작위 (수직/수평에 가까우면 게임이 깨짐).
- **길이**: `fieldW × (0.13 ~ 0.20)` 범위 (살짝 가변).
- **점프대끼리 거리**: 최소 `fieldW × 0.18` 떨어지도록 rejection sampling (무한 루프 방지 위해 50회 시도 후 포기).

### 구현 변경점
- `simulation.js` `createRoulette()`에서 `jumpers` 배열을 `pickJumpers(...)` 헬퍼로 교체.
- `RouletteGame.jsx` SVG 점프대 렌더링은 `state.jumpers`를 그대로 사용하므로 추가 변경 불필요.
- 시드 주입(`__setTestSeed`) 시 결정성 유지 — `randFloat()` 기반이라 자동.

### 검증
- 기존 5개 simulation.test.js 케이스 (n=2/5/15/30/결정성) 통과 유지.
- 신규 테스트: 2~4개 범위 보장 + 같은 시드 → 같은 점프대 배치.

---

---

## v2.2 — 카오스 레이스 (구 경주마) 전면 개편 ✅

> **목적**: 단조로운 평행 레인 경주(말 1종)를 **혼합 동물 6종 + 부스터 + 장애물** 카오스 레이스로 전환. `implementation_followup.md` §6 (옵션 4 풀패키지) 명세 따름.
> **사용자 요청**: "옵션4로 가자" — 동물 변경 + 부스터/장애물 동시 적용.

### 게임명 / 메타 변경
- 이름: `경주마 / Horse Race` → `카오스 레이스 / Chaos Race`
- 카드 이모지: `🐎` → `🏁` (특정 동물 편향 회피, 결승선 깃발로 race 정체성 유지)
- description: "결승선까지 매 프레임 가속도 추첨" → "6종 동물 + 부스터·장애물 카오스 레이스"
- 폴더명 / id (`horse`)는 유지 — 작업 범위 최소화 (followup §6.1 권장)

### A — 동물 species 시스템 + quirk
`src/games/horseRace/simulation.js`에 `SPECIES_PROPS` 추가 (6종):

| 이모지 | 종 | baseSpeedFactor | quirk |
|---|---|---|---|
| 🐰 rabbit | 1.0× | 5~10s 시점에 0.4~1.0s 잠 (1회) |
| 🐢 turtle | 0.95× | velVariance 0.55 (꾸준) |
| 🐧 penguin | 1.0× | 0.5s 체크당 8% 미끄럼 (1회, 0.8s 0.4× 감속) |
| 🐹 hamster | 1.0× | velVariance 1.5 (폭발적) |
| 🐌 snail | 0.85× | position ≥ 0.8에서 finalBoost 1.6× |
| 🦅 eagle | 1.0× | 비행 — 장애물 면제 + 시각 y-sin |

- `assignSpecies(n)` — 시드 기반 결정성 분배. 6종 전체 셔플 후 라운드 로빈, 한 번 더 셔플로 인접 동일종 회피.
- step에서 quirk 적용: 잠 (`sleepEndsAt`), 미끄럼 (`slipUntil`), 달팽이 부스트 (`snailBoosting`).

### B — 장애물 시스템
- `pickObstaclePositions()` — 25/50/75% 후보 중 1~2개 선택, ±2% jitter.
- `obstaclePauseSec(species)` 페널티: 토끼/햄스터 0.1s (점프), 거북이 0.3s (우회), 펭귄 0.6s + 후진 0.02, 달팽이 0.5s, eagle 0 (면제).
- 트랙 위에 🌳 / 🪨 시각 표시 (idx 짝수/홀수).

### C — 캐스터 캡션 통합
기존 `CasterCaption.jsx`에 새 quirk 이벤트 트리거 추가:
- `💤 {이름} 잠들었다!` (rabbit sleep)
- `💦 {이름} 미끄러졌다!` (penguin slip)
- `🐌 {이름} 막판 폭주!` (snail finalBoost)

기존 캡션 (출발 / 다크호스 / 스턴 / 사진판정 / 1·2·3등 골인)은 그대로.

### 컴포넌트 (`HorseRaceGame.jsx`)
- 메인 캐릭터 (v2.2 한정): `🐎` 고정 → `h.speciesEmoji` (동물별)
  - **참고**: v2.3.1에서 다시 `h.emoji` (참가자 본인 이모지)로 변경됨. species는 라벨로 이동. 아래 v2.3.1 섹션 참조.
- 모션 분기:
  - eagle 비행: y축 ±14px sin 모션 (`state.elapsed * 4 + i`)
  - 잠: 회전 -10deg + opacity 0.7 + 💤 마커 (위에서 떠오름 애니)
  - 미끄럼: 회전 ±18deg sin + 💦 마커
  - 달팽이 부스트: scale 1.15 + Coral drop-shadow
- 시네마틱 PIP에 species 정보 표시 (`🎥 LEADER · 거북이`)

### `lib/games.js`
- horse 카드 `name: '카오스 레이스'`, `nameEn: 'Chaos Race'`, `emoji: '🏁'`, description 갱신.

### 테스트 (5 → 9, +4건)
`src/games/horseRace/simulation.test.js`:
- (기존) rank 1..n / 도착 / budget / 결정성 / 단일 race
- (신규) species 6종 풀에서만 할당
- (신규) species 분배 시드 결정성
- (신규) obstacles 1~2개 + 25/50/75% 부근 (10 시드)
- (신규) rankings에 species/speciesEmoji 필드 포함

`경주마` 텍스트 참조 갱신:
- `src/App.test.jsx`, `src/components/GameCard.test.jsx`, `src/components/GameCardGrid.test.jsx` — `카오스 레이스`로 일괄 변경.

### 결정성·공정성
- 모든 quirk 트리거(잠 시점, 미끄럼 체크, species 분배, obstacle 위치)는 `randFloat()` 기반 → 시드 주입 시 결정적.
- baseSpeedFactor가 quirk를 상쇄해 평균 finish가 species 간 균형되도록 설계 (정밀 검증은 100회 시뮬 통계로 추후).

---

## v2.3 — 카오스 레이스 동물 밸런스 패치 ✅

> **사용자 요청**: "달팽이가 항상 너무 느린거같아. 적당히 동물들 밸런스 패치를 해야할 것 같은데. ... 동물들에 다양한 요소들을 넣고 싶은데. 달팽이는 중간에 부스트 기능이 랜덤하게 들어간다거나 뭐 새가 나무가 있으면 잠깐 랜덤하게 쉬어갈수도 있다던가 등등".
> **목적**: 동물별 다양성 강화 + 달팽이 "항상 꼴등" 이슈 해소.

### 동물별 positive quirk 6종 신규 추가

`SPECIES_PROPS`의 각 종에 positive quirk 필드 추가. 모두 `randFloat()` 기반이라 시드 결정성 유지.

| 종 | positive quirk | 트리거 조건 | 효과 | 캐스터 |
|---|---|---|---|---|
| 🐰 rabbit | wake-sprint | sleep 종료 직후 (자동) | 1.0s 동안 1.3× | "🐰 깜짝 놀라 달린다!" |
| 🐢 turtle | catch-up | position 35~65% 사이 1회 | 2.0s 동안 1.15× | "🐢 꾸준한 추격" |
| 🐧 penguin | ice slide | position 20~80% 사이 1회 | 1.0s 동안 1.35× | "❄️ 빙판 슬라이드!" |
| 🐹 hamster | turbo wheel | 전반 10~45% / 후반 50~85% 각 1회 | 0.6s 동안 1.5× × 2회 | "🐹 휠 폭주!" |
| 🐌 snail | mid-boost | 25~45% / 55~80% 각 70% 확률 발동 | 1.2s 동안 1.5× × 0~2회 | "🌟 변신!" |
| 🦅 eagle | tree rest | 장애물 통과 시 40% 확률 (immune 상쇄) | 0.4s 휴식 (negative quirk) | "🦅 잠시 쉬어간다" |

### baseSpeedFactor 재조정 (공정성)

| 종 | v2.2 | v2.3 | 비고 |
|---|---|---|---|
| 🐰 rabbit | 1.0 | **0.97** | wake-sprint로 미세 보상 |
| 🐢 turtle | 0.95 | **0.93** | catch-up 보상 |
| 🐧 penguin | 1.0 | **0.95** | ice slide 보상 |
| 🐹 hamster | 1.0 | **0.93** | turbo 보상 |
| 🐌 snail | **0.85** | **0.93** | mid-boost로 경쟁력 확보. "항상 꼴등" 해소. |
| 🦅 eagle | 1.0 | 1.0 | tree rest로 immune 페널티 상쇄 — 유지 |

### 구현 세부

`src/games/horseRace/simulation.js`:
- 각 horse에 quirk 스케줄 사전 계산 (`catchupAt`, `iceSlideAt`, `turboAts`, `midBoostAts`).
- `wakeSprintUntil` / `catchupUntil` / `iceSlideUntil` / `turboUntil` / `midBoostUntil` — 활성 종료 시점 추적.
- step 함수: position 기반 트리거 → `positiveMultiplier` 계산 → `effectiveV *= posMult`.
- **positive multiplier 동시 활성 시 가장 큰 1개만 적용** (중첩 방지, `Math.max` 누적).
- eagle tree rest: 장애물 통과 처리에서 `randFloat() < 0.4` 시 `obstaclePauseSec` 대신 `treeRest.duration` 적용.

`src/games/horseRace/HorseRaceGame.jsx`:
- `getQuirkState`에 `isWakeSprint / isCatchup / isIceSlide / isTurbo / isMidBoost / isTreeResting` 추가.
- 캐릭터 시각 통일: 모든 positive quirk = Coral drop-shadow + scale 1.15.
- quirk별 마커 (positioned absolute):
  - ❄️ ice slide
  - ⚡ turbo
  - 🌟 mid-boost
  - 🍃 tree rest (위로 떠오르는 애니)
  - 💤 sleep (기존)
  - 💦 slip (기존)
- `treeRest` 시 opacity 0.7 (sleep과 동일 처리).

### 테스트
- 9개 simulation 테스트 그대로 통과 (v2.2 4건 + 기존 5건).
- 신규 quirk는 시드 결정성 유지 — `randFloat()` 호출만 추가, 기존 트리거 로직 변경 없음.

### 영향 파일
- `src/games/horseRace/simulation.js` — `SPECIES_PROPS` quirk 필드 + `createHorseRace` quirk 스케줄 + `stepHorseRace` positive multiplier 계산
- `src/games/horseRace/HorseRaceGame.jsx` — `captionFiredRef` 확장 + quirk별 캡션·마커 추가
- `docs/PRD.md` — §7.4 species 표 v2.3 갱신 + 변경이력 v2.3 행 + §1.6 결정 사항

---

## v2.3.1 — 카오스 레이스 메인 이모지 변경 ✅

> **사용자 요청**: "카오스 레이스에 달리는 이모지는 그냥 본인 캐릭터의 이모지가 좋겠어. 각 동물 캐릭터 말고. 헤깔릴듯?"
> **목적**: 트랙을 달리는 메인 캐릭터를 species 이모지(🐰🐢🐧🐹🐌🦅) 대신 **참가자 본인 이모지**(FNV-1a 매핑, 예: 🦊 🐯 🍎)로 교체. species 정체성은 라벨에 작게 노출해 식별 혼동 회피.

### 변경 위치 (모두 `HorseRaceGame.jsx`)
| 영역 | 이전 (v2.2~v2.3) | 이후 (v2.3.1) |
|---|---|---|
| 트랙 메인 캐릭터 | `h.speciesEmoji` (🐰 🐢 등) | `h.emoji` (참가자 본인 이모지) |
| 라벨 | `{h.emoji} {h.displayName}` | `{h.speciesEmoji} {h.displayName}` |
| 시네마틱 PIP 큰 아이콘 | `leader.speciesEmoji` | `leader.emoji` |
| PIP 부제 | `🎥 LEADER · 거북이` | `🎥 LEADER · 🐢 거북이` |
| PIP 본문 | `{emoji} {name}` | `{name}` (이모지는 큰 아이콘에서 노출) |

### 의도
- **메인 = 참가자의 정체성**. 50명 다른 이모지가 트랙 위에 흩어져 누가 누군지 즉시 식별.
- **species는 quirk의 원인**으로 라벨에 부수 표시. "내 캐릭터가 왜 잠을 자지?" → 라벨의 🐰 보면 이해.
- 시뮬레이션 / quirk 동작은 동일 (eagle y-sin 모션, sleep 회전 등은 species 기반 그대로).

### 영향 파일
- `src/games/horseRace/HorseRaceGame.jsx` — 메인 이모지 / 라벨 / PIP 3곳

테스트 영향 없음 (115/115 유지).

---

## v2.4 — 폭탄 라운드별 fuse 무작위 ✅

> **사용자 요청**: "폭탄은 다 비슷한 시간에 터지는거같은데 착각인가? 그냥 확률상 세번째 사람이 폭탄이 터질 확률이 높은거같아. 이거 폭탄이 터지는 시간을 매번 랜덤으로 해줘."
> **진단**: 정확. 이전엔 `state.fuseSec` 단일 값(`computeBombTimings(n).fuseSec`)을 모든 라운드에 동일 적용 → 라운드별 폭발 시점 균질 → 평균 패스 인터벌과 결합되어 시작 좌석 + ~7~8 이동 영역(체감 "3번째 사람")에서 폭발 빈도 편향.
> **목적**: 라운드마다 fuse를 무작위화해 폭발 시점이 다양해지고 좌석 편향 해소.

### 변경 (`src/games/bomb/simulation.js`)

| 영역 | 이전 | 이후 (v2.4) |
|---|---|---|
| `state.fuseSec` | 게임 전체 단일 값 | **현재 라운드의 fuse** (라운드 진입 시 갱신) |
| `state.avgFuseSec` | 없음 | `computeBombTimings(n).fuseSec` (평균 보존) |
| `state.fuseSchedule` | 없음 | `[avgFuse × U[0.6, 1.4]] × totalRounds` (사전 추첨) |
| 라운드 진입 시 | `fuseRemaining = state.fuseSec` (고정) | `state.fuseSec = state.fuseSchedule[currentRound]` → `fuseRemaining = state.fuseSec` |

### 결정성·공정성
- `pickRoundFuse(avgFuse)`는 `randFloat()` 기반 → 시드 주입 시 결정적.
- 평균은 `avgFuse`에 가까워 총 게임 길이 budget(MIN 10s ~ MAX 25s) 영향 없음.
- 라운드별 fuse가 ±40% 변동하므로 폭발 시점이 라운드마다 변하고, 시작 좌석 + 패스 거리도 매 라운드 다름 → 좌석 편향 자연스럽게 해소.

### 컴포넌트 호환
- `BombGame.jsx`는 `state.fuseSec`을 도화선 길이 비율 분모로 사용. v2.4부터 `state.fuseSec`은 *현재 라운드*의 fuse라 비율 계산 그대로 정상 동작.
- 추가 변경 없음.

### 테스트 (+3건)
- `fuseSchedule has totalRounds entries with variance` — 길이 + 분산(2개 이상 다른 값)
- `fuseSchedule average is close to avgFuseSec ±25%` — 평균 보존
- `fuseSchedule is deterministic with same seed` — 시드 결정성

총 **118/118 통과** (115 → 118).

### 영향 파일
- `src/games/bomb/simulation.js` — `FUSE_VARIANCE_MIN/MAX` 상수 + `pickRoundFuse` 헬퍼 + `createBomb`의 `fuseSchedule` + `stepBomb` 라운드 진입 시 갱신
- `src/games/bomb/simulation.test.js` — 신규 테스트 3건
- `docs/PRD.md` §7.6 라운드 시스템 + 변경이력 v2.4
- `docs/PLAN.md` 본 섹션

---

## v2.4.1 — 폭탄 fuse 고정 범위 2.0~5.0초 ✅

> **사용자 요청**: "폭탄은 최소 2초 이상은 넘기다가 터지게 해줘. 2초~5초정도 시간 내에 터지게."
> **목적**: v2.4의 avg 기반 ±40% 보정으로는 짧은 fuse(0.4~0.9s)가 자주 등장 — 사용자가 너무 빠르다고 느낌. 절대 범위 [2.0s, 5.0s]로 고정해 매 라운드 충분한 긴장감 확보.

### 변경 (`src/games/bomb/simulation.js`)
```diff
- const MIN_FUSE_SEC = 0.45;
- const FUSE_VARIANCE_MIN = 0.6;
- const FUSE_VARIANCE_MAX = 1.4;
- const MIN_GAMEPLAY_SEC = 10;
- const MAX_GAMEPLAY_SEC = 25;
- const TARGET_PER_ROUND = 1.5;
+ export const FUSE_MIN_SEC = 2.0;
+ export const FUSE_MAX_SEC = 5.0;

- function pickRoundFuse(avgFuse) {
-   const factor = FUSE_VARIANCE_MIN + randFloat() * (FUSE_VARIANCE_MAX - FUSE_VARIANCE_MIN);
-   return Math.max(MIN_FUSE_SEC, avgFuse * factor);
- }
+ function pickRoundFuse() {
+   return FUSE_MIN_SEC + randFloat() * (FUSE_MAX_SEC - FUSE_MIN_SEC);
+ }
```

`computeBombTimings(n)`도 단순화 — 동적 계산 제거하고 평균 3.5초 고정 반환.

### 게임 길이 영향
| n | 라운드 | 라운드당 평균 (fuse + 0.55 + 0.3) | 총 평균 | 최악 케이스 |
|---|---|---|---|---|
| 2 | 1 | 4.35s | 4.35s | 5.85s |
| 5 | 4 | 4.35s | 17.4s | 23.4s |
| 10 | 9 | 4.35s | 39.15s | 52.65s |
| 15 | 14 | 4.35s | 60.9s | 81.9s |
| 20 | 19 | 4.35s | **82.65s** | **111.15s** |

PRD §3.3 90초 budget을 n>15에서 평균적으로, n=20 worst case에서 명확히 상회. 사용자 의도대로 보존하되, n=20에서 자주 90s를 넘는다면 향후 maxPlayers 하향 조정 검토 가능.

### 테스트 갱신
- `computeBombTimings reflects v2.4.1 fuse range` — 평균이 3.5에 가까운지 (`toBeCloseTo(3.5, 5)`), n=20 총 평균이 60~110s 사이인지.
- `handles n=20 within bomb budget (v2.4.1: 2~5s fuse, ~120s max)` — `runToFinish(state, 130)`로 timeout 확장, 종료 검증.
- 다른 9개 테스트 그대로 통과.

### 컴포넌트 호환
- `BombGame.jsx`의 `state.fuseRemaining / state.fuseSec` 비율은 그대로 작동 (v2.4에서 `fuseSec`이 현재 라운드 값으로 갱신됨).
- 도화선 시각 길이는 자동 적응.

### 영향 파일
- `src/games/bomb/simulation.js` — 상수 정리 + `pickRoundFuse()` 인자 제거 + `computeBombTimings` 단순화
- `src/games/bomb/simulation.test.js` — 2건 갱신
- `docs/PRD.md` 헤더 / §7.6 / §16
- `docs/PLAN.md` 본 섹션

---

## 다음 진행

**Phase 6 (반응형 + 배포)** — 마지막 단계. 하위 작업:

1. 청크 분리 (게임별 lazy load) — 게임 안 들어간 사용자에 matter.js 미로딩
2. `vite.config.js` 배포 base 경로
3. 반응형 점검 (다양한 해상도)
4. Press Start 2P 폰트 self-host (선택)
5. README.md 작성
6. (선택) GitHub Pages 자동 배포 워크플로우 (`.github/workflows/deploy.yml`)
7. (선택) favicon + OG 메타

---

**문서 끝.**

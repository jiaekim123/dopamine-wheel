# DopamineWheel — 진행 로그 (PLAN)

> **기간**: 2026-05-09 (단일 세션)
> **PRD 버전**: **v1.5** (PRD_feedback 결정 사항 + 공통 시스템 4종 + 게임별 보강)
> **현재 상태**: **Phase 1~5 + v1.4.1 + v1.4.2 + v1.5 (A1~A7) 완료**, Phase 6 (반응형 + 배포) 대기
> **테스트**: **98/98 통과**
> **빌드**: 417 KB JS / 135 KB gzip

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

### `docs/PRD_feedback.md` v2 보류 (PRD §7.3a 보강에서 명세는 되었으나 구현은 v2)
- ⏸ 시네마틱 카메라 / 경주마 16명 확장
- ⏸ 부스터 타일 (경주마)
- ⏸ 추첨기 가속 페이크 (로또)
- ⏸ 로또 PIP 클로즈업 (사용자 피드백으로 명시적 미사용)
- ⏸ 룰렛 중간 기믹 (회전 디스크/점프대)
- ⏸ 중반 이벤트 슬롯 (모든 게임)
- ⏸ 카메라 워크 follow-leader / pip-closeup

### 기타 잠재 항목
- ☐ Press Start 2P 폰트 self-host (현재 시스템 monospace로 fallback 중) — Phase 6에서 검토
- ☐ index.html `<title>` / favicon / OG 메타데이터 — Phase 6 (배포 시 필요)
- ☐ 결과 화면 키보드 단축키 (R = 다시 하기, Esc = 처음으로) — 선택 사항

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

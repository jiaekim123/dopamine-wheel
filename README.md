# 🎡 DopamineWheel

> 회의·회식·발표 자리에서 큰 화면에 띄워놓고, **단 한 번의 게임으로 당첨자를 결정**하는 도파민 폭발형 웹앱.

PRD 버전: **v1.5** · 테스트: **108/108 통과** · 빌드: **메인 296 KB / matter 85 KB / 게임별 7~10 KB** (gzip 합계 약 145 KB)

---

## 핵심 가치

- **결과가 아닌 과정**이 주인공. 결정되기까지의 긴장감을 시각적으로 극대화.
- **설치 없음, 접속 즉시 사용**. 정적 호스팅 기반 SPA.
- **공정성은 게임 진행 중 실시간 추첨**으로 확보 (Step-based Random + Web Crypto API).
- **조용함과 폭발의 대비**(Hybrid Editorial + Dopamine): 메인 화면=화이트 에디토리얼, 게임=다크 도파민.

## 미니게임 4종

| 게임 | 시그니처 컬러 | 메커니즘 | 권장 인원 | 길이 |
|---|---|---|---|---|
| 🐎 **경주마** | Coral `#aa2d00` | 매 프레임 가속도 추첨 + 결승선 통과 + 페이크 4종 + 결승 ceremony | 2~12명 | 12~20초 |
| 🎱 **럭키 로또** | Forest `#0a2e0e` | 2-phase warmup → matter.js 부력 시뮬 → 출구 추출 순서 | 2~30명 | 10~18초 |
| 💣 **폭탄 돌리기** | Surface Dark `#181d26` | 회전 인디케이터, fuse 디지털 타이머, 라운드 인터미션 클로즈업 | 2~20명 | 10~25초 |
| 🪂 **운명의 낙하** | Mustard `#946d12` | matter.js 못 격자 + 순차 드롭, 빠지는 순서 = rank | 2~35명 (50명까지 가능) | 15~30초 |

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 정적 빌드 → dist/
npm run preview  # 빌드 결과 로컬 프리뷰
npm test         # Vitest 단위/통합 테스트
```

## 주요 기능

- **참가자 입력**: 쉼표/줄바꿈/공백 혼합 파싱, 동명이인 자동 `#1` `#2` 접미, FNV-1a 안정 이모지 매핑, 50명 한도.
- **당첨 방식**: 첫번째 / 마지막 / 직접 입력 (콤마 구분 임의 순위).
- **k 자유 입력**: 자동 클램프 없음, 범위 초과 시 빨간 경고만 노출 (v1.4).
- **자동 저장**: localStorage debounce 500ms, 손상 시 fallback.
- **ESC 확인 모달**: 게임 진행 중 메인 복귀 전 한 번 더 묻기.
- **Editorial → Dopamine 페이드 전환**: Result 액션 시 0.6s 흰색 페이드.
- **캐스터 캡션**: 사운드 무음 정책의 시각 보완 — 좌하단 1줄 자막 (4게임 공통).

## 기술 스택

| 영역 | 선택 |
|---|---|
| 빌드 | Vite |
| 프레임워크 | React 18 (JS, no TypeScript) |
| 스타일 | Tailwind CSS (디자인 토큰) |
| 애니메이션 | Framer Motion |
| 물리 엔진 | matter.js (lazy chunk) |
| Confetti | canvas-confetti |
| 상태 | Zustand |
| 폰트 | Pretendard variable + Press Start 2P (latin subset, self-host) |
| 무작위 | Web Crypto API (`crypto.getRandomValues`) |
| 테스트 | Vitest + jsdom + Map 기반 Storage 폴리필 |

## 디자인 시스템 (요약)

- **두 가지 모드**: Editorial(화이트 캔버스) / Dopamine(다크 베이스 + 시그니처 컬러).
- **시그니처 컬러 4종**: Coral / Forest / Surface Dark / Mustard. 4 게임 카드 모두 화이트 텍스트 통일 (v1.4.1, WCAG AA 통과).
- **보조 팔레트**: Peach / Mint / Yellow / Cream — Confetti·결과 박스·이모지 칩 등.
- **96px section padding** (모든 띠의 vertical padding).
- **그림자 없음**, 색 블록으로 깊이 표현 (Airtable 철학).
- **폰트 가중치 400/500만** 사용 (700 금지).
- **메달 시스템**: 1=Gold, 2=Silver, 3=Bronze, 4+=보조 톤.

## 파일 구조

```
src/
├── App.jsx                             # 화면 라우팅
├── main.jsx, index.css
├── components/
│   ├── CasterCaption.jsx               # 좌하단 1줄 자막 (v1.5)
│   ├── ConfirmModal.jsx                # ESC 확인 모달
│   ├── EmojiChips.jsx, GameCard.jsx, GameCardGrid.jsx
│   ├── KCounter.jsx, ParticipantsInput.jsx, WinnerModeSelector.jsx
├── hooks/
│   └── useEscapeToHome.js              # useEscapeConfirm
├── games/
│   ├── horseRace/  (simulation.js + .test + HorseRaceGame.jsx)
│   ├── lotto/      (2-phase warmup, 부력 시뮬, PIP 미사용)
│   ├── bomb/       (디지털 타이머, 라운드 인터미션)
│   └── roulette/   (인원별 ballConfigFor, 순차 드롭)
├── lib/
│   ├── emoji.js, parser.js, random.js  (각 .test)
│   ├── games.js, theme.js
├── screens/
│   ├── HomeScreen.jsx, IntroScreen.jsx, PlayScreen.jsx (lazy chunks), ResultScreen.jsx
├── store/
│   └── useGameStore.js (+ test)
└── test/setup.js                       # Map 기반 Storage 폴리필
```

## PRD / 결정 누적

| 결정 | 채택 |
|---|---|
| 무작위 소스 | Web Crypto API (test 빌드는 mulberry32 시드 주입) |
| 공정성 로직 | Step-based Random — 결과 사전 미정, 시뮬 그대로 rank 1~n |
| 페이크 아웃 | 결과를 바꾸지 않는 시각 효과만 (PRD §7.3) |
| k>1 | 한 게임에서 동시에 k명 결정 |
| 폭탄 메커니즘 | (B) 회전 인디케이터 — 좌석 사이 hop |
| 룰렛 드롭 | 순차 드롭 (`dropQueue` 0.12~0.6s 간격) |
| 광과민성 분기 | **없음** — 항상 Full 강도 (v1.4) |
| 데이터 저장 | localStorage 단일 키 (옵션 자동 복원) |
| 사운드 | MVP 무음 — 캐스터 캡션으로 시각 보완 |

자세한 내용은 [`docs/PRD.md`](./docs/PRD.md) 참조.

## 문서 맵

- [`docs/PRD.md`](./docs/PRD.md) — Product Requirements Document v1.5
- [`docs/PLAN.md`](./docs/PLAN.md) — 실제 구현 작업 로그
- [`docs/CHECK.md`](./docs/CHECK.md) — 사용자 검증 체크리스트
- [`docs/PRD_feedback.md`](./docs/PRD_feedback.md) — v1.4→v1.5 보강 제안 원본
- [`docs/implementation_followup.md`](./docs/implementation_followup.md) — Phase 1~3-2 시점의 보완 지침서

## 라이선스

MIT

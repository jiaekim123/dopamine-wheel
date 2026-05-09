# 구현 보완 지침 (Phase 1~3-2)

> **대상**: 현재 커밋 `3a4829f` 시점의 코드.
> **작성일**: 2026-05-09
> **목적**: 사용자 요청 변경 + 코드 리뷰에서 발견된 잔여 P0 항목을 한 곳에 정리.
> 본 문서는 **수정 지침서**이며, 실제 수정은 별도 작업으로 진행.

---

## 1. 럭키 로또 — 2-phase 진행 + 공 텍스트 + 클로즈업 (사용자 요청)

### 1.1 목적
현재는 시작 즉시 공이 출구로 빠질 수 있어 긴장감이 부족하고, 공 위 이름 텍스트가 너무 작아 식별이 어렵다.

### 1.2 진행 단계 분리

`simulation.js`에 phase 상태 추가.

| phase | 동작 |
|---|---|
| `warmup` | **출구 게이트가 닫혀 있어** 공이 챔버 안에서 휘저어지기만 함. **3~10초** 무작위 (`randFloat()`로 결정성 시드 적용 가능). |
| `extracting` | 게이트가 열리고 공이 하나씩 추출. 기존 추출 로직 그대로. |
| `done` | 모든 공 추출 완료. |

### 1.3 simulation.js 변경 명세

**상수 추가**
```js
export const WARMUP_MIN_SEC = 3;
export const WARMUP_MAX_SEC = 10;
```

**`createLotto`**
- `warmupDuration = WARMUP_MIN_SEC + randFloat() * (WARMUP_MAX_SEC - WARMUP_MIN_SEC)` 산출.
- 챔버 바닥 gap을 막는 게이트 body를 별도로 생성:
  ```js
  const gateWidth = Math.sin(gapHalfAngle) * radius * 2 + 12;
  const gate = Matter.Bodies.rectangle(
    cx, cy + radius - 2, gateWidth, 8,
    { isStatic: true, friction: 0.04, restitution: 0.5, label: 'gate' }
  );
  Matter.World.add(world, gate);
  ```
- 반환 state에 `phase: 'warmup'`, `warmupDuration`, `gate` 참조 추가.

**`stepLotto`**
- `state.phase === 'warmup'` 동안:
  - 휘젓기 임펄스는 그대로 유지 (공이 빙빙 돌도록).
  - 추출 체크는 **스킵**.
  - `state.elapsed >= state.warmupDuration` 시:
    - `Matter.World.remove(state.world, state.gate)` 호출.
    - `state.phase = 'extracting'` 전환.
- `state.phase === 'extracting'`에서 기존 추출 로직 동작.

**휘젓기 임펄스 검토**
- 현재 코드는 `fx`, `fy` 모두 순수 랜덤. warmup에서 공이 더 활발히 도는 느낌이 필요하면 warmup 동안 임펄스 강도를 1.2배로 부스트하는 분기 추가 권장 (선택).
- 단, 공이 게이트 위에 올라타고 멈추는 경우 방지: 게이트는 챔버 내부 살짝 안쪽(`-2`)에 두어 게이트 위에 공이 안착하지 않도록.

### 1.4 LottoGame.jsx 변경 명세

**공 사이즈 / 텍스트 키우기**
- `CHAMBER.ballRadius`: `22` → `28` (simulation.js 상수 변경. 격자 spacing 비율은 그대로 유지하면 자동 반영).
- 이름 텍스트 `fontSize`: 하드코딩 `9` → `Math.round(CHAMBER.ballRadius * 0.45)` ≈ 13.
- 이모지 `fontSize`: `radius * 0.95` → `radius * 1.0` (radius 키움에 비례).
- 이름 truncate: 5자 → **7자** (공이 커졌으니 더 보임). 예: `displayName.length > 7 ? displayName.slice(0, 6) + '…' : displayName`.
- n=30에서 격자 충돌 우려 시 `spacing` 비율을 `2.2` → `2.1`로 살짝 좁힘 (선택).

**추출 중 공 클로즈업**
- 추출 트레이 보드 위 또는 챔버 옆에 **`<CloseUpCard>`** 컴포넌트 추가.
- 표시 조건: `state.phase === 'extracting'` AND `inTube === true` (현재 코드의 inTube 검출 로직 재사용).
- 카드 내용:
  - 큰 이모지 (clamp 96~140px)
  - 큰 이름 (Press Start 2P 또는 시스템 폰트, 32px)
  - "곧 결정 — N등 후보" 같은 보조 텍스트 (다음 추출 rank = `state.nextRank`)
- 등장 모션: `framer-motion` `initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}`. inTube 공이 사라지면 0.4초 페이드아웃.
- 위치: 화면 우상단 또는 챔버 좌측 (현재 추출 보드와 충돌 안 하도록).
- **여러 공이 동시에 튜브에 있을 때**: 가장 y값이 큰 공(=곧 추출될 공) 1개만 표시.

**Warmup UI**
- 헤더 추출 카운터 옆에 phase 배지 추가:
  - `warmup`: 🌪️ "휘젓는 중…" (Forest 라이트 컬러 배경)
  - `extracting`: 🎱 "추출 중" (Forest 풀톤 배경)
- 추출 트레이 빈 메시지("곧 첫 공이 나옵니다…")를 phase에 따라 분기:
  - `warmup`: "🌪️ 공이 충분히 섞이는 중…" (정적 텍스트, 카운트다운 노출 안 함 — **시간을 알면 긴장감 감소**)
  - `extracting` & 첫 공 전: "곧 첫 공이 나옵니다…"

**warmup → extracting 전환 플래시 (선택)**
- phase 변경 감지 시 화면 중앙에 1초 동안 "🎱 추첨 시작!" 큰 텍스트 + 백색 0.1초 플래시.
- `useEffect`로 phase 변경 추적 (`useRef`로 이전 phase 비교).

### 1.5 테스트 영향 (`simulation.test.js`)
- `runToFinish`의 max budget 검토:
  - "extracts all balls for 12명 within budget": warmup 최대 10s 추가 → 90s 안에 충분.
  - "handles n=30": `runToFinish(state, 60)` → warmup 10s + 30명 추출 시간. 60s 빠듯할 수 있으니 **80s로 여유 확보** 권장.
- 신규 테스트 추가:
  - **warmup 동안 추출 0건**: phase==='warmup'인 step에서 results.length === 0 보장.
  - **warmup 종료 시 게이트 제거**: state.phase 전환 검증.
  - **warmupDuration 결정성**: 같은 시드 → 같은 warmupDuration.
  - **warmupDuration 범위**: 3 ≤ warmupDuration ≤ 10.

### 1.6 주의사항
- 게이트 body가 챔버 segment ring과 겹치지 않게 위치 조정 (gap 폭과 게이트 폭 매칭).
- warmup 중 공이 게이트와 챔버 boundary 사이에 끼는 케이스 대비: 게이트 두께 8px이면 충돌 안정성 OK이지만, 시드별로 한두 공이 갇힐 수 있음. 안 풀리면 게이트 두께를 6px로 줄이거나 게이트의 `chamfer: { radius: 2 }` 추가 검토.

---

## 2. 잔여 P0 버그 (이전 리뷰에서 미반영)

### 2.1 `ParticipantsInput.jsx:27` placeholder의 `\n` 리터럴
```jsx
placeholder="쉼표·줄바꿈·공백으로 구분 (예: 김철수, 이영희\n박민수 정수진)"
```
- JSX 문자열 리터럴에서 `\n`은 이스케이프 처리되지만 `<textarea placeholder>`는 줄바꿈을 렌더하지 않음 → 사용자에게 `\n`이 그대로 보임.
- **수정안 1 (권장)**: 백틱 + 실제 줄바꿈
  ```jsx
  placeholder={`쉼표·줄바꿈·공백으로 구분
예: 김철수, 이영희
    박민수 정수진`}
  ```
- **수정안 2**: 줄바꿈 없이 풀어쓰기
  ```jsx
  placeholder="쉼표·줄바꿈·공백으로 구분 (예: 김철수, 이영희, 박민수 정수진)"
  ```

### 2.2 `ResultScreen.jsx` confetti 잔존
- `useEffect` cleanup이 RAF만 정리하고 `confetti.reset()`을 호출하지 않음 → "다시 하기" / "처음으로" 클릭 시 다음 화면 캔버스에 입자가 남을 수 있음.
- **수정**: cleanup에 추가
  ```js
  return () => {
    if (raf) cancelAnimationFrame(raf);
    confetti.reset();
  };
  ```

### 2.3 `ResultScreen.jsx:151` k≥13 그리드 overflow 깨짐
```jsx
<div className={`grid gap-lg ${gridClassFor(k)} ${k > 12 ? 'overflow-x-auto' : ''}`}>
```
- Grid 컨테이너에 `overflow-x-auto`만 추가해서는 가로 스크롤이 발생하지 않음 (자식이 grid track으로 wrap됨). PRD §8.2 "13+: 가로 스크롤 + 1등만 강조" 미구현.
- **수정 방향**:
  - k > 12일 때는 grid 대신 `flex flex-nowrap overflow-x-auto`로 분기.
  - 1등 박스는 sticky 또는 별도 영역에 풀사이즈로, 2등 이후는 가로 스크롤로 줄세움.

### 2.4 `KCounter.jsx:55~59` 색 이중 지정
```jsx
<p className="mt-xs text-caption text-amber" role="alert" style={{ color: '#d92d20' }}>
```
- `text-amber` (#ff8c00) Tailwind + inline `#d92d20` red 동시 지정. inline 우선이라 amber 클래스는 죽은 코드.
- **수정**: 의도가 빨강이면 inline 제거하고 `text-red-600` 또는 새 토큰(`text-error` 등) 추가. amber로 통일하려면 inline만 제거.

---

## 3. 추가 발견 사항 (P1, 우선순위 낮음)

### 3.1 `HorseRaceGame.jsx` — 페이크 아웃 시스템 미구현
- PRD §7.3: "0개 25% / 1개 55% / 2개 20%" 페이크 추첨, last-pattern memo 유지.
- 현재 코드: photoFinish 1종만 자동 트리거. wobble은 **모든** horse에 항상 적용되어 페이크라기보다 상시 효과.
- PRD §7.4 명세 4종 중 다크호스/스턴 마크 미구현.
- → Phase 5 (도파민 연출 통합) 작업 항목으로 이관.

### 3.2 `HorseRaceGame.jsx:80` exhaustive-deps disable
- 마운트 1회 실행 의도지만 `participants`를 클로저로 캡처. 동작상 문제 없으나 **`createHorseRace(participants)` 결과를 `useMemo`로 캐싱**하면 명세적 안전.

### 3.3 `theme.js` — bomb 인트로 시각 약함 (Phase 4 진입 시 검토)
- `SIGNATURE_BY_GAME.bomb = '#181d26'` ↔ Dopamine `dark-base = '#0d1218'`. 거의 동일.
- IntroScreen의 시그니처 페이드 → 다크 페이드 단계가 시각적으로 거의 변화 없음.
- Phase 4 진입 시 폭탄 인트로용 별도 액센트(코랄 도화선 글로우 침투) 명세 필요.

### 3.4 `useEscapeToHome` — 확인 모달 미구현
- PRD §5.3 "확인 모달은 Dopamine Mode 베이스에서". 현재는 ESC 즉시 복귀.
- → Phase 5 작업 항목으로 이관 (잘못 누른 ESC로 게임 강제 종료되는 UX 리스크).

### 3.5 `tailwind.config.js` — `tailwindcss-animate` 미사용
- `package.json`에 의존성 등록되어 있으나 `tailwind.config.js` plugins 빈 배열.
- 제거하거나 활성화 결정 필요 (번들 사이즈에는 영향 없으나 의도 불명).

---

## 4. 구현 순서 제안

| # | 항목 | 비용 | 비고 |
|---|---|---|---|
| 1 | §2.1 placeholder `\n` (P0) | 5분 | 다른 작업 중에 빠르게 |
| 2 | §2.4 KCounter 색 (P0) | 5분 | 단순 inline 제거 |
| 3 | §1 로또 2-phase + 공 텍스트 + 클로즈업 (사용자 요청) | 2~3h | simulation 변경 + 컴포넌트 보강 + 테스트 |
| 4 | §2.2 confetti.reset (P0) | 10분 | |
| 5 | §2.3 k≥13 그리드 (P0) | 30분 | flex 분기 |
| 6 | §3 P1 항목 | Phase 4/5 진입 시 함께 | |

---

## 5. 운명의 낙하 — 드라마 보강 (Lv3 풀패키지) — 사용자 요청

> **대상**: `src/games/roulette/simulation.js` + `src/games/roulette/RouletteGame.jsx`
> **목표**: 현재 단조로운 plinko 진행을 "일제 드롭 + 충돌 임팩트 + 클라이맥스 연출"이 있는 도파민 게임으로 강화.
> **예상 비용**: 3~5시간 (시뮬 1.5h + 렌더 2~3h + 테스트 보강 0.5h).

### 5.1 단조로운 원인 진단

1. 공 5초간 1개씩 순차 드롭 → 경쟁감 약함.
2. 충돌 시각 효과 0 — 못과 부딪혀도 깜빡임 없음.
3. 트레일 없음 — 공이 단순 원.
4. 마지막 공도 평범 — 1등 결정 순간 임팩트 부재.
5. 카메라 정적 — 줌·슬로우는 첫 공만.

### 5.2 변경 항목 (8건, Lv 분류)

| Lv | # | 항목 | 핵심 |
|---|---|---|---|
| **1** | 5.3.1 | 못 충돌 임팩트 | matter.js `collisionStart` 이벤트 + ring expansion + peg flash |
| **1** | 5.3.2 | 공 트레일 | 최근 5~7프레임 위치 fade-out 잔상 |
| **1** | 5.3.3 | 빠지기 직전 PIP 클로즈업 | 우측에 큰 카드 (로또 패턴 재사용) |
| **2** | 5.3.4 | 마지막 N명 카운트다운 캡션 | results.length 기반 트리거 |
| **2** | 5.3.5 | bin 진입 진동 + 풀 글로우 | 현재 600ms 강조 → scale 진동 + 강한 glow |
| **2** | 5.3.6 | 마지막 공 결정 플래시 + 셰이크 | 화면 전체 mustard+화이트 0.2s + 진동 |
| **3** | 5.3.7 | **드롭 시퀀스 변경 — 일제 드롭** | 모든 공 상단 정렬 대기 → "GO!" → 동시 드롭 |
| **3** | 5.3.8 | 선두 추적 카메라 | viewBox가 가장 아래 공을 따라 스무스 줌 |

### 5.3 항목별 명세

#### 5.3.1 못 충돌 임팩트 (Lv1)

**simulation.js**:
```js
// createRoulette() 후반에:
const collisions = []; // { x, y, t } — 최근 0.3s 내 충돌만
state.collisions = collisions;

Matter.Events.on(engine, 'collisionStart', (e) => {
  for (const pair of e.pairs) {
    const peg = [pair.bodyA, pair.bodyB].find((b) => b.label === 'peg');
    const ball = [pair.bodyA, pair.bodyB].find(
      (b) => b.label !== 'peg' && b.label !== 'wall'
    );
    if (peg && ball) {
      collisions.push({ x: peg.position.x, y: peg.position.y, t: state.elapsed });
    }
  }
});
```

`stepRoulette()`에 충돌 만료 처리 추가:
```js
state.collisions = state.collisions.filter((c) => state.elapsed - c.t < 0.3);
```

**RouletteGame.jsx 렌더**:
```jsx
{state?.collisions.map((c, i) => {
  const age = state.elapsed - c.t; // 0~0.3
  const r = ROULETTE.pegRadius + age * 60; // 확장
  const opacity = 1 - age / 0.3;
  return (
    <circle key={`${c.x}-${c.y}-${c.t}`} cx={c.x} cy={c.y} r={r}
      fill="none" stroke={COLOR_MUSTARD} strokeWidth={2} opacity={opacity} />
  );
})}
```

**peg 자체 깜빡임**: 충돌 발생한 peg의 position을 Map으로 관리 → 충돌 후 0.15s 동안 밝게.

#### 5.3.2 공 트레일 (Lv1)

**RouletteGame.jsx**: ref로 ball trail 관리 (시뮬 외부, 렌더 전용).
```js
const trailRef = useRef(new Map()); // ballId → [{x, y, t}, ...]

// tick에서 매 프레임:
for (const b of balls) {
  const arr = trailRef.current.get(b.id) ?? [];
  arr.push({ x: b.x, y: b.y, t: now });
  while (arr.length > 7) arr.shift();
  trailRef.current.set(b.id, arr);
}
```

렌더 시 각 trail point를 작은 circle로 (radius 줄어들고 opacity 페이드).

**주의**: trail은 **공 색상**으로 그려야 시각 통일. `BALL_PALETTE[idx]` 사용.

#### 5.3.3 빠지기 직전 PIP 클로즈업 (Lv1)

로또 §1.4와 동일 패턴. 화면 우측 추출 보드 위/위쪽에 큰 카드.

**조건**: `y > ROULETTE.pegFieldBottom + 30` && exited 직전.

**카드 내용**:
- 큰 이모지 (clamp 96~140px)
- 큰 이름 (32~40px)
- "곧 결정 — 다음 N등" (다음 rank = `state.nextRank`)

**y가 가장 큰 공 1개**만 PIP 표시.

#### 5.3.4 마지막 N명 카운트다운 캡션 (Lv2)

`state.results.length` 변화 감지 (useRef로 prev 추적).

| 남은 공 (= n - results.length) | 캡션 | 위치 |
|---|---|---|
| 3 | "🔥 마지막 3명!" | 화면 상단 중앙 |
| 2 | "⚡ 마지막 2명!" | 화면 상단 중앙 |
| 1 | "🎯 운명의 마지막 한 명!" | 화면 상단 중앙 + Gold 글로우 |

캡션은 1.5s 페이드인/아웃. framer-motion AnimatePresence 사용.

#### 5.3.5 bin 진입 진동 + 풀 글로우 (Lv2)

현재: bin opacity 0.45 → 0.9, 600ms.

강화안:
- `scaleY` 1.0 → 1.08 → 1.0 (200ms 위로 튕기는 효과). transform-origin: bottom.
- box-shadow `0 -4px 16px` → `0 -8px 32px` (글로우 2배).
- 작은 위쪽 입자(circle 3~5개) 0.5s 페이드아웃 (선택, 비용↑).

`<rect>`에 `transform`을 motion 컴포넌트로 감싸거나, SVG `<g>` 그룹에 transform 적용.

#### 5.3.6 마지막 공 결정 플래시 + 셰이크 (Lv2)

**조건**: `state.results.length === state.n` 직후 1프레임.

**연출** (총 0.4s):
- 화면 전체 화이트→mustard 그라데이션 오버레이 0.2s 페이드
- 컨테이너 전체에 `motion.div`로 X/Y shake (animate `x: [-8, 8, -6, 6, 0]`, `y: [-4, 4, -2, 2, 0]`, 0.3s)
- 마지막 공 위치에 ring expansion (collisionStart 효과 재사용, 더 크게 r=200)

이후 `FINISH_HOLD_MS` 1400ms로 결과 화면 전환 (현재와 동일).

#### 5.3.7 드롭 시퀀스 변경 — 일제 드롭 (Lv3, 가장 큰 변화)

**현재**: `dropQueue`로 5초간 순차 투입. `dropIntervalFor(n)`.

**변경 후**:
1. `state.phase = 'staging'` (신규) — 모든 공이 화면 상단 호(arc) 위에 정렬되어 대기. 물리는 비활성 (`isStatic: true`로 추가하거나 World에 추가하지 않고 시각만).
2. `staging` 1.5초 — 카운트다운 "3 → 2 → 1" 큰 글자 (인트로와 별도, 게임 내부).
3. `staging` 1.5초 종료 시 phase = `dropping`. 모든 공이 isStatic 해제 (또는 World에 한꺼번에 추가). 약간씩 다른 초기 x 좌표(±50px jitter)로 동시 드롭.
4. `dropping` 단계 = 기존 추출 로직.

**simulation.js 변경**:
- `createRoulette()`에서 공을 모두 즉시 생성하되 `isStatic: true`로 시작. 시각 위치는 상단 arc.
- `stepRoulette()`에서 `phase === 'staging'` 동안 `state.elapsed` 증가만, 1.5s 후 `Matter.Body.setStatic(body, false)` 일괄 해제 + 약한 초기 vy 부여.
- `dropQueue` / `dropIntervalFor` / `nextDropAt` 제거.

**arc staging 위치**:
```js
// n명을 화면 상단에 호로 정렬 — 가운데 모이고 양 끝은 밖으로
const stageY = 50;
const arcSpan = ROULETTE.width - 80;
const xs = participants.map((_, i) => 40 + (i / Math.max(1, n - 1)) * arcSpan);
// 단 너무 빽빽하면 두 줄로 (n > 25 시)
```

**RouletteGame.jsx**:
- `state.phase === 'staging'` 동안 stage area에 공 정적 표시 + 카운트다운 큰 글자.
- `dropping` 진입 시 0.2s 흰색 플래시 (LottoGame의 warmup→extracting 패턴 재사용).

**시뮬 결정성**: `randFloat()` 호출 횟수가 변경되면 시드 결정성도 변함. 테스트 보강 필요 (5.4 참고).

#### 5.3.8 선두 추적 카메라 (Lv3)

**RouletteGame.jsx**: `<svg>`의 `viewBox`를 동적으로.

```js
const cameraRef = useRef({ y: 0, zoom: 1 });

// tick 내부:
const lowestY = balls.length > 0
  ? Math.max(...balls.map((b) => b.y))
  : ROULETTE.pegFieldBottom;
const targetY = Math.max(0, Math.min(lowestY - 350, ROULETTE.height - 700));
const targetZoom = state?.results.length > state.n - 3 ? 1.15 : 1.0;
cameraRef.current.y += (targetY - cameraRef.current.y) * Math.min(1, dt * 3);
cameraRef.current.zoom += (targetZoom - cameraRef.current.zoom) * Math.min(1, dt * 2);
```

`viewBox`:
```jsx
viewBox={`0 ${cameraRef.current.y} ${ROULETTE.width} ${ROULETTE.height / cameraRef.current.zoom}`}
```

**주의**: 카메라가 너무 빠르게 따라가면 멀미감. lerp rate 3~5/s 권장.

**비활성 옵션**: 인원 ≤ 10에서는 카메라 효과 작아 가치 낮음. `n > 10`일 때만 카메라 발동 검토.

### 5.4 테스트 영향

기존 `simulation.test.js` 5건. Lv3 변경 후 영향:

| 테스트 | 영향 | 대응 |
|---|---|---|
| `produces rankings 1..n for 6명` | staging phase 추가로 `runToFinish` 시간 ↑ | maxSeconds 90 → 120 (충분) |
| `extracts all balls for 12명 within budget` | 일제 드롭이라 오히려 더 빨리 끝남 | 그대로 통과 예상 |
| `handles n=30 (max)` | 초기 동시 드롭 → 충돌 폭증 → stuck 가능성 | stuck 감지 임계값 1.5s → 2.0s 검토 |
| `handles n=2 (minimum)` | OK | — |
| `same seed produces same rankings` | `randFloat` 호출 순서 변함 → **결정성 깨짐** | seed 7 시 새 결과를 baseline으로 갱신 |

**신규 테스트 권장**:
- `phase === 'staging'` 1.5s 동안 results.length === 0 보장
- staging → dropping 전환 시 모든 공이 `isStatic: false`인지 확인
- 충돌 이벤트 등록 후 `state.collisions` 배열에 entry 누적 확인 (matter.js 시뮬 1초 후)

### 5.5 구현 순서 (단계별 머지 가능)

총 3단계로 분리하면 매 단계마다 동작하는 빌드 유지 가능.

| 단계 | 작업 | 시간 | 머지 가능? |
|---|---|---|---|
| **A** (Lv1) | 5.3.1 충돌 임팩트 + 5.3.2 트레일 + 5.3.3 PIP | 1.5h | ✅ 단독 머지 가능 |
| **B** (Lv2) | 5.3.4 카운트다운 + 5.3.5 bin 진동 + 5.3.6 마지막 플래시 | 1.0h | ✅ A 위에 |
| **C** (Lv3) | 5.3.7 일제 드롭 + 5.3.8 카메라 | 1.5~2.5h | ⚠ 시뮬 변경 → 테스트 보강 필요 |

**A → B → C** 순서 강추. A·B만 해도 게임이 크게 살아남.

### 5.6 주의사항

- **트레일은 시뮬 외부**: ref에만 저장. 시드 결정성에 영향 주지 않음.
- **collisionStart 이벤트는 `__setTestSeed` 모드에서도 발화**: matter.js 자체 동작이라 시드 무관. 단, 테스트에서 `state.collisions` 누적량 검증 시 시드별로 다를 수 있음.
- **카메라 줌은 SVG `viewBox` 변경**: 화면 비율 유지를 위해 width 비율 그대로, height만 조정. 위 코드 예시 참고.
- **n=2 케이스**: staging arc spread가 매우 좁음. 카운트다운 "3 → 2 → 1"은 동일하게 표시.
- **권장 인원 50명 → 35명 격하** (`PRD_feedback.md` §4.2): Lv3 도입 시 50명 동시 드롭은 충돌 폭증으로 fps 저하 가능성. 격하는 별도 작업.
- **PIP 클로즈업 + 카메라 줌 동시**: 두 효과가 겹치면 시각 혼란. PIP는 카메라 줌 발동 중에는 우측 상단 작은 형태로 축소 검토.

---

**문서 끝.**

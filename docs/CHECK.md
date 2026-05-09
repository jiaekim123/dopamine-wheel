# DopamineWheel — 사용자 확인 체크리스트 (CHECK)

> **대상**: PRD v1.5 + v1.4.x 누적 + v2 (V1~V6 다이나믹 보강) + Phase 6 (배포 제외) 완료 시점
> **확인 방법**: `npm run dev` 후 브라우저에서 직접 시연
> **체크 표기**: ☑ OK / ☐ 미확인 / △ 부분 확인 / ⚠ 추가 점검 필요 / ✗ 문제 있음 / ✅ 해결됨

자동 테스트 **108/108 통과**.
빌드: 메인 297 KB / matter chunk 85 KB / 게임별 7~10 KB (gzip 합 ~145 KB).

---

## 검증 세션 기록

| 일자 | 검증자 | 환경 | 범위 |
|---|---|---|---|
| 2026-05-09 (1차) | Claude (Chrome MCP 자동화) | 1440×900 / Chrome / `localhost:5174` | Phase 1·2·3-2·5 핵심 흐름 + v1.4·v1.4.1·v1.4.2 + v1.5 룰렛 인원 정책 |
| 2026-05-09 (2차) | Claude (Chrome MCP 자동화) | 1440×900 / Chrome / `localhost:5174` | 로또 warmup phase, ESC 모달 play화면, custom 모드 입력 검증 3종, Phase 6 메타/favicon/청크, v1.5.1 입력 보존 흐름, V1+V4 경주마 권장 16명 |

이번 세션 시연 요약:
- 입력: `김철수, 이영희\n박민수 정수진\n김철수, 김철수, 수박*2` (7명, 동명이인 + multiplier 미지원 검증)
- 게임: 경주마 1회 (k=2 / 첫번째). 1등 박민수, 2등 김철수 #1.
- ESC: result에서 ESC → 모달 → Enter → Home, 옵션 보존 ✓
- 50명 한도: 60명 입력 → 50명 + "(10명 무시됨)"
- 손상 fallback: `localStorage.setItem('dopamine_wheel_v1', '{')` 후 새로고침 → 정상 복구

**미시연 (사용자 직접 시연 필요 — 자동화 한계):**
- 럭키 로또 / 폭탄 / 운명의 낙하 **게임 본편 시간 진행** — Chrome 자동화 환경에서 background tab RAF throttling으로 14초 동안 0.4s만 진행. visibility patch도 무력. 게임 인트로·warmup·UI 요소는 검증 가능하나 시뮬 종료/결과까지의 흐름은 사용자 직접 시연 필요. (G.8 참조)
- 마지막 모드 헤드라인 (G.7 수정 결과는 코드 단위 확인 ✓, 실제 결과 화면은 미시연)
- k=3/4/5/7/13 그리드, 메달 3·4+ 시각
- 1366·1920·2560 해상도
- 4게임 페이크 아웃·슬로우모션·캐스터 캡션·V2~V6 다이나믹 보강 본편 효과

---

## A. PRD §11 Phase별 검증 포인트

### Phase 1 — 기초 / 상태
- ☑ 디자인 토큰 Tailwind 노출 (`bg-signature-coral` 등)
- ☑ Pretendard 한글 자형 정상
- ☑ 혼합 구분자 파싱 (쉼표/줄바꿈/공백)
- ☑ 동명이인 자동 `#1, #2, #3`
- ☑ `수박*2` multiplier 미지원
- ☑ FNV-1a 이모지 안정 매핑
- ☑ 50명 초과 차단 + 잘림 안내
- ☑ 직접 입력 검증 (개수/중복/범위) 인라인 메시지 — 빈 값 "1개의 순위를 입력해주세요 (현재 0개)" / 범위 밖 "9등은 참가자 수(8명) 범위 밖이에요" / 정상 "✓ 1개 OK · 3등 당첨" 모두 확인. 게임 카드는 검증 통과 시에만 활성화
- ☑ 새로고침 시 옵션 복원 (`{lastInput, lastK, lastMode, lastRanks}`, motionLevel 키 없음)
- ☑ 손상된 localStorage fallback

### Phase 2 — Editorial Home
- ☑ 시그니처 컬러 카드 풀블리드
- ☑ 4개 카드 모두 화이트 텍스트 (v1.4.1)
- ☑ 96px section padding
- ☐ 카드 호버 `translateY(-4px)` *(hover 시연 미수행)*
- ☐ Tab 키 인터랙션 도달 *(미시연)*
- ⚠ 1366×768 / 1920×1080 / 2560×1440 검증 — 1440×900만 확인

### Phase 3-1 — Intro / Result 골격
- ☑ 게임 카드 클릭 시 시그니처 컬러 페이드 → 다크 베이스
- ☑ 카운트다운 3·2·1·GO (3.5초)
- △ 결과 화면 k별 그리드 — k=2만 시연
- △ 메달 색 — 1·2등(Gold/Silver) 확인. 3·4+ 미시연
- ⚠ Confetti 시그니처 팔레트 — 캡처 부재. 시각 검증 필요
- ☑ "다시 하기" / "처음으로" 동작 — ESC→확인 등가 검증
- ☑ **last 모드 헤드라인 버그 수정**: "🎯 운명의 마지막 0명! 🎯" → "🎯 운명의 마지막 {k}명! 🎯" — `winnerRanks.length`(빈 배열)이 아니라 `winnerCount`로 교체 ✅

### Phase 3-2 — 🏁 야생 더비 (Coral, v2.2~v2.3.1로 재정의됨)
- ☑ 트랙·결승선 Coral / Gold 일관
- ☑ 매 프레임 가속도 다양 (단조롭지 않음)
- ☐ 결승선 임박 슬로우모션
- ☐ 사진판정 Gold 배너 *(이번 시연 미발생)*
- △ 16명/4명/2명 레이아웃 (구 12명 → v2 V1+V4로 16명 확장)
- ☐ **(v2.3.1)** 메인 캐릭터 = 참가자 본인 이모지 (FNV-1a). 라벨에 `{species emoji} {이름}`
- △ 게임 길이 12~20초 — 추정 17~20초
- △ 첫번째/마지막/직접 입력 모드 — 첫번째만 시연

### Phase 3-3 — 🎱 럭키 로또 (Forest)
*이번 세션 미시연.*
- ☐ 챔버 Forest 글로우, 출구 튜브
- ☐ warmup → extracting → done 흐름
- ☐ 30명 / 12명 / 2명 정상 추출
- ☐ 추출 순서 보드 실시간 누적
- ☐ 공 텍스트 가독성 (v1.5 ballRadius=28, fontSize≈13)
- ☐ 튜브 진입 슬로우모션 0.45×

### Phase 4-1 — 💣 폭탄 돌리기 (Surface Dark)
*이번 세션 미시연.*
- ☐ 원형 배치 + 폭탄 hop 모션
- ☐ 도화선 길이 fuse 비율 감소
- ☐ 폭발 시 화면 셰이크 + 흰색 플래시 + 좌석 Coral 폭발 원
- ☐ 폭사한 사람 회색 처리 + `💥 N등` 좌석 배지
- ☐ 라운드 카운터 정확
- ☐ n=20에서 25초 안에 완료
- ☐ 직접 입력 모드: 노리는 순위 안내 + Gold 메달 강조

### Phase 4-2 — 🪂 운명의 낙하 (Mustard)
*이번 세션 미시연.*
- ☐ 못 Mustard 글로우
- ☐ 공이 자연스럽게 떨어짐 (stuck 없이)
- ☐ 50명 입력 시 공 식별 가능 (이모지로 1차 식별)
- ☐ 바닥 칸 그라데이션
- ☐ 첫 공 exit 직전 슬로우모션 + 칸 강조
- ☐ 추출 순서 보드 실시간 누적

### Phase 5 — ESC 모달 + 페이드 전환
- ☑ intro/play/result에서 ESC → 모달 — play(로또 warmup) + result 양쪽 시연 (1·2차 세션)
- ☑ 모달 "확인" Home 복귀, "취소" 닫기 (모달 사라짐 확인)
- ☑ ESC=취소, Enter=확인 — 둘 다 시연 (ESC로 모달 닫힘, Enter로 Home 복귀)
- ☑ "처음으로" → 페이드 0.6s → 게임 선택 페이지 (옵션 모두 유지) — v1.5.1 정책으로 입력값 8명 + first 모드 그대로 유지 확인
- ☐ "다시 하기" 직접 클릭 *(미시연 — 같은 게임 인트로 재진입은 코드 단위 `replayGame()` 확인됨)*
- △ 4게임 연출 톤 일관 — 경주마(다크+Coral) + 로또 warmup(다크+Forest 글로우) 시연

---

## B. v1.4 / v1.4.1 / v1.4.2 / v1.5.1 누적 변경 검증

### v1.4 — 연출 강도 토글 + KCounter 자유 입력
- ☑ Home에 Full/Soft/Off 토글 없음
- ☑ localStorage `motionLevel` 키 없음
- ☑ 모든 게임 항상 Full 강도 (옵션 자체 제거됨)
- ☑ "당첨자 수" 아래 `1 ≤ k < n` 안내 없음
- ☑ `+` 상한 없음 (n=7에서 k=9 도달)
- ☑ 범위 초과 시 빨간 경고 + 숫자 빨강 (`text-danger #d92d20`)
- ☑ 경고 상태에서 게임 카드 비활성

### v1.4.1 — Mustard 다크 톤
- ☑ 룰렛 카드 `#946d12` + 화이트 텍스트
- ☑ 4개 카드 모두 화이트 텍스트 통일
- ☐ 룰렛 게임 화면 안 못/공/칸 톤 *(낙하 미시연)*
- ☐ 결과 화면 confetti·보조 박스 *(낙하 결과 미시연)*

### v1.4.2 / v1.5.1 — ResultScreen 액션 정책
- ☑ Result 버튼 2개 (다시 하기 / 처음으로) — "게임 다시" 사라짐
- ☐ "다시 하기" Primary → 페이드 없이 같은 게임 인트로 *(직접 클릭 미시연. 핸들러는 `replayGame()` 확인)*
- ☑ "처음으로" Secondary → 흰색 페이드 → 게임 선택 페이지 (ESC→확인 등가 흐름으로 검증)
- ☑ **"처음으로" 후 참가자·k·모드·순위 모두 유지** (v1.5.1 정책) — 2차 세션에서 ESC→확인 후 8명 + k=1 + first 모드 그대로 유지 확인

### 게임 카드 사이즈 / 명칭
- ☑ Home 4개 카드 동일 높이
- ☑ 4번째 카드 "운명의 낙하" 🪂

---

## C. v1.5 — A1~A7 PRD_feedback 결정 사항 반영 검증

### A1. PRD v1.5 갱신 ✅
- ☑ `docs/PRD.md` v1.5 / §1.5 / §1.6 / §3.4 / §4 / §7.1.1 / §7.3a / §7.4 / §7.5 / §7.6 / §7.7 / §16 모두 갱신

### A2. 로또 2-phase warmup + 부력 + 공 텍스트
- △ warmup 3~10초 동안 게이트 닫혀 공이 위로 붕붕 (gravity 0.55 / lift 1.4) — warmup phase 진입 + 게이트 닫힘(노란 점선) 확인. RAF throttle로 시간 진행 미관찰 (사용자 직접 시연 필요)
- ☑ "🌪 휘젓는 중" Forest 라이트 배지 — 좌상단에 배지 + "공이 충분히 섞이는 중..." 캐스터 캡션 동시 표시
- ☐ warmup 종료 시 0.32초 흰색 플래시 *(RAF throttle로 미관찰)*
- ☐ extracting 진입 후 gravity 1.4 상승, 자연 낙하 *(RAF throttle로 미관찰)*
- ☑ 공 ballRadius 28, 이름 fontSize ~13, 7자 cut — n=8 케이스에서 8개 공 모두 이름(아린/준서/하나/서윤/지호/도윤/은우/연우) 가독성 OK
- ☑ PIP 클로즈업 미사용 (사용자 피드백, 우측 추출 보드만) — "추출 순서" 보드 우측 상단 확인

### A3. 폭탄 디지털 타이머 + 라운드 인터미션
- ☐ 폭탄 표면 카운트다운 정수 (Press Start 2P, Gold)
- ☐ 폭발 후 0.3초 인터미션 — 좌석 1.25× 카메라 줌 + Coral/Gold glow + 좌석 메달 배지
- ✅ **2026-05-09 사용자 피드백**: 인터미션 중앙 "💥 X등 — 이름" 큰 팝업 **제거 완료**. 좌석 줌 + 좌석 배지 + 좌하단 캐스터 캡션은 유지

### A4. 야생 더비 결승 ceremony + 페이크 아웃 4종
- ☐ 게임 시작 시 0/1/2 페이크 추첨 (25/55/20%)
- ☐ 다크호스 — 60% 시점 후방 30% 1마리, 1초 노출 ("🌟 DARK HORSE" Coral 배지)
- ☐ 스턴 — 30~50% 중위권 1마리, ⭐ 회전 + 미세 흔들림 0.5초
- ☐ 막판 흔들림 — leader 5% 직전, wobble 페이크 추첨됐을 때만
- ☐ 사진판정 — 1·2등 차 < 0.18초 시 Gold 배너
- ☐ 결승 ceremony — 1등 통과 후에도 슬로우 0.45× 유지하며 2~3등 ceremony

### A5. 룰렛 권장 35명 + 칸 폰트 실측치
- ☑ 룰렛 카드 "권장 ~35명 · 15~30초"
- ☑ 36~50명에서 4개 카드 모두 "⚠ 권장 초과" 배지
- ☑ 50명 초과는 입력 단계 차단
- ☐ 인게임 ball 사이즈/이름 인원별 분기:
  - n ≤ 10: ballRadius 16, fontSize 11, 5자
  - n ≤ 25: ballRadius 13, fontSize 9, 4자
  - n ≤ 35: ballRadius 11, 이모지만
  - n ≤ 50: ballRadius 10, 이모지만 (권장 초과)

### A6. 캐스터 캡션 시스템
- ☐ 좌하단 1줄 자막 (다크 카드 + blur, caption 14px/500)
- ☐ 야생 더비: 🏁 출발 / 🌟 다크호스 등장 / 휘청(스턴) / 📸 사진판정 / 1·2·3등 골인 / 💤 잠 / 💦 미끄럼 / 🐌 막판 폭주 / 🐰 깜짝 / 🐢 추격 / ❄️ 빙판 / 🐹 휠 폭주 / 🌟 변신 / 🦅 잠시 쉬어간다 (v2.3)
- ☐ 로또: 추첨 시작 / 매 추출 N등-이름
- ☐ 폭탄: Round X 시작 / 💥 X등-이름 / 절반 통과
- ☐ 룰렛: 낙하 시작 / 매 추출 N등-이름

### A7. 폭탄 인트로 시각 보강
- ☐ 폭탄 카드 클릭 시 인트로 0~0.5s에 Coral 글로우 + 큰 💣 + 도화선 불꽃
- ☐ 0.5~1.0s에 도화선 짧아지며 다크 베이스로 흡수

---

## D. v2 — V1~V6 다이나믹 보강 검증

### V2. 폭탄 중반 이벤트 (라운드 절반 통과)
- ☐ totalRounds × 0.5 시점에 1회 트리거
- ☐ 라운드 카운터 1초 동안 Gold 강조
- ☐ "⚡ 절반 통과!" 캐스터 캡션

### V3. 야생 더비 부스터 타일
- ☐ 트랙 30~70% 사이에 1~2개 Coral 글로우 띠 (🚀 마커, pulse)
- ☐ 캐릭터가 통과 시 0.4초 시각 부스트 (drop-shadow + scale 1.15× + Coral glow)
- ☐ 결과는 변하지 않음 (시각만)

### V5. 로또 추첨기 가속 페이크
- ☐ extracting 후 1.5초 시점, 0.5초 동안 격렬 진동
- ☐ 화면 Forest radial 펄스
- ☐ "🌀 격렬한 추첨!" 캐스터 캡션
- ☐ 결과는 변하지 않음 (시각만)

### V6. 룰렛 점프대 (중간 기믹)
- ☐ 못 격자 중심 좌·우에 30°/-30° angled 점프대 2개
- ☐ Mustard 띠 + Gold 캡 시각화
- ☐ 공이 점프대에 닿으면 측면으로 튕김

### V1+V4. 야생 더비 시네마틱 카메라 + 16명 확장
- ☑ Home 야생 더비 카드 권장 ~16명 (이전 12명) — 카드 메타에 "권장 ~16명 · 12~20초" 직접 확인 (2차 세션)
- ☐ 17명 이상에서 권장 초과 배지 *(미시연 — 50명 케이스에서는 모두 권장 초과 배지로 검증됨)*
- ☐ 13~16명에서 트랙 폰트 자동 축소 (clamp 20~32px) *(미시연)*
- ☐ 게임 시작 4초 + leader 진행률 ≥ 45%일 때 우상단 PIP "🎥 LEADER · {speciesEmoji} {species}" 카드 *(RAF throttle로 미관찰)*
- ☐ **(v2.3.1)** PIP 큰 아이콘 = 참가자 본인 이모지 (`leader.emoji`), 부제 = species — 이전엔 큰 아이콘 = species였음

---

## E. Phase 6 — 반응형 + 최적화 검증 (배포 제외)

### 청크 분리 (게임별 lazy load)
- ☑ 메인 번들 296.67 KB / 97.45 KB gzip — `npm run build` 확인 (2차 세션)
- ☑ matter.js 별도 청크 85.42 KB / 27.34 KB gzip — `dist/assets/matter-*.js`
- ☑ 게임별 청크 8~11 KB — HorseRace 9.96, Bomb 8.41, Roulette 10.34, Lotto 10.89 KB
- ☑ CasterCaption 공유 청크 0.91 KB
- ☐ 야생 더비/폭탄만 들어갈 때 matter.js 미로딩 (DevTools Network 직접 확인 필요 — 야생 더비는 matter.js 미사용)
- ☐ 게임 진입 시 0.2초 페이드 fallback ("로딩 중…") *(미시연)*

### 반응형 패딩
- ☐ HomeScreen / 4게임 헤더 / ResultScreen — 768px 미만 `px-lg` (24px), 768+ `px-xxl` (48px)
- ☐ Section padding `pt-xxl md:pt-section` (32px → 96px)
- ☐ 게임 카드 `p-xl md:p-xxl` (32px → 48px)
- (참고: 1440×900에서만 시연. 768 미만 해상도 시연 미수행)

### Press Start 2P 폰트 self-host
- ☑ 빌드 산출물에 `press-start-2p-latin-400-normal-*.woff2` 12.51 KB / `.woff` 6.33 KB 포함 (latin subset)
- ☑ Pretendard variable 2057.69 KB woff2 self-host
- ☐ 결과 화면 marquee 텍스트가 실제 8-bit 폰트로 렌더 *(결과 화면 1차 세션 캡처에서는 Press Start 2P 적용이 시각상 명확치 않음 — 사용자 직접 확인 필요)*
- ☐ 폭탄 디지털 타이머가 Press Start 2P로 *(미시연)*

### favicon + 메타데이터
- ☑ favicon.svg 정상 응답 (200, image/svg+xml, 423 bytes, Coral→Dark radial gradient)
- ☑ View Source 메타데이터 일괄 확인 (2차 세션):
  - `<title>` "DopamineWheel — 오늘의 운명, 누가 가져갈까?"
  - `description`, `og:type/title/description/site_name`, `twitter:card/title/description`
  - `theme-color: #0d1218`, `color-scheme: light dark`, `viewport: width=device-width, ...viewport-fit=cover`

### README.md
- ☑ 프로젝트 루트에 README.md 작성됨
- ☐ 내용 review

---

## F. 누적 followup 처리 결과

| § | 항목 | 상태 |
|---|---|---|
| `implementation_followup §1` | 로또 2-phase + 공 텍스트 + PIP | ✅ v1.5 A2 (PIP 미사용 결정) |
| `implementation_followup §2.1` | placeholder `\n` | ✅ 핫픽스 |
| `implementation_followup §2.2` | confetti.reset() | ✅ 핫픽스 |
| `implementation_followup §2.3` | k≥13 그리드 flex 분기 | ✅ 핫픽스 (`WinnerBox`) |
| `implementation_followup §2.4` | KCounter 색 통일 | ✅ 핫픽스 (`text-danger`) |
| `implementation_followup §3.1` | 야생 더비(구 경주마) 페이크 4종 | ✅ v1.5 A4 |
| `implementation_followup §3.2` | HorseRace useMemo | ❌ 미반영 (cosmetic, OK) |
| `implementation_followup §3.3` | 폭탄 인트로 시각 약함 | ✅ v1.5 A7 |
| `implementation_followup §3.4` | ESC 확인 모달 | ✅ Phase 5 |
| `implementation_followup §3.5` | tailwindcss-animate 의존성 | ✅ 핫픽스 |
| `implementation_followup §5` | 운명의 낙하 드라마 보강 (Lv3) | 📋 **명세 완료, 코드 미반영** |
| `PRD_feedback` 공통 4종 | 캐스터 캡션 / 채도 / 색상 / 라이브 보드 | ✅ v1.5 A6 + PRD §7.3a |
| `PRD_feedback` 야생 더비 (구 경주마) | 부스터 / 결승 ceremony / 16명 + v2.2 동물 6종 + v2.3 positive quirk + v2.3.1 메인 이모지 | ✅ v2 V3 / v1.5 A4 / v2 V1+V4 / v2.2 / v2.3 / v2.3.1 |
| `PRD_feedback` 로또 | PIP / 추첨기 가속 페이크 | PIP 미사용 / ✅ v2 V5 |
| `PRD_feedback` 폭탄 | (B) 회전 / 디지털 타이머 / 인터미션 | ✅ v1.5 A3 |
| `PRD_feedback` 룰렛 | 35명 격하 / 점프대 | ✅ v1.5 A5 / v2 V6 |

---

## G. 2026-05-09 검증 세션 — 후속 점검 (해결 이력)

### G.1 [정합성] "처음으로" 후 k 리셋 정책 — ✅ 해결됨 (v1.5.1)
"처음으로"는 참가자·k·모드·순위 모두 유지하고 게임 상태(gameResult/selectedGame/screen)만 리셋. PLAN.md / ResultScreen.jsx / CHECK.md §B v1.4.2 항목 모두 갱신 완료.

### G.2 [확인 필요] 결과 화면 confetti 시각 캡처 부재
자동화 캡처에 입자가 명확히 잡히지 않음. 사용자 직접 시연/녹화로 확인 필요.

### G.3 [환경] Vitest jsdom localStorage.clear — ✅ 해결됨
`src/test/setup.js`에 Map 기반 Storage 폴리필 + `vite.config.js` `setupFiles`. 현재 **108/108 통과**.

### G.4 [관찰] 50명 + 4-up 그리드 권장 초과 배지
의도된 동작이지만 추천 우선순위 힌트 없음. 개선 후보 (v3?).

### G.5 [관찰] 동명이인 + FNV-1a 매핑 양호
문제 없음.

### G.6 [사용자 피드백 2026-05-09] 폭탄 인터미션 중앙 팝업 제거 — ✅ 반영
"💥 X등 — 이름" 중앙 팝업(`top-[18%]`) 삭제. 좌석 줌 (1.25×) + 좌석 메달 배지 + 좌하단 캐스터 캡션 유지.

### G.7 [사용자 피드백 2026-05-09] last 모드 헤드라인 0명 버그 — ✅ 수정
- **버그**: "🎯 운명의 마지막 0명! 🎯" — `winnerRanks.length`(custom 모드에서만 채워짐)을 사용
- **수정**: `winnerCount`(k)를 사용하도록 `buildHeadline(mode, winnerCount, ranks)` 시그니처 변경
- **결과**: `last` 모드 k=1 → "🎯 운명의 마지막 1명! 🎯", k=3 → "🎯 운명의 마지막 3명! 🎯"
- **검증**: 코드 단위 확인 ✓. 실제 결과 화면 시각 확인은 사용자 직접 시연 필요 (RAF throttle로 자동화 시 게임 종료 미관찰)

### G.8 [환경/한계 2026-05-09 2차 세션] Chrome 자동화 RAF throttling
- **현상**: Chrome MCP 환경에서 background tab `requestAnimationFrame`이 throttle되어 게임이 14초 동안 0.4s만 진행 (~35배 느림). matter.js 시뮬·confetti·Framer Motion 모두 영향.
- **원인**: 자동화 탭이 background로 분류됨 (`document.visibilityState === 'hidden'`). Chrome이 background tab의 RAF를 1초당 1회로 강제 throttle.
- **시도한 우회**: `Object.defineProperty(document, 'visibilityState', ...)` + `visibilitychange` dispatch + `window.focus()` — visibilityState는 'visible'로 바뀌나 RAF throttle은 풀리지 않음.
- **영향 범위 (자동화 미가능)**:
  - 게임 본편 시간 진행 (warmup → extracting / 폭탄 라운드 / 룰렛 낙하 / 야생 더비 결승)
  - 결과 화면 confetti 입자 시각 / 메달 색 시각
  - 페이크 아웃·슬로우모션·플래시·셰이크 등 시간 기반 효과 일체
  - V1~V6 다이나믹 보강 본편 효과 (LEADER PIP, 부스터, 점프대 등)
- **자동화로 검증 가능한 것**:
  - 게임 진입 / 인트로 카운트다운 / warmup 정적 UI
  - 모든 폼·옵션·검증 메시지·메타데이터·빌드 산출물·라우팅·ESC 모달·반응형 클래스
- **결론**: 게임 본편 본효과는 사용자 직접 시연 영역. CHECK.md의 ☐ 항목 중 시간 진행에 의존하는 것들은 사용자 검증 필수.

---

## H. 다음 진행 결정 필요

| # | 항목 | 비고 |
|---|---|---|
| 1 | **v1.5 / v2 / Phase 6 신규 항목 사용자 직접 시연 검증** | §A·C·D·E의 ☐ 항목들. 가장 우선 |
| 2 | `implementation_followup §5` 운명의 낙하 Lv3 드라마 보강 | 명세 완료, 코드 미반영. 1.5~3시간 |
| 3 | `implementation_followup §3.2` HorseRace useMemo 캡처 | cosmetic. 매우 작음 |
| 4 | GitHub Pages 배포 | `vite.config.js` `base` + `.github/workflows/deploy.yml` |
| 5 | (선택) 50명+4-up 권장 우선순위 힌트 | v3 후보 |
| 6 | (선택) 다른 해상도(1366·1920·2560) 시연 | 사용자 직접 검증 |

---

**문서 끝.**

> _범례: ☑ OK / ☐ 미확인 / △ 부분 확인 / ⚠ 추가 점검 필요 / ✗ 문제 있음 / ✅ 해결됨_

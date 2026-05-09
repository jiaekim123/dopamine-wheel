// PRD §3.2 + §7.6 — 폭탄 돌리기 시뮬레이션.
//
// 참가자가 원형으로 둘러앉고, 폭탄이 살아있는 사람들 사이를 무작위 속도로 패스된다.
// fuse가 0이 되는 순간 폭탄을 들고 있던 사람이 폭발 → 그 라운드의 rank로 확정.
// 라운드를 n-1회 진행해 모든 사람의 rank가 자연스럽게 1..n으로 산출된다 (PRD §3.2).
//
// 페이크 아웃: 카운트다운 정지 / 속도 변화 / 거짓 폭발 / 방향 반전 (PRD §7.3 — 시각만).

import { randFloat } from '../../lib/random.js';

// 라운드 시간 정책 (PRD §3.3 / §4 / v1.5 §7.6 / v2.4.1 사용자 요청 fuse 2~5s)
const EXPLOSION_DUR_SEC = 0.55;
const INTERMISSION_DUR_SEC = 0.3; // v1.5: 폭발 후 클로즈업 + 배지 정지

// 패스 간격 (한 사람에서 다음 사람으로 폭탄이 넘어가는 시간)
// 매 패스마다 새로 추첨되어 가속/감속 효과가 자연스럽게 발생한다.
const PASS_MIN_SEC = 0.06;
const PASS_MAX_SEC = 0.32;

// v2.4.1 — 사용자 요청: 폭탄은 최소 2초 ~ 최대 5초 사이에서 터지도록 고정 범위.
// 라운드마다 균등 분포로 무작위 추첨해 폭발 시점·좌석 편향 해소.
// 게임 길이 영향: n=20 평균 ~76초 / 최악 ~111초 (PRD §3.3 90초 budget 일부 케이스에서 상회 가능).
export const FUSE_MIN_SEC = 2.0;
export const FUSE_MAX_SEC = 5.0;

/**
 * @param {number} n
 * @returns {{ totalRounds, fuseSec, explosionSec, intermissionSec }}
 *   fuseSec — 라운드별 평균 fuse (v2.4.1: 고정 범위 [FUSE_MIN, FUSE_MAX]의 산술평균).
 */
export function computeBombTimings(n) {
  const totalRounds = Math.max(1, n - 1);
  const fuseSec = (FUSE_MIN_SEC + FUSE_MAX_SEC) / 2; // 3.5초 평균
  return {
    totalRounds,
    fuseSec,
    explosionSec: EXPLOSION_DUR_SEC,
    intermissionSec: INTERMISSION_DUR_SEC,
  };
}

// v2.4.1 — 라운드 fuse를 [FUSE_MIN_SEC, FUSE_MAX_SEC] 균등 분포에서 직접 추첨.
// 평균(avgFuse) 기반 ±40% 보정에서 고정 절대 범위로 변경 (사용자 요청).
function pickRoundFuse() {
  return FUSE_MIN_SEC + randFloat() * (FUSE_MAX_SEC - FUSE_MIN_SEC);
}

/**
 * @param {Array<{id:string,name:string,displayName:string,emoji:string}>} participants
 */
export function createBomb(participants) {
  const n = participants.length;
  const { totalRounds, fuseSec: avgFuse, explosionSec, intermissionSec } =
    computeBombTimings(n);

  // v2.4.1 — 라운드별 fuse 사전 추첨 (시드 결정성 유지). 2~5s 균등 분포.
  const fuseSchedule = [];
  for (let r = 0; r < totalRounds; r++) {
    fuseSchedule.push(pickRoundFuse());
  }

  return {
    people: participants.map((p, i) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      emoji: p.emoji,
      seat: i,
      rank: null,
      eliminationTime: null,
      // 시각 효과용 — 시뮬에 영향 없음
      visualShake: 0,
    })),
    n,
    totalRounds,
    // v2.4: fuseSec은 *현재 라운드*의 fuse (매 라운드 갱신). avgFuse / fuseSchedule 별도 보존.
    avgFuseSec: avgFuse,
    fuseSchedule,
    fuseSec: fuseSchedule[0],
    explosionSec,
    intermissionSec,
    // v2 V2 — 중반 이벤트 (라운드 절반 통과 알림). totalRounds * 0.5 시점에 1회.
    midEvent: {
      triggerRound: Math.max(1, Math.floor(totalRounds * 0.5)),
      fired: false,
      flashUntil: 0,
    },
    // 진행 상태
    elapsed: 0,
    currentRound: 0, // 0..totalRounds-1
    fuseRemaining: fuseSchedule[0],
    // 폭탄 위치 (seat index 0..n-1, 죽은 자리는 건너뛴다)
    bombSeat: 0,
    prevBombSeat: 0,
    // 패스 진행도 (0~1, 시각 보간용)
    passProgress: 0,
    passInterval: PASS_MIN_SEC + randFloat() * (PASS_MAX_SEC - PASS_MIN_SEC),
    passTimer: 0,
    passDir: 1, // +1 시계방향, -1 반시계방향
    // 폭발 단계
    exploding: false,
    explodingTimer: 0,
    lastExplodedSeat: null,
    // v1.5 라운드 인터미션 (폭발 후 0.3s 클로즈업)
    intermission: false,
    intermissionTimer: 0,
    // 결과
    nextRank: 1,
    results: [],
    finished: false,
  };
}

function nextAliveSeat(state, dir) {
  let seat = state.bombSeat;
  for (let i = 0; i < state.n; i++) {
    seat = (seat + dir + state.n) % state.n;
    if (state.people[seat].rank === null) return seat;
  }
  return state.bombSeat;
}

export function stepBomb(state, dt) {
  if (state.finished || dt <= 0) return state;
  state.elapsed += dt;

  // 폭발 단계 — fuse 정지, 화면 효과(셰이크 + 플래시 + 폭발 원)
  if (state.exploding) {
    state.explodingTimer -= dt;
    if (state.explodingTimer <= 0) {
      state.exploding = false;
      // v1.5: 폭발 직후 인터미션 0.3s 진입 — 클로즈업 + 배지 정지
      state.intermission = true;
      state.intermissionTimer = state.intermissionSec;
    }
    return state;
  }

  // v1.5 라운드 인터미션 — 카메라 줌 + "💥 X등!" 배지 정지
  if (state.intermission) {
    state.intermissionTimer -= dt;
    if (state.intermissionTimer <= 0) {
      state.intermission = false;
      // 마지막 라운드면 종료, 아니면 다음 alive로 이동 후 fuse 재시작
      if (state.results.length >= state.totalRounds) {
        const survivor = state.people.find((p) => p.rank === null);
        if (survivor) {
          survivor.rank = state.nextRank++;
          state.results.push(survivor);
        }
        state.finished = true;
        return state;
      }
      state.bombSeat = nextAliveSeat(state, state.passDir);
      state.prevBombSeat = state.bombSeat;
      state.passProgress = 0;
      state.passTimer = 0;
      state.currentRound++;
      // v2.4 — 라운드별 fuse 갱신 (사전 추첨된 schedule에서 가져옴)
      state.fuseSec = state.fuseSchedule[state.currentRound];
      state.fuseRemaining = state.fuseSec;
    }
    return state;
  }

  // v2 V2 — 중반 이벤트 트리거 (라운드 절반 통과)
  if (
    !state.midEvent.fired &&
    state.currentRound >= state.midEvent.triggerRound &&
    !state.exploding &&
    !state.intermission
  ) {
    state.midEvent.fired = true;
    state.midEvent.flashUntil = state.elapsed + 1.0;
  }

  // fuse 감소
  state.fuseRemaining -= dt;
  state.passTimer += dt;
  state.passProgress = Math.min(1, state.passTimer / state.passInterval);

  // 패스 — 폭탄이 다음 alive 자리로 hop
  if (state.passTimer >= state.passInterval) {
    state.passTimer = 0;
    state.prevBombSeat = state.bombSeat;
    state.bombSeat = nextAliveSeat(state, state.passDir);
    state.passProgress = 0;
    // 다음 패스 간격 무작위 추첨
    state.passInterval = PASS_MIN_SEC + randFloat() * (PASS_MAX_SEC - PASS_MIN_SEC);
    // 5% 확률 방향 반전 (PRD §7.3 fake-out 4)
    if (randFloat() < 0.05) state.passDir *= -1;
  }

  // fuse 0 → 폭발
  if (state.fuseRemaining <= 0) {
    const exploded = state.people[state.bombSeat];
    exploded.rank = state.nextRank++;
    exploded.eliminationTime = state.elapsed;
    exploded.visualShake = 1;
    state.results.push(exploded);
    state.lastExplodedSeat = state.bombSeat;
    state.exploding = true;
    state.explodingTimer = state.explosionSec;
  }

  return state;
}

export function getBombRankings(state) {
  return state.results.map((p) => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    emoji: p.emoji,
    rank: p.rank,
  }));
}

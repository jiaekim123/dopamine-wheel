// PRD §3.2 + §7.4 — 경주마 Step-based Random 시뮬레이션.
//
// 원칙: 매 step마다 무작위 가속도 추첨 → 시뮬 결과 그대로가 결과.
// 결과를 사전에 정해두지 않으며, 모든 horse가 결승선을 통과해 자연스럽게 rank 1~n이 산출된다.
// v1.5: 페이크 아웃 4종 시스템 (PRD §7.3 + §7.4).

import { randFloat } from '../../lib/random.js';

export const AVG_FINISH_SEC = 14;
export const TARGET_INTERVAL_SEC = 0.2;
export const VEL_FACTOR_MIN = 0.5;
export const VEL_FACTOR_MAX = 1.6;
const VEL_LERP_RATE = 4; // 1/s — target 속도로 수렴하는 속도

// 결승선 위치 정규화: 0(시작) ~ 1(결승)
export const FINISH_LINE = 1;

// v1.5 페이크 아웃 — 사진판정은 자동 트리거(조건부)이므로 아래 3종에서 추첨.
// PRD §7.3: 0개 25% / 1개 55% / 2개 20%.
export const FAKE_OUT_TYPES = ['wobble', 'darkhorse', 'stun'];

function pickFakeOuts() {
  const r = randFloat();
  let count;
  if (r < 0.25) count = 0;
  else if (r < 0.8) count = 1;
  else count = 2;
  const pool = [...FAKE_OUT_TYPES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(randFloat() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * @param {Array<{id:string,name:string,displayName:string,emoji:string}>} participants
 */
export function createHorseRace(participants) {
  const fakeOuts = pickFakeOuts();
  // darkhorse는 게임 60% 지점, stun은 30~50% 사이 무작위
  const darkhorseAt = AVG_FINISH_SEC * 0.6; // ≈ 8.4s
  const stunAt = AVG_FINISH_SEC * 0.3 + randFloat() * AVG_FINISH_SEC * 0.2;

  return {
    horses: participants.map((p, i) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      emoji: p.emoji,
      lane: i,
      position: 0,
      velocity: 0,
      targetVelocity: 0,
      rank: null,
      finishTime: null,
    })),
    elapsed: 0,
    nextRank: 1,
    targetTimer: TARGET_INTERVAL_SEC,
    finished: false,
    results: [],
    // v1.5 페이크 아웃 시스템
    fakeOuts,
    darkhorse: {
      enabled: fakeOuts.includes('darkhorse'),
      triggerAt: darkhorseAt,
      horseId: null,
      badgeUntil: 0,
    },
    stun: {
      enabled: fakeOuts.includes('stun'),
      triggerAt: stunAt,
      horseId: null,
      until: 0,
    },
    wobble: {
      enabled: fakeOuts.includes('wobble'),
    },
    // v2 V3 — 부스터 타일 (트랙 위 코랄 글로우 띠).
    // 게임 시작 시 1~2개 위치를 트랙 30~70% 사이에 랜덤 배치. 결과 불변.
    // 말이 통과 시 시각 부스트 0.4초 (drop-shadow + scale up).
    boosters: pickBoosterPositions(),
    horseBoosterUntil: {}, // horseId → elapsed (이 시점까지 부스트 시각 유지)
  };
}

function pickBoosterPositions() {
  const count = randFloat() < 0.5 ? 1 : 2;
  const positions = [];
  for (let i = 0; i < count; i++) {
    // 30~70% 영역에 균등 분포로 배치
    positions.push(0.3 + (i + randFloat()) * (0.4 / count));
  }
  return positions;
}

export function stepHorseRace(state, dt) {
  if (state.finished || dt <= 0) return state;
  state.elapsed += dt;
  state.targetTimer += dt;

  // 200ms마다 target velocity 재추첨 (Step-based Random)
  if (state.targetTimer >= TARGET_INTERVAL_SEC) {
    state.targetTimer = 0;
    for (const h of state.horses) {
      if (h.rank !== null) continue;
      const factor = VEL_FACTOR_MIN + randFloat() * (VEL_FACTOR_MAX - VEL_FACTOR_MIN);
      h.targetVelocity = factor / AVG_FINISH_SEC;
    }
  }

  // v1.5 다크호스 트리거 — 게임 60% 시점 + 후방 하위 30% 중 1마리 (시각만, 결과 불변)
  if (
    state.darkhorse.enabled &&
    !state.darkhorse.horseId &&
    state.elapsed >= state.darkhorse.triggerAt
  ) {
    const alive = state.horses.filter((h) => h.rank === null);
    if (alive.length > 0) {
      const sorted = [...alive].sort((a, b) => a.position - b.position); // 후방부터
      const cutoff = Math.max(1, Math.floor(sorted.length * 0.3));
      const candidate = sorted[Math.floor(randFloat() * cutoff)];
      state.darkhorse.horseId = candidate.id;
      state.darkhorse.badgeUntil = state.elapsed + 1.0;
    }
  }
  // v1.5 스턴 트리거 — 게임 30~50% + 중위권 1마리 (시각만)
  if (state.stun.enabled && !state.stun.horseId && state.elapsed >= state.stun.triggerAt) {
    const alive = state.horses.filter((h) => h.rank === null);
    if (alive.length >= 3) {
      const sorted = [...alive].sort((a, b) => a.position - b.position);
      const lo = Math.floor(sorted.length * 0.3);
      const hi = Math.ceil(sorted.length * 0.7);
      const idx = lo + Math.floor(randFloat() * Math.max(1, hi - lo));
      const candidate = sorted[Math.min(idx, sorted.length - 1)];
      state.stun.horseId = candidate.id;
      state.stun.until = state.elapsed + 0.5;
    }
  }

  // 위치 업데이트 + 결승 체크
  const lerp = Math.min(1, dt * VEL_LERP_RATE);
  for (const h of state.horses) {
    if (h.rank !== null) continue;
    const prevPos = h.position;
    h.velocity += (h.targetVelocity - h.velocity) * lerp;
    h.position += h.velocity * dt;

    // v2 V3 — 부스터 타일 통과 감지 (시각만, 결과 불변)
    for (const bx of state.boosters) {
      if (prevPos < bx && h.position >= bx) {
        state.horseBoosterUntil[h.id] = state.elapsed + 0.4;
        break;
      }
    }

    if (h.position >= FINISH_LINE) {
      h.position = FINISH_LINE;
      h.velocity = 0;
      h.rank = state.nextRank++;
      h.finishTime = state.elapsed;
      state.results.push(h);
    }
  }

  if (state.results.length === state.horses.length) {
    state.finished = true;
  }
  return state;
}

/**
 * PRD §3.2 — 모든 참가자에 대해 rank 1~n을 가진 rankings 반환.
 * 도착 순서대로 results에 push되어 있으므로 그대로 매핑.
 */
export function getHorseRaceRankings(state) {
  return state.results.map((h) => ({
    id: h.id,
    name: h.name,
    displayName: h.displayName,
    emoji: h.emoji,
    rank: h.rank,
  }));
}

/**
 * 사진판정 트리거: 1·2등 finishTime 차이가 임계값 미만이면 true.
 * 결과를 바꾸지 않는 시각 효과 (PRD §7.3).
 */
export function isPhotoFinish(state, thresholdSec = 0.18) {
  if (state.results.length < 2) return false;
  const t1 = state.results[0].finishTime;
  const t2 = state.results[1].finishTime;
  return t2 - t1 < thresholdSec;
}

/**
 * v1.5 페이크 아웃 시각 상태 헬퍼.
 */
export function getFakeOutState(state, horseId) {
  const isDarkhorse =
    state.darkhorse.horseId === horseId && state.elapsed < state.darkhorse.badgeUntil;
  const isStunned = state.stun.horseId === horseId && state.elapsed < state.stun.until;
  return { isDarkhorse, isStunned };
}

/**
 * v1.5 막판 흔들림 — 페이크 추첨됐고 leader가 결승 5% 직전일 때만.
 */
export function isFinaleWobbleActive(state) {
  if (!state.wobble.enabled) return false;
  if (state.results.length > 0) return false; // 1등 이미 통과
  return state.horses.some((h) => h.rank === null && h.position > 0.95);
}

/**
 * v2 V3 — 특정 horse가 부스터 시각 효과 활성 상태인지.
 */
export function isBoostActive(state, horseId) {
  const until = state.horseBoosterUntil[horseId];
  return until !== undefined && state.elapsed < until;
}

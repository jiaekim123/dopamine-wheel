// PRD §3.2 + §7.4 — 경주마 Step-based Random 시뮬레이션.
//
// 원칙: 매 step마다 무작위 가속도 추첨 → 시뮬 결과 그대로가 결과.
// 결과를 사전에 정해두지 않으며, 모든 horse가 결승선을 통과해 자연스럽게 rank 1~n이 산출된다.
//
// 시간 파라미터 (PRD §4 12~20초):
// - AVG_FINISH_SEC 14초 평균
// - 분산: factor U[0.5, 1.6]를 200ms마다 새로 추첨해 lerp → 누적 분산이 horse마다 다른 finishTime 생성
// - n=12에서 1등~꼴등 finish 간격 약 1~3초 (자연스러운 경기 길이)

import { randFloat } from '../../lib/random.js';

export const AVG_FINISH_SEC = 14;
export const TARGET_INTERVAL_SEC = 0.2;
export const VEL_FACTOR_MIN = 0.5;
export const VEL_FACTOR_MAX = 1.6;
const VEL_LERP_RATE = 4; // 1/s — target 속도로 수렴하는 속도

// 결승선 위치 정규화: 0(시작) ~ 1(결승)
export const FINISH_LINE = 1;

/**
 * @param {Array<{id:string,name:string,displayName:string,emoji:string}>} participants
 */
export function createHorseRace(participants) {
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
      // 시각 페이크 — 시뮬레이션에 영향 없음 (PRD §7.3)
      visualWobble: 0,
    })),
    elapsed: 0,
    nextRank: 1,
    targetTimer: TARGET_INTERVAL_SEC, // 즉시 첫 추첨이 일어나도록
    finished: false,
    results: [],
  };
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

  // 위치 업데이트 + 결승 체크
  const lerp = Math.min(1, dt * VEL_LERP_RATE);
  for (const h of state.horses) {
    if (h.rank !== null) continue;
    h.velocity += (h.targetVelocity - h.velocity) * lerp;
    h.position += h.velocity * dt;
    h.visualWobble = Math.max(0, h.visualWobble - dt);

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

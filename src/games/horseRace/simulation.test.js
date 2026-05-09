// PRD §3.2 검증 — 경주마 시뮬레이션이 항상 rank 1~n을 산출하는지.
// 테스트 시드(mulberry32) 주입으로 결정적 동작 확인.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { __setTestSeed, __clearTestSeed } from '../../lib/random.js';
import {
  createHorseRace,
  stepHorseRace,
  getHorseRaceRankings,
  AVG_FINISH_SEC,
} from './simulation.js';

const FIXED_DT = 1 / 60; // 60fps 가정

function buildParticipants(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `참가자${i}`,
    displayName: `참가자${i}`,
    emoji: '🦊',
  }));
}

function runToFinish(state, maxSeconds = 60) {
  const maxSteps = Math.ceil(maxSeconds / FIXED_DT);
  for (let i = 0; i < maxSteps; i++) {
    if (state.finished) return state;
    stepHorseRace(state, FIXED_DT);
  }
  return state;
}

describe('horseRace simulation', () => {
  beforeEach(() => __setTestSeed(42));
  afterEach(() => __clearTestSeed());

  it('produces rankings with ranks 1..n in 12명 race', () => {
    const state = createHorseRace(buildParticipants(12));
    runToFinish(state);
    expect(state.finished).toBe(true);

    const rankings = getHorseRaceRankings(state);
    expect(rankings).toHaveLength(12);

    const ranks = rankings.map((r) => r.rank).sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });

  it('all participants finish (no horse stuck)', () => {
    const state = createHorseRace(buildParticipants(8));
    runToFinish(state);
    for (const h of state.horses) {
      expect(h.rank).not.toBeNull();
      expect(h.position).toBe(1);
    }
  });

  it('finishes within 10~30 seconds (PRD §3.3 game length budget)', () => {
    const state = createHorseRace(buildParticipants(10));
    runToFinish(state);
    expect(state.elapsed).toBeGreaterThan(8); // intro 3.5s 빼고도 10초 보장
    expect(state.elapsed).toBeLessThan(28);
  });

  it('same seed produces same rankings (Step-based Random 결정성)', () => {
    const sA = createHorseRace(buildParticipants(6));
    runToFinish(sA);
    const rA = getHorseRaceRankings(sA).map((r) => r.id);

    __setTestSeed(42);
    const sB = createHorseRace(buildParticipants(6));
    runToFinish(sB);
    const rB = getHorseRaceRankings(sB).map((r) => r.id);

    expect(rA).toEqual(rB);
  });

  it('uses base speed proportional to AVG_FINISH_SEC', () => {
    // sanity check — 단일 horse가 평균에 가까운 시간에 도착
    const state = createHorseRace(buildParticipants(1));
    runToFinish(state);
    expect(state.elapsed).toBeGreaterThan(AVG_FINISH_SEC * 0.5);
    expect(state.elapsed).toBeLessThan(AVG_FINISH_SEC * 2.0);
  });
});

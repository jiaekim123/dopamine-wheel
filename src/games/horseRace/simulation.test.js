// PRD §3.2 검증 — 카오스 레이스 시뮬레이션이 항상 rank 1~n을 산출하는지.
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

  it('finishes within game length budget (v2.5: AVG_FINISH_SEC=9, faster)', () => {
    const state = createHorseRace(buildParticipants(10));
    runToFinish(state);
    expect(state.elapsed).toBeGreaterThan(5);
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
    runToFinish(state, 60);
    expect(state.elapsed).toBeGreaterThan(AVG_FINISH_SEC * 0.5);
    expect(state.elapsed).toBeLessThan(AVG_FINISH_SEC * 3.0);
  });

  // v2.2 — 카오스 레이스 동물 species 시스템
  it('assigns species from 6-species pool (v2.2)', () => {
    const state = createHorseRace(buildParticipants(12));
    const validSpecies = new Set(['rabbit', 'turtle', 'penguin', 'hamster', 'snail', 'eagle']);
    for (const h of state.horses) {
      expect(validSpecies.has(h.species)).toBe(true);
      expect(typeof h.speciesEmoji).toBe('string');
    }
  });

  it('species assignment is deterministic with seed (v2.2)', () => {
    __setTestSeed(42);
    const sA = createHorseRace(buildParticipants(8));
    __setTestSeed(42);
    const sB = createHorseRace(buildParticipants(8));
    expect(sA.horses.map((h) => h.species)).toEqual(sB.horses.map((h) => h.species));
  });

  it('obstacles are 1~2 placed near 25/50/75% (v2.2)', () => {
    for (let seed = 1; seed <= 10; seed++) {
      __setTestSeed(seed);
      const state = createHorseRace(buildParticipants(6));
      expect(state.obstacles.length).toBeGreaterThanOrEqual(1);
      expect(state.obstacles.length).toBeLessThanOrEqual(2);
      for (const ox of state.obstacles) {
        expect(ox).toBeGreaterThan(0.15);
        expect(ox).toBeLessThan(0.85);
      }
    }
  });

  it('rankings include species + speciesEmoji fields (v2.2)', () => {
    const state = createHorseRace(buildParticipants(4));
    runToFinish(state, 60);
    const rankings = getHorseRaceRankings(state);
    for (const r of rankings) {
      expect(typeof r.species).toBe('string');
      expect(typeof r.speciesEmoji).toBe('string');
    }
  });
});

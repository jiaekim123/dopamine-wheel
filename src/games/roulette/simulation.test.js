// PRD §3.2 검증 — 룰렛이 항상 rank 1~n을 산출하고 stuck 없이 마무리되는지.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { __setTestSeed, __clearTestSeed } from '../../lib/random.js';
import { createRoulette, stepRoulette, getRouletteRankings } from './simulation.js';

const FIXED_DT = 1 / 60;

function buildParticipants(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    displayName: `P${i}`,
    emoji: '🪂',
  }));
}

function runToFinish(state, maxSeconds = 90) {
  const maxSteps = Math.ceil(maxSeconds / FIXED_DT);
  for (let i = 0; i < maxSteps; i++) {
    if (state.finished) return state;
    stepRoulette(state, FIXED_DT);
  }
  return state;
}

describe('roulette simulation', () => {
  beforeEach(() => __setTestSeed(13));
  afterEach(() => __clearTestSeed());

  it('produces rankings 1..n for n=5', () => {
    const state = createRoulette(buildParticipants(5));
    runToFinish(state);
    expect(state.finished).toBe(true);
    const ranks = getRouletteRankings(state).map((r) => r.rank).sort((a, b) => a - b);
    expect(ranks).toEqual([1, 2, 3, 4, 5]);
  });

  it('finishes for n=15 within 90s', () => {
    const state = createRoulette(buildParticipants(15));
    runToFinish(state);
    expect(state.finished).toBe(true);
    expect(getRouletteRankings(state)).toHaveLength(15);
    expect(state.elapsed).toBeLessThan(90);
  });

  it('handles n=2 (minimum)', () => {
    const state = createRoulette(buildParticipants(2));
    runToFinish(state);
    expect(state.finished).toBe(true);
    expect(getRouletteRankings(state)).toHaveLength(2);
  });

  it('handles n=30 (large)', () => {
    const state = createRoulette(buildParticipants(30));
    runToFinish(state);
    expect(state.finished).toBe(true);
    expect(getRouletteRankings(state)).toHaveLength(30);
  });

  it('same seed produces same rankings', () => {
    const sA = createRoulette(buildParticipants(6));
    runToFinish(sA);
    const rA = getRouletteRankings(sA).map((r) => r.id);

    __setTestSeed(13);
    const sB = createRoulette(buildParticipants(6));
    runToFinish(sB);
    const rB = getRouletteRankings(sB).map((r) => r.id);

    expect(rA).toEqual(rB);
  });
});

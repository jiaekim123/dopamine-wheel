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

  // v2.1 / v2.2 — 점프대 무작위 배치 검증 (v2.2부터 3~5)
  it('jumpers are 3~5 randomized (v2.2)', () => {
    const counts = new Set();
    for (let seed = 1; seed <= 20; seed++) {
      __setTestSeed(seed);
      const state = createRoulette(buildParticipants(6));
      const c = state.jumpers.length;
      expect(c).toBeGreaterThanOrEqual(3);
      expect(c).toBeLessThanOrEqual(5);
      counts.add(c);
    }
    // 시드 20개 중 적어도 2개 이상의 다른 count가 등장해야 무작위성 확보
    expect(counts.size).toBeGreaterThanOrEqual(2);
  });

  // v2.2 — 동시 낙하 검증
  it('all balls are added immediately (v2.2 simultaneous drop)', () => {
    const state = createRoulette(buildParticipants(8));
    // dropQueue는 비어 있어야 함
    expect(state.dropQueue).toHaveLength(0);
    // 모든 공이 ballsByLabel에 added=true로 등록
    let addedCount = 0;
    for (const entry of state.ballsByLabel.values()) {
      if (entry.added) addedCount++;
      // 시작 Y는 음수 (챔버 위쪽)
      expect(entry.body.position.y).toBeLessThan(0);
    }
    expect(addedCount).toBe(8);
  });

  it('jumpers are deterministic with seed (v2.1)', () => {
    __setTestSeed(42);
    const sA = createRoulette(buildParticipants(6));
    __setTestSeed(42);
    const sB = createRoulette(buildParticipants(6));
    expect(sA.jumpers.length).toBe(sB.jumpers.length);
    sA.jumpers.forEach((j, i) => {
      expect(j.x).toBeCloseTo(sB.jumpers[i].x, 6);
      expect(j.y).toBeCloseTo(sB.jumpers[i].y, 6);
      expect(j.angle).toBeCloseTo(sB.jumpers[i].angle, 6);
      expect(j.length).toBeCloseTo(sB.jumpers[i].length, 6);
    });
  });
});

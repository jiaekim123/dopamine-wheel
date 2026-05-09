// PRD §3.2 검증 — 폭탄 시뮬레이션이 항상 rank 1~n을 산출하는지.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { __setTestSeed, __clearTestSeed } from '../../lib/random.js';
import {
  createBomb,
  stepBomb,
  getBombRankings,
  computeBombTimings,
} from './simulation.js';

const FIXED_DT = 1 / 60;

function buildParticipants(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `참가자${i}`,
    displayName: `참가자${i}`,
    emoji: '💣',
  }));
}

function runToFinish(state, maxSeconds = 90) {
  const maxSteps = Math.ceil(maxSeconds / FIXED_DT);
  for (let i = 0; i < maxSteps; i++) {
    if (state.finished) return state;
    stepBomb(state, FIXED_DT);
  }
  return state;
}

describe('bomb simulation', () => {
  beforeEach(() => __setTestSeed(11));
  afterEach(() => __clearTestSeed());

  it('produces rankings 1..n for n=10', () => {
    const state = createBomb(buildParticipants(10));
    runToFinish(state);
    expect(state.finished).toBe(true);

    const rankings = getBombRankings(state);
    expect(rankings).toHaveLength(10);
    const ranks = rankings.map((r) => r.rank).sort((a, b) => a - b);
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('runs n-1 explosion rounds + 1 survivor', () => {
    const state = createBomb(buildParticipants(8));
    runToFinish(state);
    expect(state.results).toHaveLength(8);
    // 처음 7명은 폭발 순으로 rank 1..7, 마지막 1명이 rank 8 (생존자)
    expect(state.results[0].rank).toBe(1);
    expect(state.results[7].rank).toBe(8);
  });

  it('handles n=2 (single round)', () => {
    const state = createBomb(buildParticipants(2));
    runToFinish(state);
    expect(state.finished).toBe(true);
    const rankings = getBombRankings(state);
    expect(rankings).toHaveLength(2);
    expect(rankings.map((r) => r.rank).sort()).toEqual([1, 2]);
  });

  it('handles n=20 (max for bomb) within bomb budget (v2.4.1: 2~5s fuse, ~120s max)', () => {
    const state = createBomb(buildParticipants(20));
    // v2.4.1 — 19 라운드 × 최대 (5 + 0.55 + 0.3) = ~111s 가능. 여유 있게 130s까지 진행 허용.
    runToFinish(state, 130);
    expect(state.finished).toBe(true);
    expect(getBombRankings(state)).toHaveLength(20);
    // 평균 케이스는 ~76초, 최악 ~111초. 130초 한도 내에서는 무조건 종료.
    expect(state.elapsed).toBeLessThan(130);
  });

  it('same seed produces same rankings', () => {
    const sA = createBomb(buildParticipants(6));
    runToFinish(sA);
    const rA = getBombRankings(sA).map((r) => r.id);

    __setTestSeed(11);
    const sB = createBomb(buildParticipants(6));
    runToFinish(sB);
    const rB = getBombRankings(sB).map((r) => r.id);

    expect(rA).toEqual(rB);
  });

  it('computeBombTimings reflects v2.4.1 fuse range (2~5s avg = 3.5s)', () => {
    const t2 = computeBombTimings(2);
    expect(t2.totalRounds).toBe(1);
    // v2.4.1: avg fuse = (2 + 5) / 2 = 3.5
    expect(t2.fuseSec).toBeCloseTo(3.5, 5);

    const t20 = computeBombTimings(20);
    expect(t20.totalRounds).toBe(19);
    // 19 * (3.5 + 0.55 + 0.3) ≈ 82.65s 평균. 최악 케이스는 fuse 5s × 19 ≈ 111s.
    // PRD §3.3 90s budget을 일부 케이스에서 상회하지만 사용자 의도대로 진행.
    const totalAvg = t20.totalRounds * (t20.fuseSec + t20.explosionSec + t20.intermissionSec);
    expect(totalAvg).toBeGreaterThan(60);
    expect(totalAvg).toBeLessThan(110);
  });

  // v2.4 — 라운드별 fuse 무작위 검증
  it('fuseSchedule has totalRounds entries with variance (v2.4)', () => {
    const state = createBomb(buildParticipants(10));
    expect(state.fuseSchedule).toHaveLength(state.totalRounds);
    expect(state.fuseSchedule).toHaveLength(9);
    // 모두 MIN_FUSE_SEC 이상
    for (const f of state.fuseSchedule) {
      expect(f).toBeGreaterThanOrEqual(0.45);
    }
    // 라운드별 fuse가 동일하지 않아야 함 (분산 검증)
    const uniq = new Set(state.fuseSchedule.map((f) => Math.round(f * 100) / 100));
    expect(uniq.size).toBeGreaterThanOrEqual(2);
  });

  it('fuseSchedule average is close to avgFuseSec ±25% (v2.4)', () => {
    const state = createBomb(buildParticipants(10));
    const avg = state.fuseSchedule.reduce((a, b) => a + b, 0) / state.fuseSchedule.length;
    expect(avg).toBeGreaterThan(state.avgFuseSec * 0.75);
    expect(avg).toBeLessThan(state.avgFuseSec * 1.25);
  });

  it('fuseSchedule is deterministic with same seed (v2.4)', () => {
    __setTestSeed(11);
    const sA = createBomb(buildParticipants(8));
    __setTestSeed(11);
    const sB = createBomb(buildParticipants(8));
    expect(sA.fuseSchedule).toEqual(sB.fuseSchedule);
  });
});

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

  it('handles n=20 (max for bomb) within budget', () => {
    const state = createBomb(buildParticipants(20));
    runToFinish(state, 60);
    expect(state.finished).toBe(true);
    expect(getBombRankings(state)).toHaveLength(20);
    // PRD §3.3 max 90초 보장
    expect(state.elapsed).toBeLessThan(90);
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

  it('computeBombTimings stays within budget', () => {
    const t2 = computeBombTimings(2);
    expect(t2.totalRounds).toBe(1);
    expect(t2.fuseSec).toBeGreaterThanOrEqual(0.45);

    const t20 = computeBombTimings(20);
    expect(t20.totalRounds).toBe(19);
    // 19 * (fuseSec + 0.55) 가 최대 게임 길이 24초 안에 들어가는지
    const total = t20.totalRounds * (t20.fuseSec + t20.explosionSec);
    expect(total).toBeLessThanOrEqual(25);
  });
});

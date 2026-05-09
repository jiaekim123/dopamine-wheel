// PRD §3.2 검증 — 로또 추첨 시뮬레이션이 항상 rank 1~n을 산출하는지.
// 시드 주입 후 결정적 동작 + 모든 공이 합리적 시간 안에 추출되는지 확인.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { __setTestSeed, __clearTestSeed } from '../../lib/random.js';
import { createLotto, stepLotto, getLottoRankings } from './simulation.js';

const FIXED_DT = 1 / 60;

function buildParticipants(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `참가자${i}`,
    displayName: `참가자${i}`,
    emoji: '🎱',
  }));
}

function runToFinish(state, maxSeconds = 90) {
  const maxSteps = Math.ceil(maxSeconds / FIXED_DT);
  for (let i = 0; i < maxSteps; i++) {
    if (state.finished) return state;
    stepLotto(state, FIXED_DT);
  }
  return state;
}

describe('lotto simulation', () => {
  beforeEach(() => __setTestSeed(7));
  afterEach(() => __clearTestSeed());

  it('produces rankings with ranks 1..n for 6명', () => {
    const state = createLotto(buildParticipants(6));
    runToFinish(state);
    expect(state.finished).toBe(true);

    const rankings = getLottoRankings(state);
    expect(rankings).toHaveLength(6);
    const ranks = rankings.map((r) => r.rank).sort((a, b) => a - b);
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('extracts all balls for 12명 within budget', () => {
    const state = createLotto(buildParticipants(12));
    runToFinish(state);
    expect(state.finished).toBe(true);
    expect(getLottoRankings(state)).toHaveLength(12);
    // 게임 길이 budget — Phase 5에서 90초 보장 (PRD §3.3)
    expect(state.elapsed).toBeLessThan(90);
  });

  it('handles n=30 (max for lotto)', () => {
    const state = createLotto(buildParticipants(30));
    // v1.5 부력감 강화로 warmup 최대 10s + extracting 시간이 늘어 80s 여유 확보
    runToFinish(state, 80);
    expect(state.finished).toBe(true);
    expect(getLottoRankings(state)).toHaveLength(30);
  });

  it('handles n=2 (minimum)', () => {
    const state = createLotto(buildParticipants(2));
    runToFinish(state);
    expect(state.finished).toBe(true);
    expect(getLottoRankings(state)).toHaveLength(2);
  });

  it('warmup phase starts with phase=warmup and 0 results', () => {
    const state = createLotto(buildParticipants(6));
    // warmup 시작 직후
    stepLotto(state, 0.5);
    expect(state.phase).toBe('warmup');
    expect(state.results).toHaveLength(0);
    expect(state.gate).toBeTruthy();
  });

  it('warmupDuration is in [3, 10] range and deterministic with seed', () => {
    const sA = createLotto(buildParticipants(5));
    expect(sA.warmupDuration).toBeGreaterThanOrEqual(3);
    expect(sA.warmupDuration).toBeLessThanOrEqual(10);

    __setTestSeed(7);
    const sB = createLotto(buildParticipants(5));
    expect(sB.warmupDuration).toBe(sA.warmupDuration);
  });

  it('phase transitions warmup → extracting after warmupDuration', () => {
    const state = createLotto(buildParticipants(4));
    const warmup = state.warmupDuration;
    // warmup 직전까지는 추출 0건 + warmup 단계
    for (let t = 0; t < warmup - FIXED_DT; t += FIXED_DT) {
      stepLotto(state, FIXED_DT);
    }
    expect(state.phase).toBe('warmup');
    expect(state.results).toHaveLength(0);

    // warmup 통과 시점 이후 게이트 제거되고 extracting으로 전환
    stepLotto(state, FIXED_DT * 2);
    expect(state.phase).toBe('extracting');
    expect(state.gate).toBeNull();
  });

  it('same seed produces same rankings (Step-based Random 결정성)', () => {
    const sA = createLotto(buildParticipants(5));
    runToFinish(sA);
    const rA = getLottoRankings(sA).map((r) => r.id);

    __setTestSeed(7);
    const sB = createLotto(buildParticipants(5));
    runToFinish(sB);
    const rB = getLottoRankings(sB).map((r) => r.id);

    expect(rA).toEqual(rB);
  });
});

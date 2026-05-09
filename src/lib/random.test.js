// PRD §13.1 — 무작위 함수 균등성 검증 (카이제곱)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randInt, randFloat, shuffle, randSample, __setTestSeed, __clearTestSeed } from './random.js';

describe('randInt', () => {
  it('throws on non-positive max', () => {
    expect(() => randInt(0)).toThrow();
    expect(() => randInt(-5)).toThrow();
    expect(() => randInt(1.5)).toThrow();
  });

  it('returns values in [0, max)', () => {
    for (let i = 0; i < 1000; i++) {
      const v = randInt(50);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(50);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('passes uniformity check (chi-squared) for randInt(50)', () => {
    // 1만 회 샘플 → 50개 버킷, 기대값 200개씩
    const N = 10000;
    const M = 50;
    const counts = new Array(M).fill(0);
    for (let i = 0; i < N; i++) {
      counts[randInt(M)]++;
    }
    // 카이제곱 통계량
    const expected = N / M;
    let chi2 = 0;
    for (const c of counts) {
      chi2 += (c - expected) ** 2 / expected;
    }
    // 자유도 49, 99% critical value ≈ 74.92, 99.9% ≈ 84.04
    // 안전하게 100을 상한으로 (false positive 최소화)
    expect(chi2).toBeLessThan(100);
  });
});

describe('randFloat', () => {
  it('returns values in [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const v = randFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('preserves all elements', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = shuffle([...arr]);
    expect(shuffled.sort((a, b) => a - b)).toEqual(arr);
  });

  it('produces different orders (probabilistic)', () => {
    const orig = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let differentCount = 0;
    for (let i = 0; i < 20; i++) {
      const s = shuffle([...orig]);
      if (s.some((v, idx) => v !== orig[idx])) differentCount++;
    }
    // 10! 순열 중 항상 같은 결과가 나올 확률은 사실상 0
    expect(differentCount).toBeGreaterThan(15);
  });
});

describe('randSample', () => {
  it('returns sorted unique values', () => {
    for (let i = 0; i < 100; i++) {
      const sample = randSample(50, 10);
      expect(sample.length).toBe(10);
      expect(new Set(sample).size).toBe(10); // 중복 없음
      // 정렬됨
      for (let j = 1; j < sample.length; j++) {
        expect(sample[j]).toBeGreaterThan(sample[j - 1]);
      }
    }
  });

  it('throws when count > max', () => {
    expect(() => randSample(5, 10)).toThrow();
  });
});

describe('test seed mode', () => {
  afterEach(() => {
    __clearTestSeed();
  });

  it('produces reproducible output with same seed', () => {
    __setTestSeed(42);
    const a = [randInt(100), randInt(100), randInt(100), randFloat()];
    __setTestSeed(42);
    const b = [randInt(100), randInt(100), randInt(100), randFloat()];
    expect(a).toEqual(b);
  });

  it('produces different output with different seeds', () => {
    __setTestSeed(1);
    const a = [randInt(100), randInt(100), randInt(100)];
    __setTestSeed(2);
    const b = [randInt(100), randInt(100), randInt(100)];
    expect(a).not.toEqual(b);
  });
});

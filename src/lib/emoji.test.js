// PRD §13.1 — 이모지 매핑 안정성 (FNV-1a)
import { describe, it, expect } from 'vitest';
import { fnv1a, nameToEmoji, EMOJI_POOL } from './emoji.js';

describe('fnv1a', () => {
  it('returns the same hash for the same input', () => {
    expect(fnv1a('김철수')).toBe(fnv1a('김철수'));
    expect(fnv1a('John Doe')).toBe(fnv1a('John Doe'));
    expect(fnv1a('')).toBe(fnv1a(''));
  });

  it('returns different hashes for different inputs (probabilistic)', () => {
    const samples = ['김철수', '이영희', '박민수', '정수진', '최지원'];
    const hashes = samples.map(fnv1a);
    expect(new Set(hashes).size).toBe(samples.length);
  });

  it('returns unsigned 32-bit integer', () => {
    const h = fnv1a('test');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe('nameToEmoji', () => {
  it('returns the same emoji for the same name across calls', () => {
    const name = '김철수';
    const e1 = nameToEmoji(name);
    const e2 = nameToEmoji(name);
    const e3 = nameToEmoji(name);
    expect(e1).toBe(e2);
    expect(e2).toBe(e3);
  });

  it('returns an emoji from EMOJI_POOL', () => {
    const samples = [
      '김철수',
      '이영희',
      '박민수',
      'Alice',
      'Bob',
      '🦊', // edge: emoji as input
      '',
    ];
    for (const name of samples) {
      const e = nameToEmoji(name);
      expect(EMOJI_POOL).toContain(e);
    }
  });

  it('distributes 1만 random names across EMOJI_POOL reasonably', () => {
    // 1만 개 무작위 이름이 풀 전체에 골고루 퍼지는지 확인
    const counts = new Map();
    for (let i = 0; i < 10000; i++) {
      const name = `name-${i}-${Math.random()}`;
      const e = nameToEmoji(name);
      counts.set(e, (counts.get(e) || 0) + 1);
    }
    // 풀의 70% 이상이 적어도 한 번은 사용되어야 함
    expect(counts.size).toBeGreaterThanOrEqual(Math.floor(EMOJI_POOL.length * 0.7));
  });

  it('EMOJI_POOL has at least 60 entries', () => {
    expect(EMOJI_POOL.length).toBeGreaterThanOrEqual(60);
  });
});

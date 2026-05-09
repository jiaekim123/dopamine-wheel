// PRD §11 Phase 1 검증 포인트 자동 검증
import { describe, it, expect } from 'vitest';
import { parseParticipants, parseWinnerRanks, clampK, MAX_PARTICIPANTS } from './parser.js';
import { nameToEmoji } from './emoji.js';

describe('parseParticipants', () => {
  it('handles empty input', () => {
    expect(parseParticipants('')).toEqual({ participants: [], dropped: 0 });
    expect(parseParticipants(null)).toEqual({ participants: [], dropped: 0 });
    expect(parseParticipants(undefined)).toEqual({ participants: [], dropped: 0 });
  });

  it('parses mixed delimiters: comma, newline, space → 4 names', () => {
    // PRD §11 Phase 1 검증 포인트 #1
    const { participants } = parseParticipants('김철수, 이영희\n박민수 정수진');
    expect(participants.length).toBe(4);
    expect(participants.map((p) => p.displayName)).toEqual([
      '김철수',
      '이영희',
      '박민수',
      '정수진',
    ]);
  });

  it('appends #1, #2 suffix to homonyms', () => {
    // PRD §11 Phase 1 검증 포인트 #2
    const { participants } = parseParticipants('김철수, 김철수');
    expect(participants.length).toBe(2);
    expect(participants[0].displayName).toBe('김철수 #1');
    expect(participants[1].displayName).toBe('김철수 #2');
  });

  it('keeps unique name unchanged when no homonym', () => {
    const { participants } = parseParticipants('김철수, 이영희');
    expect(participants[0].displayName).toBe('김철수');
    expect(participants[1].displayName).toBe('이영희');
  });

  it('does NOT support multiplier syntax `이름*N`', () => {
    // PRD §11 Phase 1 검증 포인트 #3 — `*`는 일반 문자
    const { participants } = parseParticipants('수박*2');
    expect(participants.length).toBe(1);
    expect(participants[0].displayName).toBe('수박*2');
  });

  it('assigns stable emoji per name (FNV-1a)', () => {
    // PRD §11 Phase 1 검증 포인트 #4
    const { participants } = parseParticipants('김철수');
    expect(participants[0].emoji).toBe(nameToEmoji('김철수'));

    // 같은 이름을 다시 파싱해도 같은 이모지
    const second = parseParticipants('김철수').participants[0];
    expect(second.emoji).toBe(participants[0].emoji);
  });

  it('caps at 50 participants and reports dropped count', () => {
    // PRD §11 Phase 1 검증 포인트 #5
    const names = Array.from({ length: 60 }, (_, i) => `n${i}`).join(',');
    const result = parseParticipants(names);
    expect(result.participants.length).toBe(MAX_PARTICIPANTS);
    expect(result.dropped).toBe(10);
  });

  it('truncates names longer than 20 characters', () => {
    // 21자 이상이어야 잘림이 발생
    const longName = 'a'.repeat(25);
    const { participants } = parseParticipants(longName);
    expect(participants[0].name.length).toBe(20);
    expect(participants[0].truncated).toBe(true);
  });

  it('does NOT mark a 20-character name as truncated', () => {
    const exactName = 'a'.repeat(20);
    const { participants } = parseParticipants(exactName);
    expect(participants[0].name.length).toBe(20);
    expect(participants[0].truncated).toBe(false);
  });

  it('strips leading/trailing whitespace and collapses spaces', () => {
    const { participants } = parseParticipants('  김철수  ,   이영희  ');
    expect(participants.map((p) => p.displayName)).toEqual(['김철수', '이영희']);
  });

  it('does not break when input has only whitespace', () => {
    expect(parseParticipants('   \n   ').participants.length).toBe(0);
  });
});

describe('parseWinnerRanks', () => {
  it('returns ok with sorted ranks for valid input', () => {
    const r = parseWinnerRanks('1, 5, 7', 3, 10);
    expect(r.ok).toBe(true);
    expect(r.ranks).toEqual([1, 5, 7]);
  });

  it('accepts space-separated input', () => {
    const r = parseWinnerRanks('1 5 7', 3, 10);
    expect(r.ok).toBe(true);
    expect(r.ranks).toEqual([1, 5, 7]);
  });

  it('sorts ranks even if input is unordered', () => {
    const r = parseWinnerRanks('7, 1, 5', 3, 10);
    expect(r.ok).toBe(true);
    expect(r.ranks).toEqual([1, 5, 7]);
  });

  it('rejects when count != k', () => {
    // PRD §11 Phase 1 검증 포인트: 개수 불일치
    const r = parseWinnerRanks('1, 5', 3, 10);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('3개');
    expect(r.error).toContain('현재 2개');
  });

  it('rejects duplicate ranks', () => {
    // PRD §11 Phase 1 검증 포인트: 중복 거부
    const r = parseWinnerRanks('1, 5, 5', 3, 10);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('중복');
    expect(r.error).toContain('5');
  });

  it('rejects out-of-range ranks (rank > n)', () => {
    // PRD §11 Phase 1 검증 포인트: 범위 거부
    const r = parseWinnerRanks('1, 5, 99', 3, 10);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('99');
    expect(r.error).toContain('10명');
  });

  it('rejects rank < 1', () => {
    const r = parseWinnerRanks('0, 5, 7', 3, 10);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('0');
  });

  it('rejects non-numeric tokens', () => {
    const r = parseWinnerRanks('1, abc, 7', 3, 10);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('abc');
  });

  it('rejects empty input', () => {
    const r = parseWinnerRanks('', 3, 10);
    expect(r.ok).toBe(false);
  });
});

describe('clampK', () => {
  it('clamps k to [1, n-1]', () => {
    expect(clampK(0, 10)).toBe(1);
    expect(clampK(1, 10)).toBe(1);
    expect(clampK(5, 10)).toBe(5);
    expect(clampK(9, 10)).toBe(9);
    expect(clampK(10, 10)).toBe(9); // k >= n -> n-1
    expect(clampK(100, 10)).toBe(9);
  });

  it('returns 0 when n < 2 (game disabled)', () => {
    expect(clampK(1, 0)).toBe(0);
    expect(clampK(1, 1)).toBe(0);
  });
});

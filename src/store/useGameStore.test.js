// Zustand 스토어 통합 동작 검증
// - localStorage 저장/복원 (PRD §11 Phase 1 검증 포인트)
// - winnerMode 변경 시 직접 입력 재검증
// - resetForReplay
// v1.4: 연출 강도 토글 제거. k는 자유 입력 (clamp 없음). isGameStartable에서 차단.

import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, STORAGE_KEY } from './useGameStore.js';

// jsdom v29에서는 Storage.clear()가 직접 호출되지 않을 수 있어 removeItem로 대체.
function clearStore() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  const s = useGameStore.getState();
  s.setRawInput('');
  s.setWinnerMode('first');
  s.setWinnerRanksInput('');
  s.setWinnerCount(1);
}

describe('useGameStore', () => {
  beforeEach(() => {
    clearStore();
  });

  it('parses raw input into participants on setRawInput', () => {
    const s = useGameStore.getState();
    s.setRawInput('김철수, 이영희, 박민수');
    expect(useGameStore.getState().participants.length).toBe(3);
  });

  it('keeps winnerCount unchanged when participants shrink (자유 입력 — clamp 없음)', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c, d, e');
    s.setWinnerCount(3);
    expect(useGameStore.getState().winnerCount).toBe(3);

    // v1.4: 인원이 줄어도 k는 그대로. isGameStartable로만 차단.
    s.setRawInput('a, b');
    expect(useGameStore.getState().winnerCount).toBe(3);
    expect(useGameStore.getState().isGameStartable()).toBe(false);
  });

  it('isGameStartable returns false when n < 2', () => {
    const s = useGameStore.getState();
    s.setRawInput('alone');
    expect(useGameStore.getState().isGameStartable()).toBe(false);
  });

  it('isGameStartable returns false when k >= n', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c'); // 3명
    s.setWinnerCount(3); // k=n
    expect(useGameStore.getState().isGameStartable()).toBe(false);

    s.setWinnerCount(2);
    expect(useGameStore.getState().isGameStartable()).toBe(true);
  });

  it('isGameStartable returns true with valid first/last mode', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c, d');
    s.setWinnerCount(2);
    s.setWinnerMode('first');
    expect(useGameStore.getState().isGameStartable()).toBe(true);

    s.setWinnerMode('last');
    expect(useGameStore.getState().isGameStartable()).toBe(true);
  });

  it('isGameStartable returns false in custom mode without valid ranks input', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c, d');
    s.setWinnerCount(2);
    s.setWinnerMode('custom');
    expect(useGameStore.getState().isGameStartable()).toBe(false);

    s.setWinnerRanksInput('1');
    expect(useGameStore.getState().isGameStartable()).toBe(false);

    s.setWinnerRanksInput('1, 3');
    expect(useGameStore.getState().isGameStartable()).toBe(true);
    expect(useGameStore.getState().winnerRanks).toEqual([1, 3]);
  });

  it('re-validates winnerRanks when k changes', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c, d, e');
    s.setWinnerMode('custom');
    s.setWinnerRanksInput('1, 3');
    s.setWinnerCount(2);
    expect(useGameStore.getState().winnerRanks).toEqual([1, 3]);

    s.setWinnerCount(3);
    expect(useGameStore.getState().winnerRanks).toEqual([]);
  });

  it('re-validates winnerRanks when participants count changes (range check)', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c, d, e');
    s.setWinnerMode('custom');
    s.setWinnerCount(2);
    s.setWinnerRanksInput('1, 5');
    expect(useGameStore.getState().winnerRanks).toEqual([1, 5]);

    s.setRawInput('a, b, c'); // 3명 — 5등이 범위 밖
    expect(useGameStore.getState().winnerRanks).toEqual([]);
  });

  it('persists to localStorage and reloads', () => {
    // PRD §11 Phase 1 검증 포인트: 새로고침 시 옵션 복원.
    // debounce를 우회해 동기 flush.
    const s = useGameStore.getState();
    s.setRawInput('김철수, 이영희, 박민수');
    s.setWinnerCount(2);
    s.setWinnerMode('custom');
    s.setWinnerRanksInput('1, 3');
    s.flushPersist();

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.lastInput).toBe('김철수, 이영희, 박민수');
    expect(parsed.lastK).toBe(2);
    expect(parsed.lastMode).toBe('custom');
    expect(parsed.lastRanks).toBe('1, 3');
    // v1.4: motionLevel 키는 더 이상 저장되지 않음
    expect(parsed.motionLevel).toBeUndefined();
  });

  // v1.5.1: "처음으로" 액션이 resetForReplay로 통일 → 게임 상태만 리셋, 참가자·k·모드·순위 모두 유지.
  it('resetForReplay only clears gameResult/selectedGame/screen, preserves all options', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c');
    s.setWinnerCount(2);
    s.setWinnerMode('last');
    s.resetForReplay();
    const after = useGameStore.getState();
    // 참가자 + 옵션 모두 그대로
    expect(after.participants.length).toBe(3);
    expect(after.rawInput).toBe('a, b, c');
    expect(after.winnerCount).toBe(2);
    expect(after.winnerMode).toBe('last');
    // 게임 상태만 초기화
    expect(after.gameResult).toBeNull();
    expect(after.selectedGame).toBeNull();
    expect(after.screen).toBe('home');
  });
});

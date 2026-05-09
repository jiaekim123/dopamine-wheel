// 컴포넌트 테스트용 — Zustand store와 localStorage를 매 테스트마다 격리.
// vitest beforeEach에서 호출.

import { useGameStore, DEFAULT_STATE, STORAGE_KEY } from '../store/useGameStore.js';

export function resetStore() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  useGameStore.setState({ ...DEFAULT_STATE });
}

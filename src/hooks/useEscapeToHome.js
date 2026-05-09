// PRD §3.4 / §5.3 — ESC 키로 어디서든 Home(Editorial)으로 복귀.
// Phase 2 시점에서는 Home 외 화면이 아직 없으므로, screen이 home이 아닐 때만 동작.
// (Phase 3에서 intro/play/result에서의 ESC 확인 모달은 추후 보강)

import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore.js';

export function useEscapeToHome() {
  const screen = useGameStore((s) => s.screen);
  const resetForReplay = useGameStore((s) => s.resetForReplay);

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (screen === 'home') return;
      resetForReplay();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, resetForReplay]);
}

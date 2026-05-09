// PRD §3.4 / §5.3 — ESC 확인 모달.
// home 화면에서는 무시. intro/play/result 화면에서는 모달을 열고 사용자 확인 후 home 복귀.

import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore.js';

export function useEscapeConfirm() {
  const screen = useGameStore((s) => s.screen);
  const transitionWhite = useGameStore((s) => s.transitionWhite);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (screen === 'home') return;
      // 화면 전환 중에는 무시 (PRD §5.3 fade 중 중복 트리거 방지)
      if (transitionWhite) return;
      setConfirming(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, transitionWhite]);

  // 화면이 home으로 돌아가면 자동으로 모달 닫기
  useEffect(() => {
    if (screen === 'home' && confirming) setConfirming(false);
  }, [screen, confirming]);

  return { confirming, setConfirming };
}

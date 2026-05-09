// PRD §5 — 화면 라우팅.
// Editorial Mode (Home) → Transition (Intro) → Dopamine Mode (Play, Result).
// Intro 단계에서는 Home을 underlay로 두어 PRD §7.1의 "Editorial 위 시그니처 컬러 페이드인" 연출이 자연스럽게 보이도록 함.
// PRD §5.3: ESC 확인 모달 + Dopamine→Editorial 0.6s 흰색 페이드.

import { motion, AnimatePresence } from 'framer-motion';
import HomeScreen from './screens/HomeScreen.jsx';
import IntroScreen from './screens/IntroScreen.jsx';
import PlayScreen from './screens/PlayScreen.jsx';
import ResultScreen from './screens/ResultScreen.jsx';
import ConfirmModal from './components/ConfirmModal.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useEscapeConfirm } from './hooks/useEscapeToHome.js';
import { useGameStore } from './store/useGameStore.js';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const transitionWhite = useGameStore((s) => s.transitionWhite);
  const resetForReplay = useGameStore((s) => s.resetForReplay);
  const fadeToHome = useGameStore((s) => s.fadeToHome);

  const { confirming, setConfirming } = useEscapeConfirm();

  // Intro에서는 Home이 underlay로 보여야 시그니처 컬러 페이드인 연출이 자연스러움.
  const showHome = screen === 'home' || screen === 'intro';

  return (
    <>
      {showHome && <HomeScreen />}
      {screen === 'intro' && <IntroScreen />}
      {screen === 'play' && (
        <ErrorBoundary>
          <PlayScreen />
        </ErrorBoundary>
      )}
      {screen === 'result' && (
        <ErrorBoundary>
          <ResultScreen />
        </ErrorBoundary>
      )}

      {/* Dopamine → Editorial 흰색 페이드 (z-index는 모달보다 낮게) */}
      <AnimatePresence>
        {transitionWhite && (
          <motion.div
            key="transition-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[55] bg-canvas pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* ESC 확인 모달 */}
      <ConfirmModal
        open={confirming}
        title="메인으로 돌아갈까요?"
        message="진행 중인 게임은 취소되고 결과는 저장되지 않습니다."
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          // result 화면이라면 페이드를, 그 외(intro/play)는 즉시 복귀.
          if (screen === 'result') {
            fadeToHome(resetForReplay);
          } else {
            resetForReplay();
          }
        }}
      />
    </>
  );
}

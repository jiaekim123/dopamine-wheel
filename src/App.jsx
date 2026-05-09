// PRD §5 — 화면 라우팅.
// Editorial Mode (Home) → Transition (Intro) → Dopamine Mode (Play, Result).
// Intro 단계에서는 Home을 underlay로 두어 PRD §7.1의 "Editorial 위 시그니처 컬러 페이드인" 연출이 자연스럽게 보이도록 함.

import HomeScreen from './screens/HomeScreen.jsx';
import IntroScreen from './screens/IntroScreen.jsx';
import PlayScreen from './screens/PlayScreen.jsx';
import ResultScreen from './screens/ResultScreen.jsx';
import { useEscapeToHome } from './hooks/useEscapeToHome.js';
import { useGameStore } from './store/useGameStore.js';

export default function App() {
  // ESC로 Home 복귀 (PRD §5.3)
  useEscapeToHome();

  const screen = useGameStore((s) => s.screen);

  // Intro에서는 Home이 underlay로 보여야 시그니처 컬러 페이드인 연출이 자연스러움.
  const showHome = screen === 'home' || screen === 'intro';

  return (
    <>
      {showHome && <HomeScreen />}
      {screen === 'intro' && <IntroScreen />}
      {screen === 'play' && <PlayScreen />}
      {screen === 'result' && <ResultScreen />}
    </>
  );
}

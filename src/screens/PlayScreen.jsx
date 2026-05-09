// PRD §7 — 게임별 Dopamine Mode 진행 화면. selectedGame에 따라 라우팅.
// Phase 6: React.lazy로 4게임을 코드 분리. 메인 번들에서 matter.js 분리되어 초기 로딩 단축.

import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore.js';
import { getGameById } from '../lib/games.js';
import { SIGNATURE_BY_GAME } from '../lib/theme.js';

// 게임별 lazy import — 사용자가 해당 카드를 누른 시점에만 모듈 로드.
// 로또/룰렛은 matter.js를 사용하므로 별도 청크로 분리되는 효과가 가장 크다.
const HorseRaceGame = lazy(() => import('../games/horseRace/HorseRaceGame.jsx'));
const LottoGame = lazy(() => import('../games/lotto/LottoGame.jsx'));
const BombGame = lazy(() => import('../games/bomb/BombGame.jsx'));
const RouletteGame = lazy(() => import('../games/roulette/RouletteGame.jsx'));

export default function PlayScreen() {
  const selectedGame = useGameStore((s) => s.selectedGame);

  return (
    <Suspense fallback={<GameLoadingFallback />}>
      {selectedGame === 'horse' && <HorseRaceGame />}
      {selectedGame === 'lotto' && <LottoGame />}
      {selectedGame === 'bomb' && <BombGame />}
      {selectedGame === 'roulette' && <RouletteGame />}
      {!['horse', 'lotto', 'bomb', 'roulette'].includes(selectedGame) && <UnknownGame />}
    </Suspense>
  );
}

// 게임 청크 로딩 중 표시 — Dopamine Mode 톤, 시그니처 컬러 펄스.
function GameLoadingFallback() {
  const selectedGame = useGameStore((s) => s.selectedGame);
  const game = getGameById(selectedGame);
  const sig = SIGNATURE_BY_GAME[selectedGame] ?? '#181d26';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-dark-base text-on-dark flex flex-col items-center justify-center px-xxl"
    >
      <div className="text-[64px] leading-none mb-md" aria-hidden="true">
        {game?.emoji ?? '🎮'}
      </div>
      <p className="text-body-md text-on-dark/60">{game?.name ?? '게임'} 로딩 중…</p>
      <div className="mt-xl flex gap-sm" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: sig }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

function UnknownGame() {
  return (
    <div className="fixed inset-0 z-40 bg-dark-base text-on-dark flex items-center justify-center">
      <p className="text-body-md text-on-dark/70">선택된 게임이 없습니다.</p>
    </div>
  );
}

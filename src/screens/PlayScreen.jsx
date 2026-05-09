// PRD §7 — 게임별 Dopamine Mode 진행 화면. selectedGame에 따라 라우팅.
// 미구현 게임은 Phase 3-1 stub (mock rankings)으로 흐름만 검증.

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore.js';
import { shuffle } from '../lib/random.js';
import { getGameById } from '../lib/games.js';
import { SIGNATURE_BY_GAME } from '../lib/theme.js';
import HorseRaceGame from '../games/horseRace/HorseRaceGame.jsx';
import LottoGame from '../games/lotto/LottoGame.jsx';

const STUB_DURATION_MS = 2200;

export default function PlayScreen() {
  const selectedGame = useGameStore((s) => s.selectedGame);

  if (selectedGame === 'horse') return <HorseRaceGame />;
  if (selectedGame === 'lotto') return <LottoGame />;
  // Phase 4에서 bomb / roulette 추가 예정
  return <StubGame />;
}

function StubGame() {
  const participants = useGameStore((s) => s.participants);
  const selectedGame = useGameStore((s) => s.selectedGame);
  const finishGame = useGameStore((s) => s.finishGame);
  const game = getGameById(selectedGame);
  const sig = SIGNATURE_BY_GAME[selectedGame] ?? '#181d26';

  useEffect(() => {
    if (participants.length < 2) return;
    const timer = setTimeout(() => {
      const shuffled = shuffle([...participants]);
      const rankings = shuffled.map((p, i) => ({ ...p, rank: i + 1 }));
      finishGame(rankings);
    }, STUB_DURATION_MS);
    return () => clearTimeout(timer);
  }, [participants, finishGame]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-40 bg-dark-base text-on-dark flex flex-col items-center justify-center px-xxl"
    >
      <div className="text-[96px] leading-none mb-md" aria-hidden="true">
        {game?.emoji ?? '🎮'}
      </div>
      <h2 className="text-display-md font-normal mb-xs text-center">{game?.name ?? '게임'}</h2>
      <p className="text-body-md text-on-dark/60 text-center max-w-[480px]">
        Phase 3-3 / Phase 4에서 게임별 본 화면이 등장합니다.
      </p>

      <div className="mt-xxl flex gap-sm" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: sig }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: 1.0, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// PRD §7.1 — 공통 인트로 시퀀스 (Transition Mode, 총 3.5초).
// 0.0~0.5s: Editorial 위로 시그니처 컬러 오버레이 페이드인 (0→0.85)
// 0.5~1.0s: 시그니처 → 다크 베이스 #0d1218
// 1.0~3.0s: 카운트다운 3 → 2 → 1 (각 0.7s, 줌인)
// 3.0~3.3s: GO! 플래시 (시그니처 + 화이트)
// 3.3~3.5s: 자동으로 play 화면 전환

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore.js';
import { getGameById } from '../lib/games.js';
import { SIGNATURE_BY_GAME } from '../lib/theme.js';

const PHASES = [
  { key: 'sig', startMs: 0 },
  { key: 'dark', startMs: 500 },
  { key: '3', startMs: 1000 },
  { key: '2', startMs: 1700 },
  { key: '1', startMs: 2400 },
  { key: 'go', startMs: 3000 },
  { key: 'done', startMs: 3500 },
];

export default function IntroScreen() {
  const selectedGame = useGameStore((s) => s.selectedGame);
  const setScreen = useGameStore((s) => s.setScreen);
  const game = getGameById(selectedGame);
  const sig = SIGNATURE_BY_GAME[selectedGame] ?? '#181d26';

  const [phase, setPhase] = useState('sig');

  useEffect(() => {
    const timers = PHASES.slice(1).map(({ key, startMs }) =>
      setTimeout(() => {
        if (key === 'done') setScreen('play');
        else setPhase(key);
      }, startMs)
    );
    return () => timers.forEach(clearTimeout);
  }, [setScreen]);

  const bgColor = phase === 'sig' ? sig : '#0d1218';
  const bgOpacity = phase === 'sig' ? 0.85 : 1;
  const isCount = phase === '3' || phase === '2' || phase === '1';

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" aria-live="assertive">
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: bgOpacity, backgroundColor: bgColor }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ backgroundColor: bgColor }}
      />

      <div className="relative z-10 h-full flex items-center justify-center px-xxl">
        <AnimatePresence mode="popLayout">
          {isCount && (
            <motion.div
              key={phase}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-on-dark font-medium select-none"
              style={{ fontSize: 'clamp(180px, 30vw, 360px)', lineHeight: 1 }}
            >
              {phase}
            </motion.div>
          )}
          {phase === 'go' && (
            <motion.div
              key="go"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="font-medium tracking-wide select-none"
              style={{
                color: '#ffffff',
                fontSize: 'clamp(120px, 22vw, 280px)',
                lineHeight: 1,
                textShadow: `0 0 80px ${sig}, 0 0 160px ${sig}`,
              }}
            >
              GO!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* GO 플래시 — WCAG 1초당 1회 보장 */}
      {phase === 'go' && (
        <motion.div
          className="absolute inset-0 bg-white pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.55, 0] }}
          transition={{ duration: 0.3 }}
        />
      )}

      {game && phase !== 'go' && (
        <div className="absolute bottom-section left-1/2 -translate-x-1/2 text-on-dark/70 text-center pointer-events-none">
          <div className="text-[40px] leading-none" aria-hidden="true">
            {game.emoji}
          </div>
          <div className="font-medium tracking-tight mt-xs text-title-md">{game.name}</div>
        </div>
      )}
    </div>
  );
}

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

  // v1.5 PRD §7.1.1 — 폭탄은 시그니처 컬러 = #181d26 ≈ 다크 베이스이므로
  // 별도 Coral 글로우 + 도화선 보강 레이어를 적용.
  const isBomb = selectedGame === 'bomb';
  const bgColor = phase === 'sig' && !isBomb ? sig : '#0d1218';
  const bgOpacity = phase === 'sig' && !isBomb ? 0.85 : 1;
  const isCount = phase === '3' || phase === '2' || phase === '1';
  // 폭탄 특수 레이어 표시 단계
  const showBombIntro = isBomb && (phase === 'sig' || phase === 'dark');
  const bombGlowOpacity = isBomb && phase === 'sig' ? 0.85 : 0;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" aria-live="assertive">
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: bgOpacity, backgroundColor: bgColor }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ backgroundColor: bgColor }}
      />

      {/* v1.5 §7.1.1 — 폭탄 인트로 보강: Coral 글로우 + 큰 도화선 불꽃 */}
      {showBombIntro && (
        <motion.div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: bombGlowOpacity }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            background:
              'radial-gradient(circle at center, rgba(170, 45, 0, 0.55) 0%, rgba(170, 45, 0, 0.18) 35%, transparent 70%)',
          }}
        >
          <div className="flex flex-col items-center">
            {/* 큰 도화선 + 불꽃 — sig 단계에서 등장, dark에서 짧아짐 */}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: phase === 'sig' ? 80 : 20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative"
              style={{ width: '4px', backgroundColor: '#aa2d00' }}
            >
              <motion.div
                className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full"
                style={{
                  width: '14px',
                  height: '14px',
                  backgroundColor: '#ffd700',
                  filter: 'drop-shadow(0 0 16px #ffd700)',
                }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.4, repeat: Infinity }}
              />
            </motion.div>
            {/* 폭탄 본체 */}
            <div
              className="leading-none mt-xs"
              style={{
                fontSize: 'clamp(96px, 18vw, 240px)',
                filter: 'drop-shadow(0 0 32px rgba(170, 45, 0, 0.8))',
              }}
              aria-hidden="true"
            >
              💣
            </div>
          </div>
        </motion.div>
      )}

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

// PRD §8 — 결과 화면 (Dopamine Mode).
// 헤드라인은 당첨 방식별로 분기 (§8.1). k별 그리드 레이아웃 (§8.2).
// 등장 순서는 §8.3, 컨페티는 시그니처 팔레트 (§8.4 + §10.10).
// 액션 버튼: 게임 다시 / 다시 하기(Primary) / 처음으로(Secondary) (§8.5).

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/useGameStore.js';
import { getGameById } from '../lib/games.js';
import {
  SIGNATURE_BY_GAME,
  ACCENTS,
  CONFETTI_PALETTE,
  textOnBg,
  medalFor,
} from '../lib/theme.js';

function buildHeadline(mode, ranks) {
  if (mode === 'first') return '🎉 당첨자가 결정되었습니다! 🎉';
  if (mode === 'last') return '🎯 운명의 마지막 ' + (ranks?.length ?? '') + '명! 🎯';
  const sorted = [...(ranks ?? [])].sort((a, b) => a - b);
  return `🎲 ${sorted.join('·')}등 당첨자입니다! 🎲`;
}

// PRD §8.2 — k별 그리드.
function gridClassFor(k) {
  if (k === 1) return 'grid-cols-1';
  if (k === 2) return 'grid-cols-2';
  if (k === 3) return 'grid-cols-3';
  if (k === 4) return 'grid-cols-2';
  if (k <= 6) return 'grid-cols-3';
  if (k <= 12) return 'grid-cols-4';
  return 'grid-cols-4'; // 13+: 폰트 자동 축소 (스크롤은 부모에서)
}

// 등장 순서 정렬 (§8.3).
function orderedWinners(winners, mode) {
  if (!winners?.length) return [];
  if (mode === 'last') {
    // 마지막에 결정된 사람(=rank가 가장 큰 사람)이 가장 먼저 등장.
    return [...winners].sort((a, b) => b.rank - a.rank);
  }
  return [...winners].sort((a, b) => a.rank - b.rank);
}

export default function ResultScreen() {
  const gameResult = useGameStore((s) => s.gameResult);
  const selectedGame = useGameStore((s) => s.selectedGame);
  const winnerMode = useGameStore((s) => s.winnerMode);
  const winnerRanks = useGameStore((s) => s.winnerRanks);
  const replayGame = useGameStore((s) => s.replayGame);
  const resetForReplay = useGameStore((s) => s.resetForReplay);
  const resetParticipants = useGameStore((s) => s.resetParticipants);

  const sig = SIGNATURE_BY_GAME[selectedGame] ?? '#181d26';
  const game = getGameById(selectedGame);

  const winners = useMemo(
    () => orderedWinners(gameResult?.winners ?? [], winnerMode),
    [gameResult, winnerMode]
  );

  // 컨페티 — 시그니처 팔레트, 3초간. 항상 Full 강도.
  useEffect(() => {
    const end = Date.now() + 3000;

    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.55 },
      colors: CONFETTI_PALETTE,
    });

    let raf = 0;
    const tick = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors: CONFETTI_PALETTE,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors: CONFETTI_PALETTE,
      });
      if (Date.now() < end) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!gameResult || winners.length === 0) {
    return (
      <div className="fixed inset-0 z-40 bg-dark-base text-on-dark flex items-center justify-center px-xxl">
        <p className="text-body-md text-on-dark/70">결과를 불러오는 중…</p>
      </div>
    );
  }

  const k = winners.length;
  const isSingle = k === 1;
  const radiusClass = isSingle ? 'rounded-lg' : 'rounded-md';
  const padClass = isSingle ? 'p-xxl' : 'p-xl';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-40 bg-dark-base text-on-dark overflow-y-auto"
    >
      {/* 시그니처 컬러 펄스 */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, ${sig}33 0%, transparent 70%)` }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative min-h-full max-w-[1280px] mx-auto px-xxl py-section flex flex-col">
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-display-xl font-medium text-center mb-xxl"
        >
          {buildHeadline(winnerMode, winnerRanks)}
        </motion.h1>

        {/* 게임 표시 */}
        {game && (
          <p className="text-center text-on-dark/60 text-caption mb-xxl">
            {game.emoji} {game.name}
          </p>
        )}

        {/* Winners grid */}
        <div className={`grid gap-lg ${gridClassFor(k)} ${k > 12 ? 'overflow-x-auto' : ''}`}>
          {winners.map((w, i) => {
            // 1등은 게임 시그니처 컬러, 2등 이후는 보조 톤 순환.
            const bg = i === 0 ? sig : ACCENTS[(i - 1) % ACCENTS.length];
            const fg = textOnBg(bg);
            const medal = medalFor(w.rank);

            return (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, scale: 0.8, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.4, duration: 0.5, ease: 'easeOut' }}
                className={`relative ${radiusClass} ${padClass} flex flex-col items-center justify-center`}
                style={{
                  backgroundColor: bg,
                  color: fg,
                  minHeight: isSingle ? '40vh' : '180px',
                }}
              >
                {/* 메달 배지 */}
                <div
                  className="absolute top-md left-md rounded-full px-sm py-xxs flex items-center gap-xxs text-caption font-medium"
                  style={{ backgroundColor: medal.color, color: '#181d26' }}
                >
                  {medal.label && <span aria-hidden="true">{medal.label}</span>}
                  <span>{w.rank}등</span>
                </div>

                <div
                  className="leading-none mb-md"
                  style={{ fontSize: isSingle ? 'clamp(96px, 14vw, 168px)' : '72px' }}
                  aria-hidden="true"
                >
                  {w.emoji}
                </div>

                <div
                  className="font-marquee text-center break-keep px-sm"
                  style={{
                    fontSize: isSingle
                      ? 'clamp(32px, 5vw, 56px)'
                      : k <= 6
                          ? '24px'
                          : k <= 12
                              ? '20px'
                              : '16px',
                    letterSpacing: '0.02em',
                  }}
                >
                  {w.displayName}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 액션 버튼 */}
        <div className="mt-section flex flex-wrap gap-md justify-center">
          <button
            type="button"
            onClick={replayGame}
            className="px-lg py-md rounded-lg bg-canvas/0 border border-on-dark/40 text-on-dark text-button font-medium hover:bg-on-dark/10 transition-colors focus:outline-none focus-visible:shadow-focus-ring"
          >
            게임 다시
          </button>
          <button
            type="button"
            onClick={resetForReplay}
            className="px-lg py-md rounded-lg bg-canvas text-ink text-button font-medium hover:bg-surface-soft transition-colors focus:outline-none focus-visible:shadow-focus-ring"
          >
            다시 하기
          </button>
          <button
            type="button"
            onClick={resetParticipants}
            className="px-lg py-md rounded-lg bg-canvas/0 border border-on-dark/40 text-on-dark text-button font-medium hover:bg-on-dark/10 transition-colors focus:outline-none focus-visible:shadow-focus-ring"
          >
            처음으로
          </button>
        </div>
      </div>
    </motion.div>
  );
}

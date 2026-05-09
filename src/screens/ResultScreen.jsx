// PRD §8 — 결과 화면 (Dopamine Mode).
// 헤드라인은 당첨 방식별로 분기 (§8.1). k별 그리드 레이아웃 (§8.2).
// 등장 순서는 §8.3, 컨페티는 시그니처 팔레트 (§8.4 + §10.10).
// 액션 버튼 (v1.4.2): 다시 하기 Primary = 같은 게임 즉시 재실행 / 처음으로 Secondary = 이름 유지 + 게임 선택 페이지 (§8.5).

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

// PRD §8.1 헤드라인. last 모드는 winnerCount(k)를 사용해야 함 (winnerRanks는 custom 모드에서만 채워짐).
function buildHeadline(mode, winnerCount, ranks) {
  if (mode === 'first') return '🎉 당첨자가 결정되었습니다! 🎉';
  if (mode === 'last') return `🎯 운명의 마지막 ${winnerCount}명! 🎯`;
  const sorted = [...(ranks ?? [])].sort((a, b) => a - b);
  return `🎲 ${sorted.join('·')}등 당첨자입니다! 🎲`;
}

// 단일 winner 박스 — size별로 hero / normal / compact 분기.
// hero: 풀사이즈 (k=1 단일 또는 13+ 헤드라이너)
// normal: 그리드 안 (k=2..12)
// compact: 가로 스크롤 안 (k>=13의 2등 이하)
function WinnerBox({ w, i, sig, size, k }) {
  const bg = i === 0 ? sig : ACCENTS[(i - 1) % ACCENTS.length];
  const fg = textOnBg(bg);
  const medal = medalFor(w.rank);

  const radius = size === 'compact' ? 'rounded-md' : size === 'hero' ? 'rounded-lg' : 'rounded-md';
  const pad = size === 'hero' ? 'p-xxl' : size === 'compact' ? 'p-md' : 'p-xl';
  const minH = size === 'hero' ? '40vh' : size === 'compact' ? '160px' : '180px';

  const emojiSize =
    size === 'hero'
      ? 'clamp(96px, 14vw, 168px)'
      : size === 'compact'
          ? '48px'
          : '72px';

  let nameSize;
  if (size === 'hero') nameSize = 'clamp(32px, 5vw, 56px)';
  else if (size === 'compact') nameSize = '14px';
  else nameSize = k <= 6 ? '24px' : '20px';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.25, 2.5), duration: 0.45, ease: 'easeOut' }}
      className={`relative ${radius} ${pad} flex flex-col items-center justify-center w-full h-full`}
      style={{ backgroundColor: bg, color: fg, minHeight: minH }}
    >
      <div
        className="absolute top-md left-md rounded-full px-sm py-xxs flex items-center gap-xxs text-caption font-medium"
        style={{ backgroundColor: medal.color, color: '#181d26' }}
      >
        {medal.label && <span aria-hidden="true">{medal.label}</span>}
        <span>{w.rank}등</span>
      </div>

      <div className="leading-none mb-md" style={{ fontSize: emojiSize }} aria-hidden="true">
        {w.emoji}
      </div>
      <div
        className="font-marquee text-center break-keep px-sm"
        style={{ fontSize: nameSize, letterSpacing: '0.02em' }}
      >
        {w.displayName}
      </div>
    </motion.div>
  );
}

// PRD §8.2 — k별 그리드 (k <= 12에 한해 적용. 13+는 별도 flex 레이아웃).
function gridClassFor(k) {
  if (k === 1) return 'grid-cols-1';
  if (k === 2) return 'grid-cols-2';
  if (k === 3) return 'grid-cols-3';
  if (k === 4) return 'grid-cols-2';
  if (k <= 6) return 'grid-cols-3';
  return 'grid-cols-4';
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
  const winnerCount = useGameStore((s) => s.winnerCount);
  const winnerRanks = useGameStore((s) => s.winnerRanks);
  const replayGame = useGameStore((s) => s.replayGame);
  // "처음으로"는 게임 상태(gameResult/selectedGame/screen)만 리셋하고
  // 참가자·k·모드·순위는 그대로 유지한다. (사용자 결정: 같은 옵션으로 다른 게임을 이어서 시도)
  const resetForReplay = useGameStore((s) => s.resetForReplay);
  const fadeToHome = useGameStore((s) => s.fadeToHome);

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
      // 다음 화면(Home/Intro)에 잔존 입자가 남지 않도록 캔버스 비우기
      confetti.reset();
    };
  }, []);

  if (!gameResult || winners.length === 0) {
    return (
      <div className="fixed inset-0 z-40 bg-dark-base text-on-dark flex items-center justify-center px-lg md:px-xxl">
        <p className="text-body-md text-on-dark/70">결과를 불러오는 중…</p>
      </div>
    );
  }

  const k = winners.length;
  const isSingle = k === 1;
  const isLarge = k >= 13; // PRD §8.2 — 13+ 가로 스크롤 + 1등만 강조
  const radiusClass = isSingle ? 'rounded-lg' : 'rounded-md';
  const padClass = isSingle ? 'p-xxl' : 'p-xl';

  // 1등(또는 랭크 가장 작은 winner)을 분리해 강조하기 위한 helper.
  const headliner = winners[0];
  const tail = winners.slice(1);

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

      <div className="relative min-h-full max-w-[1280px] mx-auto px-lg md:px-xxl py-xxl md:py-section flex flex-col">
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-display-xl font-medium text-center mb-xxl"
        >
          {buildHeadline(winnerMode, winnerCount, winnerRanks)}
        </motion.h1>

        {/* 게임 표시 */}
        {game && (
          <p className="text-center text-on-dark/60 text-caption mb-xxl">
            {game.emoji} {game.name}
          </p>
        )}

        {/* Winners — k별 레이아웃 분기 (PRD §8.2) */}
        {isLarge ? (
          <div className="flex flex-col gap-xl">
            {/* 1등 강조 박스 */}
            <WinnerBox
              w={headliner}
              i={0}
              sig={sig}
              size="hero"
              k={k}
            />
            {/* 2등~k등 가로 스크롤 */}
            <div
              className="flex gap-md overflow-x-auto pb-sm -mx-xs px-xs"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {tail.map((w, idx) => (
                <div
                  key={w.id}
                  className="shrink-0"
                  style={{ width: '180px', scrollSnapAlign: 'start' }}
                >
                  <WinnerBox w={w} i={idx + 1} sig={sig} size="compact" k={k} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`grid gap-lg ${gridClassFor(k)}`}>
            {winners.map((w, i) => (
              <WinnerBox key={w.id} w={w} i={i} sig={sig} size={isSingle ? 'hero' : 'normal'} k={k} />
            ))}
          </div>
        )}

        {/* 액션 버튼 (v1.4.2) */}
        <div className="mt-section flex flex-wrap gap-md justify-center">
          {/* Primary — 같은 게임 즉시 재실행 (페이드 없이 인트로로 직행) */}
          <button
            type="button"
            onClick={replayGame}
            className="px-lg py-md rounded-lg bg-canvas text-ink text-button font-medium hover:bg-surface-soft transition-colors focus:outline-none focus-visible:shadow-focus-ring"
          >
            다시 하기
          </button>
          {/* Secondary — 게임 선택 페이지로 (참가자·k·모드·순위 모두 유지) */}
          <button
            type="button"
            onClick={() => fadeToHome(resetForReplay)}
            className="px-lg py-md rounded-lg bg-canvas/0 border border-on-dark/40 text-on-dark text-button font-medium hover:bg-on-dark/10 transition-colors focus:outline-none focus-visible:shadow-focus-ring"
          >
            처음으로
          </button>
        </div>
      </div>
    </motion.div>
  );
}

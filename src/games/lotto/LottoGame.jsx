// PRD §7.5 — 럭키 로또 (Forest) 게임 화면.
// 다크 베이스 + Forest 톤 챔버 글로우. matter.js 물리로 공이 출구로 빠지는 순서 = rank.
// 공이 튜브에 진입하는 순간 자동 슬로우모션 + 클로즈업 (PRD §7.2).

import { useEffect, useReducer, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore.js';
import {
  createLotto,
  stepLotto,
  getLottoRankings,
  getLottoSnapshot,
  CHAMBER,
} from './simulation.js';
import { ACCENTS } from '../../lib/theme.js';

const COLOR_FOREST = '#0a2e0e';
const COLOR_FOREST_GLOW = 'rgba(10, 46, 14, 0.8)';
const COLOR_FOREST_LINE = '#1f7a3a';
const COLOR_GOLD = '#ffd700';

// 공 색상 — 시그니처 팔레트(coral/peach/mint/yellow/mustard) 순환
const BALL_PALETTE = [
  '#aa2d00', // coral
  '#fcab79', // peach
  '#a8d8c4', // mint
  '#f4d35e', // yellow
  '#d9a441', // mustard
  '#f5e9d4', // cream
];
function ballColor(i) {
  return BALL_PALETTE[i % BALL_PALETTE.length];
}
// 공 위 텍스트 색 — 밝은 배경엔 ink, 어두운 배경엔 화이트
function ballText(i) {
  const dark = ['#aa2d00'];
  return dark.includes(BALL_PALETTE[i % BALL_PALETTE.length]) ? '#ffffff' : '#181d26';
}

const FINISH_HOLD_MS = 1400;

export default function LottoGame() {
  const participants = useGameStore((s) => s.participants);
  const finishGame = useGameStore((s) => s.finishGame);

  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const slowMoRef = useRef(1);
  const finishedRef = useRef(false);

  const [, forceRender] = useReducer((n) => n + 1, 0);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (participants.length < 2) return;
    stateRef.current = createLotto(participants);
    lastTimeRef.current = performance.now();

    function tick(now) {
      const state = stateRef.current;
      if (!state) return;

      let dtRaw = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (dtRaw > 0.05) dtRaw = 0.05;

      // 추출 임박 슬로우모션: 튜브 안에 공이 있고 추출 라인 직전일 때
      let inTube = false;
      for (const entry of state.ballsByLabel.values()) {
        if (entry.extracted) continue;
        const { x, y } = entry.body.position;
        // 튜브 폭 안 + 챔버 하단~추출 라인 직전
        if (
          Math.abs(x - CHAMBER.cx) < CHAMBER.tubeHalfWidth &&
          y > CHAMBER.tubeYTop &&
          y < CHAMBER.extractY
        ) {
          inTube = true;
          break;
        }
      }
      const targetSlow = inTube ? 0.45 : 1.0;
      slowMoRef.current += (targetSlow - slowMoRef.current) * Math.min(1, dtRaw * 6);

      stepLotto(state, dtRaw * slowMoRef.current);
      forceRender();

      if (!state.finished) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!finishedRef.current) {
        finishedRef.current = true;
        setCelebrating(true);
        setTimeout(() => {
          finishGame(getLottoRankings(state));
        }, FINISH_HOLD_MS);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = stateRef.current;
  const balls = state ? getLottoSnapshot(state) : [];
  // id → 인덱스 매핑(공 색상 결정용)
  const idxOf = useRef(new Map());
  if (state && idxOf.current.size === 0) {
    [...state.ballsByLabel.keys()].forEach((id, i) => idxOf.current.set(id, i));
  }

  // 추출된 공 (rank 부여 순서대로)
  const extracted = state ? state.results : [];
  const totalN = state ? state.ballsByLabel.size : participants.length;

  // 챔버 boundary path: 바닥 gap을 제외한 호.
  // gap center = π/2 (아래 방향). gapHalf 18°.
  const gap = CHAMBER.gapHalfAngle;
  const startA = Math.PI / 2 + gap; // gap의 왼쪽 끝
  const endA = Math.PI / 2 - gap; // gap의 오른쪽 끝 (시계반대방향으로 큰 호)
  const sx = CHAMBER.cx + Math.cos(startA) * CHAMBER.radius;
  const sy = CHAMBER.cy + Math.sin(startA) * CHAMBER.radius;
  const ex = CHAMBER.cx + Math.cos(endA) * CHAMBER.radius;
  const ey = CHAMBER.cy + Math.sin(endA) * CHAMBER.radius;
  const arcPath = `M ${sx} ${sy} A ${CHAMBER.radius} ${CHAMBER.radius} 0 1 1 ${ex} ${ey}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-40 bg-dark-base text-on-dark overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-xxl pt-xl pb-md flex items-center justify-between">
        <div className="flex items-center gap-md">
          <span className="text-[36px] leading-none" aria-hidden="true">🎱</span>
          <div>
            <h2 className="text-title-lg font-medium leading-tight">럭키 로또</h2>
            <p className="text-caption text-on-dark/50">Lucky Lotto</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-caption text-on-dark/50">
            추출 <span className="text-on-dark font-medium">{extracted.length}</span> / {totalN}
          </p>
          <p className="text-caption text-on-dark/40">
            {state ? state.elapsed.toFixed(1) : '0.0'}s
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-xl px-xxl pb-xxl min-h-0">
        {/* Chamber + tube SVG */}
        <div className="relative flex-1 min-w-0">
          <svg
            viewBox={`0 0 ${CHAMBER.width} ${CHAMBER.height}`}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Forest glow background ring */}
            <defs>
              <radialGradient id="chamberGlow" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor={COLOR_FOREST_GLOW} stopOpacity="0.6" />
                <stop offset="100%" stopColor={COLOR_FOREST_GLOW} stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect
              x={CHAMBER.cx - CHAMBER.radius * 1.4}
              y={CHAMBER.cy - CHAMBER.radius * 1.4}
              width={CHAMBER.radius * 2.8}
              height={CHAMBER.radius * 2.8}
              fill="url(#chamberGlow)"
            />

            {/* Chamber boundary (open arc) */}
            <path
              d={arcPath}
              fill="none"
              stroke={COLOR_FOREST_LINE}
              strokeWidth={8}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 14px ${COLOR_FOREST_LINE})` }}
            />

            {/* Exit tube */}
            <line
              x1={CHAMBER.cx - CHAMBER.tubeHalfWidth}
              y1={CHAMBER.tubeYTop}
              x2={CHAMBER.cx - CHAMBER.tubeHalfWidth}
              y2={CHAMBER.tubeYBot}
              stroke={COLOR_FOREST_LINE}
              strokeWidth={6}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${COLOR_FOREST_LINE})` }}
            />
            <line
              x1={CHAMBER.cx + CHAMBER.tubeHalfWidth}
              y1={CHAMBER.tubeYTop}
              x2={CHAMBER.cx + CHAMBER.tubeHalfWidth}
              y2={CHAMBER.tubeYBot}
              stroke={COLOR_FOREST_LINE}
              strokeWidth={6}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${COLOR_FOREST_LINE})` }}
            />

            {/* Extract line (visual indicator) */}
            <line
              x1={CHAMBER.cx - CHAMBER.tubeHalfWidth - 16}
              y1={CHAMBER.extractY}
              x2={CHAMBER.cx + CHAMBER.tubeHalfWidth + 16}
              y2={CHAMBER.extractY}
              stroke={COLOR_GOLD}
              strokeWidth={2}
              strokeDasharray="6 6"
              opacity={0.7}
            />

            {/* Balls */}
            {balls.map((b) => {
              const i = idxOf.current.get(b.id) ?? 0;
              const fill = ballColor(i);
              const textC = ballText(i);
              return (
                <g key={b.id} transform={`translate(${b.x} ${b.y}) rotate(${(b.angle * 180) / Math.PI})`}>
                  <circle
                    r={CHAMBER.ballRadius}
                    fill={fill}
                    stroke="#ffffff"
                    strokeOpacity={0.25}
                    strokeWidth={1.5}
                  />
                  <text
                    y={-2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={CHAMBER.ballRadius * 0.95}
                    style={{ userSelect: 'none' }}
                  >
                    {b.emoji}
                  </text>
                  <text
                    y={CHAMBER.ballRadius * 0.55}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={9}
                    fontWeight={500}
                    fill={textC}
                    style={{ userSelect: 'none' }}
                  >
                    {b.displayName.length > 5 ? b.displayName.slice(0, 4) + '…' : b.displayName}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* 추출 순서 보드 */}
        <div className="w-[260px] shrink-0 flex flex-col">
          <div className="text-caption text-on-dark/50 mb-sm uppercase tracking-wider">
            추출 순서
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-xxs flex flex-col gap-xs">
            {extracted.length === 0 && (
              <p className="text-body-md text-on-dark/40">곧 첫 공이 나옵니다…</p>
            )}
            {extracted.map((entry, idx) => {
              const i = idxOf.current.get(entry.participant.id) ?? 0;
              const isLatest = idx === extracted.length - 1;
              return (
                <motion.div
                  key={entry.participant.id}
                  initial={{ opacity: 0, x: 30, scale: isLatest ? 1.2 : 1 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="flex items-center gap-sm rounded-md px-sm py-xs"
                  style={{
                    backgroundColor: isLatest ? `${ballColor(i)}33` : 'rgba(255,255,255,0.04)',
                    border: isLatest
                      ? `1px solid ${ballColor(i)}`
                      : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center font-medium text-body-md"
                    style={{
                      backgroundColor: ballColor(i),
                      color: ballText(i),
                    }}
                  >
                    {entry.rank}
                  </span>
                  <span className="text-[18px] leading-none" aria-hidden="true">
                    {entry.participant.emoji}
                  </span>
                  <span className="text-body-md text-on-dark truncate">
                    {entry.participant.displayName}
                  </span>
                </motion.div>
              );
            })}
          </div>
          {celebrating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-md text-caption text-center font-medium"
              style={{ color: COLOR_GOLD }}
            >
              ✨ 추첨 완료
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

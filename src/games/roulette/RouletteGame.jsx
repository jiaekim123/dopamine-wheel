// PRD §7.7 — 운명의 낙하 (Mustard) 게임 화면.
// 다크 베이스 + Mustard 못 글로우 + 시그니처 팔레트 칸 그라데이션.
// 첫 공이 빠지는 순간 자동 슬로우모션 + 칸 강조 (PRD §7.2).

import { useEffect, useReducer, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore.js';
import {
  createRoulette,
  stepRoulette,
  getRouletteRankings,
  getRouletteSnapshot,
  ROULETTE,
} from './simulation.js';
import CasterCaption from '../../components/CasterCaption.jsx';

const COLOR_MUSTARD = '#946d12';
const COLOR_GOLD = '#ffd700';

// 공 색상 — 시그니처 팔레트 순환
const BALL_PALETTE = [
  '#aa2d00', // coral
  '#fcab79', // peach
  '#a8d8c4', // mint
  '#f4d35e', // yellow
  '#946d12', // mustard
  '#f5e9d4', // cream
];
const ON_DARK_BALL = new Set(['#aa2d00']);

function ballColor(i) {
  return BALL_PALETTE[i % BALL_PALETTE.length];
}
function ballText(i) {
  return ON_DARK_BALL.has(ballColor(i)) ? '#ffffff' : '#181d26';
}

// 바닥 칸 색 — peach/mint/yellow/mustard 순환
const BIN_PALETTE = ['#fcab79', '#a8d8c4', '#f4d35e', '#946d12'];
const BIN_COUNT = 8;

const FINISH_HOLD_MS = 1400;

export default function RouletteGame() {
  const participants = useGameStore((s) => s.participants);
  const finishGame = useGameStore((s) => s.finishGame);

  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const slowMoRef = useRef(1);
  const finishedRef = useRef(false);

  const [, forceRender] = useReducer((n) => n + 1, 0);
  const [highlightBin, setHighlightBin] = useState(null);
  // v1.5 캐스터 캡션
  const [caption, setCaption] = useState(null);
  const lastResultLenRef = useRef(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (participants.length < 2) return;
    stateRef.current = createRoulette(participants);
    lastTimeRef.current = performance.now();

    function tick(now) {
      const state = stateRef.current;
      if (!state) return;

      let dtRaw = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (dtRaw > 0.05) dtRaw = 0.05;

      // 첫 공이 exit 직전(예: y > 800 && y < exitY)일 때 슬로우모션
      let nearExit = false;
      if (state.results.length === 0) {
        for (const entry of state.ballsByLabel.values()) {
          if (!entry.added || entry.exited) continue;
          if (entry.body.position.y > ROULETTE.pegFieldBottom) {
            nearExit = true;
            break;
          }
        }
      }
      const targetSlow = nearExit ? 0.5 : 1.0;
      slowMoRef.current += (targetSlow - slowMoRef.current) * Math.min(1, dtRaw * 6);

      const prevResultsLen = state.results.length;
      stepRoulette(state, dtRaw * slowMoRef.current);

      // 새 공이 exit 했으면 빠진 X 위치로 빈 강조 + 캡션
      if (state.results.length > prevResultsLen) {
        const last = state.results[state.results.length - 1];
        const x = last.body?.position?.x ?? ROULETTE.width / 2;
        const binIdx = Math.min(BIN_COUNT - 1, Math.max(0, Math.floor((x / ROULETTE.width) * BIN_COUNT)));
        setHighlightBin(binIdx);
        setTimeout(() => setHighlightBin(null), 600);
        setCaption(`${last.rank}등 — ${last.participant.displayName}`);
        lastResultLenRef.current = state.results.length;
      }

      // v1.5 시작 캡션
      if (!startedRef.current && state.elapsed > 0.4) {
        startedRef.current = true;
        setCaption('🪂 낙하 시작!');
      }

      forceRender();

      if (!state.finished) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!finishedRef.current) {
        finishedRef.current = true;
        setTimeout(() => finishGame(getRouletteRankings(state)), FINISH_HOLD_MS);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = stateRef.current;
  const balls = state ? getRouletteSnapshot(state) : [];
  const totalN = state ? state.n : participants.length;
  const extracted = state ? state.results : [];

  // id → 인덱스 매핑(공 색상)
  const idxOf = useRef(new Map());
  if (state && idxOf.current.size === 0) {
    [...state.ballsByLabel.keys()].forEach((id, i) => idxOf.current.set(id, i));
  }

  const binWidth = ROULETTE.width / BIN_COUNT;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-40 bg-dark-base text-on-dark overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-lg md:px-xxl pt-xl pb-md flex items-center justify-between">
        <div className="flex items-center gap-md">
          <span className="text-[36px] leading-none" aria-hidden="true">🪂</span>
          <div>
            <h2 className="text-title-lg font-medium leading-tight">운명의 낙하</h2>
            <p className="text-caption text-on-dark/50">Falling Fate</p>
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

      <div className="flex-1 flex flex-col md:flex-row gap-md md:gap-xl px-lg md:px-xxl pb-xxl min-h-0">
        {/* 룰렛 보드 */}
        <div className="relative flex-1 min-w-0 flex items-center justify-center">
          <svg
            viewBox={`0 0 ${ROULETTE.width} ${ROULETTE.height}`}
            className="h-full max-h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <radialGradient id="rouletteGlow" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor={COLOR_MUSTARD} stopOpacity="0.18" />
                <stop offset="100%" stopColor={COLOR_MUSTARD} stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 후광 */}
            <rect x={0} y={0} width={ROULETTE.width} height={ROULETTE.height} fill="url(#rouletteGlow)" />

            {/* 좌·우 벽 (시각) */}
            <rect
              x={0}
              y={0}
              width={ROULETTE.wallThickness}
              height={ROULETTE.height}
              fill="#1d1f25"
            />
            <rect
              x={ROULETTE.width - ROULETTE.wallThickness}
              y={0}
              width={ROULETTE.wallThickness}
              height={ROULETTE.height}
              fill="#1d1f25"
            />

            {/* 못 */}
            {state?.pegPositions.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={ROULETTE.pegRadius}
                fill={COLOR_MUSTARD}
                style={{ filter: `drop-shadow(0 0 4px ${COLOR_MUSTARD})` }}
              />
            ))}

            {/* v2 V6 — 점프대 (Mustard 강조) */}
            {state?.jumpers?.map((j, idx) => (
              <g
                key={`jumper-${idx}`}
                transform={`translate(${j.x} ${j.y}) rotate(${(j.angle * 180) / Math.PI})`}
              >
                <rect
                  x={-j.length / 2}
                  y={-3}
                  width={j.length}
                  height={6}
                  rx={3}
                  fill={COLOR_MUSTARD}
                  style={{ filter: `drop-shadow(0 0 10px ${COLOR_MUSTARD})` }}
                />
                {/* 양 끝에 작은 캡 */}
                <circle cx={-j.length / 2} cy={0} r={4} fill={COLOR_GOLD} />
                <circle cx={j.length / 2} cy={0} r={4} fill={COLOR_GOLD} />
              </g>
            ))}

            {/* 바닥 칸 그라데이션 */}
            {Array.from({ length: BIN_COUNT }).map((_, i) => (
              <rect
                key={i}
                x={i * binWidth}
                y={ROULETTE.pegFieldBottom + 30}
                width={binWidth}
                height={ROULETTE.height - ROULETTE.pegFieldBottom - 30}
                fill={BIN_PALETTE[i % BIN_PALETTE.length]}
                opacity={highlightBin === i ? 0.9 : 0.45}
                style={
                  highlightBin === i
                    ? { filter: `drop-shadow(0 -4px 16px ${BIN_PALETTE[i % BIN_PALETTE.length]})` }
                    : undefined
                }
              />
            ))}
            {/* 칸 분리선 */}
            {Array.from({ length: BIN_COUNT - 1 }).map((_, i) => (
              <line
                key={`sep${i}`}
                x1={(i + 1) * binWidth}
                y1={ROULETTE.pegFieldBottom + 30}
                x2={(i + 1) * binWidth}
                y2={ROULETTE.height}
                stroke="#181d26"
                strokeWidth={2}
                opacity={0.6}
              />
            ))}

            {/* 공 — v1.5: 인원별 ballRadius + 이름 표시 정책 */}
            {balls.map((b) => {
              const i = idxOf.current.get(b.id) ?? 0;
              const fill = ballColor(i);
              const textC = ballText(i);
              const cfg = state?.ballConfig ?? { ballRadius: 13, fontSize: 0, nameCut: 0, showName: false };
              const cutName =
                cfg.showName && b.displayName.length > cfg.nameCut
                  ? b.displayName.slice(0, cfg.nameCut - 1) + '…'
                  : b.displayName;
              return (
                <g
                  key={b.id}
                  transform={`translate(${b.x} ${b.y}) rotate(${(b.angle * 180) / Math.PI})`}
                >
                  <circle
                    r={cfg.ballRadius}
                    fill={fill}
                    stroke="#ffffff"
                    strokeOpacity={0.3}
                    strokeWidth={1.5}
                  />
                  <text
                    textAnchor="middle"
                    y={cfg.showName ? -cfg.ballRadius * 0.18 : 0}
                    dominantBaseline="central"
                    fontSize={cfg.showName ? cfg.ballRadius * 0.88 : cfg.ballRadius * 1.05}
                    style={{ userSelect: 'none' }}
                  >
                    {b.emoji}
                  </text>
                  {cfg.showName && (
                    <text
                      textAnchor="middle"
                      y={cfg.ballRadius * 0.55}
                      dominantBaseline="central"
                      fontSize={cfg.fontSize}
                      fontWeight={500}
                      fill={textC}
                      style={{ userSelect: 'none' }}
                    >
                      {cutName}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* 추출 순서 보드 — 모바일 세로 스택, md+ 우측 사이드바 */}
        <div className="w-full md:w-[260px] shrink-0 flex flex-col max-h-[30vh] md:max-h-none">
          <div className="text-caption text-on-dark/50 mb-sm uppercase tracking-wider">
            추출 순서
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-xxs flex flex-col gap-xs">
            {extracted.length === 0 && (
              <p className="text-body-md text-on-dark/40">곧 첫 공이 빠집니다…</p>
            )}
            {extracted.map((entry, idx) => {
              const i = idxOf.current.get(entry.participant.id) ?? 0;
              const isLatest = idx === extracted.length - 1;
              return (
                <motion.div
                  key={entry.participant.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
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
                    style={{ backgroundColor: ballColor(i), color: ballText(i) }}
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
          {state?.finished && (
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

      {/* v1.5 캐스터 캡션 */}
      <CasterCaption message={caption} />
    </motion.div>
  );
}

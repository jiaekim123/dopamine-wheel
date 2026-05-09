// PRD §7.6 — 폭탄 돌리기 (Surface Dark) 게임 화면.
// 다크 베이스 + Surface Dark 폭탄 + Coral 도화선 + Gold 메달 강조.
// 폭발 시 화면 셰이크 + Coral 플래시. 직접 입력 모드는 노리는 순위 안내.

import { useEffect, useReducer, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore.js';
import { createBomb, stepBomb, getBombRankings } from './simulation.js';
import CasterCaption from '../../components/CasterCaption.jsx';

const COLOR_CORAL = '#aa2d00';
const COLOR_GOLD = '#ffd700';
const COLOR_SURFACE_DARK = '#181d26';

const FINISH_HOLD_MS = 1400;

export default function BombGame() {
  const participants = useGameStore((s) => s.participants);
  const finishGame = useGameStore((s) => s.finishGame);
  const winnerMode = useGameStore((s) => s.winnerMode);
  const winnerRanks = useGameStore((s) => s.winnerRanks);

  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const finishedRef = useRef(false);

  const [, forceRender] = useReducer((n) => n + 1, 0);
  const [shaking, setShaking] = useState(false);
  const [flashing, setFlashing] = useState(false);
  // v1.5 캐스터 캡션
  const [caption, setCaption] = useState(null);
  const lastRoundRef = useRef(-1);
  const lastResultLenRef = useRef(0);
  // v2 중반 이벤트
  const midEventFiredRef = useRef(false);

  useEffect(() => {
    if (participants.length < 2) return;
    stateRef.current = createBomb(participants);
    lastTimeRef.current = performance.now();

    function tick(now) {
      const state = stateRef.current;
      if (!state) return;
      let dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (dt > 0.05) dt = 0.05;

      const wasExploding = state.exploding;
      stepBomb(state, dt);

      // 폭발 시작 프레임 — 화면 셰이크 + 플래시
      if (!wasExploding && state.exploding) {
        setShaking(true);
        setFlashing(true);
        setTimeout(() => setShaking(false), 280);
        setTimeout(() => setFlashing(false), 120);
      }

      // v1.5 캐스터 캡션 트리거
      if (state.currentRound !== lastRoundRef.current) {
        lastRoundRef.current = state.currentRound;
        setCaption(`Round ${state.currentRound + 1} 시작`);
      }
      if (state.results.length > lastResultLenRef.current) {
        const newest = state.results[state.results.length - 1];
        if (newest.rank < state.totalRounds + 1) {
          // 폭사자 캡션
          setCaption(`💥 ${newest.rank}등 — ${newest.displayName}`);
        }
        lastResultLenRef.current = state.results.length;
      }
      // v2 중반 이벤트 (라운드 절반 통과)
      if (state.midEvent.fired && !midEventFiredRef.current) {
        midEventFiredRef.current = true;
        setCaption('⚡ 절반 통과!');
      }

      forceRender();

      if (!state.finished) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!finishedRef.current) {
        finishedRef.current = true;
        setTimeout(() => finishGame(getBombRankings(state)), FINISH_HOLD_MS);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = stateRef.current;
  const n = state?.n ?? participants.length;

  const watchedRanks = winnerMode === 'custom' ? new Set(winnerRanks) : null;

  // 좌표 계산
  const VB = 700;
  const center = VB / 2;
  const seatRadius = VB * 0.36;
  const personRadius = Math.min(48, Math.max(22, (seatRadius * 2 * Math.PI) / n / 2.4));

  function seatPos(seat) {
    const a = (seat / n) * Math.PI * 2 - Math.PI / 2; // 12시 방향 시작
    return {
      x: center + Math.cos(a) * seatRadius,
      y: center + Math.sin(a) * seatRadius,
    };
  }

  // 폭탄 위치 — prev → current 보간
  let bombX = center;
  let bombY = center;
  if (state && !state.exploding) {
    const a = seatPos(state.bombSeat);
    const b = seatPos(state.prevBombSeat);
    const t = state.passProgress;
    bombX = b.x + (a.x - b.x) * t;
    bombY = b.y + (a.y - b.y) * t;
  } else if (state && state.exploding) {
    const a = seatPos(state.lastExplodedSeat ?? 0);
    bombX = a.x;
    bombY = a.y;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        x: shaking ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
        y: shaking ? [0, 4, -4, 2, -2, 1, -1, 0] : 0,
      }}
      transition={{ duration: shaking ? 0.28 : 0.3 }}
      className="fixed inset-0 z-40 bg-dark-base text-on-dark overflow-hidden flex flex-col"
    >
      {/* 폭발 플래시 */}
      {flashing && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{ backgroundColor: '#ffffff', opacity: 0.45, mixBlendMode: 'screen' }}
        />
      )}

      {/* Header */}
      <div className="px-lg md:px-xxl pt-xl pb-md flex items-center justify-between">
        <div className="flex items-center gap-md">
          <span className="text-[36px] leading-none" aria-hidden="true">💣</span>
          <div>
            <h2 className="text-title-lg font-medium leading-tight">폭탄 돌리기</h2>
            <p className="text-caption text-on-dark/50">Time Bomb</p>
          </div>
        </div>
        <div className="text-right">
          <p
            className="text-caption text-on-dark/50"
            style={
              state?.midEvent?.fired && state.elapsed < state.midEvent.flashUntil
                ? { color: COLOR_GOLD, transition: 'color 0.3s' }
                : undefined
            }
          >
            라운드{' '}
            <span className="text-on-dark font-medium">{(state?.currentRound ?? 0) + 1}</span>
            {' / '}
            {state?.totalRounds ?? Math.max(1, n - 1)}
          </p>
          <p className="text-caption text-on-dark/40">
            {state ? state.elapsed.toFixed(1) : '0.0'}s
          </p>
        </div>
      </div>

      {/* 직접 입력 모드 안내 */}
      {watchedRanks && (
        <div className="px-lg md:px-xxl pb-sm">
          <p className="text-caption text-on-dark/60">
            노리는 순위:{' '}
            <span style={{ color: COLOR_CORAL }} className="font-medium">
              {[...winnerRanks].sort((a, b) => a - b).join('·')}등
            </span>
          </p>
        </div>
      )}

      {/* Circle area */}
      <div className="flex-1 flex items-center justify-center min-h-0 px-lg md:px-xxl pb-xxl">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="w-full h-full max-w-[min(90vh,900px)]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="bombGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={COLOR_CORAL} stopOpacity="0.32" />
              <stop offset="60%" stopColor={COLOR_CORAL} stopOpacity="0.06" />
              <stop offset="100%" stopColor={COLOR_CORAL} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={center} cy={center} r={seatRadius * 0.95} fill="url(#bombGlow)" />

          {/* 사람들 — 인터미션일 때 폭사자 좌석에 카메라 줌 */}
          {state?.people.map((p) => {
            const { x, y } = seatPos(p.seat);
            const isExploded = p.rank !== null;
            const isHolder = state.bombSeat === p.seat && !state.exploding && !state.intermission;
            const isJustExploded =
              (state.exploding || state.intermission) && state.lastExplodedSeat === p.seat;
            const isIntermissionFocus = state.intermission && state.lastExplodedSeat === p.seat;
            const ringColor = isExploded
              ? '#3a3f48'
              : isHolder
                  ? COLOR_CORAL
                  : '#41454d';
            const fill = isExploded ? '#1d1f25' : '#ffffff';
            const textColor = isExploded ? '#9297a0' : COLOR_SURFACE_DARK;
            const isWatched = watchedRanks?.has(p.rank);

            const seatScale = isIntermissionFocus ? 1.25 : 1;
            return (
              <g
                key={p.id}
                transform={`translate(${x} ${y}) scale(${seatScale})`}
                style={{ transition: 'transform 0.2s ease-out' }}
              >
                <circle
                  r={personRadius}
                  fill={fill}
                  stroke={ringColor}
                  strokeWidth={isHolder ? 3 : 2}
                  style={
                    isHolder
                      ? { filter: `drop-shadow(0 0 14px ${COLOR_CORAL})` }
                      : isIntermissionFocus
                          ? { filter: `drop-shadow(0 0 24px ${isWatched ? COLOR_GOLD : COLOR_CORAL})` }
                          : undefined
                  }
                />
                <text
                  y={-personRadius * 0.1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={personRadius * 0.85}
                  opacity={isExploded ? 0.45 : 1}
                  style={{ userSelect: 'none' }}
                >
                  {p.emoji}
                </text>
                <text
                  y={personRadius * 0.55}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={Math.max(9, personRadius * 0.28)}
                  fill={textColor}
                  fontWeight={500}
                  style={{ userSelect: 'none' }}
                >
                  {p.displayName.length > 6
                    ? p.displayName.slice(0, 5) + '…'
                    : p.displayName}
                </text>

                {/* 폭발 플래시 (해당 자리) */}
                {isJustExploded && state && (
                  <circle
                    r={personRadius * 1.6}
                    fill={isWatched ? COLOR_GOLD : COLOR_CORAL}
                    opacity={Math.min(0.85, state.explodingTimer / state.explosionSec)}
                    style={{ filter: 'blur(2px)' }}
                  />
                )}

                {/* 폭사 메달 배지 */}
                {isExploded && (
                  <g transform={`translate(0 ${personRadius + 18})`}>
                    <rect
                      x={-26}
                      y={-11}
                      width={52}
                      height={22}
                      rx={11}
                      fill={isWatched ? COLOR_GOLD : '#ffffff'}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={11}
                      fill="#181d26"
                      fontWeight={500}
                    >
                      💥 {p.rank}등
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 폭탄 — exploding/intermission 단계에서는 숨김 */}
          {state && !state.finished && !state.exploding && !state.intermission && (
            <g transform={`translate(${bombX} ${bombY})`}>
              <circle
                r={Math.min(34, personRadius * 0.85)}
                fill={COLOR_SURFACE_DARK}
                stroke={COLOR_CORAL}
                strokeWidth={2}
                style={{ filter: `drop-shadow(0 0 18px ${COLOR_CORAL})` }}
              />
              <text
                textAnchor="middle"
                y={-3}
                dominantBaseline="central"
                fontSize={Math.min(28, personRadius * 0.7)}
                style={{ userSelect: 'none' }}
              >
                💣
              </text>
              {/* v1.5 디지털 타이머 — 폭탄 표면에 정수 카운트다운 (Press Start 2P) */}
              <text
                textAnchor="middle"
                y={Math.min(15, personRadius * 0.4)}
                dominantBaseline="central"
                fontSize={Math.min(12, personRadius * 0.34)}
                fill={COLOR_GOLD}
                fontFamily='"Press Start 2P", "VT323", monospace'
                style={{ userSelect: 'none' }}
              >
                {Math.ceil(state.fuseRemaining)}
              </text>
              {/* 도화선 + 불꽃 — fuse 비율로 길이 감소 */}
              {(() => {
                const fuseLen = 26 * (state.fuseRemaining / state.fuseSec);
                const yTop = -personRadius * 0.6;
                return (
                  <>
                    <line
                      x1={0}
                      y1={yTop}
                      x2={0}
                      y2={yTop - fuseLen}
                      stroke={COLOR_CORAL}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={0}
                      cy={yTop - fuseLen}
                      r={5}
                      fill={COLOR_GOLD}
                      style={{ filter: `drop-shadow(0 0 10px ${COLOR_GOLD})` }}
                    />
                  </>
                );
              })()}
            </g>
          )}
        </svg>

        {/* 사용자 피드백: 라운드 인터미션 중앙 팝업("💥 X등 — 이름")은 제거.
            좌석 카메라 줌 + 좌석 메달 배지 + 좌하단 캐스터 캡션으로 충분. */}
      </div>

      {/* v1.5 캐스터 캡션 */}
      <CasterCaption message={caption} />
    </motion.div>
  );
}

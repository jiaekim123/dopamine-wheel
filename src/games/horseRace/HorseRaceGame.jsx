// PRD §7.4 — 경주마 (Coral) 게임 화면.
// 다크 베이스 + Coral 액센트 (트랙 라인) + Gold 결승선.
// 결승선 임박 시 자동 슬로우모션, 1·2등 박빙 시 사진판정 배너 (페이크 아웃).

import { useEffect, useReducer, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore.js';
import {
  createHorseRace,
  stepHorseRace,
  getHorseRaceRankings,
  isPhotoFinish,
} from './simulation.js';

const COLOR_CORAL = '#aa2d00';
const COLOR_GOLD = '#ffd700';
const COLOR_TRACK = '#0a1419';
const COLOR_LANE_LINE = 'rgba(170, 45, 0, 0.28)';

const FINISH_HOLD_MS = 1400; // 모든 도착 후 결과 화면 전까지 잠시 머무는 시간

export default function HorseRaceGame() {
  const participants = useGameStore((s) => s.participants);
  const finishGame = useGameStore((s) => s.finishGame);

  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const slowMoRef = useRef(1);
  const finishedRef = useRef(false);

  const [, forceRender] = useReducer((n) => n + 1, 0);
  const [photoFinish, setPhotoFinish] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (participants.length < 2) return;

    stateRef.current = createHorseRace(participants);
    lastTimeRef.current = performance.now();

    function tick(now) {
      const state = stateRef.current;
      if (!state) return;

      let dtRaw = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (dtRaw > 0.05) dtRaw = 0.05; // 백그라운드 탭 복귀 시 점프 방지

      // 결승선 임박 슬로우모션 (PRD §7.2)
      const closest = state.horses.reduce((m, h) => Math.max(m, h.position), 0);
      const wantSlow = closest > 0.92 && state.results.length === 0;
      const targetSlow = wantSlow ? 0.4 : 1.0;
      slowMoRef.current += (targetSlow - slowMoRef.current) * Math.min(1, dtRaw * 5);

      stepHorseRace(state, dtRaw * slowMoRef.current);

      // 사진판정 트리거 (시각 페이크, PRD §7.3)
      if (!photoFinish && isPhotoFinish(state)) setPhotoFinish(true);

      forceRender();

      if (!state.finished) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!finishedRef.current) {
        finishedRef.current = true;
        setCelebrating(true);
        setTimeout(() => {
          finishGame(getHorseRaceRankings(state));
        }, FINISH_HOLD_MS);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // participants는 진입 시점 1회만 사용. 재시작은 replayGame 흐름으로 처리.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = stateRef.current;
  const horses = state?.horses ?? participants.map((p, i) => ({ ...p, lane: i, position: 0, rank: null }));
  const n = horses.length;

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
          <span className="text-[36px] leading-none" aria-hidden="true">🐎</span>
          <div>
            <h2 className="text-title-lg font-medium leading-tight">경주마</h2>
            <p className="text-caption text-on-dark/50">Horse Race</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-caption text-on-dark/50">
            도착 <span className="text-on-dark font-medium">{state?.results.length ?? 0}</span> /{' '}
            {n}
          </p>
          <p className="text-caption text-on-dark/40">
            {state ? state.elapsed.toFixed(1) : '0.0'}s
          </p>
        </div>
      </div>

      {/* Track */}
      <div
        className="relative flex-1 mx-xxl mb-xxl rounded-md overflow-hidden"
        style={{ backgroundColor: COLOR_TRACK, boxShadow: `inset 0 0 80px rgba(170,45,0,0.08)` }}
      >
        {/* 시작 라인 */}
        <div className="absolute top-0 bottom-0 left-[5%] w-[2px] bg-on-dark/30" />
        {/* 결승선 — Gold 체커 */}
        <div
          className="absolute top-0 bottom-0 right-[5%] w-[8px]"
          style={{
            background: `repeating-linear-gradient(0deg, ${COLOR_GOLD} 0 14px, #181d26 14px 28px)`,
            boxShadow: celebrating ? `0 0 32px ${COLOR_GOLD}` : 'none',
            transition: 'box-shadow 0.4s ease-out',
          }}
        />

        {/* 레인별 horse */}
        {horses.map((h, i) => {
          const laneTopPct = (i / n) * 100;
          const laneHeightPct = 100 / n;
          const xPct = 5 + h.position * 90;
          const isWinner = h.rank === 1;
          const labelFontSize = n <= 6 ? 13 : n <= 9 ? 12 : 11;
          const horseFontSize = n <= 4 ? 'clamp(40px, 6vw, 64px)'
            : n <= 8 ? 'clamp(32px, 5vw, 52px)'
            : 'clamp(24px, 4vw, 40px)';
          // 막판 흔들림 — 시각만 (PRD §7.3)
          const wobble =
            h.position > 0.85 && h.rank === null && state
              ? `translateY(${Math.sin(state.elapsed * 22 + i) * 1.5}px)`
              : '';

          return (
            <div
              key={h.id}
              className="absolute left-0 right-0"
              style={{
                top: `${laneTopPct}%`,
                height: `${laneHeightPct}%`,
                borderTop: i > 0 ? `1px dashed ${COLOR_LANE_LINE}` : 'none',
              }}
            >
              {/* 레인 번호 */}
              <span
                className="absolute left-md top-1/2 -translate-y-1/2 text-caption text-on-dark/40 select-none"
                style={{ fontSize: '11px' }}
              >
                {i + 1}
              </span>

              {/* 말 + 라벨 */}
              <div
                className="absolute top-1/2"
                style={{
                  left: `${xPct}%`,
                  transform: `translate(-50%, -50%) ${wobble}`,
                }}
              >
                <div className="flex flex-col items-center">
                  <div
                    className="leading-none select-none"
                    style={{
                      fontSize: horseFontSize,
                      filter: isWinner && celebrating
                        ? `drop-shadow(0 0 18px ${COLOR_GOLD})`
                        : 'none',
                      transition: 'filter 0.4s ease-out',
                    }}
                    aria-hidden="true"
                  >
                    🐎
                  </div>
                  <div
                    className="px-xs py-xxs rounded-full mt-xxs whitespace-nowrap text-on-dark"
                    style={{
                      backgroundColor: 'rgba(13, 18, 24, 0.85)',
                      border: `1px solid ${COLOR_CORAL}55`,
                      fontSize: `${labelFontSize}px`,
                      lineHeight: 1.3,
                    }}
                  >
                    {h.emoji} {h.displayName}
                  </div>
                </div>
                {h.rank !== null && (
                  <div
                    className="absolute -top-xs -right-xs rounded-full w-6 h-6 flex items-center justify-center font-medium"
                    style={{
                      backgroundColor: h.rank === 1 ? COLOR_GOLD : '#ffffff',
                      color: '#181d26',
                      fontSize: '11px',
                    }}
                  >
                    {h.rank}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* 사진판정 배너 */}
        {photoFinish && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-md left-1/2 -translate-x-1/2 px-md py-xs rounded-full font-medium"
            style={{ backgroundColor: COLOR_GOLD, color: '#181d26', fontSize: '13px' }}
          >
            📸 PHOTO FINISH
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

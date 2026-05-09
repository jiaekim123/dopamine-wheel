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
  getFakeOutState,
  isFinaleWobbleActive,
  isBoostActive,
} from './simulation.js';
import CasterCaption from '../../components/CasterCaption.jsx';

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
  // 캐스터 캡션 — 게임 이벤트별 메시지 트리거
  const [caption, setCaption] = useState(null);
  const captionFiredRef = useRef({ start: false, photo: false, dark: false, stun: false, ranks: new Set() });

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

      // 결승선 임박 슬로우모션 (PRD §7.2) + v1.5 결승 ceremony
      // 1등 통과 직전: 슬로우 / 1등 통과 후 2~3등 ceremony 동안에도 슬로우 유지
      const closest = state.horses.reduce((m, h) => Math.max(m, h.position), 0);
      const finishedCount = state.results.length;
      const ceremonyTargetCount = Math.min(3, n);
      const inCeremony = finishedCount >= 1 && finishedCount < ceremonyTargetCount;
      const approachingFirst = closest > 0.92 && finishedCount === 0;
      const wantSlow = approachingFirst || inCeremony;
      const targetSlow = wantSlow ? 0.45 : 1.0;
      slowMoRef.current += (targetSlow - slowMoRef.current) * Math.min(1, dtRaw * 5);

      stepHorseRace(state, dtRaw * slowMoRef.current);

      // 사진판정 트리거 (시각 페이크, PRD §7.3)
      if (!photoFinish && isPhotoFinish(state)) setPhotoFinish(true);

      // 캐스터 캡션 트리거
      const fired = captionFiredRef.current;
      if (!fired.start && state.elapsed > 0.3) {
        fired.start = true;
        setCaption('🐎 출발!');
      }
      if (!fired.dark && state.darkhorse?.horseId) {
        fired.dark = true;
        setCaption('🌟 다크호스 등장!');
      }
      if (!fired.stun && state.stun?.horseId) {
        fired.stun = true;
        const stunned = state.horses.find((h) => h.id === state.stun.horseId);
        setCaption(`${stunned?.displayName ?? '말'} 휘청!`);
      }
      if (!fired.photo && photoFinish) {
        fired.photo = true;
        setCaption('📸 사진판정!');
      }
      // 1·2·3등 통과 시 캡션
      for (const r of state.results) {
        if (r.rank <= 3 && !fired.ranks.has(r.rank)) {
          fired.ranks.add(r.rank);
          setCaption(`${r.rank === 1 ? '🏆 ' : ''}${r.rank}등 — ${r.displayName}`);
        }
      }

      forceRender();

      if (!state.finished) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (!finishedRef.current) {
        finishedRef.current = true;
        setCelebrating(true);
        // v1.5: 결승 ceremony — 메달 0.8초 정지 후 result 진입
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
      <div className="px-lg md:px-xxl pt-xl pb-md flex items-center justify-between">
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

        {/* v2 V3 — 부스터 타일 (Coral 글로우 띠) */}
        {state?.boosters?.map((bx, idx) => {
          const xPct = 5 + bx * 90;
          return (
            <motion.div
              key={`booster-${idx}`}
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${xPct}%`,
                width: '14px',
                transform: 'translateX(-50%)',
                background:
                  'linear-gradient(180deg, transparent 0%, rgba(170, 45, 0, 0.55) 50%, transparent 100%)',
                filter: `drop-shadow(0 0 16px ${COLOR_CORAL})`,
                borderLeft: `1px solid ${COLOR_CORAL}`,
                borderRight: `1px solid ${COLOR_CORAL}`,
              }}
              animate={{ opacity: [0.7, 1.0, 0.7] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div
                className="absolute top-2 left-1/2 -translate-x-1/2 text-on-dark/80"
                style={{ fontSize: '14px' }}
                aria-hidden="true"
              >
                🚀
              </div>
            </motion.div>
          );
        })}
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
          const labelFontSize = n <= 6 ? 13 : n <= 9 ? 12 : n <= 12 ? 11 : 10;
          const horseFontSize =
            n <= 4
              ? 'clamp(40px, 6vw, 64px)'
              : n <= 8
                  ? 'clamp(32px, 5vw, 52px)'
                  : n <= 12
                      ? 'clamp(24px, 4vw, 40px)'
                      : 'clamp(20px, 3.2vw, 32px)';
          // v1.5 페이크 아웃 시각 상태
          const fake = state ? getFakeOutState(state, h.id) : { isDarkhorse: false, isStunned: false };
          // 막판 흔들림 — 페이크 추첨됐고 leader가 결승 5% 직전일 때만
          const wobbleActive =
            state && isFinaleWobbleActive(state) && h.position > 0.95 && h.rank === null;
          let wobble = '';
          if (wobbleActive) {
            wobble = `translateY(${Math.sin(state.elapsed * 22 + i) * 2}px)`;
          } else if (fake.isStunned) {
            // 스턴 — 좌우로 짧게 흔들 + 정지 (시각만)
            wobble = `translateX(${Math.sin(state.elapsed * 30) * 1.5}px)`;
          }

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
                <div className="flex flex-col items-center relative">
                  {(() => {
                    const boosted = state ? isBoostActive(state, h.id) : false;
                    return (
                      <div
                        className="leading-none select-none"
                        style={{
                          fontSize: horseFontSize,
                          filter:
                            isWinner && celebrating
                              ? `drop-shadow(0 0 18px ${COLOR_GOLD})`
                              : boosted
                                  ? `drop-shadow(0 0 18px ${COLOR_CORAL})`
                                  : fake.isDarkhorse
                                      ? `drop-shadow(0 0 12px ${COLOR_CORAL})`
                                      : 'none',
                          transition: 'filter 0.3s ease-out, transform 0.2s ease-out',
                          transform: boosted ? 'scale(1.15)' : 'scale(1)',
                          opacity: fake.isStunned ? 0.7 : 1,
                        }}
                        aria-hidden="true"
                      >
                        🐎
                      </div>
                    );
                  })()}
                  {/* v1.5 다크호스 배지 */}
                  {fake.isDarkhorse && (
                    <div
                      className="absolute -top-md left-1/2 -translate-x-1/2 px-xs py-xxs rounded-full whitespace-nowrap text-on-dark font-medium"
                      style={{
                        backgroundColor: COLOR_CORAL,
                        fontSize: '10px',
                        boxShadow: `0 0 12px ${COLOR_CORAL}`,
                      }}
                    >
                      🌟 DARK HORSE
                    </div>
                  )}
                  {/* v1.5 스턴 마커 — 회전 ⭐ */}
                  {fake.isStunned && (
                    <motion.div
                      className="absolute -top-md left-1/2 -translate-x-1/2"
                      style={{ fontSize: '14px' }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
                    >
                      ⭐
                    </motion.div>
                  )}
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

      {/* v2 V1+V4 — 시네마틱 follow-leader PIP. 게임 50% 시점부터 우상단에 등장. */}
      {state &&
        !state.finished &&
        state.elapsed > 4 &&
        (() => {
          const aliveHorses = state.horses.filter((h) => h.rank === null);
          if (aliveHorses.length === 0) return null;
          const leader = aliveHorses.reduce((a, b) => (a.position >= b.position ? a : b));
          const closest = leader.position;
          // closest > 0.45 일 때만 노출 (전반 정적인 구간 제외)
          if (closest < 0.45) return null;
          return (
            <motion.div
              key={leader.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute top-[80px] right-xxl flex items-center gap-sm rounded-md px-md py-sm pointer-events-none"
              style={{
                backgroundColor: 'rgba(13, 18, 24, 0.85)',
                border: `1px solid ${COLOR_CORAL}`,
                boxShadow: `0 0 20px rgba(170, 45, 0, 0.5)`,
                minWidth: '200px',
                zIndex: 5,
              }}
            >
              <span className="text-[40px] leading-none" aria-hidden="true">
                🐎
              </span>
              <div className="flex flex-col">
                <span className="text-caption" style={{ color: COLOR_GOLD }}>
                  🎥 LEADER
                </span>
                <span className="text-on-dark text-body-md font-medium">
                  {leader.emoji} {leader.displayName}
                </span>
                <span className="text-caption text-on-dark/60">
                  진행 {Math.round(closest * 100)}%
                </span>
              </div>
            </motion.div>
          );
        })()}

      {/* v1.5 캐스터 캡션 */}
      <CasterCaption message={caption} />
    </motion.div>
  );
}

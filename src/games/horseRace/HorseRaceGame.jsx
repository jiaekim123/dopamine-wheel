// PRD §7.4 — 카오스 레이스 (Coral) 게임 화면.
// 다크 베이스 + Coral 액센트 (트랙 라인) + Gold 결승선.
// v2.2: 동물 6종 (🐰🐢🐧🐹🐌🦅) + 장애물 시스템.
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
  getQuirkState,
  SPECIES_PROPS,
} from './simulation.js';
import CasterCaption from '../../components/CasterCaption.jsx';

const COLOR_CORAL = '#aa2d00';
const COLOR_GOLD = '#ffd700';
const COLOR_TRACK = '#0a1419';
const COLOR_LANE_LINE = 'rgba(170, 45, 0, 0.28)';

const FINISH_HOLD_MS = 1400;

// v2.5 — 월드/카메라 정책
// 월드 inner는 viewport 250%. 카메라가 leader를 viewport 40% 지점에 두도록 추적.
// translateX_pct는 inner 자체 너비 기준(%). 따라서 0~60 사이가 유효 범위.
//   - inner 너비 250% 기준, 60% 이동 시 inner의 우측이 viewport 우측에 정렬됨.
const WORLD_WIDTH_PCT = 250; // inner div width (% of viewport)
const CAMERA_LEADER_VIEW_PCT = 40; // leader가 viewport에서 보이는 위치 (%)
const CAMERA_MAX_PCT = (1 - 100 / WORLD_WIDTH_PCT) * 100; // = 60

export default function HorseRaceGame() {
  const participants = useGameStore((s) => s.participants);
  const finishGame = useGameStore((s) => s.finishGame);

  const stateRef = useRef(null);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const slowMoRef = useRef(1);
  const finishedRef = useRef(false);
  // v2.5 — 선두 추적 카메라 (translateX_pct 단위, 0~CAMERA_MAX_PCT)
  const cameraOffsetRef = useRef(0);

  const [, forceRender] = useReducer((n) => n + 1, 0);
  const [photoFinish, setPhotoFinish] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [caption, setCaption] = useState(null);
  const captionFiredRef = useRef({
    start: false,
    photo: false,
    dark: false,
    stun: false,
    sleep: new Set(),
    slip: new Set(),
    snailBoost: new Set(),
    // v2.3 positive quirk caption fired
    wakeSprint: new Set(),
    catchup: new Set(),
    iceSlide: new Set(),
    turbo: new Set(),
    midBoost: new Set(),
    treeRest: new Set(),
    ranks: new Set(),
  });

  useEffect(() => {
    if (participants.length < 2) return;

    stateRef.current = createHorseRace(participants);
    lastTimeRef.current = performance.now();

    function tick(now) {
      const state = stateRef.current;
      if (!state) return;

      let dtRaw = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (dtRaw > 0.05) dtRaw = 0.05;

      const closest = state.horses.reduce((m, h) => Math.max(m, h.position), 0);
      const finishedCount = state.results.length;
      const ceremonyTargetCount = Math.min(3, state.horses.length);
      const inCeremony = finishedCount >= 1 && finishedCount < ceremonyTargetCount;
      const approachingFirst = closest > 0.92 && finishedCount === 0;
      const wantSlow = approachingFirst || inCeremony;
      const targetSlow = wantSlow ? 0.45 : 1.0;
      slowMoRef.current += (targetSlow - slowMoRef.current) * Math.min(1, dtRaw * 5);

      stepHorseRace(state, dtRaw * slowMoRef.current);

      // v2.5 — 선두 추적 카메라. inner 좌표계에서 leader xPct = 5 + position * 90.
      // translateX_pct = leader_xPct - CAMERA_LEADER_VIEW_PCT/(WORLD_WIDTH_PCT/100)
      //   inner-rel = (xPct - cam) * (WORLD_WIDTH_PCT/100) → screen-%
      //   want screen-% = 40 → cam = xPct - 40 / (WORLD/100) = xPct - 16
      const leaderPos = state.horses.reduce(
        (m, h) => Math.max(m, h.position),
        0
      );
      const leaderXPct = 5 + leaderPos * 90;
      const camTarget = Math.max(
        0,
        Math.min(CAMERA_MAX_PCT, leaderXPct - CAMERA_LEADER_VIEW_PCT / (WORLD_WIDTH_PCT / 100))
      );
      cameraOffsetRef.current +=
        (camTarget - cameraOffsetRef.current) * Math.min(1, dtRaw * 4);

      if (!photoFinish && isPhotoFinish(state)) setPhotoFinish(true);

      // 캐스터 캡션 트리거
      const fired = captionFiredRef.current;
      if (!fired.start && state.elapsed > 0.3) {
        fired.start = true;
        setCaption('🏁 출발!');
      }
      if (!fired.dark && state.darkhorse?.horseId) {
        fired.dark = true;
        setCaption('🌟 다크호스 등장!');
      }
      if (!fired.stun && state.stun?.horseId) {
        fired.stun = true;
        const stunned = state.horses.find((h) => h.id === state.stun.horseId);
        setCaption(`${stunned?.displayName ?? '주자'} 휘청!`);
      }
      if (!fired.photo && photoFinish) {
        fired.photo = true;
        setCaption('📸 사진판정!');
      }
      // v2.2 + v2.3 동물 quirk 캡션
      for (const h of state.horses) {
        if (h.rank !== null) continue;
        const quirk = getQuirkState(state, h.id);
        // negative
        if (quirk.isSleeping && !fired.sleep.has(h.id)) {
          fired.sleep.add(h.id);
          setCaption(`💤 ${h.displayName} 잠들었다!`);
        }
        if (quirk.isSlipping && !fired.slip.has(h.id)) {
          fired.slip.add(h.id);
          setCaption(`💦 ${h.displayName} 미끄러졌다!`);
        }
        // positive
        if (quirk.isSnailBoost && !fired.snailBoost.has(h.id)) {
          fired.snailBoost.add(h.id);
          setCaption(`🐌 ${h.displayName} 막판 폭주!`);
        }
        if (quirk.isWakeSprint && !fired.wakeSprint.has(h.id)) {
          fired.wakeSprint.add(h.id);
          setCaption(`🐰 ${h.displayName} 깜짝 놀라 달린다!`);
        }
        if (quirk.isCatchup && !fired.catchup.has(h.id)) {
          fired.catchup.add(h.id);
          setCaption(`🐢 ${h.displayName} 꾸준한 추격`);
        }
        if (quirk.isIceSlide && !fired.iceSlide.has(h.id)) {
          fired.iceSlide.add(h.id);
          setCaption(`❄️ ${h.displayName} 빙판 슬라이드!`);
        }
        if (quirk.isTurbo && !fired.turbo.has(h.id)) {
          fired.turbo.add(h.id);
          setCaption(`🐹 ${h.displayName} 휠 폭주!`);
        }
        if (quirk.isMidBoost && !fired.midBoost.has(h.id)) {
          fired.midBoost.add(h.id);
          setCaption(`🌟 ${h.displayName} 변신!`);
        }
        if (quirk.isTreeResting && !fired.treeRest.has(h.id)) {
          fired.treeRest.add(h.id);
          setCaption(`🦅 ${h.displayName} 잠시 쉬어간다`);
        }
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
        setTimeout(() => {
          finishGame(getHorseRaceRankings(state));
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
  const horses =
    state?.horses ??
    participants.map((p, i) => ({
      ...p,
      lane: i,
      position: 0,
      rank: null,
      species: 'rabbit',
      speciesEmoji: '🐰',
    }));
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
          <span className="text-[36px] leading-none" aria-hidden="true">
            🏁
          </span>
          <div>
            <h2 className="text-title-lg font-medium leading-tight">카오스 레이스</h2>
            <p className="text-caption text-on-dark/50">Chaos Race</p>
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

      {/* Track — 외부 viewport. v2.5: inner를 250% 너비로 두고 카메라 transform */}
      <div
        className="relative flex-1 mx-xxl mb-xxl rounded-md overflow-hidden"
        style={{ backgroundColor: COLOR_TRACK, boxShadow: `inset 0 0 80px rgba(170,45,0,0.08)` }}
      >
        {/* 월드 inner — 카메라 추적 (translateX_pct 기준) */}
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${WORLD_WIDTH_PCT}%`,
            transform: `translateX(-${cameraOffsetRef.current}%)`,
            willChange: 'transform',
          }}
        >
        {/* 시작 라인 */}
        <div className="absolute top-0 bottom-0 left-[5%] w-[2px] bg-on-dark/30" />

        {/* 부스터 타일 */}
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

        {/* v2.2 장애물 — 트랙 위에 🌳 또는 🪨 표시 */}
        {state?.obstacles?.map((ox, idx) => {
          const xPct = 5 + ox * 90;
          // idx에 따라 🌳/🪨 번갈아
          const obstacleEmoji = idx % 2 === 0 ? '🌳' : '🪨';
          return (
            <div
              key={`obstacle-${idx}`}
              className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center justify-around"
              style={{
                left: `${xPct}%`,
                width: '24px',
                transform: 'translateX(-50%)',
              }}
              aria-hidden="true"
            >
              {Array.from({ length: Math.min(n + 1, 6) }).map((_, j) => (
                <span
                  key={j}
                  style={{
                    fontSize: n <= 8 ? '18px' : '14px',
                    filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.6))',
                    opacity: 0.85,
                  }}
                >
                  {obstacleEmoji}
                </span>
              ))}
            </div>
          );
        })}

        {/* 결승선 — v2.5: inner 좌표계에서 left 95% (= position 1.0) */}
        <div
          className="absolute top-0 bottom-0 w-[8px]"
          style={{
            left: '95%',
            transform: 'translateX(-50%)',
            background: `repeating-linear-gradient(0deg, ${COLOR_GOLD} 0 14px, #181d26 14px 28px)`,
            boxShadow: celebrating ? `0 0 32px ${COLOR_GOLD}` : 'none',
            transition: 'box-shadow 0.4s ease-out',
          }}
        />

        {/* 레인별 racer */}
        {horses.map((h, i) => {
          const laneTopPct = (i / n) * 100;
          const laneHeightPct = 100 / n;
          const xPct = 5 + h.position * 90;
          const isWinner = h.rank === 1;
          const labelFontSize = n <= 6 ? 13 : n <= 9 ? 12 : n <= 12 ? 11 : 10;
          const racerFontSize =
            n <= 4
              ? 'clamp(40px, 6vw, 64px)'
              : n <= 8
                  ? 'clamp(32px, 5vw, 52px)'
                  : n <= 12
                      ? 'clamp(24px, 4vw, 40px)'
                      : 'clamp(20px, 3.2vw, 32px)';
          const fake = state
            ? getFakeOutState(state, h.id)
            : { isDarkhorse: false, isStunned: false };
          const quirk = state
            ? getQuirkState(state, h.id)
            : { isSleeping: false, isSlipping: false, isPaused: false, isSnailBoost: false };

          // y축 모션 (eagle 비행 + wobble + slip)
          const isEagle = h.species === 'eagle';
          const wobbleActive =
            state && isFinaleWobbleActive(state) && h.position > 0.95 && h.rank === null;
          let yOffset = 0;
          let xOffset = 0;
          let rotate = 0;
          if (isEagle && h.rank === null) {
            yOffset = Math.sin(state ? state.elapsed * 4 + i : 0) * 14;
          }
          if (wobbleActive) {
            yOffset += Math.sin((state?.elapsed ?? 0) * 22 + i) * 2;
          } else if (fake.isStunned) {
            xOffset = Math.sin((state?.elapsed ?? 0) * 30) * 1.5;
          }
          if (quirk.isSlipping) {
            rotate = Math.sin((state?.elapsed ?? 0) * 18) * 18;
          } else if (quirk.isSleeping) {
            rotate = -10; // 약간 기울어진 자세
          }

          // v2.3.1 — 메인 캐릭터는 참가자 본인 이모지 (FNV-1a 매핑).
          // species 이모지는 라벨에 작게 표시해 식별 혼동을 줄임.
          const mainEmoji = h.emoji ?? '🏁';

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
              <span
                className="absolute left-md top-1/2 -translate-y-1/2 text-caption text-on-dark/40 select-none"
                style={{ fontSize: '11px' }}
              >
                {i + 1}
              </span>

              <div
                className="absolute top-1/2"
                style={{
                  left: `${xPct}%`,
                  transform: `translate(-50%, calc(-50% + ${yOffset}px)) translateX(${xOffset}px)`,
                }}
              >
                <div className="flex flex-col items-center relative">
                  {(() => {
                    const boosted = state ? isBoostActive(state, h.id) : false;
                    // v2.3 — 모든 positive quirk을 Coral 글로우로 통일 (시각 일관성)
                    const positiveActive =
                      boosted ||
                      quirk.isSnailBoost ||
                      quirk.isWakeSprint ||
                      quirk.isCatchup ||
                      quirk.isIceSlide ||
                      quirk.isTurbo ||
                      quirk.isMidBoost;
                    let filter = 'none';
                    if (isWinner && celebrating) {
                      filter = `drop-shadow(0 0 18px ${COLOR_GOLD})`;
                    } else if (positiveActive) {
                      filter = `drop-shadow(0 0 18px ${COLOR_CORAL})`;
                    } else if (fake.isDarkhorse) {
                      filter = `drop-shadow(0 0 12px ${COLOR_CORAL})`;
                    }
                    return (
                      <div
                        className="leading-none select-none"
                        style={{
                          fontSize: racerFontSize,
                          filter,
                          transition: 'filter 0.3s ease-out, transform 0.2s ease-out',
                          transform: `${
                            positiveActive ? 'scale(1.15)' : 'scale(1)'
                          } rotate(${rotate}deg)`,
                          opacity:
                            fake.isStunned || quirk.isSleeping || quirk.isTreeResting
                              ? 0.7
                              : 1,
                        }}
                        aria-hidden="true"
                      >
                        {mainEmoji}
                      </div>
                    );
                  })()}
                  {/* 동물 quirk 마커 */}
                  {quirk.isSleeping && (
                    <motion.div
                      className="absolute -top-md left-1/2 -translate-x-1/2"
                      style={{ fontSize: '14px' }}
                      animate={{ y: [0, -3, 0], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                    >
                      💤
                    </motion.div>
                  )}
                  {quirk.isSlipping && (
                    <div
                      className="absolute -top-md left-1/2 -translate-x-1/2"
                      style={{ fontSize: '14px' }}
                    >
                      💦
                    </div>
                  )}
                  {/* v2.3 positive quirk 마커 */}
                  {quirk.isIceSlide && (
                    <div
                      className="absolute -top-md left-1/2 -translate-x-1/2"
                      style={{ fontSize: '14px' }}
                    >
                      ❄️
                    </div>
                  )}
                  {quirk.isTurbo && (
                    <div
                      className="absolute -top-md left-1/2 -translate-x-1/2"
                      style={{ fontSize: '14px' }}
                    >
                      ⚡
                    </div>
                  )}
                  {quirk.isMidBoost && (
                    <div
                      className="absolute -top-md left-1/2 -translate-x-1/2"
                      style={{ fontSize: '14px' }}
                    >
                      🌟
                    </div>
                  )}
                  {quirk.isTreeResting && (
                    <motion.div
                      className="absolute -top-md left-1/2 -translate-x-1/2"
                      style={{ fontSize: '14px' }}
                      animate={{ y: [0, -2, 0], opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      🍃
                    </motion.div>
                  )}
                  {/* 다크호스 배지 */}
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
                  {/* 스턴 마커 */}
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
                    {/* v2.3.1 — 라벨에 species emoji + 이름 (메인은 참가자 이모지) */}
                    {h.speciesEmoji ?? ''} {h.displayName}
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

        </div>{/* /월드 inner — 카메라 transform 영향 종료 */}

        {/* 사진판정 배너 — outer fixed (카메라 영향 없음) */}
        {photoFinish && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-md left-1/2 -translate-x-1/2 px-md py-xs rounded-full font-medium"
            style={{ backgroundColor: COLOR_GOLD, color: '#181d26', fontSize: '13px', zIndex: 5 }}
          >
            📸 PHOTO FINISH
          </motion.div>
        )}
      </div>

      {/* 시네마틱 follow-leader PIP */}
      {state &&
        !state.finished &&
        state.elapsed > 4 &&
        (() => {
          const aliveHorses = state.horses.filter((h) => h.rank === null);
          if (aliveHorses.length === 0) return null;
          const leader = aliveHorses.reduce((a, b) => (a.position >= b.position ? a : b));
          const closest = leader.position;
          if (closest < 0.45) return null;
          const speciesLabel =
            SPECIES_PROPS[leader.species]?.label ?? '주자';
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
                {leader.emoji ?? '🏁'}
              </span>
              <div className="flex flex-col">
                <span className="text-caption" style={{ color: COLOR_GOLD }}>
                  🎥 LEADER · {leader.speciesEmoji ?? ''} {speciesLabel}
                </span>
                <span className="text-on-dark text-body-md font-medium">
                  {leader.displayName}
                </span>
                <span className="text-caption text-on-dark/60">
                  진행 {Math.round(closest * 100)}%
                </span>
              </div>
            </motion.div>
          );
        })()}

      {/* 캐스터 캡션 */}
      <CasterCaption message={caption} />
    </motion.div>
  );
}

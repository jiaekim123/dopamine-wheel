// PRD §3.2 + §7.4 — 카오스 레이스 (구 야생 더비 / 경주마) Step-based Random 시뮬레이션.
//
// 원칙: 매 step마다 무작위 가속도 추첨 → 시뮬 결과 그대로가 결과.
// 결과를 사전에 정해두지 않으며, 모든 racer가 결승선을 통과해 자연스럽게 rank 1~n이 산출된다.
//
// v1.5: 페이크 아웃 4종 시스템 (PRD §7.3 + §7.4) — wobble / darkhorse / stun / 사진판정.
// v2 V3: 부스터 타일 (시각만, 결과 불변).
// v2 V4: 시네마틱 follow-leader PIP (컴포넌트).
// v2.2: 카오스 레이스 — 동물 6종 (🐰🐢🐧🐹🐌🦅) + 장애물 시스템.
// v2.3: 동물별 다양성 quirk 보강 — wake sprint(🐰) / catchup(🐢) /
//        ice slide(🐧) / turbo(🐹) / mid-boost(🐌) / tree rest(🦅) +
//        baseSpeedFactor 재조정으로 평균 finish 균형 강화.

import { randFloat } from '../../lib/random.js';

// v2.5 — 사용자 요청 "속도 더 빠르게". 14 → 9초.
export const AVG_FINISH_SEC = 9;
export const TARGET_INTERVAL_SEC = 0.2;
export const VEL_FACTOR_MIN = 0.5;
export const VEL_FACTOR_MAX = 1.6;
const VEL_LERP_RATE = 4; // 1/s — target 속도로 수렴하는 속도

// 결승선 위치 정규화: 0(시작) ~ 1(결승)
export const FINISH_LINE = 1;

// v2.2 카오스 레이스 — 동물 6종 + quirk 정의.
// baseSpeedFactor는 quirk가 평균 finish에 미치는 영향을 상쇄해
// 100회 시뮬 평균 rank가 ±0.5 이내로 균등하도록 미세 조정.
export const SPECIES_PROPS = {
  rabbit: {
    emoji: '🐰',
    label: '토끼',
    baseSpeedFactor: 0.97,
    velVariance: 1.0,
    // 5~10초 시점에 0.4~1.0초 sleep (1회). sleep 동안 velocity 0.
    sleep: { earliest: 5, latest: 10, durationMin: 0.4, durationMax: 1.0 },
    // v2.3 — sleep 종료 직후 wake-sprint
    wakeSprint: { duration: 1.0, multiplier: 1.3 },
  },
  turtle: {
    emoji: '🐢',
    label: '거북이',
    baseSpeedFactor: 0.93,
    velVariance: 0.55,
    // v2.3 — 게임 35~65% 사이 1회 catchup
    catchup: { window: [0.35, 0.65], duration: 2.0, multiplier: 1.15 },
  },
  penguin: {
    emoji: '🐧',
    label: '펭귄',
    baseSpeedFactor: 0.95,
    velVariance: 1.0,
    // 매 0.5s 체크에 8% 확률 미끄럼 — 1회로 제한.
    slip: { checkInterval: 0.5, chance: 0.08, duration: 0.8, slowdown: 0.4 },
    // v2.3 — 게임 20~80% 사이 1회 ice slide
    iceSlide: { window: [0.2, 0.8], duration: 1.0, multiplier: 1.35 },
  },
  hamster: {
    emoji: '🐹',
    label: '햄스터',
    baseSpeedFactor: 0.93,
    velVariance: 1.5, // 폭발적 가속·감속
    // v2.3 — 전반/후반 각 1회 turbo wheel
    turbo: { windows: [[0.1, 0.45], [0.5, 0.85]], duration: 0.6, multiplier: 1.5 },
  },
  snail: {
    emoji: '🐌',
    label: '달팽이',
    baseSpeedFactor: 0.93,
    velVariance: 0.7,
    // 마지막 20% 트랙에서 1.6배 부스트
    finalBoost: { from: 0.8, multiplier: 1.6 },
    // v2.3 — 25~45% / 55~80% 시점 각각 60% 확률 mid-boost
    midBoost: { windows: [[0.25, 0.45], [0.55, 0.8]], duration: 1.2, multiplier: 1.5, chance: 0.7 },
  },
  eagle: {
    emoji: '🦅',
    label: '독수리',
    baseSpeedFactor: 1.0,
    velVariance: 1.0,
    // 비행 — 장애물 통과 시 페널티 없음 (시각: y축 sin은 컴포넌트에서)
    flying: true,
    // v2.3 — 장애물(나무) 위 휴식 (immune 페널티)
    treeRest: { chance: 0.4, duration: 0.4 },
  },
};

const SPECIES_KEYS = Object.keys(SPECIES_PROPS);

// v2.2 — n명에게 species 분배. 시드 기반 결정성 유지.
function assignSpecies(n) {
  // 모든 종을 적어도 1번씩 사용하되, n이 6 이하면 일부 종만 등장.
  // 셔플 후 라운드 로빈으로 분배.
  const shuffled = [...SPECIES_KEYS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randFloat() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const result = [];
  for (let i = 0; i < n; i++) {
    result.push(shuffled[i % shuffled.length]);
  }
  // 동일 종이 너무 인접하지 않도록 한 번 더 셔플
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randFloat() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// v1.5 페이크 아웃 — 사진판정은 자동 트리거(조건부)이므로 아래 3종에서 추첨.
// PRD §7.3: 0개 25% / 1개 55% / 2개 20%.
export const FAKE_OUT_TYPES = ['wobble', 'darkhorse', 'stun'];

function pickFakeOuts() {
  const r = randFloat();
  let count;
  if (r < 0.25) count = 0;
  else if (r < 0.8) count = 1;
  else count = 2;
  const pool = [...FAKE_OUT_TYPES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(randFloat() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function pickBoosterPositions() {
  const count = randFloat() < 0.5 ? 1 : 2;
  const positions = [];
  for (let i = 0; i < count; i++) {
    // 30~70% 영역에 균등 분포로 배치
    positions.push(0.3 + (i + randFloat()) * (0.4 / count));
  }
  return positions;
}

// v2.2 — 장애물 위치. 25/50/75% 후보 중 1~2개 랜덤 선택.
function pickObstaclePositions() {
  const candidates = [0.25, 0.5, 0.75];
  const count = randFloat() < 0.6 ? 1 : 2;
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randFloat() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // 살짝 jitter
  return shuffled.slice(0, count).map((x) => x + (randFloat() - 0.5) * 0.04);
}

// v2.2 — 동물별 장애물 통과 패널티 (시뮬 시간 정지). eagle은 면제.
function obstaclePauseSec(species) {
  switch (species) {
    case 'rabbit':
    case 'hamster':
      return 0.1; // 점프
    case 'turtle':
      return 0.3; // 우회
    case 'penguin':
      return 0.6; // 미끄럼
    case 'snail':
      return 0.5;
    case 'eagle':
      return 0; // 비행 면제
    default:
      return 0.2;
  }
}

/**
 * @param {Array<{id:string,name:string,displayName:string,emoji:string}>} participants
 */
export function createHorseRace(participants) {
  const n = participants.length;
  const fakeOuts = pickFakeOuts();
  const darkhorseAt = AVG_FINISH_SEC * 0.6;
  const stunAt = AVG_FINISH_SEC * 0.3 + randFloat() * AVG_FINISH_SEC * 0.2;
  const speciesArr = assignSpecies(n);

  return {
    horses: participants.map((p, i) => {
      const species = speciesArr[i];
      const props = SPECIES_PROPS[species];
      // rabbit sleep — 게임 시작 시 한 번에 시점/지속시간 결정
      let sleepAt = null;
      let sleepDuration = 0;
      if (props.sleep) {
        sleepAt =
          props.sleep.earliest +
          randFloat() * (props.sleep.latest - props.sleep.earliest);
        sleepDuration =
          props.sleep.durationMin +
          randFloat() * (props.sleep.durationMax - props.sleep.durationMin);
      }
      // v2.3 — 사전 계산된 positive quirk 일정. 트랙 진행률(0~1) 기준.
      // turtle catchup
      let catchupAt = null;
      if (props.catchup) {
        const [lo, hi] = props.catchup.window;
        catchupAt = lo + randFloat() * (hi - lo);
      }
      // penguin ice slide
      let iceSlideAt = null;
      if (props.iceSlide) {
        const [lo, hi] = props.iceSlide.window;
        iceSlideAt = lo + randFloat() * (hi - lo);
      }
      // hamster turbo (windows 각각 1회씩)
      const turboAts = [];
      if (props.turbo) {
        for (const [lo, hi] of props.turbo.windows) {
          turboAts.push(lo + randFloat() * (hi - lo));
        }
      }
      // snail mid-boost (각 window 60% 확률)
      const midBoostAts = [];
      if (props.midBoost) {
        for (const [lo, hi] of props.midBoost.windows) {
          if (randFloat() < props.midBoost.chance) {
            midBoostAts.push(lo + randFloat() * (hi - lo));
          }
        }
      }
      return {
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        emoji: p.emoji,
        species,
        speciesEmoji: props.emoji,
        lane: i,
        position: 0,
        velocity: 0,
        targetVelocity: 0,
        rank: null,
        finishTime: null,
        // v2.2 quirk 상태 (negative)
        sleepAt,
        sleepDuration,
        sleepStarted: false,
        sleepEndsAt: null,
        slipCheckTimer: 0,
        slipUntil: null,
        slipped: false,
        snailBoosting: false,
        pauseUntil: null,
        obstaclesHit: [],
        // v2.3 quirk 상태 (positive). 모두 position 기반 트리거.
        catchupAt,
        catchupTriggered: false,
        catchupUntil: null,
        iceSlideAt,
        iceSlideTriggered: false,
        iceSlideUntil: null,
        turboAts: [...turboAts],
        turboTriggeredFlags: turboAts.map(() => false),
        turboUntil: null,
        midBoostAts: [...midBoostAts],
        midBoostTriggeredFlags: midBoostAts.map(() => false),
        midBoostUntil: null,
        // wake sprint (sleep 종료 직후)
        wakeSprintUntil: null,
        // 활성 positive boost 멀티플라이어 (없으면 1.0). 매 step 갱신.
        positiveMultiplier: 1.0,
      };
    }),
    elapsed: 0,
    nextRank: 1,
    targetTimer: TARGET_INTERVAL_SEC,
    finished: false,
    results: [],
    fakeOuts,
    darkhorse: {
      enabled: fakeOuts.includes('darkhorse'),
      triggerAt: darkhorseAt,
      horseId: null,
      badgeUntil: 0,
    },
    stun: {
      enabled: fakeOuts.includes('stun'),
      triggerAt: stunAt,
      horseId: null,
      until: 0,
    },
    wobble: {
      enabled: fakeOuts.includes('wobble'),
    },
    boosters: pickBoosterPositions(),
    horseBoosterUntil: {},
    // v2.2 장애물
    obstacles: pickObstaclePositions(),
  };
}

export function stepHorseRace(state, dt) {
  if (state.finished || dt <= 0) return state;
  state.elapsed += dt;
  state.targetTimer += dt;

  // 200ms마다 target velocity 재추첨 (Step-based Random) — species별 보정
  if (state.targetTimer >= TARGET_INTERVAL_SEC) {
    state.targetTimer = 0;
    for (const h of state.horses) {
      if (h.rank !== null) continue;
      const props = SPECIES_PROPS[h.species];
      // velVariance에 따라 분산 폭 조정
      const variance = props.velVariance;
      const center = (VEL_FACTOR_MIN + VEL_FACTOR_MAX) / 2;
      const half = ((VEL_FACTOR_MAX - VEL_FACTOR_MIN) / 2) * variance;
      const factor = center - half + randFloat() * (2 * half);
      let target = (factor * props.baseSpeedFactor) / AVG_FINISH_SEC;
      // 달팽이 막판 부스트
      if (props.finalBoost && h.position >= props.finalBoost.from) {
        target *= props.finalBoost.multiplier;
        h.snailBoosting = true;
      }
      h.targetVelocity = target;
    }
  }

  // 다크호스 트리거
  if (
    state.darkhorse.enabled &&
    !state.darkhorse.horseId &&
    state.elapsed >= state.darkhorse.triggerAt
  ) {
    const alive = state.horses.filter((h) => h.rank === null);
    if (alive.length > 0) {
      const sorted = [...alive].sort((a, b) => a.position - b.position);
      const cutoff = Math.max(1, Math.floor(sorted.length * 0.3));
      const candidate = sorted[Math.floor(randFloat() * cutoff)];
      state.darkhorse.horseId = candidate.id;
      state.darkhorse.badgeUntil = state.elapsed + 1.0;
    }
  }
  // 스턴 트리거
  if (state.stun.enabled && !state.stun.horseId && state.elapsed >= state.stun.triggerAt) {
    const alive = state.horses.filter((h) => h.rank === null);
    if (alive.length >= 3) {
      const sorted = [...alive].sort((a, b) => a.position - b.position);
      const lo = Math.floor(sorted.length * 0.3);
      const hi = Math.ceil(sorted.length * 0.7);
      const idx = lo + Math.floor(randFloat() * Math.max(1, hi - lo));
      const candidate = sorted[Math.min(idx, sorted.length - 1)];
      state.stun.horseId = candidate.id;
      state.stun.until = state.elapsed + 0.5;
    }
  }

  // 위치 업데이트 + quirk 적용 + 결승 체크
  const lerp = Math.min(1, dt * VEL_LERP_RATE);
  for (const h of state.horses) {
    if (h.rank !== null) continue;
    const props = SPECIES_PROPS[h.species];

    // v2.2 토끼 잠
    if (props.sleep && !h.sleepStarted && h.sleepAt !== null && state.elapsed >= h.sleepAt) {
      h.sleepStarted = true;
      h.sleepEndsAt = state.elapsed + h.sleepDuration;
    }
    const isSleeping = h.sleepEndsAt !== null && state.elapsed < h.sleepEndsAt;

    // v2.2 펭귄 미끄럼 — 0.5s마다 체크, 한 번만
    if (props.slip && !h.slipped && h.position > 0.1 && h.position < 0.9) {
      h.slipCheckTimer += dt;
      if (h.slipCheckTimer >= props.slip.checkInterval) {
        h.slipCheckTimer = 0;
        if (randFloat() < props.slip.chance) {
          h.slipped = true;
          h.slipUntil = state.elapsed + props.slip.duration;
        }
      }
    }
    const isSlipping = h.slipUntil !== null && state.elapsed < h.slipUntil;

    // v2.2 장애물 통과 → 일시 정지 (eagle 면제)
    const isPaused = h.pauseUntil !== null && state.elapsed < h.pauseUntil;

    // v2.3 positive quirk 트리거 (position 기반)
    // wake sprint — sleep 종료 직후
    if (
      props.wakeSprint &&
      h.sleepEndsAt !== null &&
      h.wakeSprintUntil === null &&
      state.elapsed >= h.sleepEndsAt &&
      state.elapsed < h.sleepEndsAt + 0.05
    ) {
      h.wakeSprintUntil = state.elapsed + props.wakeSprint.duration;
    }
    // turtle catchup
    if (
      props.catchup &&
      !h.catchupTriggered &&
      h.catchupAt !== null &&
      h.position >= h.catchupAt
    ) {
      h.catchupTriggered = true;
      h.catchupUntil = state.elapsed + props.catchup.duration;
    }
    // penguin ice slide
    if (
      props.iceSlide &&
      !h.iceSlideTriggered &&
      h.iceSlideAt !== null &&
      h.position >= h.iceSlideAt
    ) {
      h.iceSlideTriggered = true;
      h.iceSlideUntil = state.elapsed + props.iceSlide.duration;
    }
    // hamster turbo (여러 window 각각 1회)
    if (props.turbo) {
      for (let ti = 0; ti < h.turboAts.length; ti++) {
        if (!h.turboTriggeredFlags[ti] && h.position >= h.turboAts[ti]) {
          h.turboTriggeredFlags[ti] = true;
          h.turboUntil = state.elapsed + props.turbo.duration;
          break;
        }
      }
    }
    // snail mid-boost
    if (props.midBoost) {
      for (let mi = 0; mi < h.midBoostAts.length; mi++) {
        if (!h.midBoostTriggeredFlags[mi] && h.position >= h.midBoostAts[mi]) {
          h.midBoostTriggeredFlags[mi] = true;
          h.midBoostUntil = state.elapsed + props.midBoost.duration;
          break;
        }
      }
    }

    // 활성 positive multiplier 계산 (가장 강한 1개만 적용 — 중첩 방지)
    let posMult = 1.0;
    if (h.wakeSprintUntil !== null && state.elapsed < h.wakeSprintUntil) {
      posMult = Math.max(posMult, props.wakeSprint.multiplier);
    }
    if (h.catchupUntil !== null && state.elapsed < h.catchupUntil) {
      posMult = Math.max(posMult, props.catchup.multiplier);
    }
    if (h.iceSlideUntil !== null && state.elapsed < h.iceSlideUntil) {
      posMult = Math.max(posMult, props.iceSlide.multiplier);
    }
    if (h.turboUntil !== null && state.elapsed < h.turboUntil) {
      posMult = Math.max(posMult, props.turbo.multiplier);
    }
    if (h.midBoostUntil !== null && state.elapsed < h.midBoostUntil) {
      posMult = Math.max(posMult, props.midBoost.multiplier);
    }
    h.positiveMultiplier = posMult;

    // 속도 결정
    h.velocity += (h.targetVelocity - h.velocity) * lerp;
    let effectiveV = h.velocity;
    if (isSleeping || isPaused) {
      effectiveV = 0;
    } else if (isSlipping) {
      effectiveV *= props.slip.slowdown;
    } else if (posMult > 1.0) {
      effectiveV *= posMult;
    }

    const prevPos = h.position;
    h.position += effectiveV * dt;

    // 부스터 통과 (시각만, 결과 불변 — 시간 보정 없음)
    for (const bx of state.boosters) {
      if (prevPos < bx && h.position >= bx) {
        state.horseBoosterUntil[h.id] = state.elapsed + 0.4;
        break;
      }
    }

    // v2.2 장애물 통과 — 동물별 페널티 (+ v2.3 eagle tree rest)
    for (const ox of state.obstacles) {
      if (prevPos < ox && h.position >= ox && !h.obstaclesHit.includes(ox)) {
        h.obstaclesHit.push(ox);
        let pause = obstaclePauseSec(h.species);
        // v2.3 — eagle은 immune이지만 trooRest 확률에 따라 잠깐 휴식
        if (h.species === 'eagle' && props.treeRest) {
          if (randFloat() < props.treeRest.chance) {
            pause = props.treeRest.duration;
          }
        }
        if (pause > 0) {
          h.pauseUntil = state.elapsed + pause;
          // 펭귄은 미끄러져 후진
          if (h.species === 'penguin') {
            h.position = Math.max(0, h.position - 0.02);
          }
        }
        break;
      }
    }

    if (h.position >= FINISH_LINE) {
      h.position = FINISH_LINE;
      h.velocity = 0;
      h.rank = state.nextRank++;
      h.finishTime = state.elapsed;
      state.results.push(h);
    }
  }

  if (state.results.length === state.horses.length) {
    state.finished = true;
  }
  return state;
}

/**
 * PRD §3.2 — 모든 참가자에 대해 rank 1~n을 가진 rankings 반환.
 */
export function getHorseRaceRankings(state) {
  return state.results.map((h) => ({
    id: h.id,
    name: h.name,
    displayName: h.displayName,
    emoji: h.emoji,
    species: h.species,
    speciesEmoji: h.speciesEmoji,
    rank: h.rank,
  }));
}

/**
 * 사진판정 트리거: 1·2등 finishTime 차이가 임계값 미만이면 true.
 */
export function isPhotoFinish(state, thresholdSec = 0.18) {
  if (state.results.length < 2) return false;
  const t1 = state.results[0].finishTime;
  const t2 = state.results[1].finishTime;
  return t2 - t1 < thresholdSec;
}

/**
 * v1.5 페이크 아웃 시각 상태 헬퍼.
 */
export function getFakeOutState(state, horseId) {
  const isDarkhorse =
    state.darkhorse.horseId === horseId && state.elapsed < state.darkhorse.badgeUntil;
  const isStunned = state.stun.horseId === horseId && state.elapsed < state.stun.until;
  return { isDarkhorse, isStunned };
}

/**
 * v1.5 막판 흔들림 — 페이크 추첨됐고 leader가 결승 5% 직전일 때만.
 */
export function isFinaleWobbleActive(state) {
  if (!state.wobble.enabled) return false;
  if (state.results.length > 0) return false;
  return state.horses.some((h) => h.rank === null && h.position > 0.95);
}

/**
 * v2 V3 — 특정 horse가 부스터 시각 효과 활성 상태인지.
 */
export function isBoostActive(state, horseId) {
  const until = state.horseBoosterUntil[horseId];
  return until !== undefined && state.elapsed < until;
}

/**
 * v2.2 + v2.3 — 동물별 quirk 시각 상태 헬퍼.
 */
export function getQuirkState(state, horseId) {
  const h = state.horses.find((x) => x.id === horseId);
  if (!h) {
    return {
      isSleeping: false,
      isSlipping: false,
      isPaused: false,
      isSnailBoost: false,
      isWakeSprint: false,
      isCatchup: false,
      isIceSlide: false,
      isTurbo: false,
      isMidBoost: false,
      isTreeResting: false,
    };
  }
  const eagleResting =
    h.species === 'eagle' && h.pauseUntil !== null && state.elapsed < h.pauseUntil;
  return {
    isSleeping: h.sleepEndsAt !== null && state.elapsed < h.sleepEndsAt,
    isSlipping: h.slipUntil !== null && state.elapsed < h.slipUntil,
    // eagle pause는 시각상 휴식이지 obstacle penalty가 아님 → isPaused는 eagle 외만 true
    isPaused: h.pauseUntil !== null && state.elapsed < h.pauseUntil && h.species !== 'eagle',
    isSnailBoost: h.snailBoosting && h.rank === null && h.position >= 0.8,
    isWakeSprint: h.wakeSprintUntil !== null && state.elapsed < h.wakeSprintUntil,
    isCatchup: h.catchupUntil !== null && state.elapsed < h.catchupUntil,
    isIceSlide: h.iceSlideUntil !== null && state.elapsed < h.iceSlideUntil,
    isTurbo: h.turboUntil !== null && state.elapsed < h.turboUntil,
    isMidBoost: h.midBoostUntil !== null && state.elapsed < h.midBoostUntil,
    isTreeResting: eagleResting,
  };
}

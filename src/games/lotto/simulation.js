// PRD §3.2 + §7.5 — 럭키 로또 (Forest) matter.js 시뮬레이션.
//
// 원형 챔버 안에 참가자 수만큼 공이 들어 있고, 챔버 바닥에 좁은 출구가 있다.
// 주기적으로 공 전체에 위쪽/측면 임펄스("바람")를 가해 무작위로 휘저으며,
// 출구를 통해 빠져나간 공이 추출 순서대로 rank를 갖는다.
// 결과를 미리 정해두지 않으며, 물리 시뮬 그대로가 결과 (PRD §3.2).

import Matter from 'matter-js';
import { randFloat } from '../../lib/random.js';

// Chamber geometry — pixel 단위. 화면 비율은 컴포넌트에서 viewBox로 스케일.
// v1.5: ballRadius 22 → 28 (식별성↑, PRD §7.5).
export const CHAMBER = {
  width: 800,
  height: 920,
  cx: 400,
  cy: 380,
  radius: 240,
  // 출구 게이트: 챔버 바닥의 작은 호 (라디안). 0.16 ≈ 18°.
  gapHalfAngle: 0.16,
  // 출구 튜브 (수직). 공 지름이 커진 만큼 약간 넓힘.
  tubeYTop: 380 + 240 - 4,
  tubeYBot: 380 + 240 + 160,
  tubeHalfWidth: 38, // ball radius(28) * ~1.36
  extractY: 380 + 240 + 130,
  ballRadius: 28,
};

const SEG_COUNT = 60;

// PRD §7.5 v1.5 — 2-phase warmup
export const WARMUP_MIN_SEC = 3;
export const WARMUP_MAX_SEC = 10;

// 사용자 피드백 — 바람으로 띄운 듯한 부력감.
// 공기가 많이 든 가벼운 공이 위로 붕붕 뜨면서 순서가 계속 바뀌도록 위쪽 바이어스를 강하게 준다.
function shakeIntervalSec(n) {
  // 더 자주 burst — 공이 끊이지 않고 흔들리는 느낌
  return Math.max(0.05, 0.12 - n * 0.002);
}

function shakeForceMag(n) {
  return 0.028 + Math.min(n, 30) * 0.0009;
}

/**
 * @param {Array<{id:string,name:string,displayName:string,emoji:string}>} participants
 */
export function createLotto(participants) {
  const engine = Matter.Engine.create({
    // v1.5: 중력 1.0 → 0.55. 바람 부력감을 살리되 결국 출구로 빠지도록 약하게.
    gravity: { x: 0, y: 0.55 },
    enableSleeping: false,
  });
  const world = engine.world;

  const { cx, cy, radius, gapHalfAngle, tubeYTop, tubeYBot, tubeHalfWidth, ballRadius } =
    CHAMBER;

  // ── 챔버 boundary (gap을 제외한 segment ring) ──
  const gapAngleCenter = Math.PI / 2; // 바닥 (양수 y 방향)
  const segLen = ((2 * Math.PI * radius) / SEG_COUNT) * 1.06;
  const segments = [];
  for (let i = 0; i < SEG_COUNT; i++) {
    const a = (i / SEG_COUNT) * Math.PI * 2;
    // 각도 차이를 [-π, π]로 정규화 후 절댓값으로 비교
    let diff = a - gapAngleCenter;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) < gapHalfAngle) continue; // gap

    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    segments.push(
      Matter.Bodies.rectangle(x, y, segLen, 8, {
        isStatic: true,
        angle: a + Math.PI / 2,
        friction: 0.02,
        restitution: 0.5,
        label: 'wall',
      })
    );
  }

  // ── 출구 튜브 (수직 좌·우 벽) ──
  const tubeMidY = (tubeYTop + tubeYBot) / 2;
  const tubeHeight = tubeYBot - tubeYTop;
  const tubeWalls = [
    Matter.Bodies.rectangle(cx - tubeHalfWidth, tubeMidY, 8, tubeHeight, {
      isStatic: true,
      friction: 0.02,
      restitution: 0.5,
      label: 'tube',
    }),
    Matter.Bodies.rectangle(cx + tubeHalfWidth, tubeMidY, 8, tubeHeight, {
      isStatic: true,
      friction: 0.02,
      restitution: 0.5,
      label: 'tube',
    }),
  ];

  // ── 출구 게이트 (warmup 동안 닫혀 있음) ──
  // gap 폭만큼의 가로 막대를 챔버 바닥 살짝 안쪽에 배치. warmup 종료 시 World.remove.
  const gateWidth = Math.sin(gapHalfAngle) * radius * 2 + 16; // 약 88px
  const gate = Matter.Bodies.rectangle(cx, cy + radius - 4, gateWidth, 8, {
    isStatic: true,
    friction: 0.04,
    restitution: 0.5,
    label: 'gate',
  });

  Matter.World.add(world, [...segments, ...tubeWalls, gate]);

  // ── 공 배치: 챔버 내부에 격자형으로 흩뿌림 ──
  const n = participants.length;
  const ballsByLabel = new Map();
  const ballBodies = [];
  // 격자 배치 — sqrt(n) 행렬로
  const cols = Math.ceil(Math.sqrt(n));
  const spacing = ballRadius * 2.2;
  const startX = cx - ((cols - 1) * spacing) / 2;
  const startY = cy - radius * 0.55;

  participants.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * spacing + (randFloat() - 0.5) * 6;
    const y = startY + row * spacing + (randFloat() - 0.5) * 6;
    const body = Matter.Bodies.circle(x, y, ballRadius, {
      // v1.5 사용자 피드백: 공기가 많이 든 가벼운 공처럼 위로 잘 뜨도록.
      restitution: 0.78,
      friction: 0.04,
      frictionAir: 0.008, // 약간의 공기 저항
      density: 0.0011,
      label: p.id,
    });
    ballsByLabel.set(p.id, {
      participant: p,
      body,
      extracted: false,
      rank: null,
      finishTime: null,
    });
    ballBodies.push(body);
  });
  Matter.World.add(world, ballBodies);

  return {
    engine,
    world,
    ballsByLabel,
    elapsed: 0,
    nextRank: 1,
    results: [],
    finished: false,
    lastShakeAt: 0,
    n,
    shakeInterval: shakeIntervalSec(n),
    shakeForce: shakeForceMag(n),
    // v1.5 2-phase
    phase: 'warmup', // 'warmup' | 'extracting' | 'done'
    warmupDuration: WARMUP_MIN_SEC + randFloat() * (WARMUP_MAX_SEC - WARMUP_MIN_SEC),
    gate,
    // v2 V5 — 추첨기 가속 페이크 (격렬 진동 1회). extracting 진입 후 1.5초 시점, 0.5초 동안.
    vortex: {
      triggerOffset: 1.5, // extracting 시작 후 몇 초 뒤
      duration: 0.5,
      startedAt: null, // 트리거된 시각 (state.elapsed 기준)
      finished: false,
    },
  };
}

export function stepLotto(state, dt) {
  if (state.finished || dt <= 0) return state;
  state.elapsed += dt;

  // 2-phase 전환: warmup 종료 시 게이트 제거 후 extracting 단계로
  if (state.phase === 'warmup' && state.elapsed >= state.warmupDuration) {
    if (state.gate) {
      Matter.World.remove(state.world, state.gate);
      state.gate = null;
    }
    state.phase = 'extracting';
  }

  // v2 V5 — 추첨기 가속 페이크 트리거 + 종료
  if (
    state.phase === 'extracting' &&
    !state.vortex.startedAt &&
    !state.vortex.finished &&
    state.elapsed >= state.warmupDuration + state.vortex.triggerOffset
  ) {
    state.vortex.startedAt = state.elapsed;
  }
  const inVortex =
    state.vortex.startedAt !== null &&
    !state.vortex.finished &&
    state.elapsed < state.vortex.startedAt + state.vortex.duration;
  if (state.vortex.startedAt && !state.vortex.finished && !inVortex) {
    state.vortex.finished = true;
  }

  // 휘젓기 임펄스 — 사용자 피드백: 바람에 띄운 공처럼 위로 붕붕.
  // 실제 빙고 머신: warmup = 강한 송풍기(공이 떠오름), extracting = 송풍 약화(중력 우세).
  // V5 vortex 단계: 모든 공에 격렬한 위쪽 + 회전성 임펄스 (시각만, 결과 분포는 카오틱)
  if (state.elapsed - state.lastShakeAt >= state.shakeInterval) {
    state.lastShakeAt = state.elapsed;
    const isWarmup = state.phase === 'warmup';
    let lift = isWarmup ? 1.3 : 0.0;
    let forceScale = isWarmup ? 1.0 : 0.4;
    if (inVortex) {
      lift = 2.2;
      forceScale = 1.8;
    }
    const f = state.shakeForce * forceScale;
    for (const entry of state.ballsByLabel.values()) {
      if (entry.extracted) continue;
      const fy = -f * lift * (0.7 + randFloat() * 0.9);
      // vortex 중에는 좌우 sin 회전성 추가
      const fx = inVortex
        ? (randFloat() - 0.5) * f * 1.6 +
          Math.sin(state.elapsed * 6 + entry.body.position.x * 0.05) * f * 0.6
        : (randFloat() - 0.5) * f * 1.4;
      Matter.Body.applyForce(entry.body, entry.body.position, { x: fx, y: fy });
    }
  }

  // extracting 진입 시 중력을 키워 자연스러운 낙하 보장
  if (state.phase === 'extracting' && state.engine.world.gravity.y < 1.4) {
    state.engine.world.gravity.y = 1.4;
  }

  // dt가 60Hz보다 클 때 안정성 위해 분할 update
  const stepMs = Math.min(dt, 1 / 30) * 1000;
  Matter.Engine.update(state.engine, stepMs);
  if (dt > 1 / 30) {
    Matter.Engine.update(state.engine, (dt - 1 / 30) * 1000);
  }

  // 추출 체크 — extracting 단계에서만
  if (state.phase === 'extracting') {
    for (const entry of state.ballsByLabel.values()) {
      if (entry.extracted) continue;
      if (entry.body.position.y > CHAMBER.extractY) {
        entry.extracted = true;
        entry.rank = state.nextRank++;
        entry.finishTime = state.elapsed;
        state.results.push(entry);
        Matter.World.remove(state.world, entry.body);
      }
    }

    if (state.results.length === state.ballsByLabel.size) {
      state.finished = true;
      state.phase = 'done';
    }
  }
  return state;
}

export function getLottoRankings(state) {
  return state.results.map((e) => ({
    id: e.participant.id,
    name: e.participant.name,
    displayName: e.participant.displayName,
    emoji: e.participant.emoji,
    rank: e.rank,
  }));
}

/**
 * 현재 활성 공들의 렌더링용 스냅샷.
 */
export function getLottoSnapshot(state) {
  const balls = [];
  for (const entry of state.ballsByLabel.values()) {
    if (entry.extracted) continue;
    const { body, participant } = entry;
    balls.push({
      id: participant.id,
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      emoji: participant.emoji,
      displayName: participant.displayName,
    });
  }
  return balls;
}

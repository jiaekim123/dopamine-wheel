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
      // 두께 12 — 빠른 공이 세그먼트를 한 frame 안에 통과(tunneling)하지 않도록 보강.
      Matter.Bodies.rectangle(x, y, segLen, 12, {
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

  // 휘젓기 임펄스 — 사용자 피드백: warmup 단계에서 사방에서 바람이 도는 것처럼 챔버 전체를 삥삥 돌게.
  // - warmup: 챔버 중심 기준 tangential vortex (CCW) + 약한 random + 미세 부력
  // - extracting: 횡방향 random만 → gravity 우세로 자연 낙하
  // - V5 페이크(vortex): 격렬한 위쪽 + sin 회전성
  if (state.elapsed - state.lastShakeAt >= state.shakeInterval) {
    state.lastShakeAt = state.elapsed;
    const isWarmup = state.phase === 'warmup';
    const forceScale = isWarmup ? 1.0 : inVortex ? 1.4 : 0.4;
    const f = state.shakeForce * forceScale;

    for (const entry of state.ballsByLabel.values()) {
      if (entry.extracted) continue;
      let fx;
      let fy;
      if (isWarmup) {
        // 챔버 중심 → 공으로의 vector를 90° CCW 회전 (tangential 방향)
        const dx = entry.body.position.x - CHAMBER.cx;
        const dy = entry.body.position.y - CHAMBER.cy;
        const d = Math.hypot(dx, dy) + 0.01;
        const tangMag = f * 1.7;
        fx = (-dy / d) * tangMag + (randFloat() - 0.5) * f * 0.5;
        fy = (dx / d) * tangMag + (randFloat() - 0.5) * f * 0.5 - f * 0.35; // 살짝 부력
      } else if (inVortex) {
        // V5 페이크 — 격렬한 vortex(회전) 우세로 변경. 위쪽 폭발 줄여 tunneling 방지.
        const dx = entry.body.position.x - CHAMBER.cx;
        const dy = entry.body.position.y - CHAMBER.cy;
        const d = Math.hypot(dx, dy) + 0.01;
        const tangMag = f * 1.8;
        fx = (-dy / d) * tangMag + (randFloat() - 0.5) * f * 0.6;
        fy = (dx / d) * tangMag + (randFloat() - 0.5) * f * 0.6 - f * 0.4;
      } else {
        // extracting: 횡방향만
        fy = (randFloat() - 0.5) * f * 0.8;
        fx = (randFloat() - 0.5) * f * 1.4;
      }
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

  // 안전 장치 1 — 공 속도 캡 (tunneling 방지)
  // 임계값 이상 빠른 공은 같은 방향으로 클램프해 segment 통과를 막는다.
  const MAX_BALL_SPEED = 18;
  for (const entry of state.ballsByLabel.values()) {
    if (entry.extracted) continue;
    const v = entry.body.velocity;
    const sp = Math.hypot(v.x, v.y);
    if (sp > MAX_BALL_SPEED) {
      const k = MAX_BALL_SPEED / sp;
      Matter.Body.setVelocity(entry.body, { x: v.x * k, y: v.y * k });
    }
  }

  // 안전 장치 2 — 챔버 외부 escape recovery
  // 공이 어떤 이유로든 챔버 boundary 밖으로 빠져나갔으면 (튜브 진입은 제외) 중심으로 복귀.
  const escapeDist = CHAMBER.radius + 40;
  for (const entry of state.ballsByLabel.values()) {
    if (entry.extracted) continue;
    const px = entry.body.position.x;
    const py = entry.body.position.y;
    // 튜브 영역(아래쪽 출구)으로 정상 진입 중이면 건드리지 않음
    const inTubeArea =
      Math.abs(px - CHAMBER.cx) < CHAMBER.tubeHalfWidth + 4 && py > CHAMBER.tubeYTop - 8;
    if (inTubeArea) continue;
    const dx = px - CHAMBER.cx;
    const dy = py - CHAMBER.cy;
    if (Math.hypot(dx, dy) > escapeDist) {
      // 챔버 안쪽 무작위 위치로 복귀 + velocity 0
      Matter.Body.setPosition(entry.body, {
        x: CHAMBER.cx + (randFloat() - 0.5) * CHAMBER.radius * 0.6,
        y: CHAMBER.cy + (randFloat() - 0.5) * CHAMBER.radius * 0.6,
      });
      Matter.Body.setVelocity(entry.body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(entry.body, 0);
    }
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

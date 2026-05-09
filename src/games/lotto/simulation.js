// PRD §3.2 + §7.5 — 럭키 로또 (Forest) matter.js 시뮬레이션.
//
// 원형 챔버 안에 참가자 수만큼 공이 들어 있고, 챔버 바닥에 좁은 출구가 있다.
// 주기적으로 공 전체에 위쪽/측면 임펄스("바람")를 가해 무작위로 휘저으며,
// 출구를 통해 빠져나간 공이 추출 순서대로 rank를 갖는다.
// 결과를 미리 정해두지 않으며, 물리 시뮬 그대로가 결과 (PRD §3.2).

import Matter from 'matter-js';
import { randFloat } from '../../lib/random.js';

// Chamber geometry — pixel 단위. 화면 비율은 컴포넌트에서 viewBox로 스케일.
export const CHAMBER = {
  width: 800,
  height: 920,
  cx: 400,
  cy: 380,
  radius: 240,
  // 출구 게이트: 챔버 바닥의 작은 호 (라디안). 0.16 ≈ 18°.
  gapHalfAngle: 0.16,
  // 출구 튜브 (수직). 폭은 공 지름 * 1.4 정도.
  tubeYTop: 380 + 240 - 4, // chamber 하단부 살짝 안쪽
  tubeYBot: 380 + 240 + 160,
  tubeHalfWidth: 30, // ball radius * ~1.4
  // 추출 판정 라인 (이 Y 이하로 내려가면 추출)
  extractY: 380 + 240 + 130,
  ballRadius: 22,
};

const SEG_COUNT = 60;

// 주기적 휘젓기 — n명에 따라 추출 속도 조정. n이 클수록 더 강한 임펄스로 시간 보장.
function shakeIntervalSec(n) {
  return Math.max(0.08, 0.18 - n * 0.003);
}

function shakeForceMag(n) {
  return 0.022 + Math.min(n, 30) * 0.0008;
}

/**
 * @param {Array<{id:string,name:string,displayName:string,emoji:string}>} participants
 */
export function createLotto(participants) {
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 1.0 },
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

  Matter.World.add(world, [...segments, ...tubeWalls]);

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
      restitution: 0.74,
      friction: 0.04,
      frictionAir: 0.005,
      density: 0.0015,
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
  };
}

export function stepLotto(state, dt) {
  if (state.finished || dt <= 0) return state;
  state.elapsed += dt;

  // 휘젓기 임펄스 — 모든 방향 랜덤. 출구로 빠지는 흐름을 막지 않도록 평균은 0에 가깝게.
  if (state.elapsed - state.lastShakeAt >= state.shakeInterval) {
    state.lastShakeAt = state.elapsed;
    const f = state.shakeForce;
    for (const entry of state.ballsByLabel.values()) {
      if (entry.extracted) continue;
      const fx = (randFloat() - 0.5) * f * 1.6;
      const fy = (randFloat() - 0.5) * f * 1.6;
      Matter.Body.applyForce(entry.body, entry.body.position, { x: fx, y: fy });
    }
  }

  // dt가 60Hz보다 클 때 안정성 위해 분할 update
  const stepMs = Math.min(dt, 1 / 30) * 1000;
  Matter.Engine.update(state.engine, stepMs);
  if (dt > 1 / 30) {
    Matter.Engine.update(state.engine, (dt - 1 / 30) * 1000);
  }

  // 추출 체크: 추출 라인 아래로 내려간 공
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

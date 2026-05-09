// PRD §3.2 + §7.7 — 운명의 낙하 (Mustard) matter.js 시뮬레이션.
//
// 못이 흩어진 좁은 통 안으로 공이 차례로 떨어지고, 못 사이를 튕겨가며 결국 바닥으로 빠진다.
// 빠지는 순서가 rank (PRD §3.2 — 결과 사전 미정, 물리 시뮬 결과가 그대로).
// 공/못 격자 밀도는 인원에 따라 조정 (PRD §7.7).

import Matter from 'matter-js';
import { randFloat } from '../../lib/random.js';

export const ROULETTE = {
  width: 700,
  height: 900,
  pegRadius: 5,
  pegFieldTop: 130,
  pegFieldBottom: 770,
  exitY: 880, // 이 Y를 넘어가면 exit (랭크 부여)
  wallThickness: 16,
};

// v1.5 PRD §7.7: 인원별 ballRadius + 이름 표시 정책 실측치
export function ballConfigFor(n) {
  if (n <= 10) return { ballRadius: 16, fontSize: 11, nameCut: 5, showName: true };
  if (n <= 25) return { ballRadius: 13, fontSize: 9, nameCut: 4, showName: true };
  if (n <= 35) return { ballRadius: 11, fontSize: 0, nameCut: 0, showName: false };
  return { ballRadius: 10, fontSize: 0, nameCut: 0, showName: false }; // 36~50명 (권장 초과)
}

// 인원에 따라 peg 격자 (PRD §7.7).
function pegLayoutFor(n) {
  if (n <= 10) return { rows: 8, cols: 7 };
  if (n <= 25) return { rows: 12, cols: 11 };
  return { rows: 16, cols: 15 };
}

function dropIntervalFor(n) {
  // 전체 드롭이 5~7초 안에 끝나도록 — 이후 튕기는 시간 + exit
  return Math.max(0.12, Math.min(0.6, 5 / n));
}

function buildPegs(world, n) {
  const { rows, cols } = pegLayoutFor(n);
  const innerLeft = ROULETTE.wallThickness + 24;
  const innerRight = ROULETTE.width - ROULETTE.wallThickness - 24;
  const fieldW = innerRight - innerLeft;
  const fieldH = ROULETTE.pegFieldBottom - ROULETTE.pegFieldTop;
  const rowSpacing = fieldH / (rows + 1);
  const colSpacing = fieldW / cols;

  const pegs = [];
  const positions = [];
  for (let r = 0; r < rows; r++) {
    const y = ROULETTE.pegFieldTop + (r + 1) * rowSpacing;
    const offset = r % 2 === 0 ? 0 : colSpacing / 2;
    for (let c = 0; c < cols; c++) {
      const x = innerLeft + offset + c * colSpacing;
      if (x < innerLeft || x > innerRight) continue;
      const body = Matter.Bodies.circle(x, y, ROULETTE.pegRadius, {
        isStatic: true,
        restitution: 0.55,
        friction: 0.04,
        label: 'peg',
      });
      pegs.push(body);
      positions.push({ x, y });
    }
  }
  Matter.World.add(world, pegs);
  return positions;
}

/**
 * @param {Array<{id:string,name:string,displayName:string,emoji:string}>} participants
 */
export function createRoulette(participants) {
  const n = participants.length;
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 0.55 },
    enableSleeping: false,
  });
  const world = engine.world;

  // 좌·우 벽
  Matter.World.add(world, [
    Matter.Bodies.rectangle(
      ROULETTE.wallThickness / 2,
      ROULETTE.height / 2,
      ROULETTE.wallThickness,
      ROULETTE.height + 400,
      { isStatic: true, restitution: 0.4, friction: 0.04, label: 'wall' }
    ),
    Matter.Bodies.rectangle(
      ROULETTE.width - ROULETTE.wallThickness / 2,
      ROULETTE.height / 2,
      ROULETTE.wallThickness,
      ROULETTE.height + 400,
      { isStatic: true, restitution: 0.4, friction: 0.04, label: 'wall' }
    ),
  ]);

  const pegPositions = buildPegs(world, n);

  // v2 V6 — 중간 기믹: 점프대 2개 (좌우 대각선). 못 격자 중간 높이에 배치.
  // 정적 회전 직사각형이라 공이 위에서 닿으면 측면으로 튕긴다.
  const fieldMidY = (ROULETTE.pegFieldTop + ROULETTE.pegFieldBottom) / 2;
  const innerLeft = ROULETTE.wallThickness + 24;
  const innerRight = ROULETTE.width - ROULETTE.wallThickness - 24;
  const fieldW = innerRight - innerLeft;
  const jumperLength = fieldW * 0.18;
  const jumperOpts = {
    isStatic: true,
    restitution: 0.7,
    friction: 0.03,
    label: 'jumper',
  };
  const jumpers = [
    {
      x: innerLeft + fieldW * 0.28,
      y: fieldMidY,
      angle: Math.PI / 6, // 30° 시계방향 (왼쪽 점프대 — 떨어진 공을 우측으로)
      length: jumperLength,
    },
    {
      x: innerLeft + fieldW * 0.72,
      y: fieldMidY,
      angle: -Math.PI / 6, // 30° 반시계방향 (오른쪽 점프대 — 우측 공을 좌측으로)
      length: jumperLength,
    },
  ];
  const jumperBodies = jumpers.map((j) =>
    Matter.Bodies.rectangle(j.x, j.y, j.length, 6, { ...jumperOpts, angle: j.angle })
  );
  Matter.World.add(world, jumperBodies);

  // 공 — 드롭 큐로 관리. 시뮬레이션 진행 중 점진적으로 추가.
  const ballsByLabel = new Map();
  participants.forEach((p) => {
    ballsByLabel.set(p.id, {
      participant: p,
      body: null,
      added: false,
      exited: false,
      rank: null,
      finishTime: null,
    });
  });

  return {
    engine,
    world,
    ballsByLabel,
    pegPositions,
    elapsed: 0,
    nextRank: 1,
    results: [],
    finished: false,
    n,
    dropQueue: [...participants],
    nextDropAt: 0.3,
    dropInterval: dropIntervalFor(n),
    lastExitedId: null,
    // stuck 방지용 휘젓기 — 한참 동안 exit이 없으면 모든 공에 횡력 인가
    lastExitAt: 0,
    // v1.5: 인원별 ball 설정
    ballConfig: ballConfigFor(n),
    // v2 V6: 점프대 시각화용 위치
    jumpers,
  };
}

export function stepRoulette(state, dt) {
  if (state.finished || dt <= 0) return state;
  state.elapsed += dt;

  // 드롭 큐: 정해진 인터벌마다 공 1개 투입
  while (state.dropQueue.length > 0 && state.elapsed >= state.nextDropAt) {
    const p = state.dropQueue.shift();
    const x = ROULETTE.width / 2 + (randFloat() - 0.5) * 80;
    const y = 30;
    const body = Matter.Bodies.circle(x, y, state.ballConfig.ballRadius, {
      restitution: 0.55,
      friction: 0.04,
      frictionAir: 0.002,
      density: 0.0014,
      label: p.id,
    });
    Matter.Body.setVelocity(body, { x: (randFloat() - 0.5) * 1.5, y: 0 });
    state.ballsByLabel.get(p.id).body = body;
    state.ballsByLabel.get(p.id).added = true;
    Matter.World.add(state.world, body);
    state.nextDropAt = state.elapsed + state.dropInterval;
  }

  // matter step (분할)
  const stepMs = Math.min(dt, 1 / 30) * 1000;
  Matter.Engine.update(state.engine, stepMs);
  if (dt > 1 / 30) {
    Matter.Engine.update(state.engine, (dt - 1 / 30) * 1000);
  }

  // exit 체크
  for (const entry of state.ballsByLabel.values()) {
    if (!entry.added || entry.exited) continue;
    if (entry.body.position.y > ROULETTE.exitY) {
      entry.exited = true;
      entry.rank = state.nextRank++;
      entry.finishTime = state.elapsed;
      state.results.push(entry);
      state.lastExitedId = entry.participant.id;
      state.lastExitAt = state.elapsed;
      Matter.World.remove(state.world, entry.body);
    }
  }

  // stuck 방지 — 1.5초 이상 exit 없으면 살아있는 공 전원에 횡력 인가
  if (
    state.results.length < state.n &&
    state.dropQueue.length === 0 &&
    state.elapsed - state.lastExitAt > 1.5
  ) {
    state.lastExitAt = state.elapsed; // 한 번만 적용 후 다시 1.5초 대기
    for (const entry of state.ballsByLabel.values()) {
      if (!entry.added || entry.exited) continue;
      const fx = (randFloat() - 0.5) * 0.025;
      const fy = -0.005;
      Matter.Body.applyForce(entry.body, entry.body.position, { x: fx, y: fy });
    }
  }

  if (state.results.length === state.n) {
    state.finished = true;
  }
  return state;
}

export function getRouletteRankings(state) {
  return state.results.map((e) => ({
    id: e.participant.id,
    name: e.participant.name,
    displayName: e.participant.displayName,
    emoji: e.participant.emoji,
    rank: e.rank,
  }));
}

export function getRouletteSnapshot(state) {
  const balls = [];
  for (const entry of state.ballsByLabel.values()) {
    if (!entry.added || entry.exited) continue;
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

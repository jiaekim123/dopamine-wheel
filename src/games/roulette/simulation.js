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
// v2.2: 장애물 강화 — 각 layout에서 rows +1.
function pegLayoutFor(n) {
  if (n <= 10) return { rows: 9, cols: 7 };
  if (n <= 25) return { rows: 13, cols: 11 };
  return { rows: 17, cols: 15 };
}

/**
 * v2.2 — 동시 낙하 시작 위치.
 * 모든 공을 챔버 위쪽(Y<0)에 격자형으로 쌓아 두고 동시에 떨어뜨림.
 * cols = min(10, ceil(sqrt(n × 1.5))) — n=10→4 / n=25→7 / n=50→9
 * rows = ceil(n / cols)
 */
function computeStartPositions(n, innerLeft, innerRight) {
  const fieldW = innerRight - innerLeft;
  const cols = Math.min(10, Math.ceil(Math.sqrt(n * 1.5)));
  const colSpacing = fieldW / cols;
  const rowSpacing = 35;
  const positions = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = innerLeft + (c + 0.5) * colSpacing + (randFloat() - 0.5) * 6;
    const y = -30 - r * rowSpacing; // 챔버 위로 쌓음 (Y<0)
    positions.push({ x, y });
  }
  return positions;
}

/**
 * v2.1 / v2.2 — 점프대 무작위 배치.
 * - 개수: v2.2부터 **3~5개** (`randInt(3) + 3`).
 * - 위치: X=innerLeft+15~85%fieldW / Y=pegFieldTop+25~75%fieldH (못 격자 중간 영역).
 * - 각도: -35° ~ +35°.
 * - 길이: fieldW × (0.12 ~ 0.18).
 * - 점프대끼리 최소 거리 fieldW × 0.18, rejection sampling 50회 시도.
 */
function pickJumpers(innerLeft, fieldW, fieldTop, fieldH) {
  const targetCount = 3 + Math.floor(randFloat() * 3); // 3,4,5
  const minDistSq = (fieldW * 0.18) ** 2;
  const jumpers = [];
  let attempts = 0;
  while (jumpers.length < targetCount && attempts < 50) {
    attempts++;
    const x = innerLeft + (0.15 + randFloat() * 0.7) * fieldW;
    const y = fieldTop + (0.25 + randFloat() * 0.5) * fieldH;
    // 거리 체크 — 기존 점프대와 너무 가까우면 reject
    const tooClose = jumpers.some((j) => {
      const dx = j.x - x;
      const dy = j.y - y;
      return dx * dx + dy * dy < minDistSq;
    });
    if (tooClose) continue;
    // 각도 ±35° — 너무 가파르면 공이 위로 튕겨 stuck 위험
    const angle = (randFloat() - 0.5) * (Math.PI * 35 / 180) * 2;
    const length = fieldW * (0.12 + randFloat() * 0.06); // 0.12 ~ 0.18
    jumpers.push({ x, y, angle, length });
  }
  return jumpers;
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
  // v2.5.1 — 좌우 끝 커버리지 수정. 이전엔 짝수 행 c<cols 루프로 우측 1칸 peg가 없어
  // 맨 오른쪽 bin으로 떨어진 공이 수직 낙하하는 현상이 있었음.
  // 수정: 짝수 행은 cols+1개 peg (양 끝 innerLeft·innerRight에 닿음),
  //       홀수 행은 cols개 peg (반칸 안쪽에서 시작/끝).
  for (let r = 0; r < rows; r++) {
    const y = ROULETTE.pegFieldTop + (r + 1) * rowSpacing;
    const isOdd = r % 2 === 1;
    const offset = isOdd ? colSpacing / 2 : 0;
    const endC = isOdd ? cols : cols + 1; // exclusive
    for (let c = 0; c < endC; c++) {
      const x = innerLeft + offset + c * colSpacing;
      if (x < innerLeft - 0.5 || x > innerRight + 0.5) continue;
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

  // v2.1 — 점프대 무작위 배치. 매 게임 다르게 2~4개를 임의 위치에 배치.
  const innerLeft = ROULETTE.wallThickness + 24;
  const innerRight = ROULETTE.width - ROULETTE.wallThickness - 24;
  const fieldW = innerRight - innerLeft;
  const fieldH = ROULETTE.pegFieldBottom - ROULETTE.pegFieldTop;
  const jumpers = pickJumpers(innerLeft, fieldW, ROULETTE.pegFieldTop, fieldH);
  const jumperOpts = {
    isStatic: true,
    restitution: 0.85, // 더 잘 튕기게 (이전 0.7)
    friction: 0.005, // 표면 미끄럽게 (이전 0.03) — 공이 위에서 안정적으로 정지하지 못하게
    label: 'jumper',
  };
  const jumperBodies = jumpers.map((j) =>
    Matter.Bodies.rectangle(j.x, j.y, j.length, 6, { ...jumperOpts, angle: j.angle })
  );
  Matter.World.add(world, jumperBodies);

  // v2.2 — 공을 시작 시점에 모두 동시 배치 (Plinko Tournament).
  // 챔버 위쪽(Y<0)에 격자형으로 쌓아 두면 한꺼번에 떨어진다.
  const ballConfig = ballConfigFor(n);
  const startPositions = computeStartPositions(n, innerLeft, innerRight);
  const ballsByLabel = new Map();
  const ballBodies = [];
  participants.forEach((p, i) => {
    const { x, y } = startPositions[i];
    const body = Matter.Bodies.circle(x, y, ballConfig.ballRadius, {
      restitution: 0.55,
      friction: 0.04,
      frictionAir: 0.002,
      density: 0.0014,
      label: p.id,
    });
    Matter.Body.setVelocity(body, { x: (randFloat() - 0.5) * 1.2, y: 0 });
    ballsByLabel.set(p.id, {
      participant: p,
      body,
      added: true, // 즉시 추가됨
      exited: false,
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
    pegPositions,
    elapsed: 0,
    nextRank: 1,
    results: [],
    finished: false,
    n,
    // v2.2: dropQueue 제거 (동시 낙하). 호환성 위해 빈 배열만 유지.
    dropQueue: [],
    nextDropAt: 0,
    dropInterval: 0,
    lastExitedId: null,
    // stuck 방지용 휘젓기 (전역) + 개별 공 stuck timer (per-ball)
    lastExitAt: 0,
    ballStuckTimer: new Map(), // id → 누적 정지 시간(s)
    // v1.5: 인원별 ball 설정
    ballConfig,
    // v2 V6: 점프대 시각화용 위치
    jumpers,
  };
}

export function stepRoulette(state, dt) {
  if (state.finished || dt <= 0) return state;
  state.elapsed += dt;

  // v2.2: 공은 createRoulette에서 모두 동시 배치되므로 dropQueue 처리 불필요.

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

  // 개별 공 stuck 감지 + 강한 횡력 인가.
  // 사용자 피드백 (2026-05-09): 공이 점프대 위에 균형 잡혀 영영 안 떨어지는 케이스.
  // velocity 매우 낮은 상태로 0.5초 이상 지속되면 강한 random 방향 + 위쪽 임펄스로 차냄.
  for (const entry of state.ballsByLabel.values()) {
    if (!entry.added || entry.exited) continue;
    const v = entry.body.velocity;
    const speedSq = v.x * v.x + v.y * v.y;
    const id = entry.participant.id;
    const prev = state.ballStuckTimer.get(id) ?? 0;
    if (speedSq < 0.05) {
      // 거의 정지 — 누적
      const next = prev + dt;
      if (next >= 0.5) {
        // 0.5초 이상 정지 → 강한 random 방향 + 위쪽 살짝 띄움
        const dir = randFloat() < 0.5 ? -1 : 1;
        const fx = dir * (0.05 + randFloat() * 0.06);
        const fy = -0.025 - randFloat() * 0.02;
        Matter.Body.applyForce(entry.body, entry.body.position, { x: fx, y: fy });
        // 회전도 살짝 — 점프대 위에서 미끄러지도록
        Matter.Body.setAngularVelocity(entry.body, (randFloat() - 0.5) * 0.4);
        state.ballStuckTimer.set(id, 0);
      } else {
        state.ballStuckTimer.set(id, next);
      }
    } else if (prev > 0) {
      state.ballStuckTimer.set(id, 0);
    }
  }

  // (백업) 전역 stuck 방지 — 어떤 공도 1.5초 이상 빠지지 않으면 모든 공에 옆으로 살짝 흔들기.
  if (
    state.results.length < state.n &&
    state.elapsed - state.lastExitAt > 1.5
  ) {
    state.lastExitAt = state.elapsed;
    for (const entry of state.ballsByLabel.values()) {
      if (!entry.added || entry.exited) continue;
      const fx = (randFloat() - 0.5) * 0.04;
      const fy = -0.008;
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

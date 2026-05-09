// PRD §3.1 — 무작위 소스 (Web Crypto API)
// 모듈로 편향(modulo bias)을 제거한 무편향 정수 생성을 보장한다.
//
// 테스트 모드(import.meta.env.MODE === 'test')에서는 mulberry32 PRNG로
// 시드 주입이 가능하도록 대체된다. PRD §13.2 참조.

const isTestMode =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test';

// --- Test seed support (mulberry32) ---
let seedState = null;

/**
 * 테스트 빌드에서만 호출 가능. 시드 주입 후 randInt/randFloat가 결정적으로 동작.
 * 프로덕션 빌드에서 호출되면 무시(no-op)된다.
 */
export function __setTestSeed(seed) {
  if (!isTestMode) return;
  seedState = seed >>> 0;
}

export function __clearTestSeed() {
  seedState = null;
}

function mulberry32() {
  // 시드가 없으면 부르지 않음 — caller가 seedState를 확인.
  let t = (seedState += 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
}

/**
 * 0 이상 max 미만의 무편향 정수.
 * - max는 양의 정수여야 한다.
 * - rejection sampling으로 modulo bias 제거.
 */
export function randInt(max) {
  if (!Number.isInteger(max) || max <= 0) {
    throw new Error(`randInt: max must be a positive integer, got ${max}`);
  }

  // 테스트 시드 모드: mulberry32 사용
  if (isTestMode && seedState !== null) {
    return Math.floor(mulberry32() * max);
  }

  // 프로덕션: Web Crypto API + rejection sampling
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  // 무한 루프 방지: 이론상 평균 1.5회 이내, 안전하게 1000회 한도
  for (let i = 0; i < 1000; i++) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
  // 극히 드문 경우의 fallback
  return buf[0] % max;
}

/**
 * 0 이상 1 미만의 실수.
 */
export function randFloat() {
  if (isTestMode && seedState !== null) {
    return mulberry32();
  }
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x100000000;
}

/**
 * Fisher–Yates shuffle. 입력 배열을 in-place 셔플하고 같은 배열을 반환.
 */
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 배열에서 무작위로 하나 선택.
 */
export function randPick(arr) {
  if (arr.length === 0) return undefined;
  return arr[randInt(arr.length)];
}

/**
 * 0~max 사이 정수를 N개 무작위로 (중복 없이) 뽑아 정렬해 반환.
 * count > max + 1 이면 throw.
 */
export function randSample(max, count) {
  if (count > max) {
    throw new Error(`randSample: count(${count}) cannot exceed max(${max})`);
  }
  const pool = Array.from({ length: max }, (_, i) => i);
  shuffle(pool);
  return pool.slice(0, count).sort((a, b) => a - b);
}

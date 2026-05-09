// PRD §10.2 — 시그니처 컬러 / 보조 톤 / 메달 컬러를 JS 런타임에서 사용 가능하도록 노출.
// Tailwind 클래스만으로 표현하기 어려운 동적 스타일(컨페티 팔레트, 인라인 backgroundColor 등)에서 사용.

export const SIGNATURE_BY_GAME = {
  horse: '#aa2d00', // signature-coral
  lotto: '#0a2e0e', // signature-forest
  bomb: '#181d26', // surface-dark
  roulette: '#d9a441', // signature-mustard
};

// PRD §10.2 보조 팔레트 — 결과 박스 보조 톤, 컨페티, 이모지 칩 등에 사용.
export const ACCENTS = ['#fcab79', '#a8d8c4', '#f4d35e', '#f5e9d4'];

// PRD §10.10: 컨페티는 시그니처 팔레트로만 (네온 RGB 회피).
export const CONFETTI_PALETTE = [
  '#aa2d00', // coral
  '#0a2e0e', // forest
  '#d9a441', // mustard
  '#fcab79', // peach
  '#a8d8c4', // mint
  '#f4d35e', // yellow
  '#f5e9d4', // cream
];

// 밝은 배경(보조 톤 일부 + mustard) 위에서는 ink 텍스트, 그 외에는 화이트.
const LIGHT_BACKGROUNDS = new Set(['#d9a441', '#fcab79', '#f4d35e', '#f5e9d4', '#a8d8c4']);

export function textOnBg(bg) {
  return LIGHT_BACKGROUNDS.has(bg) ? '#181d26' : '#ffffff';
}

// PRD §8.2 메달 시스템.
export function medalFor(rank) {
  if (rank === 1) return { color: '#ffd700', label: '🥇' };
  if (rank === 2) return { color: '#c0c0c0', label: '🥈' };
  if (rank === 3) return { color: '#cd7f32', label: '🥉' };
  // 4등 이후: 보조 톤 순환
  return { color: ACCENTS[(rank - 4) % ACCENTS.length], label: '' };
}

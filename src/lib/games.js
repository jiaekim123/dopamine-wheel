// PRD §4 미니게임 4종 라인업 + §6.6 게임 카드 메타데이터.
// 시그니처 컬러는 §10.2 토큰명과 1:1로 매칭. (token은 Tailwind class 접미사)

export const GAMES = [
  {
    id: 'horse',
    emoji: '🐎',
    name: '경주마',
    nameEn: 'Horse Race',
    description: '결승선까지 매 프레임 가속도 추첨',
    minPlayers: 2,
    // v2 V4: 시네마틱 카메라(선두 PIP) 도입으로 16명까지 확장
    maxPlayers: 16,
    durationSec: [12, 20],
    // 시그니처 컬러 (Tailwind class 직접 매칭용)
    bg: 'bg-signature-coral',
    text: 'text-on-dark',
    glow: 'shadow-glow-coral',
    // 호버 시 살짝 밝게 — 채도 5% ↑ 효과는 brightness로 근사
    hoverFx: 'hover:brightness-110',
  },
  {
    id: 'lotto',
    emoji: '🎱',
    name: '럭키 로또',
    nameEn: 'Lucky Lotto',
    description: '추첨기 안 공이 출구로 나오는 순서',
    minPlayers: 2,
    maxPlayers: 30,
    durationSec: [10, 18],
    bg: 'bg-signature-forest',
    text: 'text-on-dark',
    glow: 'shadow-glow-forest',
    hoverFx: 'hover:brightness-125',
  },
  {
    id: 'bomb',
    emoji: '💣',
    name: '폭탄 돌리기',
    nameEn: 'Time Bomb',
    description: '점점 빨라지는 불꽃, 무작위 폭발 시점',
    minPlayers: 2,
    maxPlayers: 20,
    durationSec: [10, 25],
    bg: 'bg-surface-dark',
    text: 'text-on-dark',
    glow: '',
    hoverFx: 'hover:brightness-125',
  },
  {
    id: 'roulette',
    emoji: '🪂',
    name: '운명의 낙하',
    nameEn: 'Falling Fate',
    description: '못 사이로 떨어지는 공, 칸 추출',
    minPlayers: 2,
    // v1.5: 권장 35명, 50명까지 가능 (권장 초과 시 경고 배지)
    maxPlayers: 35,
    hardMaxPlayers: 50,
    durationSec: [15, 30],
    bg: 'bg-signature-mustard',
    // v1.4.1: 다크 머스타드(#946d12) → on-dark 텍스트 (WCAG AA 통과)
    text: 'text-on-dark',
    glow: 'shadow-glow-mustard',
    hoverFx: 'hover:brightness-125',
  },
];

export function getGameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// PRD §6.6: 인원이 권장치 초과인 게임에 경고 배지 부착.
// n < minPlayers면 비활성, n > maxPlayers면 권장 초과 (선택은 가능).
export function getGameAvailability(game, n) {
  if (n < game.minPlayers) {
    return { disabled: true, reason: `최소 ${game.minPlayers}명 필요`, warn: false };
  }
  if (n > game.maxPlayers) {
    return { disabled: false, reason: `권장 최대 ${game.maxPlayers}명 초과`, warn: true };
  }
  return { disabled: false, reason: null, warn: false };
}

// PRD §6.6 — 시그니처 컬러 게임 카드.
// Editorial Mode 안의 시그니처 카드: 풀블리드 컬러, rounded-lg(12px), 패딩 xxl(48px).
// 그림자 없음 (Airtable 철학). 호버 시 translateY(-4px)만.
// 비활성: 채도 30% + 클릭 차단. 권장 초과: 채도 70% + 경고 배지.

import { useGameStore } from '../store/useGameStore.js';
import { getGameAvailability } from '../lib/games.js';

export default function GameCard({ game }) {
  const participants = useGameStore((s) => s.participants);
  const startable = useGameStore((s) => s.isGameStartable());
  const startGame = useGameStore((s) => s.startGame);

  const n = participants.length;
  const { disabled: capacityDisabled, reason, warn } = getGameAvailability(game, n);

  // 카드 비활성화 = 인원/k/직접입력 검증 중 어느 하나라도 실패
  const disabled = capacityDisabled || !startable;

  // 채도 처리: 비활성 30%, 권장 초과 70%
  const saturation = disabled ? 'saturate-[0.3]' : warn ? 'saturate-[0.7]' : 'saturate-100';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => startGame(game.id)}
      aria-label={`${game.name} — ${game.description}`}
      className={[
        'relative flex flex-col items-start text-left',
        'p-xxl rounded-lg',
        'transition-[transform,filter] duration-200 ease-system',
        game.bg,
        game.text,
        saturation,
        disabled
          ? 'cursor-not-allowed opacity-80'
          : `cursor-pointer ${game.hoverFx} hover:-translate-y-1`,
        'focus:outline-none focus-visible:shadow-focus-ring focus-visible:ring-0',
      ].join(' ')}
    >
      {warn && !capacityDisabled && (
        <span
          className="absolute top-md right-md px-sm py-xxs rounded-full bg-canvas/90 text-ink text-caption"
          aria-label="권장 인원 초과"
        >
          ⚠ 권장 초과
        </span>
      )}

      <div className="text-[64px] leading-none mb-md" aria-hidden="true">
        {game.emoji}
      </div>

      <h3 className="text-title-lg font-medium mb-xs">{game.name}</h3>

      <p className="text-body-md opacity-80 mb-md">{game.description}</p>

      <div className="mt-auto text-caption opacity-70">
        {capacityDisabled ? (
          <span>{reason}</span>
        ) : (
          <span>
            권장 ~{game.maxPlayers}명 · {game.durationSec[0]}~{game.durationSec[1]}초
          </span>
        )}
      </div>
    </button>
  );
}

// PRD §10.9 — 데스크톱 4-up / 태블릿 2-up / 모바일 1-up.
// 게임 카드 그리드 + 비활성 사유 안내.

import { GAMES } from '../lib/games.js';
import { useGameStore } from '../store/useGameStore.js';
import GameCard from './GameCard.jsx';

export default function GameCardGrid() {
  const participants = useGameStore((s) => s.participants);
  const winnerCount = useGameStore((s) => s.winnerCount);
  const winnerMode = useGameStore((s) => s.winnerMode);
  const winnerRanks = useGameStore((s) => s.winnerRanks);
  const startable = useGameStore((s) => s.isGameStartable());

  const n = participants.length;

  // 어느 단계에서 막혀있는지 안내 문구 (PRD §6.7)
  let hint = null;
  if (n < 2) {
    hint = '최소 2명 필요 — 참가자를 입력해주세요.';
  } else if (winnerCount < 1 || winnerCount >= n) {
    hint = `당첨자 수는 1 이상 ${n - 1} 이하여야 합니다.`;
  } else if (winnerMode === 'custom' && winnerRanks.length !== winnerCount) {
    hint = '직접 입력 모드: 정확히 k개의 유효한 순위를 입력해주세요.';
  }

  return (
    <section aria-labelledby="game-select-label">
      <h2
        id="game-select-label"
        className="text-display-md font-normal text-ink mb-lg"
      >
        게임 선택
      </h2>

      {hint && !startable && (
        <p className="mb-lg text-body-md text-amber" role="status">
          {hint}
        </p>
      )}

      <div
        className="grid gap-lg grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
        role="list"
      >
        {GAMES.map((game) => (
          <div role="listitem" key={game.id}>
            <GameCard game={game} />
          </div>
        ))}
      </div>
    </section>
  );
}

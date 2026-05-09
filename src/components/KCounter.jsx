// PRD §6.4 — 당첨자 수 (k) 입력.
// v1.4: 자유 입력. 범위(1 ≤ k < n) 초과 시 빨간 경고만 노출, 입력은 막지 않음.
// 게임 카드는 isGameStartable에서 차단되므로 상한 강제는 불필요.

import { useGameStore } from '../store/useGameStore.js';

export default function KCounter() {
  const winnerCount = useGameStore((s) => s.winnerCount);
  const participants = useGameStore((s) => s.participants);
  const setWinnerCount = useGameStore((s) => s.setWinnerCount);

  const n = participants.length;
  const tooFew = n < 2;
  const overMax = n >= 2 && winnerCount >= n;

  // 경고 메시지 결정
  let warning = null;
  if (tooFew) warning = '참가자를 2명 이상 입력해주세요.';
  else if (overMax) warning = `당첨자 수가 참가자(${n}명)와 같거나 많아 게임이 성립하지 않습니다.`;

  return (
    <section aria-labelledby="k-counter-label">
      <div className="flex items-center justify-between gap-md">
        <span id="k-counter-label" className="text-label-md font-medium text-ink">
          당첨자 수
        </span>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={() => setWinnerCount(winnerCount - 1)}
            disabled={winnerCount <= 1}
            aria-label="당첨자 수 감소"
            className="w-10 h-10 rounded-sm border border-hairline bg-canvas text-ink text-button font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:border-ink transition-colors"
          >
            −
          </button>
          <span
            className={`min-w-12 text-center text-title-md font-medium tabular-nums ${
              warning ? 'text-amber' : 'text-ink'
            }`}
            aria-live="polite"
          >
            {winnerCount}
          </span>
          <button
            type="button"
            onClick={() => setWinnerCount(winnerCount + 1)}
            aria-label="당첨자 수 증가"
            className="w-10 h-10 rounded-sm border border-hairline bg-canvas text-ink text-button font-medium hover:border-ink transition-colors"
          >
            +
          </button>
        </div>
      </div>
      {warning && (
        <p
          className="mt-xs text-caption text-amber"
          role="alert"
          style={{ color: '#d92d20' }}
        >
          ⚠ {warning}
        </p>
      )}
    </section>
  );
}

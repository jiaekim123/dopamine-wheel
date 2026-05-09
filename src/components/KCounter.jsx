// PRD §6.4 — 당첨자 수 (k) 입력.
// v1.4: 자유 입력. 범위 초과 시 빨간 경고만 노출.
// v2.5: 카지노 다크 톤 — elevated 카드 + 네온 시안 hover.

import { useGameStore } from '../store/useGameStore.js';

export default function KCounter() {
  const winnerCount = useGameStore((s) => s.winnerCount);
  const participants = useGameStore((s) => s.participants);
  const setWinnerCount = useGameStore((s) => s.setWinnerCount);

  const n = participants.length;
  const tooFew = n < 2;
  const overMax = n >= 2 && winnerCount >= n;

  let warning = null;
  if (tooFew) warning = '참가자를 2명 이상 입력해주세요.';
  else if (overMax) warning = `당첨자 수가 참가자(${n}명)와 같거나 많아 게임이 성립하지 않습니다.`;

  return (
    <section
      aria-labelledby="k-counter-label"
      className="rounded-md p-lg bg-casino-elevated"
      style={{ border: '1px solid rgba(0, 245, 255, 0.15)' }}
    >
      <div className="flex items-center justify-between gap-md">
        <span id="k-counter-label" className="text-label-md font-medium text-casino-text">
          당첨자 수
        </span>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={() => setWinnerCount(winnerCount - 1)}
            disabled={winnerCount <= 1}
            aria-label="당첨자 수 감소"
            className="w-10 h-10 rounded-sm bg-casino-base text-casino-text text-button font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-shadow"
            style={{ border: '1px solid rgba(0, 245, 255, 0.3)' }}
            onMouseEnter={(e) => {
              if (e.currentTarget.disabled) return;
              e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 245, 255, 0.5)';
              e.currentTarget.style.borderColor = '#00f5ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.borderColor = 'rgba(0, 245, 255, 0.3)';
            }}
          >
            −
          </button>
          <span
            className="min-w-12 text-center text-title-md font-medium tabular-nums"
            style={{
              color: warning ? '#e10600' : '#ffffff',
              textShadow: warning
                ? '0 0 12px rgba(225, 6, 0, 0.7)'
                : '0 0 12px rgba(255, 45, 146, 0.5)',
            }}
            aria-live="polite"
          >
            {winnerCount}
          </span>
          <button
            type="button"
            onClick={() => setWinnerCount(winnerCount + 1)}
            aria-label="당첨자 수 증가"
            className="w-10 h-10 rounded-sm bg-casino-base text-casino-text text-button font-medium transition-shadow"
            style={{ border: '1px solid rgba(0, 245, 255, 0.3)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 245, 255, 0.5)';
              e.currentTarget.style.borderColor = '#00f5ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.borderColor = 'rgba(0, 245, 255, 0.3)';
            }}
          >
            +
          </button>
        </div>
      </div>
      {warning && (
        <p
          className="mt-xs text-caption font-medium"
          role="alert"
          style={{ color: '#e10600' }}
        >
          ⚠ {warning}
        </p>
      )}
    </section>
  );
}

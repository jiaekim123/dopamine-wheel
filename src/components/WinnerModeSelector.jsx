// PRD §6.5 — 당첨 방식 (첫번째 / 마지막 / 직접 입력) + 직접 입력 검증
import { useGameStore } from '../store/useGameStore.js';
import { parseWinnerRanks } from '../lib/parser.js';

export default function WinnerModeSelector() {
  const winnerMode = useGameStore((s) => s.winnerMode);
  const winnerRanksInput = useGameStore((s) => s.winnerRanksInput);
  const winnerCount = useGameStore((s) => s.winnerCount);
  const participants = useGameStore((s) => s.participants);
  const setWinnerMode = useGameStore((s) => s.setWinnerMode);
  const setWinnerRanksInput = useGameStore((s) => s.setWinnerRanksInput);

  const n = participants.length;

  // 직접 입력 검증 결과
  const validation =
    winnerMode === 'custom' ? parseWinnerRanks(winnerRanksInput, winnerCount, n) : null;

  // 미리보기 텍스트 (각 모드에서 어떤 순위가 뽑히는지 안내)
  const preview = (() => {
    if (n < 2) return '참가자가 부족해요';
    if (winnerMode === 'first') {
      const arr = Array.from({ length: winnerCount }, (_, i) => `${i + 1}등`);
      return arr.join('·');
    }
    if (winnerMode === 'last') {
      const arr = Array.from({ length: winnerCount }, (_, i) => `${n - winnerCount + 1 + i}등`);
      return arr.join('·');
    }
    if (validation?.ok) return validation.ranks.map((r) => `${r}등`).join('·');
    return null;
  })();

  return (
    <section
      aria-labelledby="winner-mode-label"
      className="rounded-md p-lg bg-casino-elevated"
      style={{ border: '1px solid rgba(255, 45, 146, 0.15)' }}
    >
      <span
        id="winner-mode-label"
        className="block text-label-md font-medium text-casino-text mb-sm"
      >
        당첨 방식
      </span>

      <div role="radiogroup" aria-labelledby="winner-mode-label" className="flex flex-col gap-xs">
        <Option
          mode="first"
          checked={winnerMode === 'first'}
          onSelect={setWinnerMode}
          label={`첫번째 ${preview && winnerMode === 'first' ? `(${preview})` : ''}`}
        />
        <Option
          mode="last"
          checked={winnerMode === 'last'}
          onSelect={setWinnerMode}
          label={`마지막 ${preview && winnerMode === 'last' ? `(${preview})` : ''}`}
        />
        <Option
          mode="custom"
          checked={winnerMode === 'custom'}
          onSelect={setWinnerMode}
          label="직접 입력"
        />

        {winnerMode === 'custom' && (
          <div className="ml-7 mt-xs flex flex-col gap-xs">
            <input
              type="text"
              value={winnerRanksInput}
              onChange={(e) => setWinnerRanksInput(e.target.value)}
              placeholder='예: "1, 5, 7" 또는 "1 5 7"'
              aria-label="당첨 순위 직접 입력"
              aria-invalid={validation && !validation.ok ? 'true' : 'false'}
              className="w-full max-w-md px-md py-sm rounded-sm bg-casino-base text-body-md text-casino-text placeholder:text-casino-text-soft/60 focus:outline-none transition-shadow"
              style={{ border: '1px solid rgba(0, 245, 255, 0.25)' }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 0 12px rgba(0, 245, 255, 0.4)';
                e.target.style.borderColor = '#00f5ff';
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = '';
                e.target.style.borderColor = 'rgba(0, 245, 255, 0.25)';
              }}
            />
            {validation?.ok ? (
              <span
                className="text-caption font-medium"
                style={{ color: '#84cc16' }}
              >
                ✓ {winnerCount}개 OK · {preview} 당첨
              </span>
            ) : (
              <span
                className="text-caption font-medium"
                role="alert"
                style={{ color: '#ff8c00' }}
              >
                {validation?.error}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Option({ mode, checked, onSelect, label }) {
  return (
    <label
      className="flex items-center gap-sm cursor-pointer text-body-md text-casino-text"
    >
      <input
        type="radio"
        name="winner-mode"
        value={mode}
        checked={checked}
        onChange={() => onSelect(mode)}
        className="w-4 h-4"
        style={{ accentColor: '#ff2d92' }}
      />
      <span
        style={
          checked
            ? { textShadow: '0 0 8px rgba(255, 45, 146, 0.5)' }
            : undefined
        }
      >
        {label}
      </span>
    </label>
  );
}

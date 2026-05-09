// PRD §6.3 — 입력된 참가자를 이모지 카드로 시각화.
// v2.3: 가로 인라인 pill → 세로 카드. 큰 이모지(36px) 위 + 이름 아래.
// v2.5: 카지노 다크 톤. cream 배경 → casino-elevated + 미세 네온 글로우.
import { useGameStore } from '../store/useGameStore.js';

export default function EmojiChips() {
  const participants = useGameStore((s) => s.participants);

  if (participants.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-xs" aria-label="참가자 이모지 카드 목록">
      {participants.map((p) => (
        <div
          key={p.id}
          className="flex flex-col items-center gap-xxs px-sm py-xs rounded-md bg-casino-elevated text-casino-text"
          style={{
            minWidth: '64px',
            border: '1px solid rgba(255, 45, 146, 0.18)',
          }}
          title={p.truncated ? `${p.displayName} (잘림)` : p.displayName}
        >
          <span aria-hidden="true" className="leading-none" style={{ fontSize: '36px' }}>
            {p.emoji}
          </span>
          <span className="text-caption font-medium text-center break-keep">
            {p.displayName}
          </span>
        </div>
      ))}
    </div>
  );
}

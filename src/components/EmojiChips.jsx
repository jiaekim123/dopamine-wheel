// PRD §6.3 — 입력된 참가자를 이모지 칩으로 시각화
import { useGameStore } from '../store/useGameStore.js';

export default function EmojiChips() {
  const participants = useGameStore((s) => s.participants);

  if (participants.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-xs mt-md" aria-label="참가자 이모지 칩 목록">
      {participants.map((p) => (
        <span
          key={p.id}
          className="inline-flex items-center gap-xs px-sm py-xs rounded-full bg-signature-cream text-ink text-caption"
          title={p.truncated ? `${p.displayName} (잘림)` : p.displayName}
        >
          <span aria-hidden="true">{p.emoji}</span>
          <span>{p.displayName}</span>
        </span>
      ))}
    </div>
  );
}

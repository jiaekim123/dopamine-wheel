// PRD §6.3 — 참가자 입력 컴포넌트
import { useGameStore } from '../store/useGameStore.js';
import { MAX_PARTICIPANTS } from '../lib/parser.js';

export default function ParticipantsInput() {
  const rawInput = useGameStore((s) => s.rawInput);
  const participants = useGameStore((s) => s.participants);
  const dropped = useGameStore((s) => s.dropped);
  const setRawInput = useGameStore((s) => s.setRawInput);

  const n = participants.length;

  return (
    <section aria-labelledby="participants-label">
      <label
        id="participants-label"
        htmlFor="participants-textarea"
        className="block text-label-md font-medium text-ink mb-sm"
      >
        참가자 입력
      </label>

      <textarea
        id="participants-textarea"
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        placeholder="쉼표·줄바꿈·공백으로 구분 (예: 김철수, 이영희\n박민수 정수진)"
        rows={4}
        className="w-full px-md py-sm rounded-sm border border-hairline bg-canvas text-body-md text-ink placeholder:text-muted focus:outline-none focus:border-info-border focus:shadow-focus-ring transition-colors"
        aria-describedby="participants-meta"
      />

      <div id="participants-meta" className="mt-xs text-caption text-muted">
        현재 <span className="text-ink font-medium">{n}명</span>
        {n >= MAX_PARTICIPANTS && (
          <span className="ml-sm text-amber font-medium">
            ⚠ 최대 {MAX_PARTICIPANTS}명까지만 가능
          </span>
        )}
        {dropped > 0 && (
          <span className="ml-sm text-amber font-medium">
            ({dropped}명은 초과로 무시됨)
          </span>
        )}
      </div>
    </section>
  );
}

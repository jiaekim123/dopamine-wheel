// PRD §6.3 — 참가자 입력 컴포넌트.
// v2.5: 카지노 다크 톤. textarea 다크 elevated + 네온 시안 포커스 글로우.
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
        className="block text-label-md font-medium text-casino-text mb-sm"
      >
        참가자 입력
      </label>

      <textarea
        id="participants-textarea"
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
        placeholder={`쉼표·줄바꿈·공백으로 구분
예) 김철수, 이영희
    박민수 정수진`}
        rows={4}
        className="w-full px-md py-sm rounded-sm bg-casino-elevated text-body-md text-casino-text placeholder:text-casino-text-soft/60 focus:outline-none transition-shadow"
        style={{
          border: '1px solid rgba(0, 245, 255, 0.2)',
          boxShadow: 'inset 0 0 0 0 rgba(0, 245, 255, 0)',
        }}
        onFocus={(e) => {
          e.target.style.boxShadow = '0 0 16px rgba(0, 245, 255, 0.4)';
          e.target.style.borderColor = '#00f5ff';
        }}
        onBlur={(e) => {
          e.target.style.boxShadow = '';
          e.target.style.borderColor = 'rgba(0, 245, 255, 0.2)';
        }}
        aria-describedby="participants-meta"
      />

      <div id="participants-meta" className="mt-xs text-caption text-casino-text-soft">
        현재{' '}
        <span
          className="font-medium"
          style={{
            color: '#ff2d92',
            textShadow: '0 0 8px rgba(255, 45, 146, 0.6)',
          }}
        >
          {n}명
        </span>
        {n >= MAX_PARTICIPANTS && (
          <span className="ml-sm font-medium" style={{ color: '#ff8c00' }}>
            ⚠ 최대 {MAX_PARTICIPANTS}명까지만 가능
          </span>
        )}
        {dropped > 0 && (
          <span className="ml-sm font-medium" style={{ color: '#ff8c00' }}>
            ({dropped}명은 초과로 무시됨)
          </span>
        )}
      </div>
    </section>
  );
}

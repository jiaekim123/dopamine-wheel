// PRD §5.1 + §6 — Home (Editorial Mode).
// 화이트 캔버스 + 96px section padding + 시그니처 컬러 게임 카드 4종.
// App.jsx 라우팅에서 screen === 'home' (또는 intro 시 페이드 underlay) 일 때 노출.

import ParticipantsInput from '../components/ParticipantsInput.jsx';
import EmojiChips from '../components/EmojiChips.jsx';
import KCounter from '../components/KCounter.jsx';
import WinnerModeSelector from '../components/WinnerModeSelector.jsx';
import GameCardGrid from '../components/GameCardGrid.jsx';

export default function HomeScreen() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Top bar — sticky, hairline 보더 (PRD §6.2) */}
      <header className="sticky top-0 z-30 h-16 bg-canvas border-b border-hairline">
        <div className="max-w-[1280px] mx-auto h-full px-lg md:px-xxl flex items-center justify-between">
          <div className="flex items-baseline gap-md">
            <span className="text-title-lg" aria-hidden="true">
              🎡
            </span>
            <h1 className="text-title-lg font-medium text-ink tracking-tight">DopamineWheel</h1>
            <p className="hidden md:block text-body-md text-muted">
              오늘의 운명, 누가 가져갈까?
            </p>
          </div>
          <button
            type="button"
            aria-label="설정"
            className="w-10 h-10 rounded-full text-muted hover:bg-surface-soft transition-colors focus:outline-none focus-visible:shadow-focus-ring"
          >
            ⚙
          </button>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-lg md:px-xxl">
        <section className="pt-xxl md:pt-section flex flex-col gap-xl">
          <ParticipantsInput />
          <EmojiChips />
        </section>

        <section className="pt-xxl md:pt-section flex flex-col gap-xl">
          <KCounter />
          <WinnerModeSelector />
        </section>

        <section className="pt-xxl md:pt-section pb-xxl md:pb-section">
          <GameCardGrid />
        </section>
      </main>
    </div>
  );
}

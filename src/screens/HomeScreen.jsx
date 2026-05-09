// PRD §5.1 + §6 + v2.5 — Home (Casino Salon Dark).
// v2.5: 화이트 캔버스 → 카지노 네온 다크. Hero(큰 Logo + 헤드라인) + 4 시그니처 dot + footer.
// 사용자 의도: "도파민 터지는 / 도박장 분위기".

import { motion } from 'framer-motion';
import ParticipantsInput from '../components/ParticipantsInput.jsx';
import EmojiChips from '../components/EmojiChips.jsx';
import KCounter from '../components/KCounter.jsx';
import WinnerModeSelector from '../components/WinnerModeSelector.jsx';
import GameCardGrid from '../components/GameCardGrid.jsx';
import Logo from '../components/Logo.jsx';

const SIGNATURE_DOTS = [
  { color: '#aa2d00', label: 'Coral' },
  { color: '#0a2e0e', label: 'Forest' },
  { color: '#181d26', label: 'Surface Dark' },
  { color: '#946d12', label: 'Mustard' },
];

export default function HomeScreen() {
  return (
    <div className="min-h-screen bg-casino-base text-casino-text flex flex-col">
      {/* Top bar — 카지노 다크 + 네온 시안 hairline + 작은 LogoWheel */}
      <header
        className="sticky top-0 z-30 h-16 bg-casino-base"
        style={{ borderBottom: '1px solid rgba(0, 245, 255, 0.25)' }}
      >
        <div className="max-w-[1280px] mx-auto h-full px-lg md:px-xxl flex items-center justify-between">
          <div className="flex items-center gap-sm">
            {/* Top bar: 작은 휠 + 화이트 텍스트 워드마크 (다크 bg에 어울리는 light 톤) */}
            <Logo variant="wheel" size={36} alt="DopamineWheel 로고" />
            <Logo variant="wordmark" tone="light" size={20} alt="DopamineWheel" />
          </div>
          <button
            type="button"
            aria-label="설정"
            className="w-10 h-10 rounded-full text-casino-text-soft hover:bg-casino-elevated transition-colors focus:outline-none focus-visible:shadow-glow-neon-cyan"
          >
            ⚙
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1280px] mx-auto w-full px-lg md:px-xxl">
        {/* Hero — 큰 Logo + 네온 헤드라인 + 4 시그니처 dot */}
        <motion.section
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mt-xl rounded-lg p-xl md:p-xxl flex flex-col md:flex-row items-center gap-xl bg-casino-elevated"
          aria-labelledby="hero-heading"
        >
          {/* 좌측 Logo — 큰 휠 (image-only). 텍스트는 우측 헤드라인이 대체 */}
          <div className="shrink-0 flex items-center justify-center">
            <Logo
              variant="wheel"
              size={180}
              alt="DopamineWheel 로고"
            />
          </div>

          {/* 우측 텍스트 */}
          <div className="flex-1 flex flex-col gap-sm text-center md:text-left">
            <h2
              id="hero-heading"
              className="text-display-lg font-normal text-casino-text leading-tight tracking-tight"
              style={{ textShadow: '0 0 24px rgba(255, 45, 146, 0.55)' }}
            >
              도파민 수레바퀴,
              <br />
              오늘의 당첨자는 누구?
            </h2>
            <p className="text-body-md text-casino-text-soft">
              이름을 적고 게임을 골라주세요.
            </p>

            {/* 4 시그니처 컬러 dot — 카지노 칩처럼 정렬, 펄스 */}
            <div
              className="mt-md flex items-center justify-center md:justify-start gap-sm"
              aria-label="4가지 미니게임 시그니처 컬러"
            >
              <div className="flex items-center gap-xs" aria-hidden="true">
                {SIGNATURE_DOTS.map((d, i) => (
                  <motion.span
                    key={d.label}
                    className="inline-block rounded-full"
                    style={{
                      width: '14px',
                      height: '14px',
                      backgroundColor: d.color,
                      boxShadow: `0 0 12px ${d.color}, 0 0 4px ${d.color}`,
                    }}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.2,
                    }}
                    title={d.label}
                  />
                ))}
              </div>
              <span className="text-caption text-casino-text-soft font-medium">
                4가지 미니게임
              </span>
            </div>
          </div>
        </motion.section>

        {/* 본문 섹션들 — v2.5 후속: 간격 좁힘 (사용자 요청) */}
        <section className="pt-xl flex flex-col gap-sm">
          <ParticipantsInput />
          <EmojiChips />
        </section>

        {/* 옵션 — 모바일에서도 한 줄 가로 분할로 좁혀서 게임 리스트가 같은 화면에 보이게 */}
        <section className="pt-xl grid grid-cols-1 sm:grid-cols-2 gap-md">
          <KCounter />
          <WinnerModeSelector />
        </section>

        <section className="pt-xl pb-xl">
          <GameCardGrid />
        </section>
      </main>

    </div>
  );
}

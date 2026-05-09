// v2.5 — DopamineWheel 로고 컴포넌트.
// 자산은 모두 투명 배경 PNG.
//   - dw_wheel.png        : 휠 이미지 (네온 헥사고날 만다라)
//   - dw_wordmark_light.png : "DOPAMINEWHEEL" 텍스트, 화이트 (다크 bg용)
//   - dw_wordmark_dark.png  : "DOPAMINEWHEEL" 텍스트, 검정 (라이트 bg용)
//
// 사용 예:
//   <Logo variant="wheel" size={36} />
//   <Logo variant="wordmark" tone="light" />     // 다크 베이스용 화이트 텍스트
//   <Logo variant="full" tone="light" wheelSize={140} /> // 휠 + 텍스트 세로 스택

import wheelPng from '../assets/dw_wheel.png';
import wordmarkLight from '../assets/dw_wordmark_light.png';
import wordmarkDark from '../assets/dw_wordmark_dark.png';

/**
 * @param {{
 *   variant?: 'wheel' | 'wordmark' | 'full',
 *   tone?: 'light' | 'dark',     // wordmark / full에만 적용
 *   size?: number,               // wheel 정사각 크기 (px)
 *   wheelSize?: number,          // full에서 휠 크기 (size 대신 이걸 사용)
 *   className?: string,
 *   alt?: string,
 * }} props
 */
export default function Logo({
  variant = 'wheel',
  tone = 'light',
  size = 64,
  wheelSize,
  className = '',
  alt = 'DopamineWheel',
}) {
  const wordmarkSrc = tone === 'light' ? wordmarkLight : wordmarkDark;

  if (variant === 'wheel') {
    return (
      <img
        src={wheelPng}
        alt={alt}
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'block',
          objectFit: 'contain',
        }}
      />
    );
  }

  if (variant === 'wordmark') {
    return (
      <img
        src={wordmarkSrc}
        alt={alt}
        className={className}
        style={{
          height: `${size}px`,
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    );
  }

  // variant === 'full': 휠(위) + 텍스트(아래) 세로 스택
  const wSize = wheelSize ?? size;
  return (
    <div
      className={`flex flex-col items-center gap-xs ${className}`}
      role="img"
      aria-label={alt}
    >
      <img
        src={wheelPng}
        alt=""
        style={{
          width: `${wSize}px`,
          height: `${wSize}px`,
          display: 'block',
          objectFit: 'contain',
        }}
      />
      <img
        src={wordmarkSrc}
        alt=""
        style={{
          height: `${Math.round(wSize * 0.16)}px`,
          width: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}

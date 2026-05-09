/** @type {import('tailwindcss').Config} */
// PRD §10.2 ~ §10.5 디자인 토큰을 Tailwind에 등록.
// Hybrid Editorial + Dopamine 모델: 두 모드의 컬러를 동시에 노출.

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    // §10.4 Spacing — 4px 베이스 단위 토큰
    spacing: {
      0: '0',
      px: '1px',
      xxs: '4px',
      xs: '8px',
      sm: '12px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '48px',
      section: '96px',
      // Tailwind 기본 spacing(0.5, 1, 2, ...)도 일부 유지하기 위해 숫자 키 추가
      0.5: '2px',
      1: '4px',
      1.5: '6px',
      2: '8px',
      2.5: '10px',
      3: '12px',
      3.5: '14px',
      4: '16px',
      5: '20px',
      6: '24px',
      7: '28px',
      8: '32px',
      9: '36px',
      10: '40px',
      11: '44px',
      12: '48px',
      14: '56px',
      16: '64px',
      20: '80px',
      24: '96px',
      28: '112px',
      32: '128px',
      36: '144px',
      40: '160px',
      44: '176px',
      48: '192px',
      52: '208px',
      56: '224px',
      60: '240px',
      64: '256px',
      72: '288px',
      80: '320px',
      96: '384px',
    },
    // §10.5 Border Radius
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '6px',
      DEFAULT: '8px',
      md: '10px',
      lg: '12px',
      xl: '16px',
      '2xl': '20px',
      full: '9999px',
    },
    extend: {
      // §10.2 Color Tokens
      colors: {
        // Brand & Action
        primary: {
          DEFAULT: '#181d26',
          active: '#0d1218',
        },
        link: {
          DEFAULT: '#1b61c9',
          active: '#1a3866',
        },

        // Surface
        canvas: '#ffffff',
        'surface-soft': '#f8fafc',
        'surface-strong': '#e0e2e6',
        hairline: '#dddddd',
        'dark-base': '#0d1218',
        'dark-elevated': '#1d1f25',

        // Text
        ink: '#181d26',
        body: '#333840',
        muted: '#41454d',
        'border-strong': '#9297a0',
        'on-dark': '#ffffff',
        'on-primary': '#ffffff',

        // Signature (game card mapping)
        'signature-coral': '#aa2d00',
        'signature-forest': '#0a2e0e',
        'surface-dark': '#181d26',
        'signature-mustard': '#d9a441',

        // Accent surfaces
        'signature-peach': '#fcab79',
        'signature-mint': '#a8d8c4',
        'signature-yellow': '#f4d35e',
        'signature-cream': '#f5e9d4',

        // Semantic
        success: {
          DEFAULT: '#006400',
          border: '#39bf45',
        },
        info: {
          DEFAULT: '#254fad',
          border: '#458fff',
        },
        gold: '#ffd700',
        silver: '#c0c0c0',
        bronze: '#cd7f32',
        amber: '#ff8c00',
      },

      // §10.3 Typography
      fontFamily: {
        sans: [
          'Pretendard',
          'Inter Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica Neue',
          'sans-serif',
        ],
        marquee: ['"Press Start 2P"', '"VT323"', 'monospace'],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing }]
        'display-xl': ['48px', { lineHeight: '1.1', letterSpacing: '0' }],
        'display-lg': ['40px', { lineHeight: '1.2', letterSpacing: '0' }],
        'display-md': ['32px', { lineHeight: '1.2', letterSpacing: '0' }],
        'title-lg': ['24px', { lineHeight: '1.35', letterSpacing: '0.12px' }],
        'title-md': ['20px', { lineHeight: '1.5', letterSpacing: '0' }],
        'label-md': ['16px', { lineHeight: '1.4', letterSpacing: '0' }],
        button: ['16px', { lineHeight: '1.4', letterSpacing: '0' }],
        'body-md': ['14px', { lineHeight: '1.25', letterSpacing: '0' }],
        caption: ['14px', { lineHeight: '1.35', letterSpacing: '0.16px' }],
      },
      // PRD §10.10: 디스플레이 텍스트 가중치 700 금지. 400/500만 사용.
      fontWeight: {
        normal: '400',
        medium: '500',
        // 600/700은 의도적으로 미노출 (Tailwind 기본을 덮어쓰지 않으나, 본 시스템에서는 사용 자제)
      },

      // §10.6 Elevation
      boxShadow: {
        // Editorial Mode는 그림자 없음. Dopamine Mode 한정 글로우만.
        'glow-coral': '0 0 24px rgba(170, 45, 0, 0.5)',
        'glow-forest': '0 0 24px rgba(10, 46, 14, 0.5)',
        'glow-mustard': '0 0 24px rgba(217, 164, 65, 0.5)',
        'focus-ring': '0 0 0 2px #458fff',
      },

      // 화면 전환 모션 (Editorial ↔ Dopamine)
      transitionTimingFunction: {
        'ease-system': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    // Tailwind v3에 맞춰 require 대신 dynamic import 시도. 안전하게 try-catch.
  ],
};

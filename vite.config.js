import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// GitHub Pages 배포 시 base 경로가 필요하면 Phase 6에서 설정.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // jsdom v29 + vitest 2 조합에서 window.localStorage가 빈 객체로 노출되는 이슈가 있어
    // setupFiles로 Map 기반 Storage 폴리필을 주입한다.
    setupFiles: ['./src/test/setup.js'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
  },
});

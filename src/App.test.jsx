// App 라우팅 통합 테스트 — screen 분기에 따른 렌더 (PRD §5)
// matter.js / framer-motion / RAF 의존이 큰 play/result 화면은 단위 검증이 어려워
// 여기서는 home / intro 단계 + ESC 모달 위주로 검증.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from './App.jsx';
import { useGameStore } from './store/useGameStore.js';
import { resetStore } from './test/resetStore.js';

describe('App routing', () => {
  beforeEach(() => {
    resetStore();
    cleanup();
  });

  it('renders Home by default', () => {
    render(<App />);
    // v2.5: 텍스트 "DopamineWheel"은 wordmark 이미지로 교체됨 — alt로 매칭
    expect(screen.getAllByAltText('DopamineWheel').length).toBeGreaterThan(0);
    expect(screen.getByText('게임 선택')).toBeDefined();
  });

  it('clicking a game card transitions screen → intro', () => {
    useGameStore.getState().setRawInput('a, b, c');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /야생 더비/ }));
    expect(useGameStore.getState().screen).toBe('intro');
    expect(useGameStore.getState().selectedGame).toBe('horse');
  });

  it('Home stays as underlay during intro (PRD §5.2 페이드 연출용)', () => {
    useGameStore.getState().setRawInput('a, b, c');
    useGameStore.setState({ screen: 'intro', selectedGame: 'horse' });
    render(<App />);
    // 게임 선택 헤더가 여전히 DOM에 존재해야 페이드 underlay가 동작
    expect(screen.getByText('게임 선택')).toBeDefined();
  });

  it('ESC during intro does not crash + opens confirm modal or returns home', () => {
    useGameStore.getState().setRawInput('a, b, c');
    useGameStore.setState({ screen: 'intro', selectedGame: 'horse' });
    render(<App />);
    fireEvent.keyDown(window, { key: 'Escape' });
    // 모달 또는 home 복귀 — 둘 중 하나면 OK
    const state = useGameStore.getState();
    const modalOrHome =
      state.screen === 'home' ||
      document.body.textContent.includes('취소') ||
      document.body.textContent.includes('확인');
    expect(modalOrHome).toBe(true);
  });
});

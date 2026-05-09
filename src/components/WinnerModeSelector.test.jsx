// WinnerModeSelector 통합 테스트 — 모드 전환 + custom 검증 (PRD §6.5)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WinnerModeSelector from './WinnerModeSelector.jsx';
import { useGameStore } from '../store/useGameStore.js';
import { resetStore } from '../test/resetStore.js';

function setup({ rawInput = 'a, b, c, d, e', winnerCount = 2 } = {}) {
  const s = useGameStore.getState();
  s.setRawInput(rawInput);
  s.setWinnerCount(winnerCount);
}

describe('WinnerModeSelector', () => {
  beforeEach(() => resetStore());

  it('renders 3 mode radios with first as default', () => {
    setup();
    render(<WinnerModeSelector />);
    expect(screen.getByRole('radio', { name: /첫번째/ }).checked).toBe(true);
    expect(screen.getByRole('radio', { name: /마지막/ }).checked).toBe(false);
    expect(screen.getByRole('radio', { name: /직접 입력/ }).checked).toBe(false);
  });

  it('switches to last mode on click', () => {
    setup();
    render(<WinnerModeSelector />);
    fireEvent.click(screen.getByRole('radio', { name: /마지막/ }));
    expect(useGameStore.getState().winnerMode).toBe('last');
  });

  it('first mode preview shows "1등·2등" for k=2', () => {
    setup({ winnerCount: 2 });
    render(<WinnerModeSelector />);
    expect(screen.getByLabelText(/1등·2등/)).toBeDefined();
  });

  it('last mode preview shows "(n-k+1)..n등" for k=2 n=5', () => {
    setup({ rawInput: 'a, b, c, d, e', winnerCount: 2 });
    useGameStore.getState().setWinnerMode('last');
    render(<WinnerModeSelector />);
    expect(screen.getByLabelText(/4등·5등/)).toBeDefined();
  });

  it('custom mode shows input + valid feedback for matching count', () => {
    setup({ winnerCount: 3 });
    useGameStore.getState().setWinnerMode('custom');
    render(<WinnerModeSelector />);
    const input = screen.getByLabelText('당첨 순위 직접 입력');
    fireEvent.change(input, { target: { value: '1, 3, 5' } });
    expect(screen.getByText(/3개 OK/)).toBeDefined();
    expect(useGameStore.getState().winnerRanks).toEqual([1, 3, 5]);
  });

  it('custom mode shows error when count mismatch', () => {
    setup({ winnerCount: 3 });
    useGameStore.getState().setWinnerMode('custom');
    render(<WinnerModeSelector />);
    fireEvent.change(screen.getByLabelText('당첨 순위 직접 입력'), {
      target: { value: '1, 2' },
    });
    expect(screen.getByRole('alert').textContent).toMatch(/3개의 순위/);
  });

  it('custom mode shows error when rank out of range', () => {
    setup({ rawInput: 'a, b, c', winnerCount: 1 });
    useGameStore.getState().setWinnerMode('custom');
    render(<WinnerModeSelector />);
    fireEvent.change(screen.getByLabelText('당첨 순위 직접 입력'), {
      target: { value: '99' },
    });
    expect(screen.getByRole('alert').textContent).toMatch(/범위 밖/);
  });
});

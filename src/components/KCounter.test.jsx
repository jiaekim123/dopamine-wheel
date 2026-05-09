// KCounter 통합 테스트 — 증감, 경계값, 경고 메시지 (PRD §6.4 v1.4 자유 입력)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KCounter from './KCounter.jsx';
import { useGameStore } from '../store/useGameStore.js';
import { resetStore } from '../test/resetStore.js';

describe('KCounter', () => {
  beforeEach(() => resetStore());

  it('renders with k=1 by default', () => {
    render(<KCounter />);
    expect(screen.getByText('1')).toBeDefined();
  });

  it('+ button increments k (no upper clamp)', () => {
    render(<KCounter />);
    const inc = screen.getByLabelText('당첨자 수 증가');
    fireEvent.click(inc);
    fireEvent.click(inc);
    expect(useGameStore.getState().winnerCount).toBe(3);
  });

  it('- button decrements k but disabled at 1', () => {
    useGameStore.getState().setWinnerCount(3);
    render(<KCounter />);
    const dec = screen.getByLabelText('당첨자 수 감소');
    fireEvent.click(dec);
    expect(useGameStore.getState().winnerCount).toBe(2);
    fireEvent.click(dec);
    expect(useGameStore.getState().winnerCount).toBe(1);
    expect(dec.hasAttribute('disabled')).toBe(true);
  });

  it('shows warning when n < 2', () => {
    render(<KCounter />);
    // participants=0 (default) → tooFew 경고
    expect(screen.getByRole('alert').textContent).toMatch(/2명 이상/);
  });

  it('shows warning when k >= n (range overflow)', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c'); // n=3
    s.setWinnerCount(5); // k > n
    render(<KCounter />);
    expect(screen.getByRole('alert').textContent).toMatch(/같거나 많아/);
  });

  it('no warning for valid k (1 ≤ k < n)', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c, d');
    s.setWinnerCount(2);
    render(<KCounter />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

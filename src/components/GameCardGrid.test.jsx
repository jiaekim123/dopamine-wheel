// GameCardGrid 통합 테스트 — 4 카드 렌더 + 비활성 사유 안내 (PRD §6.7)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameCardGrid from './GameCardGrid.jsx';
import { GAMES } from '../lib/games.js';
import { useGameStore } from '../store/useGameStore.js';
import { resetStore } from '../test/resetStore.js';

describe('GameCardGrid', () => {
  beforeEach(() => resetStore());

  it('renders all 4 games as listitems', () => {
    render(<GameCardGrid />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(GAMES.length);
    expect(GAMES).toHaveLength(4);
  });

  it('renders all 4 game names on Home', () => {
    render(<GameCardGrid />);
    expect(screen.getByText('야생 더비')).toBeDefined();
    expect(screen.getByText('럭키 로또')).toBeDefined();
    expect(screen.getByText('폭탄 돌리기')).toBeDefined();
    expect(screen.getByText('운명의 낙하')).toBeDefined();
  });

  it('shows hint "최소 2명 필요" when n < 2', () => {
    render(<GameCardGrid />);
    expect(screen.getByRole('status').textContent).toMatch(/최소 2명 필요/);
  });

  it('shows hint about k range when k >= n', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c'); // n=3
    s.setWinnerCount(5);
    render(<GameCardGrid />);
    expect(screen.getByRole('status').textContent).toMatch(/1 이상 2 이하/);
  });

  it('shows hint about custom mode when ranks invalid', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c');
    s.setWinnerCount(2);
    s.setWinnerMode('custom'); // ranks empty → invalid
    render(<GameCardGrid />);
    expect(screen.getByRole('status').textContent).toMatch(/직접 입력 모드/);
  });

  it('hides hint when game is startable', () => {
    const s = useGameStore.getState();
    s.setRawInput('a, b, c');
    s.setWinnerCount(2);
    render(<GameCardGrid />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});

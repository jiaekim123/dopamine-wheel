// GameCard 통합 테스트 — disabled / warn / 클릭 동작 (PRD §6.6)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameCard from './GameCard.jsx';
import { GAMES } from '../lib/games.js';
import { useGameStore } from '../store/useGameStore.js';
import { resetStore } from '../test/resetStore.js';

const horse = GAMES.find((g) => g.id === 'horse');
const roulette = GAMES.find((g) => g.id === 'roulette');

describe('GameCard', () => {
  beforeEach(() => resetStore());

  it('renders game name + description + emoji', () => {
    render(<GameCard game={horse} />);
    expect(screen.getByText('야생 더비')).toBeDefined();
    expect(screen.getByText(horse.description)).toBeDefined();
  });

  it('disabled when n < 2', () => {
    render(<GameCard game={horse} />);
    const btn = screen.getByRole('button', { name: /야생 더비/ });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('enabled when n >= 2 + valid k + valid mode', () => {
    useGameStore.getState().setRawInput('a, b, c');
    render(<GameCard game={horse} />);
    const btn = screen.getByRole('button', { name: /야생 더비/ });
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('shows warn badge when n > maxPlayers (overcapacity)', () => {
    // v2 V4: horse maxPlayers = 16 → 17명 입력으로 초과 발생
    const names = Array.from({ length: 17 }, (_, i) => `p${i}`).join(', ');
    useGameStore.getState().setRawInput(names);
    render(<GameCard game={horse} />);
    expect(screen.getByLabelText('권장 인원 초과')).toBeDefined();
  });

  it('roulette card shows recommended ~35명 (v1.5)', () => {
    useGameStore.getState().setRawInput('a, b, c');
    render(<GameCard game={roulette} />);
    expect(screen.getByText(/~35명/)).toBeDefined();
  });

  it('startGame is called on click when enabled (transitions to intro)', () => {
    useGameStore.getState().setRawInput('a, b, c');
    render(<GameCard game={horse} />);
    fireEvent.click(screen.getByRole('button', { name: /야생 더비/ }));
    const state = useGameStore.getState();
    expect(state.selectedGame).toBe('horse');
    expect(state.screen).toBe('intro');
  });

  it('click is no-op when disabled', () => {
    render(<GameCard game={horse} />);
    fireEvent.click(screen.getByRole('button', { name: /야생 더비/ }));
    expect(useGameStore.getState().screen).toBe('home');
    expect(useGameStore.getState().selectedGame).toBeNull();
  });
});

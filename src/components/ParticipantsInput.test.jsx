// ParticipantsInput 통합 테스트 — 입력 파싱, 카운트, 50명 한도 (PRD §6.3)
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ParticipantsInput from './ParticipantsInput.jsx';
import { useGameStore } from '../store/useGameStore.js';
import { resetStore } from '../test/resetStore.js';

describe('ParticipantsInput', () => {
  beforeEach(() => resetStore());

  it('renders empty textarea + "0명"', () => {
    render(<ParticipantsInput />);
    expect(screen.getByRole('textbox').value).toBe('');
    expect(screen.getByText(/0명/)).toBeDefined();
  });

  it('parses comma-separated names', () => {
    render(<ParticipantsInput />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: '김철수, 이영희, 박민수' } });
    expect(useGameStore.getState().participants).toHaveLength(3);
    expect(screen.getByText(/3명/)).toBeDefined();
  });

  it('parses mixed separators (comma / newline / space)', () => {
    render(<ParticipantsInput />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '김철수, 이영희\n박민수 정수진' },
    });
    expect(useGameStore.getState().participants).toHaveLength(4);
  });

  it('shows dropped count when over 50', () => {
    render(<ParticipantsInput />);
    const names = Array.from({ length: 53 }, (_, i) => `p${i}`).join(', ');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: names } });
    expect(useGameStore.getState().participants).toHaveLength(50);
    expect(useGameStore.getState().dropped).toBe(3);
    expect(screen.getByText(/3명은 초과로 무시/)).toBeDefined();
  });

  it('handles duplicate names with auto suffix', () => {
    render(<ParticipantsInput />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '김철수, 김철수, 김철수' },
    });
    const ps = useGameStore.getState().participants;
    expect(ps.map((p) => p.displayName)).toEqual(['김철수 #1', '김철수 #2', '김철수 #3']);
  });
});

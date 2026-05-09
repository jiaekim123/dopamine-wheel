// PRD §9 — 전역 상태 (Zustand) + localStorage 영속.
// PRD §1.5: 마지막 입력·k·옵션 자동 복원.
// PRD §9.2: 단일 키 `dopamine_wheel_v1`에 JSON 저장. 손상 시 기본값으로 fallback.
// v1.4: 연출 강도 토글 제거. k는 자유 입력 (clamp 없음) + 게임 시작 시 범위 검증으로 차단.

import { create } from 'zustand';
import { parseParticipants, parseWinnerRanks } from '../lib/parser.js';

const STORAGE_KEY = 'dopamine_wheel_v1';

const DEFAULT_STATE = {
  rawInput: '',
  participants: [],
  dropped: 0,

  // 당첨자 수 — 자유 입력, 음수/0이면 isGameStartable에서 차단.
  winnerCount: 1,
  // 'first' | 'last' | 'custom'
  winnerMode: 'first',
  winnerRanksInput: '',
  winnerRanks: [],

  selectedGame: null,
  gameResult: null,
  screen: 'home',
};

function loadPersisted() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed;
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

function savePersisted(state) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const payload = {
      lastInput: state.rawInput,
      lastK: state.winnerCount,
      lastMode: state.winnerMode,
      lastRanks: state.winnerRanksInput,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota exceeded 등 — 무시 */
  }
}

function buildInitialState() {
  const persisted = loadPersisted();
  if (!persisted) return { ...DEFAULT_STATE };

  const rawInput = typeof persisted.lastInput === 'string' ? persisted.lastInput : '';
  const { participants, dropped } = parseParticipants(rawInput);

  // k는 양의 정수면 그대로 보존 (범위 초과는 경고 표시로 사용자에게 알림).
  const rawK = persisted.lastK;
  const winnerCount = Number.isInteger(rawK) && rawK >= 1 ? rawK : 1;

  const allowedModes = ['first', 'last', 'custom'];
  const winnerMode = allowedModes.includes(persisted.lastMode) ? persisted.lastMode : 'first';

  const winnerRanksInput =
    typeof persisted.lastRanks === 'string' ? persisted.lastRanks : '';
  let winnerRanks = [];
  if (winnerMode === 'custom' && winnerRanksInput) {
    const r = parseWinnerRanks(winnerRanksInput, winnerCount, participants.length);
    if (r.ok) winnerRanks = r.ranks;
  }

  return {
    ...DEFAULT_STATE,
    rawInput,
    participants,
    dropped,
    winnerCount,
    winnerMode,
    winnerRanksInput,
    winnerRanks,
  };
}

function debounce(fn, ms) {
  let timer = null;
  return function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const persistDebounced = debounce(savePersisted, 500);

export const useGameStore = create((set, get) => ({
  ...buildInitialState(),

  setRawInput: (raw) => {
    const { participants, dropped } = parseParticipants(raw);
    const { winnerCount, winnerMode, winnerRanksInput } = get();

    let winnerRanks = [];
    if (winnerMode === 'custom' && winnerRanksInput) {
      const r = parseWinnerRanks(winnerRanksInput, winnerCount, participants.length);
      if (r.ok) winnerRanks = r.ranks;
    }

    set({
      rawInput: raw,
      participants,
      dropped,
      winnerRanks,
    });
    persistDebounced(get());
  },

  // k 자유 입력 — 1 미만은 1로만 보정 (음수·0 방지). 상한은 두지 않음.
  setWinnerCount: (k) => {
    const safeK = Number.isInteger(k) && k >= 1 ? k : 1;
    const { winnerMode, winnerRanksInput, participants } = get();

    let winnerRanks = [];
    if (winnerMode === 'custom' && winnerRanksInput) {
      const r = parseWinnerRanks(winnerRanksInput, safeK, participants.length);
      if (r.ok) winnerRanks = r.ranks;
    }

    set({ winnerCount: safeK, winnerRanks });
    persistDebounced(get());
  },

  setWinnerMode: (mode) => {
    const allowed = ['first', 'last', 'custom'];
    if (!allowed.includes(mode)) return;
    const { winnerCount, winnerRanksInput, participants } = get();

    let winnerRanks = [];
    if (mode === 'custom' && winnerRanksInput) {
      const r = parseWinnerRanks(winnerRanksInput, winnerCount, participants.length);
      if (r.ok) winnerRanks = r.ranks;
    }

    set({ winnerMode: mode, winnerRanks });
    persistDebounced(get());
  },

  setWinnerRanksInput: (raw) => {
    const { winnerCount, participants } = get();
    const r = parseWinnerRanks(raw, winnerCount, participants.length);
    set({
      winnerRanksInput: raw,
      winnerRanks: r.ok ? r.ranks : [],
    });
    persistDebounced(get());
  },

  setScreen: (screen) => set({ screen }),
  setSelectedGame: (game) => set({ selectedGame: game }),
  setGameResult: (result) => set({ gameResult: result }),

  // PRD §5.3 — Dopamine → Editorial 전환을 위한 흰색 페이드 (0.6s).
  // action을 받아 전반 0.3s 페이드인 후 action 실행, 다시 0.3s 페이드아웃.
  transitionWhite: false,
  fadeToHome: (action) => {
    set({ transitionWhite: true });
    setTimeout(() => {
      try {
        action();
      } finally {
        setTimeout(() => set({ transitionWhite: false }), 300);
      }
    }, 300);
  },

  // 테스트/긴급 저장용 — debounce를 우회해 즉시 localStorage에 반영.
  flushPersist: () => savePersisted(get()),

  startGame: (gameId) => {
    if (!get().isGameStartable()) return;
    set({ selectedGame: gameId, gameResult: null, screen: 'intro' });
  },

  finishGame: (rankings) => {
    const { winnerMode, winnerCount, winnerRanks } = get();
    let winners = [];
    if (winnerMode === 'first') {
      winners = rankings.slice(0, winnerCount);
    } else if (winnerMode === 'last') {
      winners = rankings.slice(-winnerCount).reverse();
    } else {
      const rankSet = new Set(winnerRanks);
      winners = rankings.filter((r) => rankSet.has(r.rank));
    }
    set({ gameResult: { rankings, winners }, screen: 'result' });
  },

  // "다시 하기": 게임 결과만 리셋, 참가자·옵션 유지 (PRD §8.5 Primary)
  resetForReplay: () => set({ gameResult: null, selectedGame: null, screen: 'home' }),

  // "게임 다시": 같은 게임 즉시 재실행. selectedGame 유지, intro부터 다시. (PRD §8.5)
  replayGame: () => {
    const { selectedGame, isGameStartable } = get();
    if (!selectedGame || !isGameStartable()) {
      set({ gameResult: null, selectedGame: null, screen: 'home' });
      return;
    }
    set({ gameResult: null, screen: 'intro' });
  },

  // 게임 시작 가능 여부 (PRD §6.6 + v1.4 자유 입력 검증)
  isGameStartable: () => {
    const { participants, winnerCount, winnerMode, winnerRanks } = get();
    if (participants.length < 2) return false;
    if (winnerCount < 1 || winnerCount >= participants.length) return false;
    if (winnerMode === 'custom' && winnerRanks.length !== winnerCount) return false;
    return true;
  },
}));

export { STORAGE_KEY, DEFAULT_STATE };

import { create } from "zustand";
import type { AdviceResponse } from "../utils/validation";
import type { CardCode } from "../utils/cards";
import type { AdviceResult } from "../api/advice";

export type Street = "preflop" | "flop" | "turn" | "river";

const STREET_ORDER: Street[] = ["preflop", "flop", "turn", "river"];

export interface OpponentsByStreet {
  preflop: number;
  flop: number;
  turn: number;
  river: number;
}

export interface AdviceHistoryEntry {
  street: Street;
  action: AdviceResponse["action"];
  equity: number;
  pot_odds: number;
  opponents: number;
  timestamp: string;
}

interface SessionState {
  step: number;
  heroHole: [CardCode | null, CardCode | null];
  board: [CardCode | null, CardCode | null, CardCode | null, CardCode | null, CardCode | null];
  opponentsByStreet: OpponentsByStreet;
  potBb: number;
  facingBetBb: number;
  allowBluffs: boolean;
  latestAdvice: AdviceResult | null;
  lastRequestPayload: unknown | null;
  isAdviceStale: boolean;
  adviceHistory: AdviceHistoryEntry[];
  setStep: (next: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setHeroCard: (index: 0 | 1, card: CardCode | null) => void;
  setBoardCard: (index: 0 | 1 | 2 | 3 | 4, card: CardCode | null) => void;
  setOpponentsForStreet: (street: Street, n: number) => void;
  setPotBb: (v: number) => void;
  setFacingBetBb: (v: number) => void;
  setAllowBluffs: (v: boolean) => void;
  setLatestAdvice: (advice: AdviceResult | null) => void;
  setLastRequestPayload: (payload: unknown | null) => void;
  pushHistory: (entry: AdviceHistoryEntry) => void;
  resetHand: () => void;
  clearStreetCards: (street: Street) => void;
}

export function stepToStreet(step: number): Street {
  return STREET_ORDER[Math.max(0, Math.min(3, step))];
}

const initialState = {
  step: 0,
  heroHole: ["As", "Kh"] as [CardCode | null, CardCode | null],
  board: ["Qd", "Js", "2c", null, null] as [CardCode | null, CardCode | null, CardCode | null, CardCode | null, CardCode | null],
  opponentsByStreet: {
    preflop: 1,
    flop: 1,
    turn: 1,
    river: 1,
  } as OpponentsByStreet,
  potBb: 12.5,
  facingBetBb: 8,
  allowBluffs: false,
  latestAdvice: null as AdviceResult | null,
  lastRequestPayload: null as unknown | null,
  isAdviceStale: false,
  adviceHistory: [] as AdviceHistoryEntry[],
};

export const useSessionStore = create<SessionState>((set) => ({
  ...initialState,
  setStep: (next) => set(() => ({ step: Math.max(0, Math.min(3, next)), isAdviceStale: true })),
  nextStep: () => set((s) => ({ step: Math.min(3, s.step + 1), isAdviceStale: true })),
  prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1), isAdviceStale: true })),
  setHeroCard: (index, card) =>
    set((s) => {
      const heroHole = [...s.heroHole] as [CardCode | null, CardCode | null];
      heroHole[index] = card;
      return { heroHole, isAdviceStale: true };
    }),
  setBoardCard: (index, card) =>
    set((s) => {
      const board = [...s.board] as [CardCode | null, CardCode | null, CardCode | null, CardCode | null, CardCode | null];
      board[index] = card;
      return { board, isAdviceStale: true };
    }),
  setOpponentsForStreet: (street, n) =>
    set((s) => ({
      opponentsByStreet: {
        ...s.opponentsByStreet,
        [street]: n,
      },
      isAdviceStale: true,
    })),
  setPotBb: (v) => set(() => ({ potBb: v, isAdviceStale: true })),
  setFacingBetBb: (v) => set(() => ({ facingBetBb: v, isAdviceStale: true })),
  setAllowBluffs: (v) => set(() => ({ allowBluffs: v, isAdviceStale: true })),
  setLatestAdvice: (advice) => set(() => ({ latestAdvice: advice, isAdviceStale: false })),
  setLastRequestPayload: (payload) => set(() => ({ lastRequestPayload: payload })),
  pushHistory: (entry) => set((s) => ({ adviceHistory: [entry, ...s.adviceHistory] })),
  resetHand: () =>
    set(() => ({
      ...initialState,
      heroHole: [null, null],
      board: [null, null, null, null, null],
      opponentsByStreet: { preflop: 1, flop: 1, turn: 1, river: 1 },
      potBb: 1.5,
      facingBetBb: 0,
    })),
  clearStreetCards: (street) =>
    set((s) => {
      const board = [...s.board] as [CardCode | null, CardCode | null, CardCode | null, CardCode | null, CardCode | null];
      if (street === "flop") {
        board[0] = null;
        board[1] = null;
        board[2] = null;
        board[3] = null;
        board[4] = null;
      }
      if (street === "turn") {
        board[3] = null;
        board[4] = null;
      }
      if (street === "river") {
        board[4] = null;
      }
      return { board, isAdviceStale: true };
    }),
}));

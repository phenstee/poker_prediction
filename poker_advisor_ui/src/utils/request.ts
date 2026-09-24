import type { Street } from "../store/session";
import type { AdviceRequest } from "./validation";

export interface AdviceRequestInput {
  heroHole: [string, string];
  board: string[];
  street: Street;
  numOpponents: number;
  potBb: number;
  toCallBb: number;
  allowBluffs: boolean;
}

// The rule engine is the default: it needs no trained model artifact and explains its reasoning.
// The ML mode only reproduces the rule policy (see README) and 503s until a model is trained.
export function buildAdviceRequest(input: AdviceRequestInput): AdviceRequest {
  return {
    hero_hole: input.heroHole,
    board: input.board,
    street: input.street,
    num_opponents: input.numOpponents,
    pot_bb: input.potBb,
    facing_bet_bb: input.toCallBb,
    allow_bluffs: input.allowBluffs,
    mode: "rule",
  };
}

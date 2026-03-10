import { z } from "zod";

const cardSchema = z
  .string()
  .regex(/^[AKQJT98765432][shdc]$/, "Card must look like As, Kh, Qd, 2c");

const opponentsByStreetSchema = z.object({
  preflop: z.number().int().min(1).max(8),
  flop: z.number().int().min(1).max(8),
  turn: z.number().int().min(1).max(8),
  river: z.number().int().min(1).max(8),
});

export const adviceRequestSchema = z.object({
  hero_hole: z.tuple([cardSchema, cardSchema]),
  board: z.array(cardSchema).max(5),
  street: z.enum(["preflop", "flop", "turn", "river"]),
  mode: z.enum(["rule", "ml"]).optional(),
  num_opponents: z.number().int().min(1).max(8),
  opponents_by_street: opponentsByStreetSchema.optional(),
  pot_bb: z.number().nonnegative(),
  facing_bet_bb: z.number().nonnegative(),
  allow_bluffs: z.boolean(),
  effective_stack_bb: z.number().nonnegative().optional(),
  min_raise_bb: z.number().nonnegative().optional(),
  max_raise_bb: z.number().nonnegative().optional(),
});

export const adviceResponseSchema = z.object({
  action: z.enum(["FOLD", "CALL", "RAISE", "CHECK", "BET"]),
  equity: z.number().min(0).max(1),
  pot_odds: z.number().min(0).max(1),
  samples: z.number().int().positive(),
  reason: z.string(),
  mode_used: z.enum(["rule", "ml"]).optional(),
  recommended_raise_bb: z.number().positive().optional().nullable(),
  recommended_raise_label: z.string().optional().nullable(),
  raise_reason: z.string().optional().nullable(),
});

export type AdviceRequest = z.infer<typeof adviceRequestSchema>;
export type AdviceResponse = z.infer<typeof adviceResponseSchema>;

export function validateNoDuplicates(cards: string[]): void {
  if (new Set(cards).size !== cards.length) {
    throw new Error("Duplicate cards detected across hero and board");
  }
}

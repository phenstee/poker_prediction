import { describe, expect, it } from "vitest";
import { buildAdviceRequest } from "./request";

describe("buildAdviceRequest", () => {
  const input = {
    heroHole: ["Ah", "Kh"] as [string, string],
    board: ["Qh", "7h", "2c"],
    street: "flop" as const,
    numOpponents: 2,
    potBb: 12,
    toCallBb: 8,
    allowBluffs: false,
  };

  it("uses the rule engine so advice works without a trained ML model", () => {
    expect(buildAdviceRequest(input).mode).toBe("rule");
  });

  it("maps session state to the API field names", () => {
    expect(buildAdviceRequest(input)).toEqual({
      hero_hole: ["Ah", "Kh"],
      board: ["Qh", "7h", "2c"],
      street: "flop",
      num_opponents: 2,
      pot_bb: 12,
      facing_bet_bb: 8,
      allow_bluffs: false,
      mode: "rule",
    });
  });
});

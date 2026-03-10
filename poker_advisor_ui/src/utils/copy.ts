import type { AdviceResult } from "../api/advice";

export function buildBeginnerCopySummary(advice: AdviceResult): string {
  const boardText = advice.request.board.length > 0 ? advice.request.board.join(" ") : "-";
  const heroText = advice.request.hero_hole.join(" ");

  const toCall = advice.request.facing_bet_bb;
  const potBeforeCall = advice.request.pot_bb;
  const potAfterCall = potBeforeCall + toCall;
  const winChance = advice.response?.equity;
  const priceToCall = advice.response?.pot_odds;
  const breakEvenWinChance = priceToCall;

  return [
    `Street: ${advice.request.street}`,
    `Hero cards: ${heroText}`,
    `Board: ${boardText}`,
    `Pot (before call): ${potBeforeCall.toFixed(2)} bb`,
    `To call: ${toCall.toFixed(2)} bb`,
    `Pot after call: ${potAfterCall.toFixed(2)} bb`,
    `Opponents: ${advice.request.num_opponents}`,
    `Source: ${advice.source}`,
    `Action: ${advice.response?.action ?? "N/A"}`,
    `Win chance: ${winChance !== undefined ? `${(winChance * 100).toFixed(1)}%` : "N/A"}`,
    `Price to call: ${priceToCall !== undefined ? `${(priceToCall * 100).toFixed(1)}%` : "N/A"}`,
    `Break even win chance: ${breakEvenWinChance !== undefined ? `${(breakEvenWinChance * 100).toFixed(1)}%` : "N/A"}`,
    `Simulations run: ${advice.response?.samples ?? "N/A"}`,
    `Recommended ${advice.response?.action === "BET" ? "bet" : "raise to"}: ${advice.response?.recommended_raise_bb ? `${advice.response.recommended_raise_bb.toFixed(1)} bb` : "N/A"}`,
    `Sizing note: ${advice.response?.raise_reason ?? "N/A"}`,
    `Why: ${advice.response?.reason ?? advice.errorMessage ?? "No recommendation available"}`,
  ].join("\n");
}

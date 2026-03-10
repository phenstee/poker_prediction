const RANKS = "AKQJT98765432";
const SUITS = "shdc";

export type CardCode = `${string}${string}`;

export function normalizeCard(raw: string): CardCode {
  const token = raw.trim();
  if (token.length !== 2) {
    throw new Error(`Invalid card: ${raw}`);
  }
  const rank = token[0].toUpperCase();
  const suit = token[1].toLowerCase();
  if (!RANKS.includes(rank) || !SUITS.includes(suit)) {
    throw new Error(`Invalid card: ${raw}`);
  }
  return `${rank}${suit}`;
}

export function parseCardList(input: string, expectedCount?: number): CardCode[] {
  const cards = input
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => normalizeCard(t));
  if (expectedCount !== undefined && cards.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} cards, got ${cards.length}`);
  }
  if (hasDuplicates(cards)) {
    throw new Error("Duplicate cards are not allowed");
  }
  return cards;
}

export function hasDuplicates(cards: Array<CardCode | null | undefined>): boolean {
  const compact = cards.filter((c): c is CardCode => Boolean(c));
  return new Set(compact).size !== compact.length;
}

export function toCardLabel(card: CardCode | null | undefined): string {
  if (!card) {
    return "--";
  }
  const suitMap: Record<string, string> = {
    s: "S",
    h: "H",
    d: "D",
    c: "C",
  };
  return `${card[0]}${suitMap[card[1]] ?? card[1].toUpperCase()}`;
}

export function cardColor(card: CardCode | null | undefined): string {
  if (!card) {
    return "text-slate-400";
  }
  return card[1] === "h" || card[1] === "d" ? "text-rose-300" : "text-slate-100";
}

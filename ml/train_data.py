from __future__ import annotations

import argparse
import csv
import random
from collections import Counter
from pathlib import Path

from poker_advisor.decision import DecisionConfig, compute_pot_odds, recommend_action
from poker_advisor.equity import estimate_equity

RANKS = "AKQJT98765432"
SUITS = "shdc"
STREETS = ["preflop", "flop", "turn", "river"]


def card_deck() -> list[str]:
    return [f"{r}{s}" for r in RANKS for s in SUITS]


def sample_hand(street: str, rng: random.Random) -> tuple[list[str], list[str]]:
    deck = card_deck()
    rng.shuffle(deck)
    hero = [deck.pop(), deck.pop()]

    board_len = {"preflop": 0, "flop": 3, "turn": 4, "river": 5}[street]
    board = [deck.pop() for _ in range(board_len)]
    return hero, board


def sample_facing_bet(pot_bb: float, rng: random.Random, no_bet_rate: float) -> float:
    if rng.random() < no_bet_rate:
        return 0.0
    return round(rng.uniform(0.5, min(35.0, pot_bb * 1.2)), 2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic poker training data")
    parser.add_argument("--rows", type=int, default=3000)
    parser.add_argument("--equity-iters", type=int, default=120)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--no-bet-rate", type=float, default=0.35)
    parser.add_argument("--out", type=Path, default=Path("data/train.csv"))
    args = parser.parse_args()

    if not 0 <= args.no_bet_rate <= 1:
        raise ValueError("--no-bet-rate must be between 0 and 1")

    rng = random.Random(args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)

    fields = [
        "street",
        "num_opponents",
        "pot_bb",
        "facing_bet_bb",
        "effective_stack_bb",
        "allow_bluffs",
        "equity",
        "pot_odds",
        "action",
    ]

    action_counts: Counter[str] = Counter()

    with args.out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()

        for i in range(args.rows):
            street = rng.choice(STREETS)
            hero, board = sample_hand(street, rng)
            num_opponents = rng.randint(1, 4)
            pot_bb = round(rng.uniform(2.0, 80.0), 2)
            facing_bet_bb = sample_facing_bet(pot_bb, rng, args.no_bet_rate)
            effective_stack_bb = round(rng.uniform(20.0, 150.0), 2)
            allow_bluffs = False

            equity_result = estimate_equity(
                hero_hole_cards=hero,
                board_cards=board,
                num_opponents=num_opponents,
                iterations=args.equity_iters,
                seed=rng.randint(1, 10_000_000),
            )

            advice = recommend_action(
                equity=equity_result.equity,
                pot_size=pot_bb,
                facing_bet=facing_bet_bb,
                iterations=equity_result.iterations,
                hand_class=equity_result.hand_class,
                effective_stack_bb=effective_stack_bb,
                street=street,
                config=DecisionConfig(bluff_enabled=allow_bluffs),
            )

            action_counts[advice.action] += 1

            writer.writerow(
                {
                    "street": street,
                    "num_opponents": num_opponents,
                    "pot_bb": pot_bb,
                    "facing_bet_bb": facing_bet_bb,
                    "effective_stack_bb": effective_stack_bb,
                    "allow_bluffs": int(allow_bluffs),
                    "equity": round(equity_result.equity, 6),
                    "pot_odds": round(compute_pot_odds(pot_bb, facing_bet_bb), 6),
                    "action": advice.action,
                }
            )

            if (i + 1) % 500 == 0:
                print(f"generated {i + 1}/{args.rows}")

    print(f"saved dataset: {args.out}")
    print("action counts:")
    for action, count in sorted(action_counts.items()):
        print(f"  {action}: {count}")


if __name__ == "__main__":
    main()

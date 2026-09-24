from __future__ import annotations

from dataclasses import dataclass
from random import Random

from .cards import normalize_card
from .ranges import sample_hole_cards

try:
    from treys import Card, Deck, Evaluator
    EVALUATOR_BACKEND = "treys"
except ImportError:  # pragma: no cover
    try:
        from deuces import Card, Deck, Evaluator
        EVALUATOR_BACKEND = "deuces"
    except ImportError as exc:  # pragma: no cover
        raise ImportError("Install treys (preferred) or deuces for hand evaluation.") from exc


@dataclass
class MonteCarloConfig:
    preflop_iterations: int = 20_000
    flop_iterations: int = 10_000
    turn_iterations: int = 7_500
    river_iterations: int = 5_000


@dataclass
class EquityResult:
    equity: float
    wins: int
    ties: int
    losses: int
    iterations: int
    hand_class: str
    backend: str
    # Opponent hands dealt at random because no hand in the requested range was still available.
    range_fallbacks: int = 0


def _default_iterations(board_len: int, config: MonteCarloConfig) -> int:
    if board_len == 0:
        return config.preflop_iterations
    if board_len == 3:
        return config.flop_iterations
    if board_len == 4:
        return config.turn_iterations
    if board_len == 5:
        return config.river_iterations
    raise ValueError("Board must contain 0, 3, 4, or 5 cards")


def _hand_class(hero_cards: list[int], board_cards: list[int]) -> str:
    if len(board_cards) < 3:
        return "Preflop"
    evaluator = Evaluator()
    score = evaluator.evaluate(board_cards, hero_cards)
    rank_class = evaluator.get_rank_class(score)
    return evaluator.class_to_string(rank_class)


def estimate_equity(
    hero_hole_cards: list[str] | tuple[str, str],
    board_cards: list[str] | None = None,
    *,
    num_opponents: int = 1,
    iterations: int | None = None,
    opponent_range: str | None = None,
    seed: int | None = None,
    config: MonteCarloConfig | None = None,
) -> EquityResult:
    if num_opponents < 1:
        raise ValueError("num_opponents must be >= 1")

    board_cards = board_cards or []
    hero = [normalize_card(c) for c in hero_hole_cards]
    board = [normalize_card(c) for c in board_cards]
    if len(hero) != 2:
        raise ValueError("hero_hole_cards must contain exactly 2 cards")

    known = hero + board
    if len(set(known)) != len(known):
        raise ValueError("Duplicate cards in hero/board inputs")

    cfg = config or MonteCarloConfig()
    total_iterations = iterations or _default_iterations(len(board), cfg)
    rng = Random(seed)

    hero_int = [Card.new(c) for c in hero]
    board_int = [Card.new(c) for c in board]
    full_deck = Deck.GetFullDeck()
    dead = set(hero_int + board_int)
    available = [c for c in full_deck if c not in dead]
    draw_count = 5 - len(board_int)

    evaluator = Evaluator()
    wins = ties = losses = 0
    split_share = 0.0
    range_fallbacks = [0]

    for _ in range(total_iterations):
        opp_hands = sample_hole_cards(
            available_cards=available,
            num_opponents=num_opponents,
            rng=rng,
            card_cls=Card,
            preset_name=opponent_range,
            fallback_counter=range_fallbacks,
        )

        used = {c for hand in opp_hands for c in hand}
        remaining = [c for c in available if c not in used]
        board_draw = rng.sample(remaining, draw_count) if draw_count > 0 else []
        board_full = board_int + board_draw

        hero_score = evaluator.evaluate(board_full, hero_int)
        opp_scores = [evaluator.evaluate(board_full, [h1, h2]) for h1, h2 in opp_hands]

        if any(score < hero_score for score in opp_scores):
            losses += 1
        elif any(score == hero_score for score in opp_scores):
            ties += 1
            # Pot is split evenly between hero and every opponent tied at the best hand.
            split_share += 1.0 / (1 + sum(score == hero_score for score in opp_scores))
        else:
            wins += 1

    equity = (wins + split_share) / total_iterations
    return EquityResult(
        equity=equity,
        wins=wins,
        ties=ties,
        losses=losses,
        iterations=total_iterations,
        hand_class=_hand_class(hero_int, board_int),
        backend=EVALUATOR_BACKEND,
        range_fallbacks=range_fallbacks[0],
    )

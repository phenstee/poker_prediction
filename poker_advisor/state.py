from __future__ import annotations

from dataclasses import dataclass, field

from .cards import ensure_unique_cards

STREETS = ("preflop", "flop", "turn", "river")
POSITIONS = {"BTN", "CO", "HJ", "LJ", "SB", "BB"}


@dataclass
class GameState:
    hero_hole_cards: tuple[str, str]
    num_opponents: int = 1
    hero_position: str | None = None
    effective_stack_bb: float = 100.0
    board_cards: list[str] = field(default_factory=list)
    pot_size: float = 0.0
    facing_bet: float = 0.0
    min_raise: float | None = None
    max_raise: float | None = None

    def __post_init__(self) -> None:
        if self.num_opponents < 1:
            raise ValueError("num_opponents must be >= 1")
        if self.hero_position is not None and self.hero_position.upper() not in POSITIONS:
            raise ValueError(f"hero_position must be one of {sorted(POSITIONS)}")
        ensure_unique_cards([*self.hero_hole_cards, *self.board_cards])

    @property
    def street(self) -> str:
        size = len(self.board_cards)
        if size == 0:
            return "preflop"
        if size == 3:
            return "flop"
        if size == 4:
            return "turn"
        if size == 5:
            return "river"
        raise ValueError("Board card count must be 0, 3, 4, or 5")

    def set_flop(self, cards: list[str]) -> None:
        if len(cards) != 3:
            raise ValueError("Flop must have exactly 3 cards")
        self.board_cards = list(cards)
        ensure_unique_cards([*self.hero_hole_cards, *self.board_cards])

    def set_turn(self, card: str) -> None:
        if len(self.board_cards) != 3:
            raise ValueError("Turn can only be set after flop")
        self.board_cards.append(card)
        ensure_unique_cards([*self.hero_hole_cards, *self.board_cards])

    def set_river(self, card: str) -> None:
        if len(self.board_cards) != 4:
            raise ValueError("River can only be set after turn")
        self.board_cards.append(card)
        ensure_unique_cards([*self.hero_hole_cards, *self.board_cards])

    def update_betting(self, pot_size: float, facing_bet: float, min_raise: float | None = None, max_raise: float | None = None) -> None:
        if pot_size < 0 or facing_bet < 0:
            raise ValueError("pot_size and facing_bet must be non-negative")
        self.pot_size = float(pot_size)
        self.facing_bet = float(facing_bet)
        self.min_raise = min_raise
        self.max_raise = max_raise

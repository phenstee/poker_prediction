from __future__ import annotations

from typing import Iterable

RANKS = "23456789TJQKA"
SUITS = "cdhs"


class CardParseError(ValueError):
    """Raised when card text cannot be parsed."""


def normalize_card(card: str) -> str:
    token = card.strip()
    if len(token) != 2:
        raise CardParseError(f"Invalid card token: {card!r}")
    rank = token[0].upper()
    suit = token[1].lower()
    if rank not in RANKS or suit not in SUITS:
        raise CardParseError(f"Invalid card token: {card!r}")
    return f"{rank}{suit}"


def parse_cards(text: str, expected_count: int | None = None) -> list[str]:
    tokens = [normalize_card(t) for t in text.split() if t.strip()]
    if expected_count is not None and len(tokens) != expected_count:
        raise CardParseError(f"Expected {expected_count} cards, got {len(tokens)}")
    if len(set(tokens)) != len(tokens):
        raise CardParseError("Duplicate cards provided")
    return tokens


def ensure_unique_cards(cards: Iterable[str]) -> None:
    normalized = [normalize_card(c) for c in cards]
    if len(set(normalized)) != len(normalized):
        raise CardParseError("Duplicate cards found across inputs")


def card_int_to_str(card_value: int, card_cls: object) -> str:
    # treys/deuces both expose Card.int_to_str returning lowercase rank chars.
    raw = card_cls.int_to_str(card_value)
    return raw[0].upper() + raw[1].lower()

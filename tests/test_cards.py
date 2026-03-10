import pytest

from poker_advisor.cards import CardParseError, parse_cards


def test_parse_cards_valid() -> None:
    assert parse_cards("As Kh", expected_count=2) == ["As", "Kh"]


def test_parse_cards_duplicate_rejected() -> None:
    with pytest.raises(CardParseError):
        parse_cards("As As", expected_count=2)


def test_parse_cards_invalid_rank_rejected() -> None:
    with pytest.raises(CardParseError):
        parse_cards("1s Kh", expected_count=2)


def test_parse_cards_invalid_suit_rejected() -> None:
    with pytest.raises(CardParseError):
        parse_cards("Ax Kh", expected_count=2)

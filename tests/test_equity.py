from random import Random

import pytest
from treys import Card, Deck

from poker_advisor.cards import card_int_to_str
from poker_advisor.equity import estimate_equity
from poker_advisor.ranges import in_preset, sample_hole_cards


def test_aa_preflop_equity_vs_one_random_is_high() -> None:
    result = estimate_equity(
        hero_hole_cards=["As", "Ah"],
        board_cards=[],
        num_opponents=1,
        iterations=3000,
        seed=7,
    )
    assert 0.78 <= result.equity <= 0.90


def test_made_nut_flush_is_very_strong_on_river() -> None:
    result = estimate_equity(
        hero_hole_cards=["As", "Ks"],
        board_cards=["Qs", "Js", "2s", "9h", "4d"],
        num_opponents=1,
        iterations=2000,
        seed=11,
    )
    assert result.equity > 0.9


def test_equity_decreases_with_more_opponents() -> None:
    heads_up = estimate_equity(
        hero_hole_cards=["As", "Kd"],
        board_cards=["Qh", "7d", "2c"],
        num_opponents=1,
        iterations=4000,
        seed=19,
    )
    three_way = estimate_equity(
        hero_hole_cards=["As", "Kd"],
        board_cards=["Qh", "7d", "2c"],
        num_opponents=3,
        iterations=4000,
        seed=19,
    )

    assert three_way.equity < heads_up.equity


def test_multiway_split_pot_divides_equity_among_all_tied_players() -> None:
    # Royal flush on board: every player plays the board, so the pot splits four ways.
    result = estimate_equity(
        hero_hole_cards=["2c", "3d"],
        board_cards=["As", "Ks", "Qs", "Js", "Ts"],
        num_opponents=3,
        iterations=200,
        seed=3,
    )
    assert result.ties == result.iterations
    assert result.equity == pytest.approx(0.25)


def test_range_sampling_only_deals_hands_in_preset() -> None:
    rng = Random(5)
    available = [c for c in Deck.GetFullDeck() if c not in {Card.new("Ah"), Card.new("Kd")}]
    for _ in range(200):
        hands = sample_hole_cards(available, 3, rng, Card, preset_name="tight")
        cards = [c for hand in hands for c in hand]
        assert len(set(cards)) == len(cards)
        for c1, c2 in hands:
            assert in_preset(card_int_to_str(c1, Card), card_int_to_str(c2, Card), "tight")


def test_range_fallbacks_counted_when_range_is_exhausted() -> None:
    # Hero and board block most of the tight range: at most 6 disjoint tight hands remain,
    # so with 8 opponents at least 2 per iteration must be dealt at random.
    result = estimate_equity(
        hero_hole_cards=["Ah", "As"],
        board_cards=["Kh", "Ks", "Qh", "Qs", "Jh"],
        num_opponents=8,
        opponent_range="tight",
        iterations=50,
        seed=13,
    )
    assert result.range_fallbacks >= 2 * result.iterations

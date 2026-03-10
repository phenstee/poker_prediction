from poker_advisor.equity import estimate_equity


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

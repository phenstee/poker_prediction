import pytest

from poker_advisor.cli import _street_step
from poker_advisor.state import GameState


def test_street_step_uses_river_bet_sizing(capsys: pytest.CaptureFixture[str]) -> None:
    state = GameState(
        hero_hole_cards=("As", "Ks"),
        board_cards=["Qs", "Js", "2s", "9h", "4d"],
        pot_size=20,
        facing_bet=0,
    )
    _street_step(state, opponent_range=None, seed=1)
    out = capsys.readouterr().out
    assert "Suggested action: BET" in out
    # River value bets are 3/4 pot; before the fix the CLI always used the 1/2-pot preflop size.
    assert "Sizing: Bet 15.0 bb" in out

from __future__ import annotations

from .cards import CardParseError, parse_cards
from .decision import DecisionConfig, recommend_action
from .equity import estimate_equity
from .ranges import preset_names
from .state import GameState


def _prompt_float(prompt: str, default: float | None = None, *, allow_empty_keep: bool = False) -> float:
    while True:
        suffix = ""
        if default is not None:
            suffix = f" [{default}]"
        raw = input(f"{prompt}{suffix}: ").strip()
        if raw == "" and default is not None:
            return float(default)
        if raw == "" and allow_empty_keep and default is not None:
            return float(default)
        try:
            value = float(raw)
            if value < 0:
                print("Value must be non-negative.")
                continue
            return value
        except ValueError:
            print("Enter a numeric value.")


def _prompt_cards(prompt: str, count: int) -> list[str]:
    while True:
        raw = input(f"{prompt}: ").strip()
        try:
            return parse_cards(raw, expected_count=count)
        except CardParseError as exc:
            print(f"Invalid cards: {exc}")


def _board_summary(board_cards: list[str]) -> str:
    if not board_cards:
        return "-"
    if len(board_cards) == 3:
        return " ".join(board_cards)
    if len(board_cards) == 4:
        return f"{' '.join(board_cards[:3])} | Turn: {board_cards[3]}"
    if len(board_cards) == 5:
        return f"{' '.join(board_cards[:3])} | Turn: {board_cards[3]} | River: {board_cards[4]}"
    return " ".join(board_cards)


def _summary(state: GameState) -> str:
    return (
        f"Hero: {' '.join(state.hero_hole_cards)}\n"
        f"Board: {_board_summary(state.board_cards)}\n"
        f"Opponents: {state.num_opponents}\n"
        f"Pot: {state.pot_size:.2f} bb, Facing bet: {state.facing_bet:.2f} bb"
    )


def _street_step(state: GameState, *, opponent_range: str | None, seed: int | None) -> None:
    print("\n" + _summary(state))

    equity_result = estimate_equity(
        hero_hole_cards=list(state.hero_hole_cards),
        board_cards=state.board_cards,
        num_opponents=state.num_opponents,
        opponent_range=opponent_range,
        seed=seed,
    )
    advice = recommend_action(
        equity=equity_result.equity,
        pot_size=state.pot_size,
        facing_bet=state.facing_bet,
        iterations=equity_result.iterations,
        hand_class=equity_result.hand_class,
        effective_stack_bb=state.effective_stack_bb,
        street=state.street,
        min_raise=state.min_raise,
        max_raise=state.max_raise,
        config=DecisionConfig(),
    )

    print(f"Suggested action: {advice.action}")
    if advice.recommended_raise_label:
        print(f"Sizing: {advice.recommended_raise_label}")
    print(f"Equity: {advice.equity:.3f} (N={advice.iterations}, backend={equity_result.backend})")
    print(f"Pot odds: {advice.pot_odds:.3f}")
    print(f"Hand class: {advice.hand_class}")
    print(f"Reason: {advice.reason}")


def main() -> None:
    print("Texas Hold'em Educational Decision Assistant")
    print("Offline analysis only. Manual input only. No site integration or automation.")

    hero = _prompt_cards("Enter hero hole cards (e.g. As Kh)", 2)
    num_opponents = int(_prompt_float("Number of opponents", 1))
    position_raw = input("Hero position [BTN/CO/HJ/LJ/SB/BB, optional]: ").strip().upper()
    hero_position = position_raw or None
    effective_stack = _prompt_float("Effective stack (bb)", 100)

    range_raw = input(f"Opponent range preset {list(preset_names())} or blank for random: ").strip().lower()
    opponent_range = range_raw if range_raw else None

    seed_raw = input("Random seed (optional): ").strip()
    seed = int(seed_raw) if seed_raw else None

    state = GameState(
        hero_hole_cards=(hero[0], hero[1]),
        num_opponents=num_opponents,
        hero_position=hero_position,
        effective_stack_bb=effective_stack,
    )

    print("\n=== Preflop ===")
    pot_size = _prompt_float("Pot size (bb)", 1.5)
    facing_bet = _prompt_float("Facing bet (bb)", 0)
    min_raise_default = max(2.0, facing_bet * 2) if facing_bet > 0 else max(2.0, pot_size * 0.5)
    min_raise = _prompt_float("Min raise size (bb)", min_raise_default)
    max_raise_raw = input("Max raise size (bb, optional): ").strip()
    max_raise = float(max_raise_raw) if max_raise_raw else None
    state.update_betting(pot_size, facing_bet, min_raise=min_raise, max_raise=max_raise)
    _street_step(state, opponent_range=opponent_range, seed=seed)

    print("\n=== Flop ===")
    state.set_flop(_prompt_cards("Enter flop cards (e.g. Qd Js 2c)", 3))
    state.update_betting(
        _prompt_float("Pot size (bb)", state.pot_size, allow_empty_keep=True),
        _prompt_float("Facing bet (bb)", state.facing_bet, allow_empty_keep=True),
        min_raise=state.min_raise,
        max_raise=state.max_raise,
    )
    _street_step(state, opponent_range=opponent_range, seed=seed)

    print("\n=== Turn ===")
    state.set_turn(_prompt_cards("Enter turn card", 1)[0])
    state.update_betting(
        _prompt_float("Pot size (bb)", state.pot_size, allow_empty_keep=True),
        _prompt_float("Facing bet (bb)", state.facing_bet, allow_empty_keep=True),
        min_raise=state.min_raise,
        max_raise=state.max_raise,
    )
    _street_step(state, opponent_range=opponent_range, seed=seed)

    print("\n=== River ===")
    state.set_river(_prompt_cards("Enter river card", 1)[0])
    state.update_betting(
        _prompt_float("Pot size (bb)", state.pot_size, allow_empty_keep=True),
        _prompt_float("Facing bet (bb)", state.facing_bet, allow_empty_keep=True),
        min_raise=state.min_raise,
        max_raise=state.max_raise,
    )
    _street_step(state, opponent_range=opponent_range, seed=seed)


if __name__ == "__main__":
    main()

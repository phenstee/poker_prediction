from __future__ import annotations

from dataclasses import dataclass


@dataclass
class DecisionConfig:
    margin: float = 0.02
    value_raise_threshold: float = 0.65
    value_bet_threshold: float = 0.62
    bluff_enabled: bool = False


@dataclass
class Advice:
    action: str
    reason: str
    equity: float
    pot_odds: float
    iterations: int
    hand_class: str
    recommended_raise_bb: float | None = None
    recommended_raise_label: str | None = None
    raise_reason: str | None = None


def compute_pot_odds(pot_size: float, facing_bet: float) -> float:
    if facing_bet <= 0:
        return 0.0
    denom = pot_size + facing_bet
    if denom <= 0:
        return 1.0
    return facing_bet / denom


def _round_to_half_bb(value: float) -> float:
    return round(value * 2) / 2


def _format_size_label(action: str, amount_bb: float, facing_bet: float, all_in: bool = False) -> str:
    if all_in:
        return f"All-in {amount_bb:.1f} bb"

    if action == "BET":
        return f"Bet {amount_bb:.1f} bb"

    if facing_bet > 0:
        ratio = amount_bb / facing_bet
        return f"{ratio:.1f}x to {amount_bb:.1f} bb"

    return f"Raise to {amount_bb:.1f} bb"


def recommend_raise_size(
    *,
    action: str,
    street: str,
    pot_size: float,
    facing_bet: float,
    effective_stack_bb: float | None,
    min_raise: float | None = None,
    max_raise: float | None = None,
) -> tuple[float, str, str] | None:
    if action not in {"RAISE", "BET"}:
        return None

    stack_cap = effective_stack_bb if effective_stack_bb and effective_stack_bb > 0 else None

    if facing_bet <= 0:
        if street == "river":
            base_fraction = 0.75
        elif street in {"flop", "turn"}:
            base_fraction = 0.66
        else:
            base_fraction = 0.50

        base_size = max(0.5, pot_size * base_fraction)
        min_size = 0.5
        fallback_max = max(0.5, pot_size * 2)

        cap_max = stack_cap if stack_cap is not None else fallback_max
        if max_raise is not None:
            cap_max = min(cap_max, max_raise)

        size = min(max(base_size, min_size), cap_max)
        size = _round_to_half_bb(size)

        if size < min_size:
            size = min_size

        label = _format_size_label(action, size, facing_bet, all_in=stack_cap is not None and size >= stack_cap)
        reason = (
            "Heuristic value bet sizing based on street and pot size. "
            + ("Capped by effective stack." if stack_cap is not None else "Effective stack missing; used pot-based cap.")
        )
        return size, label, reason

    base_size = facing_bet + max(0.66 * pot_size, 2.0 * facing_bet)
    min_to = max(2.0 * facing_bet, min_raise or 0.0)

    if stack_cap is not None:
        cap_max = stack_cap
    else:
        cap_max = pot_size + 3.0 * facing_bet

    if max_raise is not None:
        cap_max = min(cap_max, max_raise)

    size = min(max(base_size, min_to), cap_max)
    size = _round_to_half_bb(size)

    if size <= facing_bet:
        size = _round_to_half_bb(facing_bet + 0.5)

    if size < min_to:
        size = _round_to_half_bb(min_to)

    if size > cap_max:
        size = _round_to_half_bb(cap_max)

    if size <= facing_bet:
        return None

    label = _format_size_label(action, size, facing_bet, all_in=stack_cap is not None and size >= stack_cap)
    reason = (
        "Heuristic raise-to size using pot pressure and minimum raise rules. "
        + ("Capped by effective stack." if stack_cap is not None else "Effective stack missing; used fallback cap pot + 3x bet.")
    )
    return size, label, reason


def recommend_action(
    *,
    equity: float,
    pot_size: float,
    facing_bet: float,
    iterations: int,
    hand_class: str,
    effective_stack_bb: float,
    street: str = "preflop",
    min_raise: float | None = None,
    max_raise: float | None = None,
    config: DecisionConfig | None = None,
) -> Advice:
    cfg = config or DecisionConfig()
    pot_odds = compute_pot_odds(pot_size, facing_bet)

    # Raising needs chips beyond the call; with a stack at or below the bet, calling is already all-in.
    can_raise = effective_stack_bb > facing_bet and (min_raise is None or min_raise > 0)

    if facing_bet > 0:
        if equity < pot_odds - cfg.margin:
            action = "FOLD"
            reason = f"equity below pot odds by more than margin {cfg.margin:.2f}"
        elif equity >= cfg.value_raise_threshold and can_raise:
            action = "RAISE"
            reason = "equity is high enough for value raise"
        elif abs(equity - pot_odds) <= cfg.margin:
            action = "CALL"
            reason = f"equity near pot odds within margin {cfg.margin:.2f}"
        elif equity > pot_odds:
            action = "CALL"
            reason = "equity above pot odds"
        elif cfg.bluff_enabled and can_raise:
            action = "RAISE"
            reason = "bluff raise enabled"
        else:
            action = "FOLD"
            reason = "equity not sufficient versus pot odds"
    else:
        if equity >= cfg.value_bet_threshold:
            action = "BET"
            reason = "equity is high enough for value bet"
        elif cfg.bluff_enabled:
            action = "BET"
            reason = "bluff betting enabled"
        else:
            action = "CHECK"
            reason = "no bet required and equity below value threshold"

    if action == "RAISE" and max_raise is not None and min_raise is not None and min_raise > max_raise:
        action = "CALL" if facing_bet > 0 else "CHECK"
        reason = "raise blocked by limits"

    sizing = recommend_raise_size(
        action=action,
        street=street,
        pot_size=pot_size,
        facing_bet=facing_bet,
        effective_stack_bb=effective_stack_bb,
        min_raise=min_raise,
        max_raise=max_raise,
    )

    if action == "RAISE" and sizing is None:
        action = "CALL"
        reason = "no legal raise size fits the stack and raise limits"

    recommended_raise_bb = None
    recommended_raise_label = None
    raise_reason = None
    if sizing is not None:
        recommended_raise_bb, recommended_raise_label, raise_reason = sizing

    return Advice(
        action=action,
        reason=reason,
        equity=equity,
        pot_odds=pot_odds,
        iterations=iterations,
        hand_class=hand_class,
        recommended_raise_bb=recommended_raise_bb,
        recommended_raise_label=recommended_raise_label,
        raise_reason=raise_reason,
    )

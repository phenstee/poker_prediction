from __future__ import annotations

from functools import lru_cache
from random import Random
from typing import Iterable


RANGE_PRESETS: dict[str, set[str]] = {
    "tight": {
        "AA", "KK", "QQ", "JJ", "TT", "AKs", "AQs", "AJs", "KQs", "AKo",
    },
    "standard": {
        "AA", "KK", "QQ", "JJ", "TT", "99", "88",
        "AKs", "AQs", "AJs", "ATs", "KQs", "KJs", "QJs", "JTs", "T9s", "98s",
        "AKo", "AQo", "AJo", "KQo",
    },
    "loose": {
        "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
        "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
        "KQs", "KJs", "KTs", "K9s", "QJs", "QTs", "JTs", "J9s", "T9s", "98s", "87s", "76s", "65s", "54s",
        "AKo", "AQo", "AJo", "ATo", "KQo", "KJo", "QJo",
    },
}


def hand_key(card_a: str, card_b: str) -> str:
    ra, sa = card_a[0], card_a[1]
    rb, sb = card_b[0], card_b[1]
    order = "23456789TJQKA"
    if ra == rb:
        return f"{ra}{rb}"
    if order.index(ra) < order.index(rb):
        ra, rb = rb, ra
        sa, sb = sb, sa
    suited = "s" if sa == sb else "o"
    return f"{ra}{rb}{suited}"


def in_preset(card_a: str, card_b: str, preset_name: str) -> bool:
    key = preset_name.lower()
    if key not in RANGE_PRESETS:
        raise ValueError(f"Unknown range preset: {preset_name}")
    return hand_key(card_a, card_b) in RANGE_PRESETS[key]


@lru_cache(maxsize=None)
def _preset_combos(preset_name: str, card_cls: object) -> tuple[tuple[int, int], ...]:
    """Every concrete two-card combo in a preset, as evaluator card ints."""
    suits = "shdc"
    combos: list[tuple[int, int]] = []
    for key in RANGE_PRESETS[preset_name]:
        r1, r2 = key[0], key[1]
        if r1 == r2:
            pairs = [(s1, s2) for i, s1 in enumerate(suits) for s2 in suits[i + 1:]]
        elif key[2] == "s":
            pairs = [(s, s) for s in suits]
        else:
            pairs = [(s1, s2) for s1 in suits for s2 in suits if s1 != s2]
        combos.extend((card_cls.new(r1 + s1), card_cls.new(r2 + s2)) for s1, s2 in pairs)
    return tuple(combos)


def sample_hole_cards(
    available_cards: list[int],
    num_opponents: int,
    rng: Random,
    card_cls: object,
    preset_name: str | None = None,
    fallback_counter: list[int] | None = None,
) -> list[tuple[int, int]]:
    if preset_name is None:
        drawn = rng.sample(available_cards, 2 * num_opponents)
        return [(drawn[i], drawn[i + 1]) for i in range(0, len(drawn), 2)]

    key = preset_name.lower()
    if key not in RANGE_PRESETS:
        raise ValueError(f"Unknown range preset: {preset_name}")

    combos = _preset_combos(key, card_cls)
    result: list[tuple[int, int]] = []
    remaining = set(available_cards)
    for _ in range(num_opponents):
        # Most combos are usually live, so a few uniform picks almost always succeed;
        # fall back to scanning the whole range only when blockers make hits rare.
        chosen = None
        for _attempt in range(20):
            c1, c2 = rng.choice(combos)
            if c1 in remaining and c2 in remaining:
                chosen = (c1, c2)
                break
        if chosen is None:
            live = [(c1, c2) for c1, c2 in combos if c1 in remaining and c2 in remaining]
            if live:
                chosen = rng.choice(live)
            else:
                # Range exhausted by hero, board and earlier opponents: deal a random hand.
                c1, c2 = rng.sample(sorted(remaining), 2)
                chosen = (c1, c2)
                if fallback_counter is not None:
                    fallback_counter[0] += 1
        result.append(chosen)
        remaining.discard(chosen[0])
        remaining.discard(chosen[1])
    return result


def preset_names() -> Iterable[str]:
    return RANGE_PRESETS.keys()

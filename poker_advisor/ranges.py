from __future__ import annotations

from random import Random
from typing import Iterable

from .cards import card_int_to_str

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


def sample_hole_cards(
    available_cards: list[int],
    num_opponents: int,
    rng: Random,
    card_cls: object,
    preset_name: str | None = None,
) -> list[tuple[int, int]]:
    if preset_name is None:
        drawn = rng.sample(available_cards, 2 * num_opponents)
        return [(drawn[i], drawn[i + 1]) for i in range(0, len(drawn), 2)]

    if preset_name.lower() not in RANGE_PRESETS:
        raise ValueError(f"Unknown range preset: {preset_name}")

    result: list[tuple[int, int]] = []
    remaining = list(available_cards)
    for _ in range(num_opponents):
        found = False
        for _attempt in range(500):
            c1, c2 = rng.sample(remaining, 2)
            if in_preset(card_int_to_str(c1, card_cls), card_int_to_str(c2, card_cls), preset_name):
                result.append((c1, c2))
                remaining.remove(c1)
                remaining.remove(c2)
                found = True
                break
        if not found:
            drawn = rng.sample(remaining, 2)
            result.append((drawn[0], drawn[1]))
            remaining.remove(drawn[0])
            remaining.remove(drawn[1])
    return result


def preset_names() -> Iterable[str]:
    return RANGE_PRESETS.keys()

from poker_advisor.decision import DecisionConfig, recommend_action


def test_fold_when_equity_far_below_pot_odds() -> None:
    advice = recommend_action(
        equity=0.20,
        pot_size=10,
        facing_bet=10,
        iterations=1000,
        hand_class="High Card",
        effective_stack_bb=100,
        config=DecisionConfig(margin=0.02),
    )
    assert advice.action == "FOLD"


def test_call_when_equity_near_pot_odds() -> None:
    advice = recommend_action(
        equity=0.40,
        pot_size=10,
        facing_bet=6,
        iterations=1000,
        hand_class="Pair",
        effective_stack_bb=100,
        config=DecisionConfig(margin=0.03),
    )
    assert advice.action == "CALL"


def test_raise_for_value_when_equity_high() -> None:
    advice = recommend_action(
        equity=0.80,
        pot_size=12,
        facing_bet=6,
        iterations=1000,
        hand_class="Flush",
        effective_stack_bb=100,
        min_raise=12,
        config=DecisionConfig(value_raise_threshold=0.7),
    )
    assert advice.action == "RAISE"


def test_check_when_not_facing_bet_and_no_value() -> None:
    advice = recommend_action(
        equity=0.45,
        pot_size=20,
        facing_bet=0,
        iterations=1000,
        hand_class="High Card",
        effective_stack_bb=100,
        config=DecisionConfig(value_bet_threshold=0.6),
    )
    assert advice.action == "CHECK"


def test_raise_size_increases_with_pot() -> None:
    small_pot = recommend_action(
        equity=0.80,
        pot_size=10,
        facing_bet=4,
        iterations=1000,
        hand_class="Top Pair",
        effective_stack_bb=200,
        street="flop",
        config=DecisionConfig(value_raise_threshold=0.7),
    )
    big_pot = recommend_action(
        equity=0.80,
        pot_size=30,
        facing_bet=4,
        iterations=1000,
        hand_class="Top Pair",
        effective_stack_bb=200,
        street="flop",
        config=DecisionConfig(value_raise_threshold=0.7),
    )

    assert small_pot.action == "RAISE"
    assert big_pot.action == "RAISE"
    assert small_pot.recommended_raise_bb is not None
    assert big_pot.recommended_raise_bb is not None
    assert big_pot.recommended_raise_bb > small_pot.recommended_raise_bb


def test_raise_to_is_above_facing_bet_and_rounded() -> None:
    advice = recommend_action(
        equity=0.9,
        pot_size=11,
        facing_bet=5,
        iterations=1000,
        hand_class="Straight",
        effective_stack_bb=200,
        street="turn",
        config=DecisionConfig(value_raise_threshold=0.7),
    )

    assert advice.action == "RAISE"
    assert advice.recommended_raise_bb is not None
    assert advice.recommended_raise_bb > 5
    assert (advice.recommended_raise_bb * 2).is_integer()


def test_bet_size_present_when_action_is_bet() -> None:
    advice = recommend_action(
        equity=0.8,
        pot_size=18,
        facing_bet=0,
        iterations=1000,
        hand_class="Two Pair",
        effective_stack_bb=200,
        street="river",
        config=DecisionConfig(value_bet_threshold=0.6),
    )

    assert advice.action == "BET"
    assert advice.recommended_raise_bb is not None
    assert advice.recommended_raise_label is not None

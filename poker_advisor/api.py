from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    import joblib
except ImportError:  # pragma: no cover
    joblib = None

from .decision import DecisionConfig, compute_pot_odds, recommend_action, recommend_raise_size
from .equity import estimate_equity

Street = Literal["preflop", "flop", "turn", "river"]
AdviceMode = Literal["rule", "ml"]
OpponentRange = Literal["tight", "standard", "loose"]
MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "action_model_balanced.joblib"


class AdviceRequest(BaseModel):
    hero_hole: tuple[str, str]
    board: list[str] = Field(default_factory=list, min_length=0, max_length=5)
    street: Street
    mode: AdviceMode = "rule"
    num_opponents: int = Field(default=1, ge=1, le=8)
    opponent_range: OpponentRange | None = None
    pot_bb: float = Field(ge=0)
    facing_bet_bb: float = Field(ge=0)
    allow_bluffs: bool = False
    effective_stack_bb: float | None = Field(default=100, ge=0)
    min_raise_bb: float | None = Field(default=None, ge=0)
    max_raise_bb: float | None = Field(default=None, ge=0)


class AdviceResponse(BaseModel):
    action: Literal["FOLD", "CALL", "RAISE", "CHECK", "BET"]
    equity: float
    pot_odds: float
    samples: int
    reason: str
    mode_used: AdviceMode
    recommended_raise_bb: float | None = None
    recommended_raise_label: str | None = None
    raise_reason: str | None = None


app = FastAPI(title="Poker Advisor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _validate_board_for_street(street: Street, board: list[str]) -> None:
    expected_by_street = {
        "preflop": 0,
        "flop": 3,
        "turn": 4,
        "river": 5,
    }
    expected = expected_by_street[street]
    if len(board) != expected:
        raise HTTPException(status_code=422, detail=f"Street '{street}' expects {expected} board cards, got {len(board)}")


@lru_cache(maxsize=1)
def _load_ml_artifact() -> dict[str, object] | None:
    if joblib is None:
        return None
    if not MODEL_PATH.exists():
        return None
    loaded = joblib.load(MODEL_PATH)
    if not isinstance(loaded, dict):
        return None
    if "pipeline" not in loaded:
        return None
    return loaded


def _predict_ml_action(
    *,
    street: Street,
    num_opponents: int,
    pot_bb: float,
    facing_bet_bb: float,
    effective_stack_bb: float,
    allow_bluffs: bool,
    equity: float,
    pot_odds: float,
) -> tuple[str, str]:
    artifact = _load_ml_artifact()
    if artifact is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "ML model unavailable. Expected artifact at "
                f"{MODEL_PATH}. Train with: python -m ml.train --data data/train_balanced.csv --model {MODEL_PATH}"
            ),
        )

    pipeline = artifact["pipeline"]

    row = pd.DataFrame(
        [
            {
                "street": street,
                "num_opponents": num_opponents,
                "pot_bb": pot_bb,
                "facing_bet_bb": facing_bet_bb,
                "effective_stack_bb": effective_stack_bb,
                "allow_bluffs": int(allow_bluffs),
                "equity": equity,
                "pot_odds": pot_odds,
            }
        ]
    )

    predicted = str(pipeline.predict(row)[0])
    valid_actions = {"FOLD", "CALL", "RAISE", "CHECK", "BET"}
    if predicted not in valid_actions:
        raise HTTPException(status_code=500, detail=f"ML model predicted invalid action: {predicted}")

    reason = "ML model prediction from trained action policy"
    if hasattr(pipeline, "predict_proba") and hasattr(pipeline, "classes_"):
        probabilities = pipeline.predict_proba(row)[0]
        confidence = float(max(probabilities))
        reason = f"ML model prediction (confidence {confidence:.2f})"

    return predicted, reason


@app.post("/advice", response_model=AdviceResponse)
def advice(payload: AdviceRequest) -> AdviceResponse:
    _validate_board_for_street(payload.street, payload.board)

    try:
        equity_result = estimate_equity(
            hero_hole_cards=list(payload.hero_hole),
            board_cards=payload.board,
            num_opponents=payload.num_opponents,
            opponent_range=payload.opponent_range,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    effective_stack = payload.effective_stack_bb if payload.effective_stack_bb is not None else 100
    pot_odds = compute_pot_odds(payload.pot_bb, payload.facing_bet_bb)

    if payload.mode == "ml":
        ml_action, ml_reason = _predict_ml_action(
            street=payload.street,
            num_opponents=payload.num_opponents,
            pot_bb=payload.pot_bb,
            facing_bet_bb=payload.facing_bet_bb,
            effective_stack_bb=effective_stack,
            allow_bluffs=payload.allow_bluffs,
            equity=equity_result.equity,
            pot_odds=pot_odds,
        )

        sizing = recommend_raise_size(
            action=ml_action,
            street=payload.street,
            pot_size=payload.pot_bb,
            facing_bet=payload.facing_bet_bb,
            effective_stack_bb=effective_stack,
            min_raise=payload.min_raise_bb,
            max_raise=payload.max_raise_bb,
        )

        if ml_action == "RAISE" and sizing is None:
            ml_action = "CALL"
            ml_reason = f"{ml_reason}; no legal raise size fits the stack and raise limits, so calling instead"

        recommended_raise_bb = None
        recommended_raise_label = None
        raise_reason = None
        if sizing is not None:
            recommended_raise_bb, recommended_raise_label, raise_reason = sizing

        return AdviceResponse(
            action=ml_action,
            equity=equity_result.equity,
            pot_odds=pot_odds,
            samples=equity_result.iterations,
            reason=ml_reason,
            mode_used="ml",
            recommended_raise_bb=recommended_raise_bb,
            recommended_raise_label=recommended_raise_label,
            raise_reason=raise_reason,
        )

    advice_result = recommend_action(
        equity=equity_result.equity,
        pot_size=payload.pot_bb,
        facing_bet=payload.facing_bet_bb,
        iterations=equity_result.iterations,
        hand_class=equity_result.hand_class,
        effective_stack_bb=effective_stack,
        street=payload.street,
        min_raise=payload.min_raise_bb,
        max_raise=payload.max_raise_bb,
        config=DecisionConfig(bluff_enabled=payload.allow_bluffs),
    )

    return AdviceResponse(
        action=advice_result.action,
        equity=advice_result.equity,
        pot_odds=advice_result.pot_odds,
        samples=advice_result.iterations,
        reason=advice_result.reason,
        mode_used="rule",
        recommended_raise_bb=advice_result.recommended_raise_bb,
        recommended_raise_label=advice_result.recommended_raise_label,
        raise_reason=advice_result.raise_reason,
    )

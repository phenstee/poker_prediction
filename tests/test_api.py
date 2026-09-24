import pytest
from fastapi.testclient import TestClient

from poker_advisor import api

client = TestClient(api.app)

VALID_ACTIONS = {"FOLD", "CALL", "RAISE", "CHECK", "BET"}


def _river_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "hero_hole": ["As", "Ks"],
        "board": ["Qs", "Js", "2s", "9h", "4d"],
        "street": "river",
        "pot_bb": 20,
        "facing_bet_bb": 10,
    }
    payload.update(overrides)
    return payload


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_nut_flush_facing_bet_raises() -> None:
    response = client.post("/advice", json=_river_payload())
    assert response.status_code == 200
    body = response.json()
    assert body["action"] == "RAISE"
    assert body["mode_used"] == "rule"
    assert body["equity"] > 0.9
    assert body["pot_odds"] == pytest.approx(10 / 30)
    assert body["recommended_raise_bb"] > 10


def test_no_bet_reports_zero_pot_odds() -> None:
    response = client.post("/advice", json=_river_payload(facing_bet_bb=0))
    assert response.status_code == 200
    body = response.json()
    assert body["pot_odds"] == 0.0
    assert body["action"] == "BET"


def test_opponent_range_is_accepted() -> None:
    response = client.post("/advice", json=_river_payload(opponent_range="tight"))
    assert response.status_code == 200
    assert response.json()["action"] in VALID_ACTIONS


def test_unknown_opponent_range_rejected() -> None:
    response = client.post("/advice", json=_river_payload(opponent_range="maniac"))
    assert response.status_code == 422


def test_board_must_match_street() -> None:
    response = client.post("/advice", json=_river_payload(street="flop"))
    assert response.status_code == 422
    assert "expects 3 board cards" in response.json()["detail"]


def test_duplicate_cards_rejected() -> None:
    response = client.post("/advice", json=_river_payload(hero_hole=["Qs", "Ks"]))
    assert response.status_code == 400


def test_invalid_card_rejected() -> None:
    response = client.post("/advice", json=_river_payload(hero_hole=["Zz", "Ks"]))
    assert response.status_code == 400


def test_ml_mode_without_model_returns_503(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(api, "_load_ml_artifact", lambda: None)
    response = client.post("/advice", json=_river_payload(mode="ml"))
    assert response.status_code == 503
    assert "ML model unavailable" in response.json()["detail"]


@pytest.mark.skipif(not api.MODEL_PATH.exists(), reason="trained model artifact not present")
def test_ml_mode_with_model_returns_valid_action() -> None:
    response = client.post("/advice", json=_river_payload(mode="ml"))
    assert response.status_code == 200
    body = response.json()
    assert body["mode_used"] == "ml"
    assert body["action"] in VALID_ACTIONS

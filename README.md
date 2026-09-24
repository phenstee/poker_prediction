# Poker Advisor

[![CI](https://github.com/phenstee/poker_prediction/actions/workflows/ci.yml/badge.svg)](https://github.com/phenstee/poker_prediction/actions/workflows/ci.yml)

A full-stack Texas Hold'em decision assistant. Enter your hole cards, the board, the pot, and the bet you face; it estimates your equity with a Monte Carlo simulation and recommends an action (fold / check / call / bet / raise) with a bet size.

**Stack:** Python · FastAPI · scikit-learn · React 19 · TypeScript · Vite · Tailwind · Zustand · TanStack Query · pytest · Vitest · GitHub Actions

> Educational and offline analysis only. Input is manual; there is no poker-site integration, screen reading, or automation.

## How it works

```
 React UI ──POST /advice──▶ FastAPI ──▶ Monte Carlo equity ──▶ decision policy ──▶ action + sizing
                                        (treys evaluator)      ├─ rule engine (default)
                                                               └─ ML classifier (mode="ml")
```

### 1. Equity estimation (`poker_advisor/equity.py`)

Deals the unknown cards at random thousands of times, evaluates every showdown with the [`treys`](https://github.com/ihendley/treys) hand evaluator, and reports `equity = (wins + ties / 2) / iterations`.

- Sample counts scale by street: 20k preflop, 10k flop, 7.5k turn, 5k river.
- Supports 1–8 opponents.
- Opponents can hold random cards or be restricted to a preset range (`tight`, `standard`, `loose`; see `ranges.py`) through rejection sampling.

### 2. Decision policy (`poker_advisor/decision.py`)

Compares equity with pot odds, `facing_bet / (pot + facing_bet)`:

| Situation | Rule | Action |
|---|---|---|
| Facing a bet | equity < pot odds − 2% | FOLD |
| Facing a bet | equity ≥ 65% | RAISE |
| Facing a bet | otherwise | CALL |
| No bet | equity ≥ 62% | BET |
| No bet | otherwise | CHECK |

Bet sizing depends on the street (½ pot preflop, ⅔ pot on the flop and turn, ¾ pot on the river). Raises go to the bet plus the larger of ⅔·pot and 2×bet. Every size respects min/max raise limits, is capped by the effective stack, and is rounded to 0.5 bb.

### 3. ML policy (`ml/`)

A scikit-learn `RandomForestClassifier` inside a `Pipeline` that one-hot encodes the street. It predicts the action from 8 features: street, opponents, pot, facing bet, stack, bluff flag, equity, and pot odds.

- `ml/train_data.py` generates a synthetic dataset. It samples random game states, computes equity, and labels each row with the rule engine's action.
- `ml/train.py` trains with a stratified 80/20 split and reports a classification report.
- Because the labels come from the rule engine, the model **learns to reproduce that policy** (~99% validation accuracy). It does not learn a stronger one. Training on real hand outcomes (expected value, EV) instead of rule labels would be the next step toward a policy that could beat the rules.

## Getting started

Requires Python 3.11+ and Node 20+.

```bash
pip install -r requirements-dev.txt
npm install
npm --prefix poker_advisor_ui install

# optional: train the model used by mode="ml" (~3 s)
python -m ml.train --data data/train_balanced.csv --model models/action_model_balanced.joblib

npm run dev
```

- Backend: http://127.0.0.1:8000 (interactive docs at `/docs`)
- Frontend: http://localhost:5173 (proxies `/api/*` to the backend)

A terminal version is also available: `python -m poker_advisor.cli`.

## API

`GET /health` → `{"status": "ok"}`

`POST /advice`

```json
{
  "hero_hole": ["Ah", "Kh"],
  "board": ["Qh", "7h", "2c"],
  "street": "flop",
  "pot_bb": 12,
  "facing_bet_bb": 8,
  "num_opponents": 1,
  "opponent_range": "standard",
  "mode": "rule"
}
```

```json
{
  "action": "CALL",
  "equity": 0.629,
  "pot_odds": 0.4,
  "samples": 10000,
  "reason": "equity above pot odds",
  "mode_used": "rule",
  "recommended_raise_bb": null,
  "recommended_raise_label": null,
  "raise_reason": null
}
```

Optional fields: `num_opponents` (1–8), `opponent_range` (`tight` | `standard` | `loose`), `effective_stack_bb`, `min_raise_bb`, `max_raise_bb`, `allow_bluffs`, `mode` (`rule` | `ml`).

Errors:

- `422`: invalid schema, or a board that doesn't match the street
- `400`: invalid or duplicate cards
- `503`: `mode="ml"` without a trained model

## Tests

```bash
python -m pytest -q                        # backend: cards, equity, decision policy, API
npm --prefix poker_advisor_ui test         # frontend: store and card utilities
```

CI runs both suites and the production frontend build on every push.

## Project layout

```
poker_advisor/      core engine: cards, equity, ranges, decision policy, FastAPI app, CLI
ml/                 synthetic data generation, training, evaluation, inference
data/               generated training datasets
poker_advisor_ui/   React + TypeScript frontend
tests/              pytest suite
```

## Limitations

- The rule engine uses fixed equity thresholds. It is not a game-theory-optimal (GTO) solver, and it ignores position, stack-to-pot ratio, and drawing odds.
- By default opponents hold random hands, which overstates hero equity when facing a bet. Pass `opponent_range` to get a more realistic estimate.

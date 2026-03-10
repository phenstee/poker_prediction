from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import pandas as pd


def main() -> None:
    parser = argparse.ArgumentParser(description="Run one prediction with trained model")
    parser.add_argument("--model", type=Path, default=Path("models/action_model.joblib"))
    parser.add_argument("--street", type=str, default="flop")
    parser.add_argument("--num-opponents", type=int, default=1)
    parser.add_argument("--pot-bb", type=float, default=12.5)
    parser.add_argument("--facing-bet-bb", type=float, default=8.0)
    parser.add_argument("--effective-stack-bb", type=float, default=100.0)
    parser.add_argument("--allow-bluffs", type=int, default=0)
    parser.add_argument("--equity", type=float, default=0.42)
    parser.add_argument("--pot-odds", type=float, default=0.39)
    args = parser.parse_args()

    artifact = joblib.load(args.model)
    clf = artifact["pipeline"]

    row = pd.DataFrame(
        [
            {
                "street": args.street,
                "num_opponents": args.num_opponents,
                "pot_bb": args.pot_bb,
                "facing_bet_bb": args.facing_bet_bb,
                "effective_stack_bb": args.effective_stack_bb,
                "allow_bluffs": args.allow_bluffs,
                "equity": args.equity,
                "pot_odds": args.pot_odds,
            }
        ]
    )

    pred = clf.predict(row)[0]
    proba = clf.predict_proba(row)[0]
    labels = clf.classes_

    print(f"predicted action: {pred}")
    print("probabilities:")
    for label, p in sorted(zip(labels, proba), key=lambda x: x[1], reverse=True):
      print(f"  {label}: {p:.3f}")


if __name__ == "__main__":
    main()

from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


def main() -> None:
    parser = argparse.ArgumentParser(description="Train poker action model")
    parser.add_argument("--data", type=Path, default=Path("data/train.csv"))
    parser.add_argument("--model", type=Path, default=Path("models/action_model.joblib"))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    df = pd.read_csv(args.data)

    feature_cols = [
        "street",
        "num_opponents",
        "pot_bb",
        "facing_bet_bb",
        "effective_stack_bb",
        "allow_bluffs",
        "equity",
        "pot_odds",
    ]
    target_col = "action"

    X = df[feature_cols]
    y = df[target_col]

    class_counts = y.value_counts()
    stratify = y if (class_counts >= 2).all() else None

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=args.seed,
        stratify=stratify,
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("street", OneHotEncoder(handle_unknown="ignore"), ["street"]),
            (
                "num",
                "passthrough",
                [
                    "num_opponents",
                    "pot_bb",
                    "facing_bet_bb",
                    "effective_stack_bb",
                    "allow_bluffs",
                    "equity",
                    "pot_odds",
                ],
            ),
        ]
    )

    model = RandomForestClassifier(
        n_estimators=250,
        random_state=args.seed,
        class_weight="balanced",
        min_samples_leaf=2,
    )

    clf = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", model),
        ]
    )

    clf.fit(X_train, y_train)
    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)

    print(f"validation accuracy: {acc:.4f}")
    print("classification report:")
    print(classification_report(y_test, preds, digits=3, zero_division=0))

    args.model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "pipeline": clf,
            "feature_cols": feature_cols,
            "target_col": target_col,
        },
        args.model,
    )
    print(f"saved model: {args.model}")


if __name__ == "__main__":
    main()

from __future__ import annotations

import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate trained poker action model")
    parser.add_argument("--data", type=Path, default=Path("data/train.csv"))
    parser.add_argument("--model", type=Path, default=Path("models/action_model.joblib"))
    args = parser.parse_args()

    df = pd.read_csv(args.data)
    artifact = joblib.load(args.model)
    clf = artifact["pipeline"]
    feature_cols = artifact["feature_cols"]
    target_col = artifact["target_col"]

    X = df[feature_cols]
    y = df[target_col]

    preds = clf.predict(X)
    print(f"accuracy (full dataset): {accuracy_score(y, preds):.4f}")
    print("classification report:")
    print(classification_report(y, preds, digits=3))
    print("confusion matrix:")
    print(confusion_matrix(y, preds, labels=clf.classes_))
    print("labels:")
    print(list(clf.classes_))


if __name__ == "__main__":
    main()

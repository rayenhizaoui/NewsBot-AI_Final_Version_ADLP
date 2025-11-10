#!/usr/bin/env python3
"""Generate LIME and SHAP explanations for AI-generated news summaries.

This script approximates how an abstractive summary (e.g., produced by Gemini)
relates to the underlying article by treating each summary bullet as a target
concept and analysing which tokens in the article have the strongest influence
on that concept. The influence scores are computed with two local XAI tools:
LIME (Local Interpretable Model-agnostic Explanations) and SHAP (SHapley
Additive exPlanations).

The script expects a JSON payload describing the article and its generated
summary. Example input file:

{
  "article": "<full article text>",
  "summary": [
    "Bullet one.",
    "Bullet two.",
    "Bullet three."
  ]
}

Usage:
  python scripts/explain_summary_xai.py --input data.json --output report.json

Dependencies (install via pip):
  pip install lime shap scikit-learn numpy
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, List, Sequence, Tuple

import numpy as np
from lime.lime_text import LimeTextExplainer
import shap
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


@dataclass
class SummaryPayload:
    article: str
    bullets: List[str]


def load_payload(input_path: Path) -> SummaryPayload:
    with input_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    article = (payload.get("article") or "").strip()
    raw_summary = payload.get("summary")

    if not article:
        raise ValueError("The input payload must contain a non-empty 'article' field.")

    bullets: List[str] = []
    if isinstance(raw_summary, list):
        bullets = [str(item).strip() for item in raw_summary if str(item).strip()]
    elif isinstance(raw_summary, str):
        for line in raw_summary.splitlines():
            cleaned = line.strip().lstrip("-•*").strip()
            if cleaned:
                bullets.append(cleaned)

    if not bullets:
        raise ValueError("The input payload must provide at least one summary bullet under 'summary'.")

    return SummaryPayload(article=article, bullets=bullets)


class BulletAttributionModel:
    """Maps article text to summary relevance using embedding similarity."""

    def __init__(self, article: str, bullet: str) -> None:
        self.article = article
        self.bullet = bullet
        self.vectorizer = TfidfVectorizer(
            lowercase=True,
            strip_accents="unicode",
            ngram_range=(1, 2),
            stop_words="english",
            min_df=1,
        )
        self.vectorizer.fit([article, bullet])
        self._bullet_vector = self.vectorizer.transform([bullet])

    def predict_proba(self, texts: Sequence[str]) -> np.ndarray:
        matrix = self.vectorizer.transform(texts)
        sims = cosine_similarity(matrix, self._bullet_vector).ravel()
        probs = np.clip(0.5 * (sims + 1.0), 0.0, 1.0)
        complement = 1.0 - probs
        return np.vstack([complement, probs]).T


def run_lime(model: BulletAttributionModel, article: str, top_k: int) -> List[Tuple[str, float]]:
    explainer = LimeTextExplainer(class_names=["not_related", "related"], random_state=42)
    explanation = explainer.explain_instance(
        article,
        model.predict_proba,
        labels=[1],
        num_features=top_k,
    )
    return explanation.as_list(label=1)[:top_k]


def run_shap(
    model: BulletAttributionModel,
    article: str,
    top_k: int,
    max_evals: int,
) -> List[Tuple[str, float]]:
    masker = shap.maskers.Text()
    predictor: Callable[[Sequence[str]], np.ndarray] = lambda texts: model.predict_proba(texts)[:, 1]
    explainer = shap.Explainer(predictor, masker)
    explanation = explainer([article], max_evals=max_evals)
    tokens = explanation.data[0]
    values = explanation.values[0]

    pairs: List[Tuple[str, float]] = []
    for token, value in zip(tokens, values):
        token_str = str(token).strip()
        if token_str:
            pairs.append((token_str, float(value)))

    pairs.sort(key=lambda item: abs(item[1]), reverse=True)
    return pairs[:top_k]


def build_report(
    payload: SummaryPayload,
    lime_top_k: int,
    shap_top_k: int,
    shap_max_evals: int,
) -> List[dict]:
    report: List[dict] = []

    for idx, bullet in enumerate(payload.bullets, start=1):
        model = BulletAttributionModel(payload.article, bullet)
        lime_weights = run_lime(model, payload.article, lime_top_k)
        shap_weights = run_shap(model, payload.article, shap_top_k, shap_max_evals)

        report.append(
            {
                "bullet_index": idx,
                "bullet_text": bullet,
                "lime": [
                    {"token": token, "weight": round(weight, 6)} for token, weight in lime_weights
                ],
                "shap": [
                    {"token": token, "weight": round(weight, 6)} for token, weight in shap_weights
                ],
            }
        )

    return report


def print_report(report: Sequence[dict]) -> None:
    for entry in report:
        print(f"=== Bullet {entry['bullet_index']} ===")
        print(f"{entry['bullet_text']}")
        print("LIME top tokens:")
        if entry["lime"]:
            for item in entry["lime"]:
                weight = f"{item['weight']:.4f}".rjust(10)
                print(f"  {weight}  {item['token']}")
        else:
            print("  (no influential tokens found)")

        print("SHAP top tokens:")
        if entry["shap"]:
            for item in entry["shap"]:
                weight = f"{item['weight']:.4f}".rjust(10)
                print(f"  {weight}  {item['token']}")
        else:
            print("  (no influential tokens found)")
        print()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Explain AI-generated summaries with LIME and SHAP.")
    parser.add_argument("--input", required=True, type=Path, help="Path to the JSON payload containing article and summary.")
    parser.add_argument("--output", type=Path, help="Optional path to write the explanation report as JSON.")
    parser.add_argument("--lime-top", type=int, default=8, help="Number of top tokens to keep in the LIME report.")
    parser.add_argument("--shap-top", type=int, default=8, help="Number of top tokens to keep in the SHAP report.")
    parser.add_argument(
        "--shap-max-evals",
        type=int,
        default=300,
        help="Maximum number of model evaluations for SHAP kernel approximation.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload = load_payload(args.input)
    report = build_report(payload, args.lime_top, args.shap_top, args.shap_max_evals)

    print_report(report)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2)
        print(f"Report written to {args.output}")


if __name__ == "__main__":
    main()

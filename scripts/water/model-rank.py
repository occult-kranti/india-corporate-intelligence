#!/usr/bin/env python3
"""Rank public water, weather, farming and food evidence locally, never as verification."""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import sys

DEFAULT_INPUT = Path("research/water/model-corpus.json")
DEFAULT_OUTPUT = Path("research/water/model-suggestions.json")
WATER_QUERIES = {
    "water-service": "Household tap connections drinking water supply availability functionality regularity quantity and public water service in India",
    "water-quality": "Drinking water quality monitoring laboratory tests contamination chemical pollutants and standards for potable water in India",
    "weather-and-access": "Drought rainfall floods reservoir storage climate and urban water shortages affecting communities in India",
    "farming-and-inputs": "Seeds irrigation fertilizer crop production agricultural inputs farmer support insurance and crop failure in India",
    "food-supply": "Food grain procurement storage stocks allocation offtake transport and ration distribution through India's public distribution system and Food Corporation of India",
    "spending-and-procurement": "Audit of government water supply schemes and food grain procurement: tendering contracts expenditure implementation deficiencies and CAG audit findings in India",
}


def model_engine():
    # Reuse the audited, pinned CPU implementation in a fresh module namespace.
    # Changing this instance's query list cannot change the education CLI or its
    # artifacts. This wrapper also owns its separate input and output defaults.
    implementation = Path(__file__).resolve().parents[1] / "education" / "model-rank.py"
    spec = importlib.util.spec_from_file_location("water_research_model_core", implementation)
    if spec is None or spec.loader is None:
        raise ValueError("The shared pinned model implementation is unavailable")
    engine = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(engine)
    engine.QUERIES = dict(WATER_QUERIES)
    return engine


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--cache", type=Path, default=Path.home() / ".cache" / "india-education-models", help="Reuse the identical pinned education research model weights")
    parser.add_argument("--offline", action="store_true", help="Use already cached, hash-verified weights only")
    parser.add_argument("--verify", action="store_true", help="Validate the saved artifact without model dependencies or inference")
    args = parser.parse_args()
    engine = model_engine()
    documents, corpus_hash = engine.read_corpus(args.input)
    if args.verify:
        result = json.loads(args.output.read_text())
        engine.validate_result(result, documents, corpus_hash)
        if result.get("researchDomain") != "water-weather-food":
            raise ValueError("Artifact does not belong to the water, weather and food register")
        print(f"Validated {len(documents)} public source summaries and {len(WATER_QUERIES)} water research queries; suggestions remain unverified.")
        return

    result = engine.rank(documents, corpus_hash, args.cache, args.offline)
    result["researchDomain"] = "water-weather-food"
    result["limitation"] = (
        "Cosine similarity ranks public researcher-authored source summaries. It is not factual confidence, "
        "a water-safety verdict, a causal climate finding, a funding total, or proof of misconduct. "
        "No model-generated claim or risk classification is promoted to the evidence registry."
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".partial")
    temporary.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    temporary.replace(args.output)
    print(f"Ranked {len(documents)} public summaries locally with {engine.MODEL_ID}; wrote {args.output}.")


if __name__ == "__main__":
    try:
        main()
    except ImportError as error:
        sys.exit(f"Missing model dependency: {error}. Install scripts/education/model-requirements.txt in an isolated environment.")
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as error:
        sys.exit(f"Water research model workflow failed: {error}")

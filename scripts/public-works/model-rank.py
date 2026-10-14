#!/usr/bin/env python3
"""Rank public procurement evidence locally; suggestions never establish influence or misconduct."""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import sys

DEFAULT_INPUT = Path("research/public-works/model-corpus.json")
DEFAULT_OUTPUT = Path("research/public-works/model-suggestions.json")
PROCUREMENT_QUERIES = {
    "road-contract-delivery": "Government roads bridges highway works tender contract award construction quality defect maintenance and completion records in India",
    "repeat-work-review": "Repeated public works overlapping contracts same asset scope chainage location periods corrigendum retender cancelled work maintenance and audit findings",
    "utilities-and-services": "Electricity water hospital schools public and private institutions procurement delivery quality audit findings government funding",
    "security-and-recruitment": "Police military public administration recruitment examination funding procurement audit legal jurisdiction and official response",
    "rules-and-dates": "Public procurement law regulation amendment effective date works goods services state central government contract applicability",
    "verified-connections": "Exact corporate legal entity subsidiary ownership public official dated office tenure political party contributions electoral bonds and limitations of evidence of award influence",
}


def model_engine():
    # Reuse the audited, pinned CPU implementation in a fresh module namespace.
    # Changing this instance's query list cannot change the education CLI or its
    # artifacts. This wrapper also owns its separate input and output defaults.
    implementation = Path(__file__).resolve().parents[1] / "education" / "model-rank.py"
    spec = importlib.util.spec_from_file_location("public_works_research_model_core", implementation)
    if spec is None or spec.loader is None:
        raise ValueError("The shared pinned model implementation is unavailable")
    engine = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(engine)
    engine.QUERIES = dict(PROCUREMENT_QUERIES)
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
        if result.get("researchDomain") != "public-works-procurement":
            raise ValueError("Artifact does not belong to the public works and procurement register")
        print(f"Validated {len(documents)} public source summaries and {len(PROCUREMENT_QUERIES)} public procurement queries; suggestions remain unverified.")
        return

    result = engine.rank(documents, corpus_hash, args.cache, args.offline)
    result["researchDomain"] = "public-works-procurement"
    result["limitation"] = (
        "Cosine similarity ranks public researcher-authored source summaries. It is not factual confidence, "
        "a contract match, a corruption verdict, an award-influence finding, or proof of misconduct. "
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
        sys.exit(f"Public works research model workflow failed: {error}")

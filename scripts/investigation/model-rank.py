#!/usr/bin/env python3
"""Rank investigation research summaries locally; relevance never establishes findings."""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path
import sys

DEFAULT_INPUT = Path("research/investigation/model-corpus.json")
DEFAULT_OUTPUT = Path("research/investigation/model-suggestions.json")
INVESTIGATION_QUERIES = {
    "pmcares-governance": "PM CARES public charitable trust governance trustees audit receipts donations expenditure disclosure and Right to Information legal status",
    "debt-accounting": "Bank loan write off versus loan waiver recoveries corporate insolvency resolution settlement haircut RBI accounting public funds financial statement evidence",
    "court-procedure": "Judicial proceedings FIR investigation arrest bail discharge conviction acquittal appeal allegations exact procedural status dated court orders",
    "judicial-appointments": "Judges appointment constitutional offices collegium recommendations notification tenure court roster separate judge identity and adjudication",
    "welfare-delivery": "Government welfare cash transfer scheme announcement budget appropriation eligibility sanction payment delivery outcomes audit response India",
    "exact-connections": "Source documented canonical entity corporate ownership official role tenure court case party funding connections historical dates and counter evidence no causal inference",
}


def model_engine():
    # Reuse the audited, pinned CPU implementation in a fresh module namespace.
    # Changing this instance's query list cannot change the education CLI or its
    # artifacts. This wrapper also owns its separate input and output defaults.
    implementation = Path(__file__).resolve().parents[1] / "education" / "model-rank.py"
    spec = importlib.util.spec_from_file_location("investigation_research_model_core", implementation)
    if spec is None or spec.loader is None:
        raise ValueError("The shared pinned model implementation is unavailable")
    engine = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(engine)
    engine.QUERIES = dict(INVESTIGATION_QUERIES)
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
        if result.get("researchDomain") != "cross-domain-investigation":
            raise ValueError("Artifact does not belong to the cross-domain investigation corpus")
        print(f"Validated {len(documents)} public source summaries and {len(INVESTIGATION_QUERIES)} cross-domain investigation queries; suggestions remain unverified.")
        return

    result = engine.rank(documents, corpus_hash, args.cache, args.offline)
    result["researchDomain"] = "cross-domain-investigation"
    result["limitation"] = (
        "Cosine similarity ranks public researcher-authored source summaries. It is not factual confidence, "
        "an identity match, a corruption verdict, a legal finding, an award-influence finding, or proof of misconduct. "
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
        sys.exit(f"Investigation research model workflow failed: {error}")

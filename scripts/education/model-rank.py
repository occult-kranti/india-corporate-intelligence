#!/usr/bin/env python3
"""Rank public education evidence locally. Similarity is never verification."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import platform
import sys
import time
from urllib.parse import urlparse
from urllib.request import urlopen

MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
REVISION = "1110a243fdf4706b3f48f1d95db1a4f5529b4d41"
ASSETS = {
    "onnx/model_quint8_avx2.onnx": (
        "b941bf19f1f1283680f449fa6a7336bb5600bdcd5f84d10ddc5cd72218a0fd21",
        23_046_789,
    ),
    "tokenizer.json": (
        "be50c3628f2bf5bb5e3a7f17b1f74611b2561a3a27eeab05e5aa30f411572037",
        466_247,
    ),
}
QUERIES = {
    "public-school-funding": "Government school education funding budget allocations grants and public spending in Indian states",
    "college-funding": "Higher education colleges universities research and technical education financing grants and loans in India",
    "foreign-ngo-funding": "Foreign education donors investment philanthropy foundations NGOs development impact bonds and FCRA in India",
    "school-access": "School closures mergers falling school numbers children population growth enrollment access and travel distance",
    "private-school-accountability": "Private school education funding fees public reimbursement and transparency accountability in India",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_corpus(path: Path) -> tuple[list[dict], str]:
    raw = path.read_bytes()
    payload = json.loads(raw)
    if not isinstance(payload, dict):
        raise ValueError("Corpus must be a JSON object with a documents array")
    documents = payload.get("documents")
    if not isinstance(documents, list) or not documents:
        raise ValueError("Corpus must contain a nonempty documents array")
    if len(documents) > 2_000:
        raise ValueError("Bounded local workflow accepts at most 2,000 documents")
    seen: set[str] = set()
    for document in documents:
        if not isinstance(document, dict):
            raise ValueError("Each document must be an object")
        for field in ("id", "title", "text", "url"):
            if not isinstance(document.get(field), str) or not document[field].strip():
                raise ValueError(f"Each document requires nonempty {field}")
        if document["id"] in seen:
            raise ValueError(f"Duplicate document id: {document['id']}")
        seen.add(document["id"])
        parsed = urlparse(document["url"])
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("Evidence URL must be a public HTTP(S) citation without embedded credentials")
        if len(document["text"]) > 20_000:
            raise ValueError("Document text must be a concise public evidence summary (20,000 characters maximum)")
    return documents, sha256(raw)


def asset(cache: Path, filename: str, offline: bool) -> Path:
    expected_hash, expected_size = ASSETS[filename]
    target = cache / REVISION / filename
    if target.exists():
        raw = target.read_bytes()
        if len(raw) != expected_size or sha256(raw) != expected_hash:
            raise ValueError(f"Cached model asset failed integrity validation: {filename}")
        return target
    if offline:
        raise ValueError(f"Missing cached asset in offline mode: {filename}")
    target.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://huggingface.co/{MODEL_ID}/resolve/{REVISION}/{filename}"
    with urlopen(url, timeout=60) as response:
        raw = response.read(expected_size + 1)
    if len(raw) != expected_size or sha256(raw) != expected_hash:
        raise ValueError(f"Downloaded model asset failed integrity validation: {filename}")
    temporary = target.with_suffix(target.suffix + ".partial")
    temporary.write_bytes(raw)
    temporary.replace(target)
    return target


def validate_result(result: dict, documents: list[dict], corpus_hash: str) -> None:
    if not isinstance(result, dict):
        raise ValueError("Model output must be a JSON object")
    if result.get("schemaVersion") != 1 or result.get("purpose") != "research-discovery-only":
        raise ValueError("Invalid result schema or purpose")
    if result.get("automaticallyVerified") is not False:
        raise ValueError("Model output must never auto-verify evidence")
    if result.get("corpusSha256") != corpus_hash:
        raise ValueError("Model output does not match the current evidence corpus")
    if result.get("documentCount") != len(documents):
        raise ValueError("Model output document count differs from corpus")
    model = result.get("model", {})
    if not isinstance(model, dict) or model.get("id") != MODEL_ID or model.get("revision") != REVISION or model.get("license") != "Apache-2.0":
        raise ValueError("Unexpected model provenance")
    if model.get("assetSha256") != {filename: metadata[0] for filename, metadata in ASSETS.items()}:
        raise ValueError("Unexpected model asset hashes")
    known = {item["id"]: item for item in documents}
    if not isinstance(result.get("queries"), dict) or set(result["queries"]) != set(QUERIES):
        raise ValueError("Model output query set is incomplete")
    for query_id, query in result["queries"].items():
        if not isinstance(query, dict) or query.get("text") != QUERIES[query_id]:
            raise ValueError("Unexpected research query")
        matches = query.get("matches", [])
        if not isinstance(matches, list) or len(matches) != min(5, len(documents)):
            raise ValueError("Each query must have the expected top-five matches")
        seen: set[str] = set()
        previous_score = math.inf
        for match in matches:
            if not isinstance(match, dict):
                raise ValueError("Each model match must be a source record")
            document_id = match.get("documentId")
            if document_id not in known or document_id in seen:
                raise ValueError("Match is missing from corpus or duplicated")
            seen.add(document_id)
            score = match.get("similarity")
            if isinstance(score, bool) or not isinstance(score, (int, float)) or not math.isfinite(score) or not -1 <= score <= 1:
                raise ValueError("Cosine similarity must be finite and between -1 and 1")
            if score > previous_score:
                raise ValueError("Matches must be ranked by descending similarity")
            previous_score = score
            if match.get("url") != known[document_id]["url"] or match.get("title") != known[document_id]["title"]:
                raise ValueError("Model suggestion cannot invent or modify a citation")


def rank(documents: list[dict], corpus_hash: str, cache: Path, offline: bool) -> dict:
    # Import only in the inference path; corpus/result validation remains stdlib-only.
    import numpy as np
    import onnxruntime as ort
    from tokenizers import Tokenizer
    import tokenizers

    model_path = asset(cache, "onnx/model_quint8_avx2.onnx", offline)
    tokenizer_path = asset(cache, "tokenizer.json", offline)
    tokenizer = Tokenizer.from_file(str(tokenizer_path))
    tokenizer.enable_truncation(max_length=256)
    tokenizer.enable_padding(pad_id=0, pad_token="[PAD]")
    options = ort.SessionOptions()
    options.intra_op_num_threads = min(4, os.cpu_count() or 1)
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(model_path), sess_options=options, providers=["CPUExecutionProvider"])

    def embed(texts: list[str]):
        vectors = []
        for start in range(0, len(texts), 16):
            batch = tokenizer.encode_batch(texts[start:start + 16])
            values = {
                "input_ids": np.asarray([item.ids for item in batch], dtype=np.int64),
                "attention_mask": np.asarray([item.attention_mask for item in batch], dtype=np.int64),
                "token_type_ids": np.asarray([item.type_ids for item in batch], dtype=np.int64),
            }
            hidden = session.run(None, {item.name: values[item.name] for item in session.get_inputs()})[0]
            mask = values["attention_mask"][:, :, None]
            means = (hidden * mask).sum(axis=1) / np.clip(mask.sum(axis=1), 1, None)
            vectors.append(means / np.clip(np.linalg.norm(means, axis=1, keepdims=True), 1e-12, None))
        output = np.concatenate(vectors)
        if output.shape != (len(texts), 384) or not np.isfinite(output).all():
            raise ValueError("Unexpected embedding shape or nonfinite model output")
        return output

    started = time.perf_counter()
    document_vectors = embed([item["title"] + ". " + item["text"] for item in documents])
    query_vectors = embed(list(QUERIES.values()))
    similarities = query_vectors @ document_vectors.T
    # A bounded semantic smoke check catches wrong pooling/input wiring; this is
    # not an accuracy benchmark or a correctness judgment on evidence.
    smoke = embed([
        "Government school funding and education budgets in India",
        "Public education spending supports schools and students in Indian states",
        "A recipe for baking lemon cake with butter and sugar",
    ])
    relevant, unrelated = float(smoke[0] @ smoke[1]), float(smoke[0] @ smoke[2])
    if relevant <= unrelated:
        raise ValueError("Embedding smoke check failed: relevant pair should outrank unrelated pair")

    result = {
        "schemaVersion": 1,
        "purpose": "research-discovery-only",
        "automaticallyVerified": False,
        "limitation": "Cosine similarity ranks public evidence summaries. It is not factual confidence, verification, proof of misconduct, or a funding total. No model-generated claims are promoted to the evidence registry.",
        "model": {
            "id": MODEL_ID,
            "revision": REVISION,
            "license": "Apache-2.0",
            "modelCard": f"https://huggingface.co/{MODEL_ID}/blob/{REVISION}/README.md",
            "format": "ONNX uint8 AVX2",
            "dimensions": 384,
            "maxTokens": 256,
            "pooling": "attention-mask-weighted mean, L2 normalized",
            "assetSha256": {filename: metadata[0] for filename, metadata in ASSETS.items()},
        },
        "execution": {
            "provider": "CPUExecutionProvider",
            "python": platform.python_version(),
            "onnxruntime": ort.__version__,
            "tokenizers": tokenizers.__version__,
            "numpy": np.__version__,
            "inferenceSeconds": round(time.perf_counter() - started, 3),
            "publicTextUploadedToModelService": False,
        },
        "corpusSha256": corpus_hash,
        "documentCount": len(documents),
        "smokeCheck": {
            "passed": True,
            "relatedSimilarity": round(relevant, 6),
            "unrelatedSimilarity": round(unrelated, 6),
            "meaning": "Pipeline wiring check only; not an evidence or model accuracy evaluation",
        },
        "queries": {},
    }
    for query_index, (query_id, query_text) in enumerate(QUERIES.items()):
        ranking = sorted(range(len(documents)), key=lambda index: (-float(similarities[query_index, index]), documents[index]["id"]))[:5]
        result["queries"][query_id] = {
            "text": query_text,
            "matches": [
                {
                    "documentId": documents[index]["id"],
                    "title": documents[index]["title"],
                    "url": documents[index]["url"],
                    "similarity": round(float(np.clip(similarities[query_index, index], -1, 1)), 6),
                }
                for index in ranking
            ],
        }
    validate_result(result, documents, corpus_hash)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="Public corpus JSON with a documents array")
    parser.add_argument("--output", type=Path, default=Path("research/education/model-suggestions.json"))
    parser.add_argument("--cache", type=Path, default=Path.home() / ".cache" / "india-education-models")
    parser.add_argument("--offline", action="store_true", help="Require already cached, hash-verified model assets")
    parser.add_argument("--verify", action="store_true", help="Validate existing artifact against corpus without dependencies or inference")
    args = parser.parse_args()
    documents, corpus_hash = read_corpus(args.input)
    if args.verify:
        validate_result(json.loads(args.output.read_text()), documents, corpus_hash)
        print(f"Validated {len(documents)} source documents and 5 research queries; suggestions remain unverified.")
        return
    result = rank(documents, corpus_hash, args.cache, args.offline)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".partial")
    temporary.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    temporary.replace(args.output)
    print(f"Ranked {len(documents)} public documents locally with {MODEL_ID}; wrote {args.output}.")


if __name__ == "__main__":
    try:
        main()
    except ImportError as error:
        sys.exit(f"Missing model dependency: {error}. Install scripts/education/model-requirements.txt in an isolated environment.")
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as error:
        sys.exit(f"Model research workflow failed: {error}")

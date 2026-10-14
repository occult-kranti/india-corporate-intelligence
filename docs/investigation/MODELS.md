# Local open-source research prioritization

The investigation workflow actually ran `sentence-transformers/all-MiniLM-L6-v2` locally on CPU over **35 public researcher-authored source summaries** from the new finance, justice and welfare slices. Six queries prioritize documents for human review. The model does not generate verified claims, connect identities, assess criminal liability, infer corruption or edit the public evidence registry. No summary was uploaded to a model service.

| Provenance | Executed value |
| --- | --- |
| Model licence | Apache-2.0 |
| Pinned revision | `1110a243fdf4706b3f48f1d95db1a4f5529b4d41` |
| Inference | ONNX uint8 AVX2; CPUExecutionProvider |
| Embedding | 384 dimensions; attention-mask-weighted mean; L2 normalized |
| Input limit | 256 WordPiece tokens per title / source summary |
| Quantized weight SHA-256 | `b941bf19f1f1283680f449fa6a7336bb5600bdcd5f84d10ddc5cd72218a0fd21` |
| Tokenizer SHA-256 | `be50c3628f2bf5bb5e3a7f17b1f74611b2561a3a27eeab05e5aa30f411572037` |
| Source population | Finance14 + justice12 + welfare9 =35 summaries |
| Corpus SHA-256 | `a293af3ed27759f35c7e612302f5fec86999f1617725460124840438a5226e20` |
| Actual inference | 1.097 seconds; Python3.12.14, ONNX Runtime1.23.2, tokenizers0.22.1, NumPy2.3.4 |
| Execution date | 2026-10-06 |

The corpus retains each source's original ID, namespace, title, URL, evidence tier, retrieval date, researcher summary and limitations. It includes exact SHA-256 digests of all three raw input files. It contains summaries, **not extracted full-document text**. The generated artifact retains `purpose:research-discovery-only`, `automaticallyVerified:false`, pinned asset hashes, runtime metadata, exact query strings and bounded top-five lists. Nothing from those lists is automatically promoted into a claim or graph edge.

Queries cover PM CARES governance, debt write-off/waiver/recovery distinctions, judicial procedure, judicial appointments, welfare delivery and exact recorded connections. PM CARES governance retrieved the reviewed Supreme Court judgment and annual statement; debt accounting retrieved the reviewed parliamentary answer and RBI circular. Retrieval also exposed limitations: the appointments query selected procedural court orders, while the welfare query ranked a PM CARES annual account above the programme audit. These are candidate reading lists, not proof that a document answers a question. Researchers must check scope, event dates, legal posture and original source passages.

The related/unrelated-sentence smoke check passed (0.808023 versus0.015860 cosine similarity). That verifies pipeline wiring, not factual accuracy, retrieval quality or legal reliability. English summaries and 256-token truncation can omit material qualifications. Cosine scores are not confidence scores, corruption scores, outcome predictions or identity matches.

## Reproduce and verify

The investigation wrapper reuses the audited education model engine in a fresh module namespace, with its own queries, domain guard and output paths. It does not modify education, water or public-works artifacts. Weights and Python dependencies remain outside the repository.

```sh
node scripts/investigation/model-corpus.mjs
python3 -m venv /tmp/investigation-model-env
/tmp/investigation-model-env/bin/pip install -r scripts/education/model-requirements.txt
/tmp/investigation-model-env/bin/python scripts/investigation/model-rank.py --cache /tmp/investigation-model-cache
node scripts/investigation/model-corpus.mjs --verify
python3 scripts/investigation/model-rank.py --verify
```

An existing hash-verified cache supports `--offline`; the recorded run reused `/tmp/india-education-model-env` and `/tmp/india-education-model-cache` with that option. Verification requires only Node and Python's standard library. If any input slice changes, regenerate the corpus and rerun inference. Do not replace a stored corpus hash without executing the model again.

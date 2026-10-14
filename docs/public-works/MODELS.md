# Local open-source research model

The public-works workflow actually runs `sentence-transformers/all-MiniLM-L6-v2` locally on CPU. It ranks public researcher-authored source summaries for research discovery only. It does not read unpublished records, generate verified claims, resolve corporate identities, classify corruption or create relationship edges. No public text was uploaded to a model service.

| Provenance | Value |
| --- | --- |
| Model licence | Apache-2.0 |
| Pinned revision | `1110a243fdf4706b3f48f1d95db1a4f5529b4d41` |
| Inference format | ONNX quantized uint8 AVX2, CPUExecutionProvider |
| Embedding | 384 dimensions, attention-mask-weighted mean, L2 normalized |
| Token limit | 256 WordPiece tokens per title/summary input |
| Quantized weights SHA-256 | `b941bf19f1f1283680f449fa6a7336bb5600bdcd5f84d10ddc5cd72218a0fd21` |
| Tokenizer SHA-256 | `be50c3628f2bf5bb5e3a7f17b1f74611b2561a3a27eeab05e5aa30f411572037` |
| Actual reviewed corpus | 56 public summaries; six research queries |
| Corpus SHA-256 | `ccb10fe4726698621a94b7c29da3e0a01e0db3edb0bbbc20afd464b4879fba84` |
| Actual inference | 1.168 seconds; Python3.12.14, ONNX Runtime1.23.2, tokenizers0.22.1, NumPy2.3.4 |

Queries cover road delivery, repeated-work review, utilities/public services, security/recruitment, rules/dates and verified relationships. The output retains its research-only purpose, `automaticallyVerified:false`, input corpus hash, exact model asset hashes and runtime metadata. A related/unrelated sentence comparison passed as a wiring check; it is not a measured accuracy benchmark.

The public-works wrapper imports the audited education model engine in a separate module namespace and changes only its query list and domain-specific guard/limitations. Education and water artifacts are not modified. Model weights and Python dependencies are cached outside the repository; only scripts, public summaries and suggestions are committed. The website does not run this model in the browser.

## Reproduce

```sh
node scripts/education/model-corpus.mjs src/data/public-works-research.json research/public-works/model-corpus.json
python3 -m venv /tmp/public-works-model-env
/tmp/public-works-model-env/bin/pip install -r scripts/education/model-requirements.txt
/tmp/public-works-model-env/bin/python scripts/public-works/model-rank.py --cache /tmp/public-works-model-cache
python3 scripts/public-works/model-rank.py --verify
```

An existing hash-verified cache can be reused with `--offline`. Verification uses only Python's standard library; inference needs the pinned requirements. The result's exact corpus hash must match regenerated summaries. A changed corpus requires rerunning inference, not merely replacing its hash.

English source summaries lose detail, and truncation can drop limitations. Similarity can retrieve a document about the same subject without supporting the proposed claim. Read the original record and apply the procurement investigation skill before publishing any factual relationship. No embedding score is displayed as evidence confidence.

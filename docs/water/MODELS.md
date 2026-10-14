# Local open-model reading lists

The water, weather and food research workflow runs the Apache-2.0 licensed
[`sentence-transformers/all-MiniLM-L6-v2`](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
model locally on public researcher-authored source summaries. Its six queries
cover water service, water quality, weather and access, farming inputs, food
supply, and spending/procurement. They produce suggestions for what to read next.

The checked-in run uses 52 source summaries from the curated water register. The
artifact records the actual CPU inference time, corpus SHA-256, model revision,
weight hashes, runtime versions, and ranked source identifiers. It is an executed
research workflow, not a browser inference feature. Public summaries are not
uploaded to any model service.

## Reproduce or verify

The wrapper reuses the education workflow's pinned implementation and identical
23.5 MB of model assets. Its query list and artifact paths are separate; running
it does not change the education corpus or suggestions.

From the repository root:

```bash
python -m venv /tmp/india-education-model-env
/tmp/india-education-model-env/bin/pip install -r scripts/education/model-requirements.txt
node scripts/education/model-corpus.mjs \
  src/data/water-research.json research/water/model-corpus.json
/tmp/india-education-model-env/bin/python scripts/water/model-rank.py
python scripts/water/model-rank.py --verify
```

If the virtual environment and weights already exist, skip their setup. The
default cache is the same `~/.cache/india-education-models` directory used by the
education runner. Use `--cache /path/to/cache --offline` for an existing cache
with no asset downloads. Model weights never enter the application bundle.
Artifact verification needs only Python's standard library; it checks corpus
freshness, citations, pinned model metadata, scores, and the six expected queries.
Rebuild the corpus and rerun inference whenever source summaries change.

Model revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41` and the quantized
`onnx/model_quint8_avx2.onnx` asset are shared with the education workflow.
See [the implementation and integrity checks](../education/MODELS.md) for runtime
versions, hashes, pooling, the generic inference smoke check, and dependency-free
guard tests.

## Reading the suggestions

Similarity is **not confidence or verification**. A document discussing water
contamination can be relevant while supplying no measured sample from the selected
city. A funding announcement is not expenditure, and a drought bulletin cannot
establish why a household lost water service. Read each original source, reporting
period, geography, units, and limitations before using a result.

The model reads at most the first 256 wordpiece tokens of each title, summary and
limitations. This is an English-language retrieval aid over summaries, not an
extraction of complete PDFs or a tested multilingual search system. It cannot
reconcile laboratory standards, classify samples as safe, establish climate
causation, calculate missing payments, or verify allegations. The recorded semantic
smoke check tests the shared inference wiring, not water-domain accuracy.

No ranked suggestion creates a numeric observation, changes a source's evidence
tier, fills a missing release amount, or generates a risk score. The application's
measurement and comparison rules remain deterministic and independent of the model.

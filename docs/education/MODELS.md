# Local open model research

The education research workflow actually runs the open, Apache-2.0 licensed
[`sentence-transformers/all-MiniLM-L6-v2`](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
embedding model on the CPU. It ranks public researcher-authored source summaries
for five discovery questions: public funding, college funding, overseas/NGO
funding, school access, and private-school accountability.

This is an offline research aid after its first asset download. The website does
not download model weights or call an inference service. No source text is
uploaded to an external model. The checked-in suggestions document the actual
research run; they do not verify facts, generate accusations, identify closures,
or automatically alter the evidence registry.

The checked-in run used **38 public source summaries** from the curated register
and produced five ranked reading lists with local CPU inference. The artifact
records the measured inference time and exact corpus hash. Manual inspection found a useful
limitation: the school-focused STARS programme also ranks for the broad college
financing query. Researchers must check education level and evidence scope before
using a suggested source; similarity alone cannot make that decision.

## Reproduce

From the repository root, use Python 3.12 on x86-64 with AVX2 support:

```bash
python -m venv /tmp/india-education-model-env
/tmp/india-education-model-env/bin/pip install -r scripts/education/model-requirements.txt
node scripts/education/model-corpus.mjs
/tmp/india-education-model-env/bin/python scripts/education/model-rank.py \
  --input research/education/model-corpus.json
```

The first run downloads about 23.5 MB of model assets from Hugging Face into
`~/.cache/india-education-models`; `--cache /another/path` changes that location.
Subsequent runs can use `--offline`. Weights and Python packages are not committed
or included in the browser bundle. A model download or integrity error fails the
workflow; it does not replace output with a fabricated success. If this hardware
format is unavailable, retain the ordinary keyword source search in the website.

To verify the committed evidence linkage without downloading a model or installing
Python dependencies:

```bash
node scripts/education/model-corpus.mjs
python scripts/education/model-rank.py \
  --input research/education/model-corpus.json --verify
python scripts/education/model-rank.test.py
```

Rebuilding the corpus after a source changes intentionally invalidates the old
suggestion artifact. Run inference again to update its corpus hash. Source
summaries, model outputs, and citations are all reviewable in
`research/education/model-corpus.json` and
`research/education/model-suggestions.json`.

## Pinned model and execution

| Property | Value |
| --- | --- |
| Model | `sentence-transformers/all-MiniLM-L6-v2` |
| License | Apache-2.0, as stated in the pinned model card |
| Revision | `1110a243fdf4706b3f48f1d95db1a4f5529b4d41` |
| Artifact | `onnx/model_quint8_avx2.onnx`, 23,046,789 bytes |
| Embeddings | 384 dimensions; attention-masked mean pooling; L2 normalization |
| Text limit | First 256 wordpiece tokens of title + summary + limitations |
| Runtime | ONNX Runtime 1.23.2, CPU; tokenizers 0.22.1; NumPy 2.3.4 |
| Network | Asset download only; inference uses local public summaries |

Both tokenizer and model weights are checked against pinned SHA-256 hashes before
every inference run. Remote Python model code is not loaded. Inputs are capped at
2,000 summaries and 20,000 characters per summary, with batches of 16 and at most
four CPU threads. Python runtime versions and measured inference duration are
recorded in the artifact. Duration can vary between otherwise equivalent runs.

## How to interpret the output

Scores are cosine similarities, **not confidence levels**. English semantic
similarity cannot establish whether a document supports a number, whether a
grant was disbursed, or whether a school closed. Regional-language material,
tables, long evidence chains, and names outside the training distribution need
separate review. Quantization can change rankings slightly. Including caveats
in summaries can also move a document closer to a question it expressly cannot
answer; a researcher must read the cited source and limitations.

The deterministic output validator rejects stale corpus hashes, unpinned assets,
missing or invented citations, automatic verification, invalid scores, and
incomplete query sets. A small semantic smoke check verifies that a school-budget
sentence is closer to a related education sentence than to a cake recipe. This
checks inference wiring only; it is not a model accuracy benchmark.

The school-count/population comparison in the application is a separate,
deterministic function. Model similarity never supplies its numerical inputs or
overrides its geography, age-band, time-period, boundary, or provenance gates.

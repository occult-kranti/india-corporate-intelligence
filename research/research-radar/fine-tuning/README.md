# Local retrieval fine-tuning artifacts

An actual local MiniLM LoRA run trained **73,728 parameters**, using 70 relevance questions and 39 training-source summaries. It completed 72 optimizer steps, eight epochs and 143.37 seconds of CPU training on 7 October 2026 (America/New_York; machine receipts are dated 8 October UTC).

**The candidate is experimental and was not promoted.** The independent 20-question, five-case test found nDCG@5 of 0.9342 versus 0.9255 for untuned full precision: a +0.00866 gain, below the frozen +0.02 requirement, with gains in only one of five cases. The existing uint8 ONNX retriever remains the default. This trains source relevance, not corruption probabilities, factual truth or personal offending risk.

Read the [model card](../../../docs/research-radar/fine-tuning/MODEL-CARD.md), [frozen protocol](../../../docs/research-radar/fine-tuning/EVALUATION-PROTOCOL.md) and [evaluation report](../../../docs/research-radar/fine-tuning/EVALUATION.md). The earlier 87-summary discovery run remains a separate retained experiment; this source-only training corpus contains 64 summaries.

## Files and loading

| File | Meaning |
| --- | --- |
| `adapter.safetensors` | Selected epoch-1 custom LoRA tensors; 297,520 bytes |
| `initial-adapter.safetensors` | Initialization for verifying an actual parameter update |
| `adapter_config.json` | Base revision, rank, targets and loader format |
| `dataset.json` | 64 source texts, split/family metadata, 70 train and 16 dev queries |
| `train-dev-labels.json` | Authored relevance labels and question-specific rationales |
| `test-labels.json` | Independently authored 20 test questions, now public and fixed |
| `test-freeze-receipt.json` | Test/data/protocol hashes frozen before training |
| `training-config.json` / `training-receipt.json` | Actual optimizer settings, all epochs, selected checkpoint and hashes |
| `test-invocation.json` / `evaluation.json` | One test invocation, complete rankings, baselines and metrics |
| `model-status.json` | Failed promotion criteria and preserved default retriever |
| `base-assets.json` | Pinned upstream model files, sizes and SHA-256 hashes |
| `requirements.lock` | Exact installed package versions for the Linux CPU run |

The adapter format is custom to `scripts/research-radar/fine-tuning/encoder.py`, not PEFT. It requires the pinned `sentence-transformers/all-MiniLM-L6-v2` full-precision base at revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`. The 90,868,376-byte base weight file is cached separately, not committed. Do not load the adapter onto another revision or treat it as a standalone model.

## Local search in the prepared workspace

Run commands from the repository root. The executed environment is `/workspace/.venvs/icip-finetune`; its base cache is `/workspace/.cache/icip-models/1110a243fdf4706b3f48f1d95db1a4f5529b4d41`, and the retained ONNX cache is `/tmp/india-education-model-cache`.

```bash
/workspace/.venvs/icip-finetune/bin/python scripts/research-radar/fine-tuning/search.py --query 'Find the order recording completed electricity-meter refunds'
/workspace/.venvs/icip-finetune/bin/python scripts/research-radar/fine-tuning/search.py --query 'Find the order recording completed electricity-meter refunds' --model candidate
```

The first command respects the retained-default policy. The second explicitly opts into the experimental adapter for comparison. Results are ranked source suggestions, with provenance and limitations; scores are not probabilities. Every proposed factual claim or graph connection still needs source review. No inference is performed inside the website's browser.

## Reproduce without overwriting the recorded run

Python 3.12 on Linux was used. Create an isolated environment and install the locked packages; the extra CPU index supplies the exact `torch==2.8.0+cpu` wheel. The lock records versions rather than package wheel hashes, so it is an environment record, not a fully hermetic supply-chain lock.

```bash
python3.12 -m venv /tmp/icip-finetune-repro-env
/tmp/icip-finetune-repro-env/bin/python -m pip install --extra-index-url https://download.pytorch.org/whl/cpu -r research/research-radar/fine-tuning/requirements.lock
node scripts/research-radar/fine-tuning/build-dataset.mjs --verify
node --test scripts/research-radar/fine-tuning/build-dataset.test.mjs
```

Create a fresh run directory and copy the frozen inputs needed by the evaluator. The training command refuses to overwrite an executed `training-receipt.json`; evaluation refuses to overwrite an invocation or result. Do not delete those receipts to retry a test.

```bash
icip_run_dir="$(mktemp -d /tmp/icip-minilm-reproduction.XXXXXX)"
cp research/research-radar/fine-tuning/dataset.json research/research-radar/fine-tuning/test-labels.json research/research-radar/fine-tuning/test-freeze-receipt.json "$icip_run_dir/"
/tmp/icip-finetune-repro-env/bin/python scripts/research-radar/fine-tuning/prepare_assets.py --cache /tmp/icip-minilm-fp32 --manifest "$icip_run_dir/base-assets.json"
/tmp/icip-finetune-repro-env/bin/python scripts/research-radar/fine-tuning/prepare_assets.py --cache /tmp/icip-minilm-fp32 --manifest "$icip_run_dir/base-assets.json" --offline
```

Prepare the separate retained ONNX comparator through its existing immutable-asset verifier. This downloads only public model assets; the research text stays local.

```bash
/tmp/icip-finetune-repro-env/bin/python - <<'PY'
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location('retained_assets', 'scripts/education/model-rank.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
for filename in module.ASSETS:
    module.asset(Path('/tmp/icip-minilm-onnx'), filename, offline=False)
PY
/tmp/icip-finetune-repro-env/bin/python scripts/research-radar/fine-tuning/train.py --output "$icip_run_dir" --cache /tmp/icip-minilm-fp32
/tmp/icip-finetune-repro-env/bin/python scripts/research-radar/fine-tuning/evaluate.py --root "$icip_run_dir" --cache /tmp/icip-minilm-fp32 --onnx-cache /tmp/icip-minilm-onnx
```

The scripts expect the unchanged repository source catalogs, labels and protocol at their recorded paths. They deliberately reject changed input or executable hashes. A new `--root` alone is insufficient: it must contain the frozen dataset, test labels, freeze receipt and training-produced artifacts, as above. Evaluation uses all 64 candidates, while gradient updates use only the 39 training documents. Development selection uses 49 train/development candidates and never encodes the 15 test documents.

This repeats a **now-public benchmark**, not a newly blind evaluation. Do not tune against its test results and claim another independent test. New experimentation requires a new frozen holdout or an explicitly labelled exploratory study. Exact numeric reproducibility is bounded by the recorded runtime, CPU libraries and hardware; the receipt retains all executed metrics rather than promising cross-platform bitwise identity.

## Data, boundaries and attribution

The 64 retained inputs are authored source summaries with locators and limitations. Questions are agent-authored relevance judgements. Source families, case groups and the two exact material-party overlaps are kept within their splits; generic auditor/government overlap remains disclosed. No future-outcome labels or numerical forecast calibration were supplied. The 23 registered scenarios retain null probabilities.

Derived from the [Sentence Transformers `all-MiniLM-L6-v2` model](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/tree/1110a243fdf4706b3f48f1d95db1a4f5529b4d41), licensed Apache-2.0. This directory includes the [Apache License 2.0](LICENSE) for the local adapter; modifications are the query/value LoRA tensors documented above. Credit and license notices for upstream components remain applicable. The adapter license does not relicense linked government, judicial, corporate or news originals. Consult their cited terms and preserve provenance when redistributing source material.

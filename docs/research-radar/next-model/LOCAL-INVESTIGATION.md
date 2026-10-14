# Run a local investigative workup

`investigate.py` runs a selected local retriever over the 435 canonical source-summary documents, then attaches existing typed graph relationships, money stages, source citations, responses and next-record questions. This is a runnable analysis pipeline; it does not synthesize missing bank records or predict a person's guilt.

Use the persistent model environment from the repository root:

```bash
/workspace/.venvs/icip-finetune/bin/python \
  scripts/research-radar/next-model/investigate.py \
  --query "Does the Honnavar Port loan sanction establish a cash drawdown?" \
  --model default --depth 2 \
  --output /workspace/honnavar-workup.json
```

`default` keeps the existing pinned MiniLM ONNX retriever unless the new candidate passed the independent promotion gate **and** the evaluation binds to the same corpus, selected configuration and adapter hash. The requested and resolved model, decision reason and evaluation/configuration hashes are saved. `--model candidate` is explicit experimental opt-in after the matching independent evaluation is complete. `base`, `bm25` and `mini` select the untuned candidate-family baseline, lexical baseline and retained MiniLM respectively.

The model supplies relevance scores, not probabilities. `base` and `candidate` use the development-selected fusion configuration; a comparison between arbitrary scalar scores from different models has no common probability scale. The existing ranker's exact pretrained revision, pooling conventions, token cap and execution metadata are retained in the separate ranking receipt.

## Inputs and outputs

Use `--queries FILE` for a JSON object with `queries: [{id, text}]`, or a direct array of those objects. IDs must be unique. `--top-k` defaults to five. `--depth` accepts 1–3, and `--max-edges` defaults to 150 with an allowed range of 1–1,000.

The output packet retains:

- The query, selected model, top source rankings and complete source-closed graph workup.
- Exact relationship type, direction, status, source IDs and money stage, without adding amounts or inventing beneficiary allocation.
- Retained responses/counterevidence and specific missing records, holders and disconfirmation tests.
- Truncation and temporal limits, including `historicalForecastEligible: false` and unestimated probabilities.
- SHA-256 bindings for the corpus, graph, query file, complete rankings, wrapper and tracing code.

A sibling `*.rankings.json` file preserves the complete 435-source ranking for every query. An ad hoc `--query` also creates a retained `*.queries.json` projection. `--ranking-output FILE` changes the ranking output path. Existing executed outputs cannot be silently overwritten; use a fresh path.

`--as-of YYYY-MM-DD` ranks the complete current corpus first, then filters graph edges by the retained source retrieval/publication dates. This is labelled source-date-filtered reconstruction. It does not recreate a historical model-input snapshot: the current summary and edge versions lack archived historical availability proof. Later responses remain visible as labelled context. Unknown or malformed availability dates fail the graph cutoff check, and event dates cannot backdate evidence.

## Pre-output demonstration questions

Ten fixed questions in `research/research-radar/next-model/demonstration-queries.json` were frozen before new candidate rankings. Their SHA-256 is `71f65276677ea0943eb31b64c36ba83de1547c16103b6fb4b12008516f33f34f`. They cover DJB, BMC catering, Honnavar/GVPR port financing, the meter SPV, bond-purchaser identity, C295, BrahMos, Bhushan, NDTV and Radhikapur West.

These are authored illustrations of record acquisition and financial-stage distinctions. They are not a new held-out benchmark or proof that a model discovered previously unknown misconduct. Candidate inference waits until development selection and the independent final test have finished.

```bash
/workspace/.venvs/icip-finetune/bin/python \
  scripts/research-radar/next-model/investigate.py \
  --demonstrations --model candidate --depth 2 --top-k 5 \
  --output research/research-radar/next-model/investigation-packets.json \
  --ranking-output research/research-radar/next-model/investigation-rankings.json \
  --ui-output research/research-radar/next-model/investigation-runs.json
```

The browser artifact contains each saved run's rankings, missing-record questions, counterevidence, temporal limits and truncation. The complete entities, edges, records and citations remain in the full packet artifact, avoiding repeated graph duplication in the browser. Browser neighborhood navigation uses the separate canonical graph and is labelled separately from the saved model output.

To repackage already executed rankings after a reviewed presentation change, `--rankings-input FILE` reuses only complete rankings bound to the exact query/corpus/configuration hashes; use a fresh output path. It performs deterministic graph tracing without another model inference. It cannot change or rescue a failed independent evaluation.

## Offline verification

The standard-library function `verify_saved_investigation(packet_path, ranking_path=None, graph_path=None, corpus_path=None, queries_path=None, evaluation_path=None, selected_path=None, ui_path=None)` checks complete ranking coverage/order, all input/code hashes, matching model selection, deterministic trace replay and the exact compact browser projection. This requires no model service, weight loading or neural re-inference.

Seven wrapper tests use synthetic fixtures and verify default-retention behavior, explicit candidate gating, query IDs, complete finite rankings, hash binding, output preservation, trace linkage and compact-UI replay. Eighteen additional tracing tests check source closure and graph/money/temporal invariants. These tests are engineering checks, not learned model performance scores.

The fixed demonstration run has now executed once: ten queries × 435 sources, 73.671 seconds of local CPU ranking. Saved packets and compact UI findings passed offline replay verification. The [demonstration review](DEMONSTRATION-REVIEW.md) records useful hits and off-topic retrievals without editing the outputs or using them to select another checkpoint.

# Expanded local evidence model: executed model card

Two compact open encoders were actually fine-tuned locally on CPU. The selected configuration is **codefuse-ai/F2LLM-v2-80M**, LoRA rank 8 · epoch 1 + BM25 reciprocal-rank fusion. Its release decision is **experimental-not-promoted**. The model lab CLI default is `mini`. The prior MiniLM experiment remains immutable and its original command retains its original default.

Training completed `2026-10-08T17:51:12.630629+00:00`. This is source-summary retrieval followed by deterministic evidence-graph navigation. There is no trained personal-guilt classifier or calibrated future-outcome predictor.

## What ran

- `intfloat/multilingual-e5-small`: 3 epochs, 99 optimizer steps, 147,456 trained adapter parameters; 300.278 seconds.
- `codefuse-ai/F2LLM-v2-80M`: 3 epochs, 99 optimizer steps, 237,568 trained adapter parameters; 624.134 seconds.

Total elapsed time: 925.583 seconds. Peak process resident memory: 2753.7 MiB. Frozen backbone hashes match before and after each run; every epoch retains its actual adapter, weight-change measurement, batch query/source IDs and development score matrix. The frozen configuration, exact assets, executable hashes and independent preflight approval are in [`model-run`](../../../research/research-radar/next-model/model-run) and [`preflight-review.json`](../../../research/research-radar/next-model/preflight-review.json).

The experiment used 435 curated retained source summaries: 305 training, 98 development and 32 quarantined test documents. Supervision comprises 129 training questions and 35 development questions. Gradient updates used only training sources; development ranked 403 training/development candidates. Final evaluation indexed all 435 sources, including legitimately retrievable held-out documents. Full PDFs, private ledgers and the entire legacy graph were not training inputs.

Both families used FP32, rank-8/alpha-16 LoRA on attention query/value projections, AdamW at 0.0002, batch size 4, 256-token cap, seed 20261008 and three epochs. The loss contrasts explicitly labelled positives and hard negatives; other in-batch sources are masked. E5 uses query/passage prefixes and attention-mask mean pooling. F2LLM uses its fixed query instruction and an explicitly retained terminal EOS, with EOS pooling. Checkpoint-specific truncation counts are recorded in the training receipt; graph readers retain complete summaries and caveats.

Four configurations were declared before development outputs: each encoder alone and each with equal-weight BM25 reciprocal-rank fusion, constant 60. The selected epoch is 1. Development case-macro nDCG@5 selected it; required-counterevidence recall, parameter count and earlier epoch break ties. If fusion is selected, its untuned comparator uses the same fusion, so a fusion gain cannot masquerade as a fine-tuning gain.

## Independent result

Twenty-four independently authored English questions in six institutional case families were frozen before training. Their documents, duplicate sources and substantive case neighborhoods were excluded from gradients and development selection. The previous public 20-question test was already exhausted and was not reused as an independent test.

| Retriever | Case-macro nDCG@5 | Recall@5 | Required counterevidence recall@5 |
| --- | ---: | ---: | ---: |
| BM25 · lexical baseline | 0.781762 | 0.843750 | 0.9166666666666666 |
| MiniLM · retained ONNX uint8 | 0.689867 | 0.743056 | 0.8333333333333334 |
| codefuse-ai/F2LLM-v2-80M + BM25 reciprocal-rank fusion · untuned | 0.758273 | 0.847222 | 0.9166666666666666 |
| codefuse-ai/F2LLM-v2-80M + BM25 reciprocal-rank fusion · LoRA | 0.722361 | 0.781250 | 1.0 |

The exploratory six-family bootstrap interval for candidate-minus-matched-base nDCG@5 is [-0.117506, 0.037673]. It is not a representative national accuracy estimate. These final labels are now exhausted for further model selection.

Release checks:

- nDCG@5 gain over own untuned base: observed -0.03591201744022443; required at least 0.02.
- nDCG@5 difference from BM25: observed -0.05940128305547643; required at least -0.01.
- recallAt5 difference from own base: observed -0.06597222222222221; required at least -0.01.
- recallAt5 difference from BM25: observed -0.0625; required at least -0.01.
- Groups improving over own untuned base: observed 3; required at least 4.
- Worst group nDCG@5 difference: observed -0.1725409622022389; required at least -0.05.

Selected adapter SHA-256: `88e2c2be892e2448b7c4c2ac05d81918b62df4ceaf396ab26c4e4d9cfa4fa712`. Evaluation SHA-256: `73a8e2ebdfbc0056029184313d4591231b50ba8ecab397fb542134a2bd0a3c0e`. The independent raw rankings, score definitions, source-lineage metrics, per-family changes and fixed gate are retained in the evaluation artifacts. Current published success/failure follows those results; no post-test retraining was performed.

## Graph tracing and variables

The deterministic graph layer carries 435 sources, 622 entity records and 605 exact typed relationships, preserving financial stage, currency/unit, period, legal posture, source IDs, responses, alternatives and disconfirmation. There is no fuzzy entity merge and no sum across incompatible amount stages. Missing bank or payment records become explicit acquisition questions, never invented transfers. An as-of source filter supports reconstruction but does not establish that the current authored graph version existed at an earlier date.

The tender audit found 17,704 exact notice/award pairs but only one provisional pre-outcome observation. It therefore does not supply an honest historical forecasting benchmark. A new official World Bank baseline contains 81 active India projects and 243 preregistered future metadata targets. Probabilities and outcomes are null; the April 2027 observation window, missingness rules and manual collection requirements are explicit. See the [temporal audit](TEMPORAL-DATA-AUDIT.md).

## Practical limits

- Agent-authored relevance judgements over selected summaries, not full source originals.
- Unknown pretrained exposure; no personal guilt, causal mechanism or corruption probability is trained.
- Numerical outcome forecasting requires separate resolved temporal-cohort validation.
- Selected agent-authored relevance labels across six institutional case families.
- Source summaries and locators, not a full-document comprehension benchmark.
- Unlisted sources are unjudged zero for these tightly scoped questions, not exhaustively verified irrelevant documents.
- Source lineage uses normalized original URLs; different-URL syndication/mirrors may remain, and distinct URLs do not establish independent corroboration.
- Pretrained-model exposure to source entities is unknown.
- All final-test labels become exhausted for future tuning after this invocation.
- The 24 independent questions are English. This release does not measure Hindi, regional-language OCR or multilingual retrieval quality.
- Source relevance is not the truth of an allegation, a causal connection, a cash payment or a probability of wrongdoing.
- Counterevidence labels are a selected subset of response and contrary-evidence queries, not exhaustive coverage.
- Some hard negatives supply part of the requested context; the target is answering the complete scoped information need, not declaring those sources useless or false.
- A 256-token representation can omit caveats: two Karnataka water-audit packets exceed the F2LLM cap before their limitations section. Full caveats remain in the graph reader and exports.
- Graph expansion preserves authored source assertions; it does not discover or prove hidden financial transfers.
- Examples in the workbench overlap retained training/development material and are demonstrations, not another independent test.
- Future outcomes remain unresolved. No calibrated probability model or continuous monitoring service was trained or deployed.

Research justification and actual AI-panel challenges are in [technical research](TECH-RESEARCH.md), [behavioral methods](BEHAVIORAL-METHODS.md), [panel](PANEL.md) and the [fixed evaluation protocol](EVALUATION-PROTOCOL.md). These are AI perspectives and documented tests, not independent human expert endorsement.

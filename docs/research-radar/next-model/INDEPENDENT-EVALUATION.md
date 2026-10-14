# Independent evaluation of the next local model

**The adapter was actually trained, but it failed the frozen promotion gate.** On the new 24-question, six-family held-out set, its source-ranking nDCG@5 was **0.7224**, below the matching untuned model/fusion (**0.7583**) and BM25 (**0.7818**). It recovered all explicitly required counterevidence in the first five results on this small benchmark. That improvement does not offset the ranking regressions or justify an automatic default switch.

The evaluation was completed on **8 October 2026 (America/New_York)**. It used the first and only frozen final invocation, after development-only checkpoint selection. No final-test-driven retraining, relabelling or candidate reselection took place. The test is now exhausted for future tuning.

## What actually ran

Two pinned pretrained families, multilingual E5-small and F2LLM-v2-80M, each ran three local CPU training epochs over **129 independently authored training questions**. Each performed **99 optimizer updates**, or **198 total**. Only their query/value LoRA parameters were trainable; the recorded frozen-base tensor hashes remained unchanged. The run took **925.583 seconds**, with peak resident memory **2,819,756 KiB**.

The finite four-configuration grid comprised the two encoders with and without fixed reciprocal-rank fusion with BM25 (constant 60, equal weights). Development selected **F2LLM-80M, LoRA rank 8, epoch 1, with fusion**, containing **237,568 trainable parameters**. The matching untuned comparison uses **the same fusion**, so fusion alone cannot be credited to fine-tuning.

The corpus contains **435 retained source summaries**. Its document partition is 305 train, 98 development and 32 test. Development used 35 questions and a 403-document index, excluding all test text. Final evaluation indexed all 435 sources. The test has four questions in each of six case groups, with 19 positively labelled summary IDs representing 15 original-source URLs. It includes seven counterevidence questions requiring nine source appearances, and five explicit hard-negative pairs. The exact same source can legitimately be required by more than one question.

These are English, agent-authored source-relevance questions; the run is not a full-document, multilingual/OCR, personal-guilt or future-event benchmark.

## Frozen final results

All figures below are equal-weight case-family macro means.

| Comparator | nDCG@5 | MRR@10 | Source Recall@5 | URL-lineage nDCG@5 | Counterevidence Recall@5 |
|---|---:|---:|---:|---:|---:|
| BM25 lexical baseline | 0.7818 | 0.9583 | 0.8438 | 0.8473 | 0.9167 |
| Untuned F2LLM-80M + fixed BM25 fusion | 0.7583 | 0.9792 | 0.8472 | 0.8342 | 0.9167 |
| F2LLM-80M LoRA + the same fusion | 0.7224 | 0.9181 | 0.7812 | 0.8001 | 1.0000 |
| Existing MiniLM uint8 default | 0.6899 | 0.9042 | 0.7431 | 0.7548 | 0.8333 |

The candidate exceeds the older MiniLM score on this new benchmark, but **this is not evidence that LoRA improved the stronger base**. Architecture and fusion differ from MiniLM. Against the appropriate matching base, the adapter's mean nDCG difference is **−0.0359**. The prespecified whole-family bootstrap interval is **[−0.1175, +0.0377]** (six groups, 5,000 resamples, seed 20261008). It is exploratory, with no national-generalization or statistical-significance claim.

| Held-out case family | Candidate − matching base nDCG@5 |
|---|---:|
| Akshaya Patra / ISKCON | -0.1411 |
| Bihar PM-KISAN | +0.0418 |
| IFC / Mahindra Last Mile Mobility | -0.1725 |
| NSAP / DAVP | +0.0747 |
| Tamil Nadu IBRD / flood procurement | +0.0634 |
| Telangana police borrowing | -0.0818 |

The failed prespecified conditions were:

- nDCG@5 gain over own untuned base: observed -0.0359; required ≥ 0.0200.
- nDCG@5 difference from BM25: observed -0.0594; required ≥ -0.0100.
- recallAt5 difference from own base: observed -0.0660; required ≥ -0.0100.
- recallAt5 difference from BM25: observed -0.0625; required ≥ -0.0100.
- Groups improving over own untuned base: observed 3.0000; required ≥ 4.0000.
- Worst group nDCG@5 difference: observed -0.1725; required ≥ -0.0500.

Counterevidence non-regression and the continuity comparison with MiniLM passed. **Overall promotion remains false.** The existing default stays active; the trained adapter is an explicit experimental option. No alternative model is selected from the final-test table after seeing these results.

## What the mistakes show

On the Akshaya Patra related-party question, the candidate ranked an unrelated forensic-review document first, while the relevant detailed annual-report summary remained third. On the IFC question about unverified later investment tranches, the issuer filing dropped out of the first five results. The detailed Telangana borrowing source also dropped out of the first five for the missing-supplier question. Conversely, the Tamil Nadu commitment-versus-disbursement question retrieved both the amendment and completion sources, improving that query.

These observations demonstrate retrieval errors, not newly discovered associations between the named institutions. They are consistent with a narrow training distribution or overfitting, but this experiment cannot isolate the cause. More training epochs, larger weights or a stronger accusation would not repair the missing independent evidence.

## Graph and evidence boundaries

The evaluator fed the candidate's first five actual results for every test question into the implemented two-hop trace expansion. All **24 real trace packets** were generated, then replayed by a separate offline verifier. All **726 emitted edge occurrences** preserved exact canonical endpoints, types, evidence status, cited source IDs, money amounts/stages and limitations. These are occurrences across packets, not 726 unique discoveries or transfers.

The first-five retrieved sources reached evidence for **36 of 42 required edge occurrences**. Some source-backed neighborhood expansion can bring in additional records, but it does not turn a missing bank receipt, unknown supplier or unverified ownership claim into a proven link. All packets keep `inferredCashFlow: false` and no summed aggregate amount. Typed guarantees, approvals, commitments, awards, ownership and payments stay separate.

This is deterministic evidence preservation and source-closure testing. **It is not learned graph-truth accuracy, proof of corruption or a successful prediction of hidden money flows.** Expected stop conditions and full authored caveats remain available even when the 256-token encoder truncates its input text.

## Numerical reproducibility caveat

After the final invocation had already started, review identified Python-set iteration in the frozen BM25 query-term accumulation. The process hash seed had not been explicitly pinned. The first outputs were preserved without another neural invocation. A separate audit used the identical per-term contributions with sorted terms and stable `math.fsum`: maximum score difference was **7.11 × 10⁻¹⁵**, with **zero changed full rankings, first-five lists or positive-source positions** for all 24 saved standalone BM25 queries.

This audit does not retrospectively pin the separate fused-process hash seeds. Reported metrics are recomputed from the first stored raw rankings, with exact hashes; bit-identical fresh neural/fusion regeneration is not asserted. A future version should use deterministic accumulation before a new experiment freeze.

## What remains unestimated

No corruption probability, personal propensity, past hidden transaction or future institutional event probability was fitted. The tender archive's late snapshot fails historical feature-availability checks. The new prospective World Bank cohort registers observable future metadata outcomes; all current probabilities and outcomes remain unknown. Meaningful forecasting needs independently resolved future observations and a separately preregistered model/probability evaluation.

Source lineages use normalized URLs; different-URL syndication or mirrors may remain, and distinct URLs are not necessarily independent corroboration. Unlisted sources were not exhaustively reread as full original documents. Selected summaries, small case coverage, AI-authored relevance labels and unknown pretrained exposure limit external validity.

## Reproduction artifacts

- [Prospective evaluation protocol](EVALUATION-PROTOCOL.md) and [independent challenge log](CHALLENGE-LOG.md).
- [Frozen labels](../../../research/research-radar/next-model/independent-test-labels.json), [label freeze](../../../research/research-radar/next-model/independent-test-freeze.json), and [single invocation receipt](../../../research/research-radar/next-model/final-test/invocation.json).
- [Raw rankings](../../../research/research-radar/next-model/final-test/rankings.json), [machine-readable evaluation](../../../research/research-radar/next-model/evaluation.json), [lexical audit](../../../research/research-radar/next-model/lexical-numerical-audit.json), and [training receipt](../../../research/research-radar/next-model/model-run/training-receipt.json).

The evaluation SHA-256 is `73a8e2ebdfbc0056029184313d4591231b50ba8ecab397fb542134a2bd0a3c0e`. The selected adapter SHA-256 is `88e2c2be892e2448b7c4c2ac05d81918b62df4ceaf396ab26c4e4d9cfa4fa712`.

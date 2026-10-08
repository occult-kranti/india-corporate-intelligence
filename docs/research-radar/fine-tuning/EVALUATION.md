# Local MiniLM fine-tuning: held-out result

**Training completed, but the adapter did not pass the prespecified promotion gate.** It remains an experimental retrieval artifact; the existing uint8 ONNX retriever remains the default. The evaluation measured source relevance, not corruption, truth, guilt or future-event probabilities.

The local CPU run trained **73,728 LoRA parameters** for eight fixed epochs, making **72 optimizer updates in 143.37 seconds**. Development-only selection chose **epoch 1**. The base-model tensor hash stayed unchanged; the selected adapter's tensor-distance from initialization was nonzero (L2 **0.1094448939**). This was actual parameter training, not another embedding-only inference run.

The independently frozen test ran once, after checkpoint selection, on **20 questions from five held-out case groups**, ranking all **64 source summaries**. Training used 70 authored queries and 39 source documents; development used 16 queries and 10 additional source documents. The 15 test-source documents were excluded from training and development inference. The 23 duplicate case summaries were excluded entirely. All dates below refer to **7 October 2026, America/New_York**; the machine receipts use the following day's UTC date.

## Measured results

Values are **case-macro means**; all five cases have four questions, so these also equal the query means. Higher is better. These are retrieval scores, not percentages of true allegations.

| System | nDCG@5 | MRR@10 | Recall@5 | Family nDCG@5 | Family Recall@5 | Required counterevidence Recall@5 | Hard-negative preference |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| BM25 lexical | 0.931317 | 0.975000 | 0.891667 | 0.994183 | 1.000000 | 1.000000 | 0.975000 |
| Untuned MiniLM, full precision | 0.925522 | 0.950000 | 0.916667 | 0.955727 | 0.975000 | 1.000000 | 1.000000 |
| Existing MiniLM, uint8 ONNX | 0.897829 | 0.925000 | 0.891667 | 0.939076 | 0.975000 | 1.000000 | 1.000000 |
| Trained LoRA candidate | **0.934182** | 0.975000 | 0.916667 | 0.974180 | 0.975000 | 1.000000 | 1.000000 |

The candidate's exact nDCG@5 was **0.9341822943035613**, versus **0.9255224535507167** for untuned full precision: an absolute gain of **0.008659840752844539**. Its gain over the existing quantized model was **0.0363536197446696**, but that larger comparison includes the full-precision/runtime difference and cannot be attributed entirely to local training. It exceeded BM25 by only **0.0028657748934209915**.

| Held-out case | Untuned full precision nDCG@5 | Candidate nDCG@5 | Change |
| --- | ---: | ---: | ---: |
| PSB write-offs | 1.000000 | 1.000000 | 0.000000 |
| Uttar Pradesh meter refunds | 0.919419 | 0.962718 | **+0.043299** |
| KIIFB accounts and responses | 1.000000 | 1.000000 | 0.000000 |
| Specified Goa mining FIR | 0.905736 | 0.905736 | 0.000000 |
| Pipavav concession | 0.802458 | 0.802458 | 0.000000 |

Only **one of five case groups improved**. None regressed in aggregate nDCG@5. In fact, only one question changed a reported nDCG@5 value relative to full precision: the Uttar Pradesh meter-credit timeline. The relevant final order moved from rank 2 to rank 1, ahead of an unrelated Green India Mission audit. The unrelated forestry source still appeared at rank 2. A Goa companion report moved from rank 19 to 18 on the historical-amount question, outside the scored cutoff; that did not improve the metric.

The exploratory paired bootstrap used **10,000 whole-case resamples**, seed `20261007`. Candidate-minus-full-precision mean nDCG@5 was **0.008659840752844561**, with a 95% percentile interval of **[0.000000, 0.025979522258533682]**. Repeated questions moved together. With only five deliberately selected cases—and all observed improvement in one case—this interval does not establish generalization to other entities, languages, sectors or future investigations. It is not evidence of statistical certainty or corruption-prediction accuracy.

## What the rankings still get wrong

All four systems retrieved **all 27 explicitly required counterevidence slots** in the first five. The candidate therefore demonstrated **no incremental counterevidence-recall gain** over either baseline. Candidate and untuned full precision each recovered **34 of 38 positive source slots** in the first five; reported Recall@5 is the mean of question-level fractions, not the micro fraction 34/38.

The candidate passed all **39 explicit positive-versus-hard-negative comparisons**, as did both neural baselines. BM25 passed 38/39. This metric compares the highest-ranked positive with selected distractors. It does **not** require every returned result to be relevant, test every possible false association, or verify an entity relationship. Examples retained in the actual rankings make that limitation concrete:

- **Concession decision stage remains weak.** On the Pipavav current-extension question, the candidate ranked an older expiry/history article first, the named-official response second and the processing disclosure third. The older article does not answer whether the August step was a completed award. This ordering was unchanged from untuned full precision; BM25 placed the processing disclosure first.
- **Related context still falls below the cutoff.** For conditional Pipavav investment, the direct MoU was first, but the useful processing filing was seventh and the management call eleventh. The first five also included unrelated FDI-policy and Bengaluru Metro material. For port royalty authority, the direct call was first but the useful official-response article remained seventh, while the Metro audit and a Bihar cabinet report appeared above it.
- **Procedural relevance is not fully ordered.** For the Goa stay/FIR chronology, the candidate put the partial quashing report first and the more directly responsive reasons report second. For the historical loss-estimate question, the direct report was first, but its companion remained eighteenth. The top five contained unrelated Kaleshwaram, Ahmedabad, forestry and Metro records.
- **Strong case scores have narrow meaning.** KIIFB and PSB questions already scored perfectly on nDCG@5 under untuned full precision. The fine-tune did not establish better accounting interpretation, factual verification or legal reasoning. Retrieval of a summary containing a caveat does not show that a model will apply it correctly in a generated answer.

Family metrics collapse repeated coverage and assign each family its maximum positive grade. They measure broad source-family coverage; they can credit an older member of a family that also contains a later correction. They must not be substituted for document-level stage correctness, source inspection or counterevidence. No graph edges were created from these rankings.

## Promotion decision and reproducibility

The [protocol](EVALUATION-PROTOCOL.md) was frozen before training and test results. **Two of ten criteria failed:**

| Failed requirement | Required | Observed |
| --- | ---: | ---: |
| nDCG@5 improvement over the stronger neural baseline | At least +0.020000 | +0.008659840752844539 |
| Cases improving over untuned full precision | At least 3 of 5 | 1 of 5 |

The lexical comparison, all six nonregression metrics and the worst-case decrease limit passed. Passing those checks does not override the two failures. The output status is **`experimental-not-promoted`**, and **`base_onnx_uint8` remains the default retriever**. The candidate is preserved for explicit local experiments. No second training round, test-guided hyperparameter change, label revision or threshold relaxation followed this result. Future training needs a newly declared experiment and independent holdout; these now-public test questions cannot silently become a fresh test.

The independent evaluation reviewer recomputed every per-question nDCG@5 and all four case-macro scores directly from the retained rankings and frozen graded labels, without calling the implementation's metric function. The reviewer also separately recomputed MRR, positive recall, the 27 counterevidence-slot outcomes and 39 hard-negative comparisons. They agree with the recorded results. This is independent arithmetic review by an AI agent, not external human validation or a new model run.

- [Training receipt](../../../research/research-radar/fine-tuning/training-receipt.json): 2026-10-08 **02:40:34.222495–02:42:57.592468 UTC**.
- [Independent test freeze](../../../research/research-radar/fine-tuning/test-freeze-receipt.json): **02:39:52.613896 UTC**, before training.
- [Complete evaluation and rankings](../../../research/research-radar/fine-tuning/evaluation.json): **02:43:56.585247–02:44:02.000971 UTC**, 5.415 seconds of evaluation.
- [Test labels](../../../research/research-radar/fine-tuning/test-labels.json): SHA-256 `e9f21dda1111df290fb0fb06b810d8f70e100b40d2fca8c45ab6bfe1fa22c5df`.
- [Adapter](../../../research/research-radar/fine-tuning/adapter.safetensors): SHA-256 `5516e066535f8e4fb010495cd40f56ec7689428e9c8c571655347a274a1f17d6`.
- Evaluation SHA-256: `818c9d7f6b6b715e817b92c7b45bae390fe3bb0574ecd25e76da53de5dfe2ea2`.

These are selected editorial summaries and AI-authored questions, with unknown upstream pretraining overlap and uneven original-source access. The experiment supports a bounded conclusion: a real local retrieval fine-tune produced a small, concentrated improvement that did not satisfy its release criterion. It supplies no resolved institutional outcomes, prevalence denominator or probability calibration. Institutional-scenario probabilities remain null.

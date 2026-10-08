# MiniLM local retrieval adapter

**Status: trained, experimental, not promoted.** This is a locally trained source-retrieval adapter for the India public-finance research archive. It ranks relevant retained summaries, including responses and limits on allegations. It does not generate verified claims or estimate corruption, guilt or institutional-outcome probabilities. The default retriever remains the existing uint8 ONNX MiniLM.

The run took place on **7 October 2026, America/New_York**, from 22:40:34 to 22:42:57 EDT. Machine receipts use **8 October 2026, 02:40:34–02:42:57 UTC**. The independent test completed at 02:44:02 UTC. Research inputs remain bounded by 7 October 2026.

## Model and actual optimization

The base is [`sentence-transformers/all-MiniLM-L6-v2`](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2), pinned to revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`, under Apache-2.0. Training used its full-precision encoder, not a modification of the quantized ONNX file. The new low-rank adapter targets the query and value projections in all six transformer layers: rank 8, alpha 16, **73,728 trainable parameters**. Base weights were frozen, and their before/after tensor hashes match.

The CPU run executed **72 optimizer steps across eight epochs in 143.37 seconds**. AdamW used learning rate 0.0001, weight decay 0.01, batch size 8, gradient clipping 1.0 and temperature 0.08. The loss gives equal positive mass to each question's declared relevant sources over all 39 training documents. Manually declared hard negatives were included within that training-only candidate set; they did not receive a separate extra weight. Unlabelled training sources serve as other negatives for the particular question, which remains a limitation of incomplete relevance annotation.

Inputs truncate at **256 tokens**. Embeddings are 384-dimensional, with attention-mask-weighted mean pooling and L2 normalization. Base dropout was disabled, random seed was `20261007`, CPU threads were four, and deterministic PyTorch algorithms were enabled. The run used Python 3.12.14, PyTorch 2.8.0+cpu and Transformers 4.56.2. Exact packages are recorded in `requirements.lock`.

**Epoch 1** was selected using development case-macro nDCG@5, then MRR@10 and Recall@5, with the earliest tied epoch retained. Its development nDCG@5 was **0.907732**, the same as untuned full precision; training loss declined from 1.317662 in epoch 1 to 0.967480 in epoch 8. Lower training loss is not held-out performance. The selected adapter actually changed: tensor delta L2 is **0.109445**, and its tensor hash differs from initialization.

## Data and supervision

The corpus contains **64 source documents** from four frozen research-radar catalogs. Each input preserves the title, authored source summary, exact locator and limitations. These are bounded public-source paraphrases, not full originals. The previous 87-summary discovery run also contained 23 case summaries; those case summaries are deliberately excluded here because they repeat sources and contain questions that could leak into training labels.

| Partition | Cases | Material-party/case groups | Source documents | Questions |
| --- | ---: | ---: | ---: | ---: |
| Training | 14 | 13 | 39 | 70 |
| Development | 4 | 3 | 10 | 16 |
| Independent test | 5 | 5 | 15 | 20 |

All **45 declared source families** stay within their split. Tara and Shivpuri share one training group because both materially name Adani Enterprises Limited; HAL and the Navy lease share one development group because both materially name the Ministry of Defence. Generic auditor/government context is shared, so this is not universal entity independence. The unresolved Tara bidder identity remains unresolved despite this conservative grouping.

Training and development questions were authored by a data-curation agent. A separate agent authored and froze the test questions before seeing model outputs. Labels express document usefulness, not truth or guilt; counterevidence is positive when it answers the question. The 15 test-source texts were excluded from training and checkpoint selection, and development-source texts were excluded from gradient updates. Checkpoint selection ranked 49 train/development sources. Final evaluation ranked all 64 sources. Public test disclosure now prevents calling a future tuned round against these same questions a new blind test.

## Held-out result and promotion decision

The selected checkpoint was evaluated once under the [frozen protocol](EVALUATION-PROTOCOL.md), against BM25, untuned full-precision MiniLM and the retained uint8 ONNX model. These are case-macro scores over **20 questions from five selected cases**:

| System | nDCG@5 | MRR@10 | Recall@5 |
| --- | ---: | ---: | ---: |
| BM25 | 0.9313 | 0.9750 | 0.8917 |
| Untuned full precision | 0.9255 | 0.9500 | 0.9167 |
| Existing ONNX uint8 | 0.8978 | 0.9250 | 0.8917 |
| Fine-tuned candidate | **0.9342** | **0.9750** | **0.9167** |

The candidate's nDCG@5 gain over the stronger neural baseline was **+0.00866**, below the prespecified **+0.02** threshold. Only **one of five cases** improved, below the required three. No case declined. Other frozen criteria passed, including preservation of required counterevidence and hard-negative preference. Improvement over the quantized baseline alone cannot be attributed entirely to fine-tuning, because runtime and quantization also differ.

The exploratory paired five-group bootstrap interval for the candidate-minus-FP32 nDCG difference was **[0.00000, 0.02598]**. Five selected groups cannot establish national generalization or useful probability calibration. The candidate is saved for explicit local comparison; **`base_onnx_uint8` remains the default**. There was no test-driven retraining or relabeling. See [EVALUATION.md](EVALUATION.md) for per-case analysis and complete metric interpretation.

## Artifacts and use

The 297,520-byte `adapter.safetensors` file contains only the custom LoRA tensors. Load it with the repository's `encoder.py`; it is **not a PEFT-format adapter** and not a standalone language model. Pinned base weights are downloaded into a separate verified local cache and are not committed here. The repository [artifact README](../../../research/research-radar/fine-tuning/README.md) gives local search, environment and reproduction commands.

| Artifact | SHA-256 |
| --- | --- |
| Source dataset | `66a31a77abbf290c876d90c4dd3a80ef0683e363ccaf4cedb4667b3cd7904ba1` |
| Selected adapter file | `5516e066535f8e4fb010495cd40f56ec7689428e9c8c571655347a274a1f17d6` |
| Independent test labels | `e9f21dda1111df290fb0fb06b810d8f70e100b40d2fca8c45ab6bfe1fa22c5df` |
| Evaluation result | `818c9d7f6b6b715e817b92c7b45bae390fe3bb0574ecd25e76da53de5dfe2ea2` |

Training, local inference and evaluation upload no research text to a model service. Fetching pinned public weights and Python packages requires network access during setup; model execution is local. No browser inference, autonomous investigation, new entity joins, private-data acquisition or continuous training was enabled by this experiment.

## Limits and next experiment

This is a small, selected, English-language, agent-annotated relevance benchmark. Names and domain vocabulary overlap between questions and summaries, and BM25 is competitive. Unlabelled but useful records may exist; source-family grouping cannot remove every conceptual dependency. Upstream pretraining exposure is unknown, and original-document access limitations remain attached to the records. The 256-token limit may truncate later caveats even though the dataset retains them in full; users must open the complete evidence record.

A further experiment should expand independently reviewed information needs, test unseen cases and multilingual/OCR passages, measure truncation and annotation agreement, and freeze a new independent holdout before tuning. The current test may support transparent reproduction or exploratory error analysis, not undisclosed threshold or checkpoint selection. Institutional forecasts still require resolved outcomes, time-aware population sampling and calibration; those data were not created by this retrieval run.

## Attribution and license

Derived from the Sentence Transformers project's `all-MiniLM-L6-v2` at the pinned revision above. Local adaptation adds custom query/value LoRA weights; upstream base parameters remain unmodified. The adapter is distributed under [Apache-2.0](../../../research/research-radar/fine-tuning/LICENSE), preserving upstream attribution. That license does not relicense linked government, judicial, corporate or news originals; their separate terms and source provenance remain applicable.

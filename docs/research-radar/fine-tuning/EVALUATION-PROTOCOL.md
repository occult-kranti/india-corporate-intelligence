# Frozen local retrieval evaluation

Authored on **7 October 2026, America/New_York**, before local fine-tuning results were inspected. This is a source-retrieval pilot. It does not train or evaluate a corruption classifier, personal propensity score, factual-truth judge or calibrated institutional forecast.

## What is being measured

Given a narrowly scoped investigation question, rank the 64 retained public-source summaries so that the record that answers the question—including a response, corrective action, legal outcome or limit on an allegation—appears early. Candidate text includes source titles, authored summaries, locators and limitations. It is not a full-document model. The 23 case summaries are excluded because they duplicate source content and contain questions that could leak into query labels.

The independent evaluation agent authored **20 test questions across five held-out cases** without inspecting tuned-model outputs. Graded relevance means source usefulness: 2 directly answers the question; 1 provides useful but incomplete context; 0 does not answer that specific question. Zero does not mean false. For example, an early pending-refund report is useful to reconstruct a timeline but cannot establish the current final disposition.

Counterevidence is deliberately relevant. The questions ask about completed refunds, account exclusions, conditional concession processing, proposed rather than paid investment, quashed proceedings, absent original court orders, authenticated services alongside an invoice qualification, a pending resignation without causal inference, debt-accounting stages and incompatible statistical populations. Hard negatives include superficially similar records from the wrong jurisdiction, case, accounting stage or procedural stage. These are source-retrieval judgments, not outcome labels.

## Frozen split and information barriers

The dataset owner groups all sources of a case, the case's source families and material shared entities before splitting. All sources of the following five cases are test-only: Uttar Pradesh meter refunds; Pipavav port concessions; the specified Goa mining FIR; KIIFB publicity/accounts; and the PSB write-off parliamentary reply. These comprise **15 source documents**. Four development cases are Delhi procurement, Bengaluru Metro, HAL delivery and the Navy lease; HAL and Navy stay together because they share the Ministry of Defence. The remaining 14 cases supply training. Tara and Shivpuri stay together because both materially involve Adani Enterprises Limited. Generic oversight references such as CAG do not merge every otherwise unrelated case into one group.

The 15 test source documents must never enter training loss, negative sampling or unsupervised adaptation. Development-source text likewise stays out of gradient updates. At evaluation time, all 64 documents are legitimate retrieval candidates: this is closed-corpus document retrieval, not a claim that the base language model has never encountered these entities. Query labels and test content are not used to choose epochs, learning rates, thresholds or preprocessing. Existing upstream-model pretraining exposure is unknown.

The root trainer fixes eight epochs, learning rate 0.0001 and query/value LoRA rank 8 before training, selecting one checkpoint using development metrics only. Other implementation parameters must be recorded in the training receipt before the test invocation. The data owner freezes the training/development labels and projected source dataset before the independent test file is copied into the repository. Test labels are retained publicly after this freeze so others can reproduce the experiment; disclosure means this benchmark cannot remain secret for future training rounds.

The first frozen test-label file has SHA-256 `e9f21dda1111df290fb0fb06b810d8f70e100b40d2fca8c45ab6bfe1fa22c5df`. Its final repository path is `research/research-radar/fine-tuning/test-labels.json`. Rechecking this hash is mandatory. A discovered annotation defect before any model-output inspection requires an explicit version and reason. No labels are revised to fit observed candidate rankings.

## Comparators and ranking contract

Evaluate the selected checkpoint once against three frozen comparators on the same 64 sources and 20 questions:

1. BM25 lexical retrieval, with recorded tokenization and parameters. Corpus-level document-frequency statistics are permitted for this retrieval index, without relevance labels; this is disclosed transductive indexing.
2. Untuned full-precision `sentence-transformers/all-MiniLM-L6-v2`, pinned to the same upstream revision and embedding/pooling configuration as the candidate.
3. The previously executed, hash-verified uint8 ONNX MiniLM checkpoint. Differences from full precision may reflect quantization or runtime, not fine-tuning.

Every ranking contains each of the 64 source IDs exactly once; IDs break equal-score ties deterministically. Store all ranked IDs, raw retrieval scores and comparator configuration. Similarity scores remain uncalibrated relevance scores and must not be displayed as probabilities. Model-weight, dataset, label, executable-code and result hashes bind the run.

## Metrics

Report the denominator, per-question values, query mean and case-macro mean. There are **five case groups, not 20 independent investigations**. Scores should include:

- **nDCG@5**, using gain `2^relevance - 1` and log-base-2 rank discount; unlabelled sources have grade 0.
- **MRR@10**, the reciprocal rank of the first grade-positive source, or zero when none occurs in the first ten.
- **Recall@5**, the fraction of all grade-positive sources in the first five. A later or partial source is included only if its frozen question-specific label is positive.
- **Family-collapsed nDCG@5 and Recall@5**, retaining the first occurrence of each source family in the ranking and assigning each family its maximum positive grade. Repeated coverage of one event cannot count as independent evidence. These metrics assess broad family coverage; a family containing both an earlier superseded source and a later correction can receive family credit without retrieving the right version. Document-level relevance, explicit counterevidence and hard-negative metrics remain essential. Even distinct families need not be independent causal confirmation.
- **Counterevidence Recall@5**, the fraction of the explicitly required counterevidence source IDs in the first five. Questions without requirements are excluded rather than treated as perfect.
- **Hard-negative preference**, the fraction of explicit hard negatives ranked below the highest-ranked positive. Report pair denominator and per-case results. This modest pairwise metric does not prove the model understands the distinction or can safely merge graph identities.

Provide a paired exploratory bootstrap interval for candidate-minus-untuned nDCG@5 using the five whole case groups, a fixed random seed and at least 2,000 resamples. Repeated questions from one case must move together. With only five groups the interval is coarse and cannot establish national generalization; show the per-case differences directly. Do not attach significance claims or corruption-prediction accuracy to this benchmark.

## Prespecified promotion gate

The adapter can be retained as a trained experimental artifact even if it fails this gate. Default retrieval promotion requires every condition below; unknown or missing evaluation fails promotion:

- Case-macro nDCG@5 improves by at least **0.02** over the stronger of the two neural baselines, and is no more than **0.01** below BM25.
- Case-macro MRR@10, Recall@5, family-collapsed nDCG@5, family-collapsed Recall@5, counterevidence Recall@5 and hard-negative preference are each no more than **0.01** below the stronger corresponding neural-baseline value.
- At least **three of five cases** improve in nDCG@5 over untuned full precision, with no case decreasing by more than **0.05**.

The gates measure a narrow editorial benchmark, not readiness for unsupervised investigative assertions. Passing permits a retrieval default only; every entity join and proposed factual claim still requires explicit source review. A failed gate is reported as a failed promotion, without another test-driven training run. Further adaptation requires a new independent holdout or a newly declared exploratory round; the current test cannot silently become development data.

## Actual limitations

The sources were selected for investigative interest, contain uneven access modes and rely on editorial paraphrases. Some original records could not be downloaded, and no additional full-document verification is implied by these labels. Five selected case groups cannot represent Indian procurement, all languages, new legal entities or future conditions. Holdout labels were authored by another AI agent, not a representative human user panel. Some questions intentionally repeat a single source under different accounting or legal constraints. Entity-name overlap inside a question and source can make lexical retrieval unusually competitive.

The model was pretrained on external text with unknown overlap. Group safeguards prevent the new local supervised run from learning these held-out source summaries; they cannot remove pretraining knowledge or guarantee real-world cold-entity generalization. Neither the local training loss nor any retrieval metric supplies future-outcome labels, base rates or probability calibration. Existing institutional-scenario probabilities remain null.

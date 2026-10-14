#!/usr/bin/env python3
"""Derive the website receipt and model card from executed, independently evaluated runs."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ARTIFACTS = ROOT / 'research/research-radar/next-model'
DOCS = ROOT / 'docs/research-radar/next-model'


def read(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def derive(evaluation_path):
    training = read(ARTIFACTS / 'model-run/training-receipt.json')
    selected = read(ARTIFACTS / 'model-run/selected-model.json')
    dataset = read(ARTIFACTS / 'dataset.json')
    evaluation = read(evaluation_path)
    assert training['status'] == 'executed'
    assert evaluation['forecastProbabilitiesEstimated'] is False
    assert evaluation['hashes']['corpus'] == sha(ARTIFACTS / 'dataset.json')
    assert selected['adapterSha256'] == sha(ROOT / selected['adapterPath'])
    family = next(row for row in training['families'] if row['family'] == selected['family'])
    fusion = ' + BM25 reciprocal-rank fusion' if selected['fusion'] == 'rrf' else ''
    labels = {'bm25': 'BM25 · lexical baseline', 'mini': 'MiniLM · retained ONNX uint8',
              'base': family['baseModelId'] + fusion + ' · untuned',
              'candidate': family['baseModelId'] + fusion + ' · LoRA'}
    limitations = list(dict.fromkeys(training['limitations'] + evaluation['limitations'] + [
        'The 24 independent questions are English. This release does not measure Hindi, regional-language OCR or multilingual retrieval quality.',
        'Source relevance is not the truth of an allegation, a causal connection, a cash payment or a probability of wrongdoing.',
        'Counterevidence labels are a selected subset of response and contrary-evidence queries, not exhaustive coverage.',
        'Some hard negatives supply part of the requested context; the target is answering the complete scoped information need, not declaring those sources useless or false.',
        'A 256-token representation can omit caveats: two Karnataka water-audit packets exceed the F2LLM cap before their limitations section. Full caveats remain in the graph reader and exports.',
        'Graph expansion preserves authored source assertions; it does not discover or prove hidden financial transfers.',
        'Examples in the workbench overlap retained training/development material and are demonstrations, not another independent test.',
        'Future outcomes remain unresolved. No calibrated probability model or continuous monitoring service was trained or deployed.',
    ]))
    status = {
        'schemaVersion': 1, 'status': evaluation['promotion']['status'],
        'completedAt': training['completedAt'], 'selectedModel': family['baseModelId'],
        'selectedConfiguration': f'LoRA rank 8 · epoch {selected["epoch"]}' + fusion,
        'corpusDocuments': len(dataset['documents']),
        'trainingQueries': len(training['trainingQueryIds']),
        'developmentQueries': len(training['developmentQueryIds']),
        'testQueries': evaluation['queries'], 'testFamilies': evaluation['caseFamilies'],
        'trainableParameters': selected['trainableParameters'], 'epochs': selected['epoch'],
        'promoted': evaluation['promotion']['promoted'],
        'defaultRetriever': 'candidate' if evaluation['promotion']['promoted'] else 'mini',
        'adapterSha256': selected['adapterSha256'], 'adapterPath': selected['adapterPath'],
        'evaluationSha256': sha(evaluation_path), 'evaluationPath': str(evaluation_path.relative_to(ROOT)),
        'trainingSeconds': training['elapsedSeconds'], 'peakResidentMemoryKiB': training['maxResidentSetKiB'],
        'comparisons': [{'id': key, 'label': labels.get(key, key),
                         **{metric: evaluation['systems'][key]['metrics']['caseMacro'][metric]
                            for metric in ('ndcgAt5', 'recallAt5', 'counterevidenceRecallAt5')}}
                        for key in ['bm25', 'mini', 'base', 'candidate'] if key in evaluation['systems']],
        'failedCriteria': [f'{row["name"]}: observed {row["observed"]}; required at least {row["minimum"]}.'
                           for row in evaluation['promotion']['criteria'] if not row['passed']],
        'limitations': limitations,
        'trainingRuns': [{'model': row['baseModelId'], 'epochs': row['epochs'],
                          'trainableParameters': row['trainableParameters'], 'seconds': row['elapsedSeconds'],
                          'optimizerSteps': row['optimizerSteps'],
                          'adapterSha256': row['history'][-1]['configurations'][0]['adapterSha256']}
                         for row in training['families']],
    }
    return status, training, selected, evaluation


def model_card(status, training, selected, evaluation):
    rows = '\n'.join(f'| {r["label"]} | {r["ndcgAt5"]:.6f} | {r["recallAt5"]:.6f} | {r["counterevidenceRecallAt5"] if r["counterevidenceRecallAt5"] is not None else "Unmeasured"} |'
                     for r in status['comparisons'])
    runs = '\n'.join(f'- `{r["model"]}`: {r["epochs"]} epochs, {r["optimizerSteps"]} optimizer steps, {r["trainableParameters"]:,} trained adapter parameters; {r["seconds"]:.3f} seconds.' for r in status['trainingRuns'])
    failed = '\n'.join('- ' + value for value in status['failedCriteria']) or '- All recorded retrieval promotion criteria passed.'
    limits = '\n'.join('- ' + value for value in status['limitations'])
    interval = evaluation['caseClusterBootstrap']['percentileInterval95']
    return f'''# Expanded local evidence model: executed model card

Two compact open encoders were actually fine-tuned locally on CPU. The selected configuration is **{status['selectedModel']}**, {status['selectedConfiguration']}. Its release decision is **{status['status']}**. The model lab CLI default is `{status['defaultRetriever']}`. The prior MiniLM experiment remains immutable and its original command retains its original default.

Training completed `{status['completedAt']}`. This is source-summary retrieval followed by deterministic evidence-graph navigation. There is no trained personal-guilt classifier or calibrated future-outcome predictor.

## What ran

{runs}

Total elapsed time: {training['elapsedSeconds']:.3f} seconds. Peak process resident memory: {training['maxResidentSetKiB'] / 1024:.1f} MiB. Frozen backbone hashes match before and after each run; every epoch retains its actual adapter, weight-change measurement, batch query/source IDs and development score matrix. The frozen configuration, exact assets, executable hashes and independent preflight approval are in [`model-run`](../../../research/research-radar/next-model/model-run) and [`preflight-review.json`](../../../research/research-radar/next-model/preflight-review.json).

The experiment used 435 curated retained source summaries: 305 training, 98 development and 32 quarantined test documents. Supervision comprises {status['trainingQueries']} training questions and {status['developmentQueries']} development questions. Gradient updates used only training sources; development ranked 403 training/development candidates. Final evaluation indexed all 435 sources, including legitimately retrievable held-out documents. Full PDFs, private ledgers and the entire legacy graph were not training inputs.

Both families used FP32, rank-8/alpha-16 LoRA on attention query/value projections, AdamW at 0.0002, batch size 4, 256-token cap, seed 20261008 and three epochs. The loss contrasts explicitly labelled positives and hard negatives; other in-batch sources are masked. E5 uses query/passage prefixes and attention-mask mean pooling. F2LLM uses its fixed query instruction and an explicitly retained terminal EOS, with EOS pooling. Checkpoint-specific truncation counts are recorded in the training receipt; graph readers retain complete summaries and caveats.

Four configurations were declared before development outputs: each encoder alone and each with equal-weight BM25 reciprocal-rank fusion, constant 60. The selected epoch is {selected['epoch']}. Development case-macro nDCG@5 selected it; required-counterevidence recall, parameter count and earlier epoch break ties. If fusion is selected, its untuned comparator uses the same fusion, so a fusion gain cannot masquerade as a fine-tuning gain.

## Independent result

Twenty-four independently authored English questions in six institutional case families were frozen before training. Their documents, duplicate sources and substantive case neighborhoods were excluded from gradients and development selection. The previous public 20-question test was already exhausted and was not reused as an independent test.

| Retriever | Case-macro nDCG@5 | Recall@5 | Required counterevidence recall@5 |
| --- | ---: | ---: | ---: |
{rows}

The exploratory six-family bootstrap interval for candidate-minus-matched-base nDCG@5 is [{interval[0]:.6f}, {interval[1]:.6f}]. It is not a representative national accuracy estimate. These final labels are now exhausted for further model selection.

Release checks:

{failed}

Selected adapter SHA-256: `{status['adapterSha256']}`. Evaluation SHA-256: `{status['evaluationSha256']}`. The independent raw rankings, score definitions, source-lineage metrics, per-family changes and fixed gate are retained in the evaluation artifacts. Current published success/failure follows those results; no post-test retraining was performed.

## Graph tracing and variables

The deterministic graph layer carries 435 sources, 622 entity records and 605 exact typed relationships, preserving financial stage, currency/unit, period, legal posture, source IDs, responses, alternatives and disconfirmation. There is no fuzzy entity merge and no sum across incompatible amount stages. Missing bank or payment records become explicit acquisition questions, never invented transfers. An as-of source filter supports reconstruction but does not establish that the current authored graph version existed at an earlier date.

The tender audit found 17,704 exact notice/award pairs but only one provisional pre-outcome observation. It therefore does not supply an honest historical forecasting benchmark. A new official World Bank baseline contains 81 active India projects and 243 preregistered future metadata targets. Probabilities and outcomes are null; the April 2027 observation window, missingness rules and manual collection requirements are explicit. See the [temporal audit](TEMPORAL-DATA-AUDIT.md).

## Practical limits

{limits}

Research justification and actual AI-panel challenges are in [technical research](TECH-RESEARCH.md), [behavioral methods](BEHAVIORAL-METHODS.md), [panel](PANEL.md) and the [fixed evaluation protocol](EVALUATION-PROTOCOL.md). These are AI perspectives and documented tests, not independent human expert endorsement.
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evaluation', type=Path, default=ARTIFACTS / 'evaluation.json')
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    status, training, selected, evaluation = derive(args.evaluation.resolve())
    outputs = {ARTIFACTS / 'ui-status.json': json.dumps(status, ensure_ascii=False, indent=2) + '\n',
               DOCS / 'MODEL-CARD.md': model_card(status, training, selected, evaluation)}
    for path, value in outputs.items():
        if args.verify:
            if path.read_text() != value:
                raise ValueError(f'Stale generated release report: {path}')
        else:
            path.write_text(value)
    print(json.dumps({'status': status['status'], 'selectedModel': status['selectedModel'], 'verified': args.verify}))


if __name__ == '__main__':
    main()

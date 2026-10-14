# Local evidence model and investigation workbench

This release connects a trained source retriever to an exact, cited relationship graph. Use it to locate records, inspect financial stages, compare responses and identify the next document needed. It does not fill missing payment legs or estimate personal guilt.

The [model card](MODEL-CARD.md) records what actually trained and whether the independent retrieval gate passed. The [workbench](https://occult-kranti.github.io/india-corporate-intelligence/#/model-lab) displays saved local inference, an interactive map and relationship reader, model comparisons, research methods and prospective project variables. Arbitrary new model inference runs in the local command below; the static website does not call a model service.

## Run a new investigation locally

From the repository root, use the persistent training environment:

```bash
/workspace/.venvs/icip-finetune/bin/python scripts/research-radar/next-model/investigate.py \
  --query "Which records distinguish a port loan sanction from an actual drawdown and the promoter's upstream cash source?" \
  --model default --depth 2 --output /workspace/port-evidence.json
```

The default follows the recorded promotion decision. `--model candidate` explicitly selects the newly trained adapter; `--model base`, `--model bm25` and `--model mini` provide comparisons. A retained experimental adapter remains available without silently becoming the default. Outputs use fresh paths and do not overwrite an executed investigation.

The output includes the complete ranked-source receipt, exact node and relationship IDs, original sources, financial-stage amounts, retained responses, missing-record questions, record holders and disconfirmation tests. Scores measure source relevance. Different amounts, periods and accounting stages are not summed into a purported money trail.

For a source-only graph inspection that needs no neural runtime:

```bash
python3 scripts/research-radar/next-model/trace.py \
  --source money-trails-djb:source:bail --max-hops 2 \
  --output /workspace/djb-source-trace.json
```

`trace.py` also supports exact `--from-entity` / `--to-entity` IDs and directed or bidirectional navigation. Optional `--as-of YYYY-MM-DD` filters by retained source observation dates. It is explicitly **source-date-filtered reconstruction**, not a historical forecast: the current authored summary/edge version is not proven to have existed at that cutoff. Later response material remains identified as later context.

## Runtime and assets

The existing pinned [CPU requirements](../../../scripts/research-radar/fine-tuning/requirements.txt) are shared. The measured machine provides four CPU cores and 16 GiB RAM, with no GPU. Pinned E5 and F2LLM assets live under `/workspace/.cache/icip-next-models`; the retained MiniLM ONNX assets are under `/workspace/.cache/icip-onnx-models`. These base weights are cached outside Git. Trained adapters, raw development matrices, independent rankings and receipts are retained in the repository.

To fetch and verify the two declared encoder families on another compatible environment:

```bash
python scripts/research-radar/next-model/encoder.py --prepare all
```

Each downloaded file is checked against its pinned revision, byte count and SHA-256; custom remote model code is disabled. The new scripts reuse the prior immutable MiniLM asset verifier. Installing the CPU requirements requires the PyTorch CPU wheel index for the exact `+cpu` version.

## Reproduce checks without downloading models

```bash
npm run validate:radar:next
npm run test:radar:next
npm run build
npm run test:radar:next:browser
```

The offline verifier checks source projection, information barriers, exact training inputs, parameter changes, unchanged backbones, development-only selection, raw rankings, metric calculations and the published decision. Graph and cohort tests challenge identity, amount-stage and temporal mistakes. Browser acceptance exercises maps, graph/source readers, exports, model results, project filtering and narrow viewports.

The [executed model-lab browser report](acceptance/MODEL-LAB-BROWSER.md) records the passing workflow checks on the populated build, including measured label spacing at desktop and mobile sizes. This interface acceptance is separate from the model's failed quality gate.

The original MiniLM pilot remains in `fine-tuning/` and retains its independent historical receipts. Its public test and this release's final test are exhausted for any later tuning. A future experiment needs a genuinely new test, not renamed old questions.

## Future observations

The [temporal audit](TEMPORAL-DATA-AUDIT.md) documents why the tender snapshot cannot support the proposed historical prediction claim. The new frozen World Bank cohort contains every currently Active India project returned by the complete official API capture. Its targets distinguish lifecycle status, closing-date revision and commitment revision. Commitment is not cash received or a financial loss.

The resolver accepts an independently archived official capture in the registered **6–20 April 2027 UTC** window. Missing projects or fields remain unknown; no probability is filled in. Collection is manual: no recurring job is installed. The collector refuses to refresh or overwrite the frozen baseline. See `worldbank-cohort.py --help` for capture/resolution commands and the audit for the independent first-eligible-capture check.

## Continue the research

1. Acquire full original passages and tables with availability timestamps, stable document identities and source-specific usage rights. Preserve corrections and case dispositions.
2. Have independent reviewers adjudicate broader user questions, ambiguous partial relevance, explicit responses and native-language/OCR examples. Keep test families hidden from future selection.
3. Collect repeated prospective tender/project snapshots and externally resolved institutional outcomes. Preregister baseline probabilities before outcomes; compare calibration with reference-class and persistence baselines.
4. Audit each new entity join and financial leg. Prioritize documents that could disprove an interpretation, not just reinforce it.
5. Add model capacity only after measured error analysis identifies a problem it can solve. A larger model and lower training loss do not establish better investigations.

The [technical review](TECH-RESEARCH.md), [behavioral methods](BEHAVIORAL-METHODS.md), [panel decisions](PANEL.md), [challenge log](CHALLENGE-LOG.md) and [evaluation contract](EVALUATION-PROTOCOL.md) record the research basis and boundaries.

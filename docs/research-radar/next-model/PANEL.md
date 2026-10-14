# Next-model research and review panel

Started **8 October 2026, America/New_York**. Participants are parallel AI research/review agents plus the parent implementation lead. These are assigned analytical perspectives, not hired human professionals, independent human witnesses or statistically independent forecasts. Sharing a foundation model and source corpus can create correlated errors.

| Agent | Responsibility | Review artifact |
| --- | --- | --- |
| Parent research lead | Scope, implementation, training decisions and publication | Final execution and release records |
| `next_model_research` | Current retrieval/graph-model literature and licensing | [Technical research](TECH-RESEARCH.md) |
| `next_psych_forecast` | Cognitive methods, forecasting, journalism and independent methods challenge | [Behavioral methods](BEHAVIORAL-METHODS.md) |
| `next_graph_data` | Exact source/entity/path inventory and money-stage semantics | [Graph audit](GRAPH-DATA-AUDIT.md) |
| `next_temporal_data` | Historical availability audit and prospective outcome capture | [Temporal audit](TEMPORAL-DATA-AUDIT.md) |
| `next_evaluation` | Independent held-out questions, frozen metrics and promotion contract | [Evaluation protocol](EVALUATION-PROTOCOL.md) |
| `next_systems` | Local resource inventory, runtime and cache stewardship | [Resource audit](RESOURCE-AUDIT.md) |

## Round 1 — research and design review: completed

This round reviewed methods, actual retained data and evaluation design before final model outputs. It did not certify an unexecuted training run. The behavioral register contains 13 inspected works, including the author-hosted August 2026 edition of *Causal Inference: What If*, OECD's 2025 guidance, OCP's 2024 procurement guide, empirical challenges to ACH and current ForecastBench methodology. Access scope distinguishes full-text passages from an abstract or authorized book description.

| Challenge raised | Evidence examined | Decision |
| --- | --- | --- |
| More fine-tuning might amplify allegation-confirming narratives. | Nickerson's review; Heuer's alternatives/hindsight chapters; UNESCO's verification method; labels with corrective/legal/accounting sources. | Train evidence relevance and exact distinctions, with counterevidence and explicit stops. No individual guilt, personality or criminal-propensity labels. |
| An ACH matrix could look rigorous while making judgment worse. | Dhami et al. (2019), randomized study of 50 analysts; mixed debiasing findings and inconsistency concerns. | Keep rival explanations as an audit trail. Do not sum suspicion marks into probabilities or claim the worksheet itself increases accuracy. |
| Nodes and paths might be mistaken for traced cash. | Graph audit of 4,202 typed relationships, mixed accounting stages and explicit missing-transaction steps. | Attach exact retained edges after retrieval; preserve type, source, date, stage and counterevidence. Ownership or semantic proximity cannot fill a missing transfer. |
| Existing results were public and could contaminate a new test. | Prior exposed 20-question evaluation and fresh independent-evaluator reservation. | Preserve old artifacts as regression evidence. Reserve six new case families, freeze 24 new questions, and prohibit final-test-driven tuning. |
| The June tender snapshot might appear to provide years of historical predictors. | Read-only temporal audit: 17,704 linked notice/award pairs; only one provisional record with both notice scrapes before close and award later, with timezone concerns. | No historical corruption predictor claim. Any masking exercise is retrospective reconstruction, not a forward prediction. |
| A current World Bank catalog might be backdated to original project approval. | Newly captured complete API pagination, retained original bytes and first-availability timestamps. | Freeze 81 active projects and 243 future metadata targets. No probabilities, future outcomes or recurring job are claimed. |
| A missing future record could be wrongly labelled a failed event. | Independent protocol critique and temporal-agent resolution rules. | Distinguish actual events from publication/metadata-state targets. For the new World Bank cohort, resolve the observed state at the first complete eligible April 6–20, 2027 capture. Missing/invalid fields and failed captures remain unknown. |
| Many agents or sources could create false independent corroboration. | Mellers' human-tournament evidence; shared model/corpus limitations; same-document and source-family duplication. | Track source lineage separately from agent count and case count. Graph closure is deterministic evidence retrieval, not independent confirmation or learned reasoning. |
| A larger model or longer run could produce a misleading success story. | Finite hardware capacity, technical literature and the frozen evaluation protocol. | Use bounded development selection, exact parameter/runtime receipts, untuned and lexical baselines and a fixed promotion gate. A failed gate remains a reported failure. |

The independent methods reviewer read the frozen [evaluation protocol](EVALUATION-PROTOCOL.md) and the World Bank collector/resolver implementation. The protocol separates retrieval, graph inspection, reconstruction and future forecasting appropriately. The reviewer recommended explicit event-versus-publication interpretation, fixed observation/grace rules and missingness reporting. The evaluator accepted these as interpretation constraints, **not changes to the frozen metrics or promotion gate**. The prospective cohort's explicit metadata-state definitions satisfy the event/publication distinction.

## Variable-card contract

Every displayed variable or scenario should say:

1. **Unit and scope:** contract, project, program or institutional decision; geography, period, currency/quantity unit and eligible denominator.
2. **Observation:** exact sourced measurement, locator, event date, publication date and earliest supported availability. Unknown inputs remain null.
3. **Meaning:** the particular financial/legal stage or metadata field; commitment is not payment, dispatch is not acceptance and bail is not a merits finding.
4. **Alternatives:** at least one ordinary-process explanation and a data/identity-error explanation where applicable; explain whether they can coexist.
5. **Disconfirmation:** the record or observation that would weaken the adverse explanation, including known responses or corrections.
6. **Next record:** specific document, likely institutional holder, acquisition status and what competing explanations it would separate. A requested record is not an acquired record.
7. **Due date and resolution:** an observable target, preregistered deadline/window, authoritative resolution source and treatment of missing/late information.
8. **Estimate status:** probability and outcome are unknown unless a valid prior forecast and resolved observation exist. Research priority, similarity and source count are not probabilities.

Candidate variables and targets are detailed in [BEHAVIORAL-METHODS.md](BEHAVIORAL-METHODS.md). These are institutional measures; person nodes expose verified roles and sourced decisions, not psychological profiles.

## Round 2 — implementation, results and initial presentation review: completed

The independent methods reviewer has now read `encoder.py`, `train.py`, `rank.py`, `trace.py`, the dataset builder and the World Bank collector/resolver. The reviewer inspected the **training/development** dataset and 14 sampled source-summary label pairs. No independent test questions or model rankings were inspected for this review; no test content was sent to the trainers. This is code/semantic review, not confirmation that the new training run has finished.

| Code or data check | Observed implementation | Review conclusion |
| --- | --- | --- |
| Model boundary | Pinned E5-small and F2LLM-v2-80M encoders, rank-8 query/value LoRA; base parameters frozen; adapter and base tensor hashes recorded. | An executed receipt can substantiate actual parameter updates. These encoders rank evidence and do not generate explanations, infer psychology or forecast outcomes. |
| Gradient and selection isolation | Gradient batches use training sources only. Development scoring uses training plus development sources, excluding held-out sources. | The reviewed code prevents the earlier held-out-document scoring leak. Final receipt must confirm exact IDs and hashes. |
| Loss interpretation | Per-query explicit positives and hard negatives; other in-batch sources are masked. | Unreviewed missing links are not treated as false facts. Uniform positive relevance is a retrieval objective, not an outcome probability. |
| Split and lineage checks | 435 documents: 305 train, 98 development, 32 held out; 129 train and 35 development questions. Exact `sourceLineageId` and broad `groupId` do not cross splits. Evaluator uses source lineage rather than broad split group for collapsed metrics. | Separate statistical split isolation from evidence dependence. Current lineage is normalized-URL based; different-URL mirrors or syndicated copies may remain dependent. |
| Counterevidence labels | 17 training and 5 development questions have explicit required-counterevidence IDs in the reviewed dataset. | These are an annotated subset, not an exhaustive audit of every possible corrective passage. Some other queries also contain official explanations or qualifications. |
| Sampled label meaning | Fourteen sampled train/development pairs retain financial/legal distinctions. One PM SHRI contrast source repeats two requested budget numbers while lacking other requested original-scope facts. | Query-specific hard negatives can be partially informative. The labels are AI-authored relevance judgments, not universal irrelevance or independently human-adjudicated truth. |
| Model/base comparison | The selected fusion setting is applied to both the adapted encoder and its untuned base. BM25 and retained MiniLM are separate comparators. | Prevents crediting lexical fusion gains to adapter training alone. Dense-only results, if supplied, are an explicitly separate ablation. |
| Finite selection | Two model families, three epochs each, four family/fusion configurations; development macro nDCG then counterevidence tie break, fewer parameters and earlier epoch. | This is a bounded selected-corpus experiment. Do not change settings after final-test inspection. |
| Source representation | Tokenizer-only checks excluded test documents. At 256 tokens, E5 truncates 7/305 train and 8/98 development packets; F2 truncates 6/305 and 9/98. In two F2 Karnataka JJM packets the limitations section starts after the token budget. | Material representation limit: the model does not see every caveat. Full source limitations must remain available in deterministic graph/UI/export output. Any pre-freeze change requires a new recorded representation/configuration; never conceal this limit. |
| Graph traversal | Exact copied entities/edges/records are checked against the registry; source closure is preserved; context-only relations cannot advance paths. Original arrows and reverse navigation are distinct. No aggregate money amount is inferred. | A path is evidence navigation, not a reconstructed payment or causal chain. Inherited editorial tiers remain inherited, not a new truth judgment. |
| Historical context | `as_of` filters require observed source dates; current record/edge-version availability remains unverified. Later responses can appear as labelled context, and `historicalForecastEligible` stays false. | Correctly prevents a date-filtered graph from being sold as a historical forecast. |
| Prospective cohort | 81 baseline-active World Bank India projects; 243 future metadata states; all probabilities and outcomes null. Missing/invalid data remain unknown; the specified observation window is enforced. | Suitable beginning for future observation collection, not a trained or calibrated forecast. Verifying the first eligible future capture still requires the documented independent review. |

The label caveat and token-truncation findings were sent to the implementation lead before final results. They are retained here as limitations rather than silently corrected after observing a score. The exact final configuration, data and executable hashes belong to the experiment freeze and execution receipts, which take precedence over this review's intermediate counts if a documented pre-run revision occurs.

The two F2 examples are `deep-procurement:source:prior-svc-ka-jjm-audit` (453 raw tokens) and `public-works:source:svc-ka-jjm-audit` (429 raw tokens). In both, 269 tokens precede the `Limitations:` section, beyond the 255-token text budget plus reserved EOS. The full dataset and graph retain those limitations. The implementation lead confirmed that training was already frozen/running when this audit arrived, so the configuration and data remain unchanged; the finding is disclosed as a representation limitation, not used for a post-freeze tuning attempt.

The implementation review checklist was:

- Training inputs and negatives for held-out entity/source-family leakage, label-derived text, wrong accounting stages and unreviewed synthetic accusations.
- Whether the actual gradient updates, frozen base, checkpoint selection, runtime and hashes match the stated experiment.
- Per-family retrieval and counterevidence results against the frozen gate, including failures and the number of truly independent cases.
- Deterministic graph edges and evidence stops, with no invented relation, money total or causal continuation.
- Prospective definitions and availability timestamps; no unresolved target scored as false, no reconstructed past described as a forward forecast.
- UI language and exported records, especially whether similarity, research priority or metadata change is being presented as probability, money paid or wrongdoing.
- Any difference between implementation and the methods recommendations above, explicitly recorded rather than silently treated as complete.

### Executed run and independent result

The reviewer subsequently inspected the actual training receipt, selected configuration, independent `evaluation.json`, numerical audit and [executed model card](MODEL-CARD.md). Both encoders ran three epochs and **99 optimizer steps each** on CPU: E5 trained 147,456 adapter parameters; F2LLM trained 237,568. Total elapsed time was 925.583 seconds with peak resident memory about 2,754 MiB. Frozen base tensor hashes match before/after; all six retained epoch adapter files match their receipt hashes and each has a nonzero recorded weight change. The three frozen encoder/trainer/ranker executable hashes also still match. These checks substantiate an executed retrieval experiment; they are not forecast-accuracy measurements.

Development selected **F2LLM-v2-80M LoRA, epoch 1, with fixed BM25 reciprocal-rank fusion**. The independent 24-question/six-family result was:

| System | Case-macro nDCG@5 | Recall@5 | Required counterevidence recall@5 |
| --- | ---: | ---: | ---: |
| BM25 | 0.781762 | 0.843750 | 0.916667 |
| Untuned F2LLM + the same fusion | 0.758273 | 0.847222 | 0.916667 |
| Selected F2LLM LoRA + fusion | 0.722361 | 0.781250 | 1.000000 |
| Retained MiniLM ONNX | 0.689867 | 0.743056 | 0.833333 |

**Panel release decision: experimental, not promoted.** The tuned candidate loses 0.035912 nDCG@5 to its matched untuned base and 0.059401 to BM25. Improved selected-counterevidence recall does not override failed quality gates. Only three of six case families improve; the required minimum was four. The model-lab CLI default remains MiniLM. BM25 and the other recorded systems remain explicit comparators; no default was silently changed to a baseline chosen after viewing this test.

| Held-out family | Candidate minus matched-base nDCG@5 |
| --- | ---: |
| Akshaya Patra / ISKCON state support and transactions | −0.141132 |
| Bihar PM-KISAN eligibility/recovery | +0.041808 |
| IFC / Mahindra equity | −0.172541 |
| NSAP / DAVP publicity | +0.074735 |
| Tamil Nadu urban / flood procurement | +0.063443 |
| Telangana police-housing borrowing | −0.081785 |

These losses are material error cases. Possible explanations include specialization to the small training corpus, development-domain mismatch, restrictive question/label scope and representation limits. **This experiment does not identify which explanation caused the losses.** The known Karnataka truncation examples are development records and do not establish the cause of held-out IFC or other case failures. Do not claim that adding epochs, enlarging a model or reading more psychology would reverse the result. The six-family bootstrap interval for the nDCG difference, approximately −0.117506 to +0.037673, is exploratory and does not support national generalization.

The numerical audit found that the frozen BM25 code iterated a Python set without a pinned process hash seed, permitting tiny floating-point addition-order differences. Against sorted-term `math.fsum`, the largest score difference was approximately `7.11e-15`; **none of the 24 complete saved rankings changed**. First-invocation outputs were preserved. This arithmetic audit did not retrain a model, choose a new checkpoint, revise labels or rerun a neural final test. A future separately frozen implementation should use deterministic term ordering; this round's code and results remain intact.

The evidence-path checks evaluate deterministic preservation/source closure, not learned reasoning. The candidate failed to retrieve all required path-source evidence for some held-out questions. Exact preservation of returned edges must not be described as finding every relevant edge or proving a complete money trail. The 10 later saved model workups are explicitly labelled demonstrations over retained material; they supply no additional independent accuracy estimate.

The reviewer also checked the frozen prospective cohort: **81 projects, 243 targets, all probabilities and outcomes null**. No trained institutional-outcome predictor or automatic monitoring service has been added by this experiment.

### Presentation review and its limit

The reviewer inspected the implemented `ModelLab.tsx` and data projection, plus the actual initial desktop, mobile, map, network and dialog images supplied at `/workspace/model-lab-{desktop,mobile,map,network,dialog}.png`. These images captured the earlier pending-inference state, including an honest zero-completed-run counter; they do not prove final populated data passed acceptance.

The reviewed presentation uses a flat geographic view, a schematic relationship graph and a cream evidence reader against a dark green map. The dialog exposes identity basis, retained connections and source/identity limits; the schematic legend distinguishes alleged/analytic links. State markers are described as administrative associations rather than precise incident or payment locations. The current source code retains full caveats, alternative explanations, falsifiers and source locators, describes saved queries as saved inference rather than a live browser model, and labels experimental model status and unknown future probabilities. It does not turn the local retrieval score into a likelihood of guilt.

The UI owner reported checks at 1440, 390 and 320 pixels, map fit/zoom and SVG keyboard focus; the methods reviewer did not independently rerun those browser interactions. **Final populated-build/browser and deployment acceptance remains a separate release gate** and must be evidenced by its own receipt. The initial images are a design review, not final-release certification.

### Next-data roadmap, without another test-driven search

1. Preserve this failed-promotion result and make the exposed test a regression set. Do not tune against it and then call it an independent test again.
2. Audit a broader annotation set with graded partial relevance, source versions, paired financial/legal-stage questions, explicit counterevidence and insufficient-evidence cases. Record disagreements and reviewer provenance. Training labels remain evidence relevance, not personal culpability.
3. Acquire dated original award, amendment, payment, acceptance and recovery records with exact IDs; separately measure coverage, source dependence and lawful/ordinary alternatives. A source-summary graph cannot reconstruct unobserved bank flows.
4. Before any new model search, freeze new independent entity/source-family holdouts and a finite development plan. Include realistic paraphrases and separately evaluated Hindi/regional-language material if obtained. Test representation changes that preserve caveats as new preregistered experiments, not as a rescue attempt on the exposed 24 questions.
5. Keep the World Bank cohort's April 2027 observation rule intact. Collect the first eligible complete snapshot, retain missing/invalid observations as unknown and adjudicate metadata meaning independently. Only a separately preregistered model with predictions fixed before outcomes and sufficient resolved observations can support calibration analysis.
6. Continue qualitative acquisition priority: name the next document, holder, rival explanations and disproof condition. Formal expected information gain or numerical corruption probability remains unsupported without appropriate likelihoods, base rates and outcome data.

Both review rounds are complete for the research, actual model decision and initial presentation scope documented here. Final website release acceptance is deliberately tracked separately; this panel does not claim deployment or final-browser success before that evidence exists.

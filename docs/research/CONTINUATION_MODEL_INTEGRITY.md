# Continuation: model artifact integrity

Review date: 14 October 2026. This note records a maintenance update after integrating the SEC supersession correction into the full investigation registry. It does not record new model training or an additional independent evaluation.

## Cause and bounded change

The rebuilt current graph differed from the historical graph in exactly two top-level metadata fields: `registryFingerprint` and `fullRegistryCounts`. The full registry gained one legacy relationship and one legacy record (4,202 → 4,203 relationships; 5,616 → 5,617 records). Every object in the retained model scope is unchanged: 435 sources, 622 entities, 605 relationships and 1,705 records, plus the same authored followups and exclusions. The legacy SEC correction is outside that model projection.

`trace.py --verify` correctly rejected the stale current-registry fingerprint. Overwriting the historical evaluation hash to match the new file would misrepresent the old evaluation. Instead, the exact old graph bytes were preserved in a content-addressed snapshot, and only the live derivative was rebuilt.

## Artifacts and audit boundary

- Rebuilt derivative: `research/research-radar/next-model/graph-data.json`. SHA-256: `7088a3f3c1a592504cbf3b95aa43efeccb76119197fb8072c131e32f10768b66`.
- Exact historical snapshot: `research/research-radar/next-model/graph-snapshots/570bdb86e53afa76de1adffe292e5c021fcbb6463fbe0698efd4029ee29f14f1.json`. SHA-256 matches its filename and the unchanged independent-evaluation and demonstration receipts.
- Changed offline verification code: `scripts/research-radar/next-model/verify.py`. Only an explicitly allowed historical binding for `graph-data.json` may resolve to an archive with exactly the receipt's SHA-256. Missing, modified, malformed or escaping snapshots fail closed. Model, corpus, executable and metric bindings keep their existing strict paths and hashes.
- Added three focused regression tests in `scripts/research-radar/next-model/verify.test.py`: current/historical separation, missing/tampered snapshot rejection, and prohibition of archive substitution for another artifact or an invalid digest.

The verifier replays the historical final trace packets and the ten saved demonstration packets against their original graph bytes. Its output separately names the historical and current graph hashes. Current graph freshness remains independently enforced by `trace.py --verify`. The current derivative is **not a newly evaluated graph**; historical model/path metrics remain bound to the historical snapshot.

No frozen receipt, training input, label, model weight, ranking, evaluation metric, promotion decision, model card or demonstration was rewritten. There was no training, neural inference, checkpoint reselection or new holdout use. The experimental candidate remains unpromoted; the default remains MiniLM.

## Verification

All commands completed successfully:

- `npm run validate:radar:next`: frozen dataset projection, current graph freshness, prospective World Bank cohort, offline training/evaluation/demo receipt verification, and unchanged report projection.
- `npm run test:radar:next`: 78 tests passed across six suites (7 dataset, 18 trace, 7 investigation, 17 cohort, 10 independent evaluation, 19 offline verifier).
- `npm run validate:funding` and `npm run test:funding`: current bundle; 101 tests passed. Existing secondary-only source warnings remain visible.
- `npm run validate:hypotheses` and `npm run test:hypotheses`: current bundle; 37 tests passed.
- `npm run test:game-theory`: 8 tests passed.

Local command logs: `/tmp/icip-model-validate.log` and `/tmp/icip-model-tests.log`. Browser/build verification is coordinated by the parent integration task.

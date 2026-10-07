# Retained research acceptance

Executed 7 October 2026, 07:42:10–07:43:14 UTC, against the current shared workspace. **All 20 gates passed.** No skills were opened or applied. One npm gate ran at a time; no application code or source-research files were edited for this verification.

This run covers promotion, fleet assembly, retained source/unit/model checks and procurement provenance. Atlas, allegations-specific, browser, build and deployment gates are assigned separately and were not invoked here. The retained investigation validator naturally sees the current integrated registry; its count is not presented as a retained-only denominator.

| Command | Result | Time (s) | Evidence |
| --- | --- | ---: | --- |
| `npm run promote` | PASS, exit 0 | 1.702 | 461 promoted records; 100 quarantined identity/grounding records retained; 16 adapter warnings |
| `npm run generate` | PASS, exit 0 | 3.009 | All6 fleet modules assembled; bytes unchanged |
| `npm run test:assemble` | PASS, exit 0 | 24.288 | 65 Node tests passed |
| `npm run validate` | PASS, exit 0 | 2.280 | Data-integrity gate passed; 30 nonblocking warnings |
| `npm run validate:education` | PASS, exit 0 | 0.233 | 38 sources; 112 series/560 values; 36 monetary observations; 3 archived PDF hashes |
| `npm run test:education` | PASS, exit 0 | 0.880 | 17 Node tests passed |
| `npm run test:education:model` | PASS, exit 0 | 0.540 | 38 documents/5 queries; 12 Python regression tests |
| `npm run validate:water` | PASS, exit 0 | 0.280 | 52 sources; 355 observations; 14 discovery routes; 16 findings/questions; 3 PDF hashes |
| `npm run test:water` | PASS, exit 0 | 1.152 | 19 Node tests passed |
| `npm run test:water:model` | PASS, exit 0 | 0.322 | 52 summaries/6 queries; stored artifact verified |
| `npm run validate:public-works` | PASS, exit 0 | 0.404 | 56 sources; 156 buyer aggregates; 20 cases; 58 relationships; 9 sectors/36 states and UTs |
| `npm run test:public-works` | PASS, exit 0 | 1.930 | 31 Node tests; 42 archive/accounting/no-inferred-payer/date controls |
| `npm run test:public-works:model` | PASS, exit 0 | 0.386 | 56 summaries/6 queries; stored artifact verified |
| `npm run validate:investigation` | PASS, exit 0 | 3.195 | 2,275 entities; 4,003 relationships; 5,468 records; 3,253 sources; 316 held items |
| `npm run test:investigation` | PASS, exit 0 | 7.449 | 45 Node tests passed |
| `npm run test:investigation:model` | PASS, exit 0 | 0.714 | 35 summaries; 3 input hashes; 6 queries; 4 Python regression tests |
| `npm run test:procurement` | PASS, exit 0 | 2.120 | 5 Node tests; 12 provenance/date Python tests; 12 audit Python tests |
| `npm run validate:deep-investigation` | PASS, exit 0 | 3.425 | 28 reviewed cases; 2,599 NSE securities; 155 exact-ISIN links; 101 held symbol candidates |
| `npm run test:deep-investigation` | PASS, exit 0 | 6.719 | 10 Node tests passed |
| `npm run test:deep-investigation:model` | PASS, exit 0 | 1.614 | 252 summaries; 10 input hashes; 7 queries; 4 Python regression tests |

The unit totals are **192 Node tests and 44 Python tests**, all passed. Public works additionally passed 42 archive, accounting-scope, no-inferred-payer, office-snapshot and package-date controls. Integrity validators and model document/query checks are separate from those unit totals.

## Model and source scope

The model gates verified saved results, corpus hashes, pinned model provenance and citation membership. This was not a new inference run or independent factual verification of model suggestions. The education, water and public-works scripts prepare their model corpora as part of their standard command; SHA-256 snapshots confirmed those writes were byte-identical. Investigation and deep-investigation corpora use `--verify`; no baseline was refreshed to make a gate pass.

The current Waaree source correction caused no failure in these gates. No expected assertion, source hash or baseline was changed to accommodate it. Passing structural/regression gates does not turn retained allegations or inherited graph links into newly verified factual claims.

## Residual warnings

There were no failed or skipped commands. Existing nonblocking warnings remain explicit:

- Promotion reports 16 raw files without an extraction adapter. They receive date/source checks but contribute no records through that pipeline: `adani-deep.json`, `desk-registers.json`, `global-footprint.json`, `indices.json`, `media.json`, `pmcares.json`, `procurement-ocds.json`, `prospect-procurement.json`, `reliance-deep.json`, `resources-coal.json`, `resources-hydrocarbons.json`, `resources-minerals.json`, `resources-spectrum.json`, `tender-data-sources.json`, `tenders-centre.json`, `tenders-states.json`. The unchanged promotion report records all 16. Separately, 100 records remain quarantined for grounding/identity and 218 collision candidates are not merged; those safeguards are not failures or newly admitted facts.
- The main validator reports 29 judicial-ruling edges whose descriptions do not use the prescribed explicit target-claim prefix. They occur in retained energy, welfare and capital source files. No descriptions were rewritten during this acceptance run.
- The thirtieth validator warning is the declared Sensex50 gap: 49 of 50 constituents are retained. Pages must preserve that denominator rather than claim full coverage.

## Mutation and log audit

SHA-256 snapshots were taken before and after every command for generated fleet modules, `research/promotion-report.json`, and the five retained model corpus/result pairs. **No monitored output changed.** `promote` and `generate` succeeded without unrelated generated changes. A new untracked `research/allegations-map/` directory appeared while other agents ran their assigned work; none of these retained commands writes that directory, and it is not attributed to this gate run.

Full stdout/stderr, command start times, exit codes, durations and per-command mutation checks are in `/tmp/allegations-retained-gates.log`. Structured results are in `/tmp/allegations-retained-gates.results.json`; before/after Git-status snapshots are adjacent in `/tmp`. The shared workspace contained other agents' changes before this run; they were not reset or modified.

Log bytes: `50273`. Log SHA-256: `399b476b868fb24064b659a10054f5114b48e2c160857c3485823825dcdb91c6`.

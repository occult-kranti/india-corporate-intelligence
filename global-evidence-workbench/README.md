# Fieldwork: global evidence workbench

Dated research snapshot: October 14, 2026. An offline-capable research prototype combining a pinned protest baseline, India institutional/organizational assertions, new bounded protest research, official Epstein-related public-record findings, Malta/Slovakia case paths and a document-change/source-quality ledger.

## Start here

- `ui/dist/fieldwork-offline.html`: standalone browser entry if supplied by final build.
- `ui/dist/index.html`: static application; serve the dist directory with a local HTTP server.
- `review/RESEARCH_ROADMAP.md`: three-round method, source priorities, competing explanations and stopping criteria.
- `review/REVIEW_LOG.md`: first-release checks and corrections.
- `review/round4/REVIEW.md`: rounds 4–5 source reconstruction, case-status corrections and deterministic-replay review.
- `protests/`, `epstein/`, `independent-sources/`: source-bearing research packets.
- `integration/README.md`: pinned source models and reproducibility instructions.

## What this does and does not establish

The baseline is a selected October 2 protest snapshot, not an exhaustive or live global census. Reference country/city lists do not establish population coverage. New observations carry their own date and source basis; an unknown event date remains unknown. Locations are coarse geographic reference points, not precise protest or personal locations.

India relationship assertions are retained from the user's pinned repository with explicit inherited/unverified labels. They are not fresh confirmations of their original citations. Temporal paths and amount aggregation are disabled pending original-source and stage reconciliation. Protest targets are typed institutional demands/responses, not evidence of financing or covert control.

Epstein records distinguish allegations, regulator findings, corporate disclosures and court outcomes. Index filenames are not read document contents. Document availability changes are classified by observation and attribution; missing links or altered redactions do not establish concealment. No guilt is inferred from association. Private victim/minor/contact details and raw leaked archives are excluded.

Game-theory entries are testable descriptive hypotheses with explicit rival explanations. They are not findings of intent or coordination.

## Rebuild and test

Use Python 3 for integration and validation. The preserved baseline is `integration/releases/v0-dataset.json` with its manifest. From `integration/`, run `python assemble_round4.py` to reproduce the reviewed extension in `staging/dataset-round4.json`, then `python -m unittest discover -s tests -v`. The older `build.py` and `assemble.py` reproduce the initial baseline/overlay and should not be used to overwrite the revised canonical output. Assembly never authorizes new joins beyond the retained typed records. Consult branch READMEs for additional validators.

From `ui/`, `npm run test:all` runs the model/DOM suite when its documented development dependencies are installed. `npm run build` produces the static build; `npm run standalone` produces the offline HTML if that script is present. Dependency directories are excluded from the deliverable. No credentials, API keys, or external service setup are required to read the finished static build. This revised snapshot contains 237 base/entity/claim records, 150 typed relations, 305 source entries and 11 document-change cases; the UI exposes relations too, for 387 inspectable entries.

## Verification boundary

Final independent checks passed 50 integration tests and 26 UI model/DOM tests; see `review/round4/` for logs. Browser screenshot rendering was attempted but blocked by the available runtime's Chromium socket permissions. Visual/layout QA is therefore incomplete. Selected original texts were independently reopened; no complete original-source or global-corpus verification is claimed.

No repository writes, external publication, or new deployment were performed for this deliverable. Bundled source snapshots are limited to the pinned user-repository inputs required for reproducibility. Two acquired official source PDFs and full extracted texts are not bundled; their acquisition receipts retain the recorded hashes, with original-byte replay requiring separately reacquired originals. Journalism is represented by citations, short excerpts and analysis rather than redistributed full articles. Original-source byte hashes are unavailable where originals were not downloaded; generated artifact hashes establish only the identity of these files.

## Next three research rounds

These are proposed next goals, not scheduled or unlimited execution:

1. Acquire discriminating originals: the source-specific document-change publication log or permitted version metadata, the missing India temporal/payment records, and identified protest case dispositions. Record access failures without interpreting motive.
2. Reconstruct candidate paths: independently resolve named organizational IDs and dates; test each protest-target or ownership/payment bridge; retain rejected namesakes, source dependence, lawful alternatives and missing denominators.
3. Falsify and verify: challenge the strongest claims against contrary records and comparison populations, rerun automated checks, and finish desktop/mobile visual verification in a browser-capable environment before any publication decision.

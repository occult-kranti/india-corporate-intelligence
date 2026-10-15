# Additive global research integration

## What is implemented
Two real repositories are joined into a shared read model, without asserting that their subjects are connected. Frozen snapshot import: 84 protest episodes and 66 India Atlas core entities, 108 typed relationships, 247 retained citations. This is a source-bearing research workbench, not a current global census or a freshly fact-checked allegations database.

The India repository default branch is **master**, not its divergent main. PR #6 merged at 2026-10-14 22:35:48 UTC; default master pinned to c49a5256217c76b8ab2866c5df7711ffbacbf6bf. Protest main pinned to fcd35a74d0b515be7e36e426aa594e13f2b9543e. Branches and closed PR status are recorded in repository-audit.json. No repository write, PR creation, branch change, deployment, or merge was performed.

## Reproduce
Python 3, standard library only:

    python build.py
    python -m unittest discover -s tests -v

Optional network reacquisition of immutable public blobs (not run here; connector supplied the checked cache):

    python fetch_cache.py --destination /tmp/new-global-evidence-cache

The script refuses an existing destination, reads commit-pinned URLs, and checks Git blob hashes. cache-manifest.json includes SHA-256, actual Git blob SHA-1, byte length, method, retrieval timestamp, immutable commit/path and fetch URL. All nine checked-in cached files match the repository tree's blob hashes. No remote source code is executed; literals.py accepts literal arrays and rejects calls, expressions, templates and spreads. The TypeScript MOTIFS export is deliberately not parsed because it includes executable expressions.

## Architecture
Pinned repository acquisition → immutable byte/hash manifest → nonexecuting literal/JSON parser → lossless normalized records and typed edges → validation → UI read model. Original payloads remain alongside normalized fields. No upstream repository was altered.

Output: output/dataset.json. Top-level meta, sources, records, relations, researchQueue, rejectedJoins, counterhypotheses. Record and source IDs are repository-namespaced. Relations point to record IDs. Sources distinguish upstream published/accessed dates from this repository retrieval; originalRechecked=false means a retained citation, not a fresh verification of its contents.

Protest positions retain actor/stance/target/claim/source IDs, and state responses remain separate. Event contexts preserve sourced cities, status basis, outcome date/summary/favours, explicit-versus-inferred benefit, and causality. Missing dates remain null; imported current activity is UNKNOWN regardless of a historic status. One exactly sourced city can receive a **coarse city reference point**, never a precise protest location. Multi-city events are unlocated at record level; all sourced cities remain in cities[]. Country and city do not create entity involvement.

India imports src/graph/data.ts core NODES/EDGES, not the entire much larger generated sector fleets. Node descriptions, denials, supersessions, tiers, sources and numeric fields are retained, but marked inherited/unverified. State display hints do not geolocate people or projects. Country UNKNOWN is intentional for nodes whose jurisdiction is not explicitly modeled in that schema.

## Fail-closed research rules
- No cross-repository event/entity edge exists without an explicit supporting source and resolved identity.
- All imported relations have pathEligible=false until original-source and temporal review. 102/108 lack any explicit validity boundary. Endpoint identity alone cannot make a time-valid path.
- All amountAggregable=false. Upstream numeric a values can be representative display values, ranges, pledges, awards or donations; they are not additive cash flows. Units retained as INR crore, transactionStage UNKNOWN.
- AP syndications share AP origin; Reuters syndications share Reuters origin. Unknown families stay UNKNOWN, not automatically independent.
- Node summaries may retain consequential negative or causal language inherited from upstream. Display claimStatus and provenance warning next to them; do not promote to verified facts.
- Typed denials and supersessions are retained. Links are evidence-navigation paths, not causation or guilt.

## Three-round evidence
Round 1: read actual branches/PRs, schemas and public data; corrected stale assumption that India PR6 remained open. Round 2: additive adapters plus deterministic build and schema/invariant tests. Round 3: independent reviewer identified syndication, temporal-path and amount-aggregation risks; all are now blocked or normalized with regression tests. test-results.txt records checks, not full upstream UI/build validation. Live network refresh script is supplied but unexecuted.

## Combined research overlays and document ledger
Run `python assemble.py` after `python build.py` to merge the protests, Epstein and independent-source track artifacts. Four protest research updates attach to baseline records; nine candidate episodes are separate. Public institution/office/target edges remain typed and do not imply finance/control. Epstein findings retain event/publication/retrieval dates and claim-level financial stages; exact date intervals remain original strings rather than invented boundaries.

`document_ledger.py` compares **acquired local bytes only**, returning hashes and unchanged/changed/unavailable status. It never infers motive. `normalize_entry` preserves HTTP404 vs access denied vs search absence vs publisher-reported movement, withdrawal, replacement or redaction. Use displayLabel and observationBasis for report-attributed cases. Eight actual ledger cases have no paired byte snapshots, so all before/after hashes are null; reported dates are not capture timestamps. A successful repository blob hash is not a hash of a cited primary document.

`path_policy.py` supplies tested fail-closed path and join decisions. Bibliographic source navigation is allowed; evidentiary/causal path promotion is not. Retained family, analytic, denial and supersession relationships cannot be substituted for payment or decision mechanisms.

# Exact evidence tracing

The local tracing engine attaches **existing sourced graph objects** to ranked source results. It does not use model similarity to manufacture a person, company, transaction or beneficiary. It can navigate existing typed connections in either direction while preserving every original relationship arrow.

## Delivered interface

- Engine: `scripts/research-radar/next-model/trace.py` (Python standard library).
- Deterministic browser artifact: `research/research-radar/next-model/graph-data.json`.
- Tests: `scripts/research-radar/next-model/trace.test.py`.

The artifact projects the full TypeScript investigation registry into a source-closed **nonlegacy, non-crosswalk** scope: 435 sources, 622 entities, 605 relationships and 1,705 records. Eighty-five other nonlegacy records depend on excluded legacy identities or citations; their exact IDs and exclusion reasons remain in `excludedRecords`. The full registry and excluded evidence remain untouched. Counts describe retained records, not verified corruption incidents or complete national coverage.

Relationships, entities, records and sources retain their original object fields. Relationships include exact `from`/`to`, `kind`, `tier`, `status`, `sourceIds`, `recordIds`, `responseIds`, dates, alternatives, falsifier and limitations. `amounts` remain separate cells containing value, currency, unit, stage and period. The approximately 5.38 MB compact JSON compresses to approximately 569 KB with gzip in the local measurement; browser delivery compression depends on hosting.

The artifact also includes 43 authored money-trail acquisition steps. These preserve the requested next record, stated holder, source citations, alternatives and explicit missing-evidence stops. They are acquisition questions, not newly inferred factual edges.

```bash
# Rebuild the artifact from the current registry and authored money trails.
python scripts/research-radar/next-model/trace.py --build

# Fail if the checked-in artifact differs from current input bytes/objects.
python scripts/research-radar/next-model/trace.py --verify

# Attach exact graph context to one ranked result.
python scripts/research-radar/next-model/trace.py \
  --source money-trails-djb:source:tribunal \
  --max-hops 2 --output /workspace/djb-evidence-packet.json

# A ranked JSON array may contain source-ID strings or {sourceId: ...} rows.
# An object with rankedSources is also accepted.
python scripts/research-radar/next-model/trace.py \
  --sources-json /workspace/ranked-sources.json --top-k 5 \
  --max-hops 2 --output /workspace/ranked-evidence-packet.json

# Exact-identity path lookup; no name matching or entity resolution occurs.
python scripts/research-radar/next-model/trace.py \
  --from-entity money-trails-djb:entity:djb \
  --to-entity money-trails-djb:entity:nkg \
  --direction outgoing --max-hops 3
```

In Python, load the module with `importlib.util` and call `expand_trace(graph, source_ids=[...], from_entity=None, to_entity=None, max_hops=2, direction='both', max_edges=150, as_of=None)`. `graph` is the parsed artifact. The CLI aliases `--fromentity` and `--toentity` are supported.

## Output and reading rules

A packet contains exact `entities`, `relationships`, `records` and `sources`, plus `paths`, `traversal`, `moneyAmounts`, `counterevidence`, `missingRecordQuestions`, `sourceClosure`, `temporalLimits` and `truncation`.

`paths[].traversedDirections` distinguishes forward and reverse navigation; it never rewrites a relationship's own `from` and `to`. Ownership, role, contract, loan and oversight paths remain different types. Response, comparison, analytic, supersession and explicitly contextual edges may be displayed but cannot advance a path. Exact namespaced IDs, not shared names, enable connectivity.

With ranked-source input, directly source-cited edges and records form the seed neighborhood, then bounded expansion adds adjacent relationships. It is evidence navigation across the retained exact IDs, not proof of a common scheme. The default output limit is 150 edges; permitted limits are 1–1,000, with 1–3 expansion hops. Truncation is explicit. A path search explores at most 10,000 states and returns at most 20 paths by default.

`inferredCashFlow` is always false, and `aggregateAmount` is always null. Even an existing pair of payment assertions does not demonstrate that the same units of money moved onward without allocation evidence. Record and relationship amounts may overlap or refer to different stages; the engine does not add them. Similarity scores do not become probabilities or certainty scores.

An explicit response or counterevidence record is returned with its citations even if outside a date filter. Other retained response text and alternatives also travel with the packet. This is a closure check over retained material, not a claim of an exhaustive new response search. Missing-record questions prioritize exact authored acquisition steps before existing disconfirmation tests; a generic evidence-stop instruction appears only when no authored one is available. Generic instructions cannot create allegations.

`validate_packet` rejects changed/invented relationship objects, dangling sources, changed directions, and cash-flow or aggregation claims. A source-closure pass demonstrates faithful evidence packaging, not the truth of every inherited assertion.

## Temporal guard

`--as-of YYYY-MM-DD` filters source-date-eligible reconstruction. It is **not a historical forecast**. Every cited source for an edge must have a valid observed retrieval date by the cutoff, any publication date must be valid and consistent with retrieval, and the source cannot have been retrieved later. Missing or malformed retrieval dates fail closed. Event dates never backdate source availability.

Publication and retrieval dates alone cannot establish when the present source-summary or authored edge version existed. Consequently `temporalLimits.historicalForecastEligible` remains false. Per-source, per-record, per-entity and per-followup eligibility annotations let the UI distinguish retained later context from date-filtered evidence without mutating the original records. Later counterevidence remains visible and explicitly marked as unavailable at the cutoff.

## Verification performed

Eighteen behavioral tests pass: exact object/amount preservation, reverse-navigation disclosure, context-edge stops, same-name separation, missing citation/endpoint/response rejection, mutation detection, invalid and unknown dates, later-response retention, all-source cutoff gating, bounds and explicit truncation. A retained development DJB source was run through the actual CLI: 19 entities, 19 relationships and seven source citations were returned, with responses, alternatives and money stages preserved.

The independent temporal reviewer additionally checked seven date/eligibility cases and accepted the fixes. Neither review inspected the new final-test question text to shape the algorithm. Independent final retrieval/path coverage is evaluated separately; these engine tests do not count as learned model accuracy.

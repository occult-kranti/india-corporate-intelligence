# Linked atlas, evidence readers and local discovery

Implementation snapshot: 7 October 2026 UTC. The requested event horizon is
6 October 2011 through 6 October 2026. Retrieval dates remain independent from
event dates. The user can select all retained history; unknown event dates have
an explicit control and are not converted into first-of-year estimates.

## Evidence and identity contract

Five strict source slices integrate under `atlas-policy`, `atlas-institutions`,
`atlas-oversight`, `atlas-international-finance` and `atlas-defence-trade`. Each retains exact local entities, directed grammatical
relationships, monetary stage, case status, response cards, alternatives and
falsifiers. The raw slices are validated before use and their retained source
artifacts have byte-count/SHA-256 manifests. An original source blocked by an
origin is recorded as a failed retrieval or an indexed extraction; mirror and
news source links are labelled “Open source”, not automatically “original”.

Crosswalks require an explicitly supplied exact canonical ID and documented
identity basis. Existing raw legacy IDs remain compatible; new reviewed links
can name an exact namespaced public institution or company. There is no
similar-name, symbol, shared-address or proximity join. A crosswalk carries both
identities’ source references and never carries a payment amount.

`getAtlasEvidenceClosure` recursively retains case relationships, each edge's
record and response references, endpoints, direct citations and geography
citations. Its `missingIds` array reports unavailable identifiers. Exported
packets retain this context even when a response falls outside the selected
event window. Filtering the display cannot remove counter-evidence from an
export. Entity packets start from exact incident links; endpoint identities do
not recursively expand the entire registry.

## Network and map surfaces

`AtlasNetwork` supplies exact-identity search, one through five hops, incoming,
outgoing or both-direction exploration, and a separate amount-bearing-link
filter. Both-direction traversal retains each arrow’s original direction and
marks reversed steps. Numbered trail steps expose their actual edge, tier,
event window, amount stage and response. An ownership or identity step is not
called a transfer; no incompatible currency, unit, period or accounting stage
is summed. “No path” states the bounded, filtered search rather than asserting
that no real relationship exists.

The SVG preview retains at most 80 entities and 180 relationships. Reachable
population counts, full paginated relationship ledger, CSV and source-closed
JSON export remain uncapped. CSV can include response objects and their sources
when the parent supplies records; missing response identifiers are explicit.
Graph labels use deterministic screen-space rectangle placement, reserve node
symbols, prioritize selected identities, and omit a label when no collision-free
position exists. The focus strip and ledger always retain full identities.

`AtlasEvidencePopover` opens the exact selected node, edge or record, expands
into a wider reader, preserves Escape/focus behavior and opens shared source
inspection after closing the reader. Source limitations are available beside
each cited source. No second overlay is left on top of the source inspector.

The case feed separates typed case/allegation/finding/
proceeding records, and exact alleged-tier relationships in an “Alleged links”
tab. Four typed financial-context records have their own tab and denominator:
financing instruments, reserve accounts and institutional positions are never
counted as cases or allegations. Links are never counted as additional corruption cases. Legacy alleged
links disclose inherited citation status. A state association through an entity
is explicitly distinguished from the location of alleged conduct. Empty domain,
layer or tier arrays mean no selection; omitted domains mean all sectors.

The policy timeline contains 12 sourced policy-change records, sorted by their
actual event dates. The site manifest contains one verified public port campus
coordinate. It does not place a particular private berth, payment destination
or private person. Site filtering checks its actual state, case window, domains
and source closure; national case context cannot relocate a campus.

The map, graph, feeds and sites use one contextual matcher for source titles,
endpoint names, event windows, tier/layer/domain selections and explicit state
associations. Adani search retains the Milestone/Adicorp dismissal records and
Mangaluru concession rather than dropping counter-evidence. An empty future
window suppresses unsupported standalone identities; a selected identity may
remain as clearly isolated context.

Foreign country contexts carry explicit ISO 3166-1 alpha-2 codes and are counted
separately. They supply neither Indian-state shading nor invented coordinates.
The retained finance fleet adds `international-finance` only to the 961 exact
edges incident to established IBRD, IDA, ADB, AIIB, NDB and IMF IDs, their 66 exact
endpoints, and their directly associated records. Original source metadata and
928 documented / 13 reported / 20 analytic edge tiers remain unchanged; this is
classification of inherited evidence, not a claim of newly reviewing 961 flows.
Exact crosswalks permit symmetric identity navigation, while actual financial
arrows retain their original direction. No similar-name lender or subsidiary
receives this domain through a fuzzy match.

## Actual open-model execution

The source-freeze run used the local pinned open model
`sentence-transformers/all-MiniLM-L6-v2` at revision
`1110a243fdf4706b3f48f1d95db1a4f5529b4d41` (Apache-2.0), quantized ONNX uint8 AVX2,
384 dimensions and CPUExecutionProvider. It processed 343 researcher-authored
public source summaries from 15 exact-hashed research slices and twelve discovery
queries in 5.402 seconds. No public text was uploaded to a model service.

- Corpus: `research/atlas-expansion/model-corpus.json`
- Corpus SHA-256: `1dfb4bbc058795d6692409414eb176325c8a464af13baa0003b0ccc546474f9c`
- Output: `research/atlas-expansion/model-suggestions.json`
- Output SHA-256: `a0b75dd342b3f2c2fc68cbe89318a905d71a4e02c44b7367021913240eab6263`

The exact final artifacts, source-input hashes and runtime receipt are retained
in `research/atlas-expansion/runs/final-343/`. The earlier actual 311-summary run
remains separately archived in `runs/initial-311/`; it is not passed off as the
current source snapshot.

Cosine similarity ranks discovery candidates only. It establishes no identity,
influence, wrongdoing or payment. Repeated URLs across research namespaces are
not independent corroboration. The model did not read all original documents
or all retained legacy sources. Its output is never promoted into graph edges.

Reproduce with an environment containing ONNX Runtime, tokenizers and NumPy:

```sh
node scripts/atlas-expansion/model-corpus.mjs
/tmp/india-education-model-env/bin/python scripts/atlas-expansion/model-rank.py --offline
npm run test:atlas:model
```

The source and result validation tests reject changed corpus hashes, fabricated
citations and automatic factual-promotion flags.

## Verification

The focused implementation checks cover source/response closure; exact directed
five-hop and reverse traversals; cap-independent ledgers; unknown and invalid
dates; mixed-stage preservation; identity-bridge source closure; typed feed
populations; separate alleged-link counts and qualified place associations;
empty sector selections; exact shared-filter population parity; financial
accounting context; inherited lender classification; empty future windows;
country-context geography; policy dates; and rejection of private-person or
unsourced site coordinates. Shared investigation tests retain legacy source,
geography, edge-collision and casebook behavior.

`test:atlas:browser` owns the actual network → identity → expanded reader →
five-hop trail → exact edge → evidence export → shared source inspector journey,
rendered label-collision checks and mobile overflow/Escape. Root integration and
spatial browser checks are separate release gates; their results belong in the
release/panel record, not inferred from unit tests.

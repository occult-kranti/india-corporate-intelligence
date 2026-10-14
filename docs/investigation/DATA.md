# Investigation registry and query contract

Snapshot: 6 October 2026. Implementation: `src/data/investigation.ts`.
The registry adapts the substantive existing corpus and three reviewed research
slices. It is a curated evidence catalogue, not a national transaction census,
live court docket, complete tender dataset or corruption ranking.

## Population and provenance

At the validated snapshot the registry contains **2,009 entities, 3,687
relationships, 5,313 record cards, 3,073 namespaced sources and 315 held items**.
Record cards include documents, direct observations, cases and inspectable
relationship cards. These counts do not represent independent incidents,
unique contracts, beneficiaries or unique source URLs. The same document can
support several records; separate source namespaces preserve source-specific
metadata even when the URL is shared.

| Namespace | Entities | Relationships | Record cards | Sources | Held |
| --- | ---: | ---: | ---: | ---: | ---: |
| Existing graph fleets (`legacy`) | 1,847 | 3,540 | 3,767 | 2,878 | 315 |
| Public works | 75 | 58 | 151 | 56 | 0 |
| Finance research | 20 | 17 | 29 | 14 | 0 |
| Justice research | 43 | 50 | 12 | 12 | 0 |
| Welfare research | 24 | 15 | 15 | 9 | 0 |
| Explicit identity crosswalks | 0 | 7 | 7 | 0 | 0 |
| Education | 0 | 0 | 659 | 38 | 0 |
| Water and food | 0 | 0 | 423 | 52 | 0 |
| Existing welfare schemes | 0 | 0 | 78 | 0 | 0 |
| Existing PM CARES annual statements | 0 | 0 | 7 | 0 | 0 |
| Reviewed procurement buyer cohorts | 0 | 0 | 156 | 6 | 0 |
| Tender corpus audit | 0 | 0 | 9 | 8 | 0 |

Source counts are inventory counts per namespace. Existing welfare and PM CARES
records reuse legacy source IDs; zero new sources in those rows does not mean
unsourced records. Every visible entity, relationship and record has source
references. A held item may preserve an unresolved or uncited claim; it is not
a drawable fact. Sourced held counter-evidence remains inspectable as a record.

The existing graph is built through the same national and fleet merge functions
as the original application: the atlas plus energy, welfare, finance, NGO,
capital and security fleets. Education contributes 560 dated school-stock
observations alongside funding, programme and source records. Water contributes
355 observations alongside sources and research questions. New research adds
35 selected primary sources, 37 direct records and their institutional graphs.
The finance source refresh also corrects stale PM CARES publication claims and
removes two unsupported money-flow arrows from the inherited graph.

Inherited citations are **not newly verified merely by being adapted**. Their
source metadata is conservatively labelled `reported`; original claim evidence
tiers remain on relationships. Missing record-tier metadata defaults to
`reported`, never `documented`. Reviewed primary-source audit and judicial
findings retain their documentary scope. A court document proves the dated act
or finding it records; it does not turn every reproduced allegation into fact.

## Identity and source contract

IDs take `namespace:kind:original-id`. The original identifier and source route
remain available separately. Legacy claim IDs recur across some independently
built fleets, so their registry identity includes the exact source endpoint,
predicate and target endpoint. Claim-response joins additionally retain the
original fleet domain. This prevents unrelated `literature:c001` claims from
colliding or receiving each other's responses.

Reviewed public-works sector tags map consistently across entities, source cards,
relationships, cases and rules: electricity to energy, schools to education,
hospitals to welfare, water to water, police/military to security and
recruitment/administration to governance. All retain the public-works domain.
This makes the DDUGJY audits visible in Energy and the Azamgarh school-rework
audit visible in Education without inferring topics from company names or text.
Domain membership overlaps; it does not create additional records or incidents.

The procurement-trails namespace adds 156 reviewed central-buyer cohort records.
Their keys combine exact portal, buyer, snapshot and buyer rule. All 156 have
rate rows; 133 have exact concentration-family matches and 23 explicitly lack
them. Rate, named plausible-value and marked-label denominators remain separate.
Lazy supplier detail rows contain dataset labels, never newly resolved legal
entities. These cohorts add no graph entities/edges or payments, and their
national collection context is not asset geography. Source-chain metadata links
the original scrape, converter, HF mirror and historical local SQL outputs.

The separate procurement-audit namespace adds nine corpus-level findings over
the publisher-hash-verified notice and award databases. Each retains exact query
identifiers, source locators, eligible populations and alternative explanations.
They are not measurements of a selected buyer and add no graph identities,
transfers or allegations. The historical award date-gap measures are retained
with a field-semantics caveat, not interpreted as evaluation duration.

No name-only joining occurs. Seven bridges use canonical office-holder IDs
explicitly retained by the reviewed public-works corpus. They mean identity
navigation, not a flow of money, shared corporate control or award influence.
Other namespaces can retain separate records for apparently similar names until
an explicit reviewed crosswalk is supplied. Parent companies, subsidiaries,
reporting perimeters, ministries and their departments remain distinct.

Sources retain URL, title, publisher, original identifier, publication date,
retrieval date, locator, tier and limitations. Unknown dates stay `null`;
month-only publication dates remain month-only and never become invented first
days. A stable URL hash deduplicates legacy citations; a same-ID/different-URL
collision throws rather than dropping evidence. View and neighbourhood source
closure includes both direct and geographic source references.

Entities require an explicit resolved identity and identity basis. Relationships
require directed endpoints, predicate, label, tier, dated status, source refs,
record refs, response refs, geographic dimensions and limitations. Every
relationship has at least one inspectable card. Synthetic cards name both
endpoints while preserving the original edge label. Cards contain status,
status-as-of, event dates, date basis, original period, response, alternative
reading, falsifier and separately typed monetary observations.

## Geography

The registry uses the current 36 state/UT codes, including `LA` and the merged
`DN`. Old unambiguous renamed codes such as `ct` and `or` map to `CG` and `OD`.
Legacy lowercase `jk`, `dn` and `dd` remain unknown because their boundary era
cannot be allocated safely to today's units. They do not become present-day
Jammu and Kashmir, Ladakh or the merged territory by string conversion.

Each geographic assertion has its own source refs, declared scope and basis:

- `project-location`, `programme-coverage`, `institution-location`: recorded
  coverage, at the precision actually established by the source.
- `headquarters`, `constituency`, `state-association`: associations, separate
  from asset location or service delivery.
- `national-context`, `unknown`: retained separately from local coverage.

Legacy company/group state tags are headquarters associations; political tags
are constituency/state associations. Other legacy tags retain the weaker
state-association meaning. Relationship placement is not copied from a buyer,
minister or company's address. Explicit finance project placement is retained
only where the original loan fact supplies a placement basis.

A national source can explicitly list states or localities covered by its
annexes. Its national-context record remains national context; it is not counted
as a local delivery outcome. Separate observation records carry actual recorded
subnational coverage. No district centroid or approximate site coordinate is
fabricated. School-stock changes are not closure-event counts or evidence that
school-age population increased.

## Query semantics

`getInvestigationRegistry()` returns the memoized registry. Item/source lookup
helpers preserve stable IDs for local casebook pins and evidence exports.
`getRouteLens(pathname)` maps existing routes plus `/justice` and `/debt` to
supported domain lenses. `/investigate` is the all-domain workspace. Industry and
media routes select company/ownership context; interlocks select company/public
office context; resource allocation and competition routes select their relevant
energy, company, government and procurement domains. These are context lenses,
not claims that every specialised register has been independently re-adapted.
Original outlet, resource, allocation and competition details remain in their
dossiers. Method, patterns, capture, evidence, network and other cross-domain
analysis tools intentionally keep all-domain context.

`getInvestigationView(filters)` supports state, domain, layer, evidence tier,
text, dates, national context and geographic basis. Undefined layer/tier filters
mean all; explicit empty arrays mean no matches. Empty domain arrays mean the
all-domain route lens. Invalid state or malformed/reversed date filters return
an empty selection rather than widening it.

Search includes record/relationship text, original IDs, referenced entity names
and supporting source titles. It does not infer geography from text. Endpoint
closure can retain an entity outside the selected entity layer so that a
matching relationship is never drawn with a missing endpoint. Such closure is
context, not an additional matching claim.

Date ranges compare only calendar-valid structured event/relationship endpoints.
Publication, audit signing, observation, legal commencement and office tenure
retain their stated date basis. A missing end date does not imply continued
tenure. With only one known endpoint the filter uses that known date; fully
undated items are included unless `includeUndated:false`. Financial and survey
periods remain explicit text and are not converted to guessed date intervals.

`getInvestigationStateCoverage()` ignores the currently selected/compared state
while retaining domain, layer, text and date constraints. Counts distinguish
recorded coverage, entity associations, national context and unknown geography.
National records are not multiplied into local coverage. A record linked to an
entity in a state may appear under associations; its own geography is unchanged.
State and domain totals can overlap, and must not be summed as a national count.
View denominators refer to the complete registry inventory; map counts refer to
records retained by the other active filters.

## Paths and review questions

`getInvestigationNeighbors()` expands up to three hops, with at most 500 returned
entities (120 by default). It reports the reachable population and whether the
returned subset is capped. `findInvestigationPaths()` searches retained directed
relationships by default; optional bidirectional adjacency is explicitly
labelled. Defaults are five steps, 1,500 visited entities and three paths; hard
limits are eight steps, 5,000 visited entities and ten paths.

Analytic-tier relationships and `analytic`, `contra`, `response`, `supersede`,
`denial` and `comparison` predicates do not connect a path or expand a
neighbourhood. Responses among already retained endpoints remain inspectable.
Every returned path names its exact existing edge IDs. No missing edge is
inferred. A bounded or filtered failure to find a path is not proof that no
relationship exists. A found path proves only recorded connectivity.

Structural questions identify reversed exact-date windows, records mixing
unlike monetary stages/periods and claims with linked counter-evidence. Each
question supplies its numerator, comparison population, source references,
alternative reading and what evidence would close it. These are review prompts,
not fraud predictions. There is no corruption score or asset-duplication claim.

All amounts retain currency, unit, stage and period. Receipts excluding opening
balances, payments, sanctions, releases, write-offs, waivers, settlements and
recoveries are not added together. Record/source counts are never financial
amounts or rates of misconduct.

## Validation and evidence integrity

Run:

```sh
node scripts/investigation/validate.mjs
node --test scripts/investigation/investigation.test.mjs
```

The loader bundles the actual TypeScript registry with the repository's existing
esbuild dependency and evaluates that local build for Node tests. It does not
execute user-supplied code, download models or add runtime dependencies.

Validation checks all namespaced IDs, endpoints, source/locality joins, modern
states, explicit geographic metadata, layers, route shapes, tiers, resolved
identities, calendar dates, amount dimensions and namespace denominators.
Malformed arrays fail before traversal. Raw slices must explicitly supply tiers,
identity resolution, nullable dates and amount arrays; defaults cannot turn an
incomplete research submission into reviewed evidence.

All three retained evidence manifests are required and every listed file is
checked against byte count and SHA-256, including these distinct roots:

- `evidence/investigation/justice/sha256-manifest.json`
- `research/raw/investigation/evidence/finance/sha256-manifest.json`
- `research/raw/investigation/evidence/welfare/sha256-manifest.json`

At this snapshot they inventory 99 retained artifacts. Original PDF hashes and
labelled excerpt page maps are recorded separately by the research authors;
an excerpt is not represented as an archived full original. Missing manifests,
missing files, malformed hash rows and altered bytes fail validation.

The 25 registry tests cover real corpus population, legacy claim collisions, modern vs
ambiguous geography, national school counts, empty filters, map denominators,
exact-date/undated filtering, text search, bounded paths, counter-evidence,
monetary comparability, malformed metadata, raw evidence gates, archive tampering,
contextual card titles and source closure. Build and rendered route/accessibility
checks are separate release gates owned by the integration lead.

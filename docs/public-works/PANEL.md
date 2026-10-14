# Roads and public works: panel decision ledger

Baseline: `2a96ec03403463bc8b8f3ac813f97f0818fc480f` on
`codex/education-funding-intelligence`. Review snapshot: 6 October 2026.
The recent-publication window inherited from the water investigation is
6 October 2021–6 October 2026; older laws and audit periods retain their dates.

The moderator coordinates six independent Codex specialist agents: procurement
data, roads/bridges, social services/utilities, security/administration, product
design and network/model engineering. These are AI role reviews, not interviews
or professional endorsements. Repository personas naming unavailable models are
used as role instructions; they do not establish that those providers ran.

## Round 1 — baseline evidence and design

| Evidence and finding | Decision and owner | Acceptance check |
| --- | --- | --- |
| Existing CPPP pipeline records 4,921,960 scraped rows and 3,385,233 after its dedup rule; 40 of 40 stored sample links expired. | Reuse committed, hashed aggregates with their reported tier and declared denominators. Procurement data. | No scrape statistic is presented as a verified national procurement rate; no fresh row scan is claimed without inputs. |
| Some tender IDs are organization/year buckets, including 2018_BHEL_EDN. | Keep extract deduplication, tender republication, multiple lots, recurring maintenance and repeated physical work separate. Procurement data and roads researcher. | Repeat-work comparisons require compatible asset, place, scope, time and accounting stage; missing fields block conclusions. |
| The existing security slice is predominantly MES/BRO works and excludes important procurement channels. | Separate public works, capital acquisition, salaries/pensions, service claims and recruitment. Security/administration and services researchers. | Each sector view states what its data measures and excludes. No combined money total. |
| A repair can be paid by the concessionaire under a maintenance obligation. | Carry payment responsibility and government responses in road dossiers. Roads researcher. | A second work event alone cannot become duplicate public expenditure. |
| Graph aliases can group legally distinct subsidiaries, and office/ownership dates constrain interpretation. | Create explicit, source-verified entity mappings; leave unresolved joins as gaps. Network engineer. | Every edge has resolved endpoints, sources, type and a stated date or unknown period. Proximity never becomes influence. |
| Procurement laws differ across central/state bodies, goods/works/services and defence. | Build a legal-change timeline with jurisdiction, applicability and effective dates. Research panel. | Unknown or later rules cannot establish a retrospective breach. |
| The site already has detailed energy, education, water, finance and tender registers. | Add one investigation workspace with nine sector lenses and links to the existing registers. Product designer and lead. | Roads/bridges is the default; all requested sectors have usable evidence views and explicit gaps. |
| Dense graphs conceal direction and source scope without an equivalent ledger. | Provide selectable, bounded one/two-hop subgraphs and a complete relationship table. Network engineer. | Keyboard selection, evidence inspection, empty cases and mobile reflow work; table and drawing use the same filtered edges. |

Accepted implementation: `/public-works`, a lazy-loaded React/TypeScript page in
the existing reading-room design. Preserve existing routes, saved work and data
pipelines. New analysis and source assembly are isolated under `scripts/public-works`
and `research/raw/public-works`.

Plugin discovery searched government procurement/open data and OpenCorporates/
Open Contracting capabilities. Returned integrations did not provide a suitable
India procurement source. Existing Exa and GitHub connections are used; no
unrelated plugin is represented as installed. A reusable procurement-investigation
skill is authored in the repository; open-source dependencies retain provenance.

## Round 2 — implementation challenge

| Implemented finding | Correction | Observed result |
| --- | --- | --- |
| Road edges without geographic fields inherited national scope and leaked West Bengal cases into Uttar Pradesh electricity and Karnataka water views. | Removed dimension defaults; every raw record must declare scope and geography. Reviewed every road record. | Validator rejects omitted dimensions; regressions exclude unrelated state edges and cases. |
| Publication dates had been used as the start of undated roles. | Unknown role periods remain null; dated announcements are point events. | Chronology checks and the graph expose unknown periods; the PM portfolio roster is a 25 July 2026 snapshot. |
| IRB consolidated donations could be read as donations by the legal parent. | Separate reporting-group node; standalone parent reports NIL; no inferred subsidiary payer or unmatched electoral-bond join. | Independent primary-document review and 42 archive/scope/office/date controls pass. |
| Source aliases could duplicate ministries and the exact L&T legal parent, or merge unrelated companies. | Four individually reviewed canonical mappings; reporting groups and subsidiaries remain separate. | No orphan edges; identity tests preserve separate legal entities. |
| Electricity ToD dates omitted applicability immediately after smart-meter installation; JJM deadlines differed by scheme type. | Added immediate installation clause and separate 15/31 March 2024 tender deadlines. | Independent services/roads cross-review verified the corrections against retained records. |
| The recurring-winner denominator appeared under every sector. | Explicitly label the whole retained dataset, independent of selected sector/state/place. | The page and methodology retain 7,777/74,940 as recurring text-pair context, not repeated physical work. |
| Case network links could share a broad audit source without describing the same allegation. | Name the view “shared supporting sources” and disclose its wider documentary context. | Graph and table use identical filtered relationships, with per-edge sources and limits. |
| Long citation locators overflowed mobile layouts; dense all-sector graphs compressed text. | Wrap full locators, enlarge the graph canvas with internal scrolling, keep focused subgraphs compact. | Narrow viewport and graph keyboard checks pass; screenshots retain the final layout. |
| Rapid filter changes and export clicks could use stale state. | Compose URL updates from the current hash and derive exports from the latest filters. | Browser history, rapid state/search submission and full CSV export checks pass. |
| Selected source-only reading lists could imply the entire desk was filtered. | State that saved-only applies to the source ledger and source export. | Local persistence, empty state and focus restoration pass. |
| Manual repeat-work inputs could confuse notices, same-contract entries and cancelled work with duplicate assets. | Require exact authority/site/asset/scope/stage and overlapping periods across distinct contracts. | Independent reviewer passed 16 rendered checks; automated boundary tests reject non-comparable records. |
| Two evidence manifests lived outside the initial scanned directory. | Require all five exact manifests and include them in assembly input hashes. | 57 unique archived/reused artifacts pass hash and byte-count validation. |

The second round was cross-assigned: roads reviewed utility evidence and the
manual comparator; utilities reviewed roads and geography in Chromium; security
reviewed corporate accounting scope, office chronology and sector journeys.
The lead reviewed source methodology, graph identity boundaries, visual output
and integration. Details are retained in `CROSS_REVIEW.md`,
`REPEAT_WORK_REVIEW.md`, `DESIGN_REVIEW.md`, `GRAPH_REVIEW.md` and the sector
research files. Release verification is recorded in `VERIFICATION.md`.

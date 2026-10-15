# Investigation board: preservation inventory

Audit date: 15 October 2026. Scope: the existing application in this working copy, before the desktop-board implementation. This is a code-backed inventory, not a claim that every interaction has passed browser testing.

## Coverage and boundaries

- `src/App.tsx` defines **60 explicit route patterns**, including `/` and its `/investigate` alias, three parameterized profile routes and eleven domain-dossier routes. The outer wildcard is a routing container, not a sixty-first content page.
- Three additional static applications are built under `dist/global-workbench/`: global evidence, public assets/finance, and media/power. They are not React hash routes.
- The ProtestAtlas link leads to a separately hosted product. Retain the link; do not imply its pages were redesigned in this repository.
- `FundingSearches.tsx` is a nested funding-analysis section, not an independently routed page. `AdaniDeepDive.tsx` and `RelianceDeepDive.tsx` are retained source files, but the live group route uses `GroupDeepDive.tsx`.
- The latest desktop-only brief supersedes the earlier product brief's mobile-design priority for the new presentation. It does not authorize deleting data, source readers, tables, URLs, exports, keyboard access or saved work.

## Shared application contracts

### Navigation and routing

The existing `Layout.tsx` supplies an atlas rail, masthead, navigation-library dialog, route title, skip link, focus handling and connected-research links. Standard content is wrapped in `Workspace`; four independent research pages and seven standalone investigation pages use their own work areas.

Preserve these existing route families:

- Independent research: `/investigations`, `/leads`, `/game-theory`, `/research-program`.
- Standalone investigation surfaces: `/follow-the-money`, `/money-trails`, `/research-radar`, `/model-lab`, `/funding-investigations`, `/hypothesis-lab`, `/allegations`.
- All other current routes: shared geographic workspace plus the original page under Dossier.

Existing cross-route context whitelist: `iw_state`, `iw_compare`, `iw_q`, `iw_layers`, `iw_tier`, `iw_from`, `iw_to`, `iw_undated`, `iw_national`, `iw_geo`, `iw_view`. A state-profile route can seed `iw_state`. Do not indiscriminately transfer domain-specific selection IDs into a different domain. Preserve browser Back/Forward, dossier anchors and original direct links.

Baseline discoverability defects to fix:

1. `/allegations` appears in the primary rail but is absent from the searchable `navGroups` collection.
2. Connected-research links remain visible regardless of the navigation query; they should participate in the same search or be clearly separate, persistent shortcuts.
3. “Money trails” is used for `/follow-the-money`, while `/money-trails` has a similar purpose. Add distinguishing descriptions without changing either URL.
4. “Saved research” currently leads to `/watchlist`; the local Casebook is a separate system. Expose both with accurate labels.

### Shared Workspace

`src/components/investigation/Workspace.tsx` provides five surface values:

| Label | URL value | Existing behavior to retain |
|---|---|---|
| Map | `iw_view=map` or omitted | Geography, sector overlays, source-linked cases, site/place inspection, time scope, map/network context |
| Connections | `iw_view=connections` | Entity focus, neighborhood depth, exact relationship inspection, path endpoints and original direction |
| Evidence | `iw_view=evidence` | Filtered record list, more results, CSV export including provenance, linked responses and limitations |
| Casebook | `iw_view=casebook` | Local saved pins, notes, question/falsifier, saved views, import and exports |
| Dossier | `iw_view=dossier` | Original route page, complete analytical controls and long-form source material |

Workspace controls include search; state; current-sector/all-topics scope; sector overlays; layer/tier filters; date interval; include-undated; geographic-basis filter; national-context inclusion; state comparison; reset; share; source selection; source-linked response/counter-evidence; procurement-trail links; and exact path search with direction controls.

Additional Workspace URL keys: `iw_depth`, `iw_direction`, `iw_domains`, `iw_edge`, `iw_graph`, `iw_node`, `iw_path`, `iw_pathFrom`, `iw_pathTo`, `iw_record`, `iw_scope`, `iw_source`. Preserve these in the views that own them, including exported/saved views. A board view is additive; it must not silently reinterpret an old `iw_view` value.

### Maps, networks and inspectors

- `InvestigationMap`: flat/dimensional presentation, selected-site detail, hover/selection and graphics fallback.
- `PlacesAtlas`: geographic search; zoom/pitch; labels, state/site layers; building context; evidence hubs and connections; explicit searched-place versus evidence-place distinction.
- `LinkedEvidenceMap`: map population and unplaced-evidence search/pagination. Unplaced records must remain reachable.
- `MapEvidenceHubPanel`: placement precision/source basis, evidence tabs, query/pagination and related geographic indexes.
- `InvestigationGraph`: relationship/ledger views, depth, zoom, pan, semantic legend and complete paginated relationship table.
- `AtlasNetwork`: identity lookup, hops, event dates and exact relationship-trail destinations.
- `AtlasEvidencePopover`: previous evidence, close, response/outcome and linked identities.
- `ProcurementTrail`: source-backed stages and evidence export. Never substitute a visual thread for a financial transaction path.

### Saved work and persistence

`casebookStore.ts` uses `icip.investigation.casebook.v1`. Retain its versioned parse/merge behavior and these capabilities:

- Title, research question and falsifier; 250 entity/relationship/record pins; 12,000-character analyst notes; up to 40 saved filtered views.
- JSON evidence packet and Markdown reading-brief exports. Exports recursively include explicitly linked records and responses, original sources, geography, dates, stages and limitations.
- Additive import; current notes and existing pins survive. Reject oversized/unsupported files without destroying the existing casebook. The current UI accepts JSON under 16 MiB.
- Unavailable saved IDs remain visible with their notes instead of being silently discarded.
- Saved-view URLs are portable in-app hash routes. No external or script URL is accepted as a saved view.

The interrupted redesign already retained `src/components/board/boardStore.ts`. Its `icip.investigation.board-layout.v1` stores positions and up to 500 typed **analyst** threads: `question`, `compare`, `counter-evidence`, `follow-up`. It validates identifiers, disallows self-links and duplicate typed directed links, and clamps coordinates. Reuse this work rather than replacing the Casebook schema. A board layout and a casebook evidence packet are different artifacts; ensure the new UI says what an export includes.

## Complete React route register

The behavior column records existing functionality and content that must remain reachable, not proposed new functionality. Shared Workspace controls above apply to wrapped routes as well.

### Start and saved work: 4 routes

| Route | Page/source | Retain |
|---|---|---|
| `/` | `Dashboard` | National investigation entry, sector starters, corporate-record overview and original dashboard dossier |
| `/investigate` | `Dashboard` alias | Same entry behavior and compatibility with older links |
| `/search` | `Search` | Literal search by company/ticker/ISIN, minister, group, state or graph-entity alias; typed results and profile links |
| `/watchlist` | `Watchlist` | Tracked companies, remove-from-tracking control, research prompts and local watch state |

### Investigation and research desks: 11 routes

| Route | Page/source | Retain |
|---|---|---|
| `/follow-the-money` | `FollowTheMoney` | Search/discovery collections; place/domain filters; casefiles; map and exact steps; source reader; responses, alternatives and next records; JSON export; case saving; local Casebook; share view |
| `/money-trails` | `MoneyTrails` | Reviewed trail picker; map/network and graph-scope controls; payer/payee and individual hops; transaction-path stopping points; hypotheses/counter-evidence; ownership roles; complete evidence export |
| `/research-radar` | `ResearchRadar` | Query, city, state, sector, recency and evidence-status filters; zoom/reset; case reader; graph; future-outcome tests; acquisition backlog; complete packet export; retained local-model work |
| `/model-lab` | `ModelLab` | Saved questions; retrieval/evaluation views; World Bank project search; map/network; graph depth and focus; exact-source reader; source limits; challenge/alternative explanations; saved findings |
| `/funding-investigations` | `FundingInvestigations` | Research sections; track/status/query filters; case selection; map/network; stages; competing explanations; actor decision reconstructions; source modal; packet export; existing sector links |
| `/hypothesis-lab` | `HypothesisLab` | Theme/assessment/query filters; map/network; optional unestablished-connection questions; evidence/counter-evidence; rival explanations; decision analysis; source reader and export |
| `/allegations` | `Allegations` | Query, domain/state/category/city filters; map/network; Delhi/Mumbai spending context; independent case/context indexes and pagination; inspection; reset and export |
| `/investigations` | `Investigations` | Investigation filters; network/source-ledger toggle; case and entity selection; dossier; graph pagination; share; exports and source ledger |
| `/leads` | `Leads` | Filtered unresolved leads; saved leads; hypotheses; alternative and disconfirming observations; records-to-obtain and investigation sequence |
| `/game-theory` | `GameTheory` | Institutional-role selection; assumptions; reset; qualitative strategic outcomes; lawful/abuse alternatives; case context; captured plan revisions; scenario JSON export |
| `/research-program` | `ResearchProgram` | Desk views; query/sector/status/relation/entity filters; ledger pagination; directional paths; exact connection inspector; methods/coverage views and research-plan context |

Nested page preservation: `/funding-investigations?fi_section=analysis` loads `FundingSearches`, including research-question selection, candidate paths, their stopping points, the identity-review queue and reproducibility material.

### Sector registers: 22 routes

| Route | Page/source | Retain |
|---|---|---|
| `/education` | `Education` | State/place/query search; source types; saved sources; copy/CSV; funding-stage paths and observations; research leads; school-count geographies; source/coverage methodology; progressive result loading |
| `/water` | `Water` | State/place/query and subject-lens filters; food-chain stages; publication-window/background/undated choices; saved sources; copy/CSV; observations, research leads and local discovery tools |
| `/public-works` | `PublicWorks` | Sector/state/place/query/type filters; procurement dataset and buyer aggregates; repeat-work comparison gates; case files/responses; accounting-stage amounts; graph/trail inspection; legal applicability; source ledger; saved sources and export |
| `/energy` | `Energy` | Entity/claim/source query; power-map filters; entity/edge focus; temporal tenure lanes; financing/ownership/stage distinctions; graph, ledger, sources, missing-records views and CSV controls |
| `/welfare` | `Welfare` | Scheme/alias/person query; category/tier/party/metric/government-level filters; year navigation; map/table; copy/reset; stage distinctions, narrative ladder, source panels and documented voids |
| `/finance` | `Finance` | Loans/capital/associations lenses; query; tier and lender/holder filters; map/flow/clock and tables; copy link; exact record/connection panels; case-file navigation |
| `/security` | `Security` | Security-buyer procurement view and supporting tender components; source limits and comparison basis |
| `/tenders` | `Tenders` | View/scope/query; national and sample registers; states/bands/types/timing; family concentration; security buyers; rates, quality and red flags; gaps/provenance |
| `/resources` | `Resources` | Coal/minerals/hydrocarbons/spectrum registers; map/blocks/winners/record views; state/query filters; regime split, competitive tension, dates, gaps and sources |
| `/pmcares` | `PmCares` | Disclosure comparisons; qualified/superseded claims; annual receipts/payments; announcement versus audit; contested positions; timeline; gaps and original sources |
| `/media` | `MediaView` | Ownership distribution/cross-media holdings; explicit denominators; outlet/source register; rejected rating sources and coverage gaps; no unsupported political-bias score |
| `/international-finance` | `InvestigationDossier`, `international-finance` | Domain records, geographic filtering, responses, alternatives, falsifiers, evidence limits and cited records |
| `/defence-trade` | `InvestigationDossier`, `defence-trade` | Same dossier controls, scoped to arms-contract evidence |
| `/health` | `InvestigationDossier`, `health` | Same dossier controls, scoped to health/hospitals |
| `/ngo` | `InvestigationDossier`, `ngo` | Same dossier controls, scoped to NGOs/foundations |
| `/disaster-relief` | `InvestigationDossier`, `disaster-relief` | Same dossier controls, scoped to relief records |
| `/transport` | `InvestigationDossier`, `transport` | Same dossier controls, scoped to transport/railways |
| `/public-funds` | `InvestigationDossier`, `public-funds` | Same dossier controls, scoped to public funds |
| `/policy` | `InvestigationDossier`, `policy` | Same dossier controls, scoped to laws/policy |
| `/public-records` | `InvestigationDossier`, `public-records` | Same dossier controls, scoped to documentary records |
| `/justice` | `InvestigationDossier`, `justice` | Same dossier controls, scoped to justice/oversight |
| `/debt` | `InvestigationDossier`, `debt-relief` | Same dossier controls, scoped to debt/recovery; route and internal domain identifier differ |

### Companies, institutions and connection tools: 13 routes

| Route | Page/source | Retain |
|---|---|---|
| `/map` | `MapExplorer` | Exchange/index/sector/metric/scale/marks filters; selected state; accessible state-ledger twin and unknown/empty coverage |
| `/states/:code` | `StateProfile` | State geometry, listed-company counts, market-cap/sector context, representatives/groups and company links; invalid-state handling |
| `/company/:id` | `CompanyProfile` | Company identity/profile data, relationships and sources; track/untrack; invalid-company handling |
| `/industries` | `IndustryView` | Sector selection; state distribution; listed-company tables/index membership; conglomerate presence |
| `/conglomerates` | `Conglomerates` | Group comparison and deep-dive links; footprint selection; facilities, sectors and source boundaries |
| `/conglomerates/:id` | `GroupDeepDive` | Entities/contracts/capital/flows tabs; ownership tree; registrations; contracts and foreign capital; footprint; CSR; base rates, gaps and refuted candidates; missing-deep-data state |
| `/cabinet` | `Cabinet` | State and minister-rank filters; portfolios, rank counts and sourced institutional context |
| `/political` | `PoliticalView` | Instrument filter; flow selection; sourced donation edges; traced-flow ledger; documented void and base-rate interpretation |
| `/network` | `NetworkView` | Layer choice; graph explorer; from/to path finder with baseline separation; degree tables excluding taxonomy hubs |
| `/geograph` | `GeoGraph` | Entity/state-flow modes; layer and predicate filters; query; state/entity focus, hops and date interval; table twin; copied view/reset |
| `/atlas` | `Atlas` | Money-trail graph/motifs; expandable motif explanations and integrity checks; original evidence hierarchy |
| `/interlocks` | `Interlocks` | Minimum-role filter; multi-group office holders; family-control context; explicit naive-match false-positive demonstration |
| `/allocation` | `Allocation` | Minimum-register filter and show-all/multiple-register winner choice; allocation graph and source-backed comparisons |

### Method, challenge and provenance: 10 routes

| Route | Page/source | Retain |
|---|---|---|
| `/patterns` | `Patterns` | Pattern-discipline reading; expandable ten-trap corrections; multiple-comparisons and publication checklist |
| `/evidence` | `EvidenceAudit` | Evidence-tier audit, grounding and integrity findings, source/claim tests and limitations |
| `/base-rates` | `BaseRates` | Comparison populations, denominators and interpretation discipline |
| `/motifs` | `Motifs` | Scope filter; expandable templates, null-model scores, innocent interpretations, kill conditions and symmetry check |
| `/prospector` | `Prospector` | Layer/query controls; run state; declared search family, funnel, null-model/control comparison and surviving candidates |
| `/desk` | `Desk` | Investigative work items, record-backed hypotheses and next investigative steps |
| `/capture` | `Capture` | Verdict filters, counts and explanatory capture-pathway records |
| `/competition` | `Competition` | Bidder-count comparisons across jurisdictions, stage/denominator distinctions and sourcing |
| `/provenance` | `Provenance` | Input digests, resolution merges, collision candidates, rejected records and supersession log |
| `/method` | `Method` | Four invariants, evidence-tier semantics, pipeline, bounded analytical roles, explicit refusals, live integrity check and as-of dates |

## Static global applications

Build contract: `scripts/build-global-workbench.mjs` runs the static UI build plus three standalone packagers, then copies the resulting files into `dist/global-workbench/`. Preserve subpath-relative assets and data URLs. Editing React CSS alone cannot redesign these pages.

### Global evidence

URL: `./global-workbench/` or `./global-workbench/index.html`. Sources: `global-evidence-workbench/ui/index.html`, `src/app.js`, `src/model.js`, `src/style.css`, `public/data/dataset.json`.

- Main filters: query, collection, country and city.
- Advanced: recorded/observed year, evidence grade, status, sector, include undated; reset and empty-state reset.
- Globe, flat map, network and table; globe rotation slider; entity network focus and relation-type context.
- Record register and source/detail inspector; source locators, access/review scope, claims and counter-evidence.
- Ledgers: research queue, coverage gaps, rejected joins, document changes, counterhypotheses.
- Connected links to India atlas, ProtestAtlas and reproducibility repository.

### Public assets and finance

URL: `./global-workbench/finance.html`. Sources: `finance.html`, `src/finance-app.js`, `src/finance-model.js`, `src/finance.css`, `public/data/finance.json`.

- Query, instrument, country and relationship-role filters.
- Advanced transaction/reported year, evidence grade, status, sector, include undated; reset.
- Same four display modes, rotation, network focus, full register and source inspector.
- Coverage summary, case/transaction context, financing/ownership distinctions and exact source scope.
- Ledgers: research queue, coverage gaps, rejected joins and counterhypotheses.
- Preserve a sale, lease, concession, loan and investment as distinct record kinds; a country reference does not establish a transaction site.

### Media and power

URL: `./global-workbench/media.html`. Sources: `media.html`, `src/media-app.js`, `src/media-model.js`, `src/media.css`, `public/data/media.json`.

- Query, country/jurisdiction, relationship type and sector filters.
- Advanced event year, relationship status, from/to dates and include undated; reset.
- Same four display modes, rotation and network focus; record and entity tables; profile list/count and source inspector.
- Ledgers: research gaps, country coverage and graph-reading guidance.
- Preserve ownership/funding/advertising/legal/other typed relationships and temporal uncertainty. Do not turn co-appearance, affiliation or funding into editorial control.

Current static-app code has no Casebook/localStorage or download/export handlers. Do not advertise new cross-app persistence or board interoperability unless it is actually implemented and tested.

## Preservation acceptance checklist

1. Compare the 60 route patterns above against the final router; keep every old path. Verify dynamic profiles with real valid IDs and an unknown ID.
2. Open each route both normally and with `iw_view=dossier` where applicable. Test one representative existing deep link from each parameter family.
3. Search the navigation for every route label, “allegations,” “global,” “public assets,” “media,” “casebook,” “loans,” “school,” “procurement,” and “sources.” Empty and no-match states must be honest.
4. Exercise Map → selected record → source/response → pin → Casebook/Board → original dossier → Back. Selection and filter context must survive.
5. Seed a version-1 Casebook before the redesign, then verify notes/pins/views after refresh, new-board interaction and import/export. Compare exported evidence/source counts and limitations.
6. Verify analyst threads never alter source graph data or make an unproved link eligible for a money path. Show missing endpoints and orphaned layout state safely.
7. Build and visit all three static apps under the actual deployment subpath. Exercise their unique filters, all four view modes, source inspection and ledgers.
8. Test keyboard navigation, Escape/close/focus restoration, non-drag board movement and browser zoom at supported desktop sizes. Readable tables and records must remain usable when visual rendering fails.
9. Keep existing data validation and page/browser suites. Relevant commands include `npm run test:investigation`, `npm run test:dossier:history`, `npm run test:pages`, `npm run test:global-workbench`, `npm run test:map`, and the domain-specific suites in `package.json`. This inventory does not assert those commands were run during the audit.

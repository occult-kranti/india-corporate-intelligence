# Relationship graph review

The graph is a source index with explicit identities and directed relationship types. It is not an influence ranking. Positions come from a deterministic D3 force layout, all nodes have equal size, and recorded evidence tiers retain the site's solid/dashed/dotted/dot-dash semantics.

## Round one: schema and interoperability

The graph-engineering agent read the repository's graph-schema, knowledge-graph-construction, evidence-tiering and pattern-discipline skills. The legacy graph contains useful discovery leads but broad group aliases can include several legally distinct subsidiaries. Importing those aliases as legal-entity matches would fuse parent, operating company and SPV. Its inherited tiers also do not constitute fresh verification.

Decision: a separate procurement register, exact source-backed identities and explicit canonical IDs only where verified. No fuzzy CPPP supplier-name joins, shared-state connections or ministry-to-contractor influence edges. A portfolio-holding edge records office, not involvement in an agency's award. Historical and unknown relationship dates stay visible.

Acceptance: every edge resolves to two established identities; sources and dates appear in an equivalent table and CSV; one/two-step traversal does not change the original direction; unavailable URL focus stays explicit; unresolved identities get no edges. Political contributions and ownership may be ordinary lawful relationships and carry no misconduct inference.

## Round two: implemented controls

- Independent root review found the source-tier union included `self-reported`, while graph tiers have four frozen meanings. The data engineer separated relationship tiers; source metadata retains corporate disclosure scope.
- Root review found parallel/reciprocal edges could overlap. Deterministic curves now separate each same-endpoint relationship; self-relations have loops. Response edges have greater width and an explicit response predicate; the relationship table preserves the full response text.
- Entity focus and traversal depth are parent-controlled URL state. The component also accepts URL-controlled network/table mode and selected relationship.
- Exact-citation CSV includes source IDs/URLs/publication dates, relationship dates, tier, direction, limitations and stable endpoint IDs. Spreadsheet formulas are neutralized.
- Six focused tests cover actual traversal logic, false joins, unresolved identities, unknown date windows and export fidelity. These tests execute the real TypeScript helper.

The locally authored `public-procurement-investigation` skill formalizes procurement stages, repeated-work false positives, rule applicability, scope-correct corporate finance and source-equivalent accessible graph controls. It is repository guidance, not an externally installed plugin.

## Visual and browser verification

The final assembled register has 75 resolved entities and 58 relationships. All 75 SVG nodes were counted in the all-sector view; no cap or silent truncation is used. An IRB two-step neighbourhood renders nine entities/eight relationships and the same eight table rows. The consolidated/standalone limitation appears in the table. Focus, depth and table mode survive reload; keyboard Enter changes the focused entity.

Visual review found that a fixed-size all-sector diagram crowded labels. Its final canvas expands to 1,992 × 1,386 SVG units and scrolls within a bounded region. Focused subgraphs remain compact. The SVG never scales below one CSS pixel per unit, preserving 12px text and a 56px node target on phones. At 390px the document remains 390px wide, the graph scrolls internally, and the focus select is 16px to avoid mobile zoom. Long labels are explicitly described as shortened; focus, accessible names and the table expose complete labels. All-sector overviews are for navigation, with focused subgraphs and the full table as the readable investigation views.

Browser checks recorded no page errors. Screenshots are retained in `docs/public-works/screenshots/network-desktop.png`, `network-all-sectors.png` and `network-mobile.png`. The six actual helper tests pass; the primary connection audit passes 42 archive, accounting-scope, office-snapshot and package-date controls. Root production acceptance remains a separate integration gate.

A final fresh-navigation geometry check confirms the selected entity is centered inside the mobile graph scroll region (node bounds 100–291px inside region 35–355px at 390px viewport; scrollLeft 299px). A locator-screenshot operation can itself reset internal scroll and produced a false-negative visibility observation; the retained mobile screenshot uses the page capture without that side effect.

# Money trails: experience review

## Round 1 — map, money, and the missing document

The opening view is a flat geographic workspace with a compact investigation selector and a money-path reader. Geography indexes documentary associations; it does not stand in for transaction geography. The same investigation switches to a relationship graph without losing the selected evidence.

The reading order is: what is alleged or established; who paid whom, at what financial stage; which document establishes that hop; where the public cash trail stops; and what evidence would change the conclusion. A recorded contract price, a payment allegation, a court's account of a prosecution claim, and a bank transaction remain different proof categories.

The cash-path view and the wider network are explicit separate scopes. Ownership, office, political donations, and oversight may be legitimate context and do not become downstream payments merely by appearing near a contractor. An unresolved identity or transaction join appears as a gap card with a named next document and document holder. It never generates an edge.

Every selected entity opens the shared evidence reader with its complete retained connections and source/response tabs. Every financial hop links to its underlying record and exact document locator. Investigation packets export the authored analysis, supporting documents, replies, and scoped graph closure.

The desktop map and path reader sit alongside one another. At narrow widths the map comes first, followed by a scrollable path index; touch targets remain at least 40 pixels. Browser URL state covers investigation, graph/map, path/context, selected evidence and hypothesis. Keyboard focus and browser history use the same state as pointer interactions.

No skills were used. This review is an implementation decision log, not research evidence.

## Round 2 — original-document and interaction review

The first real-data browser pass passed 63 checks against three corporate investigations. The second passed 72 checks after Mumbai arrived. Visual inspection found a meaningful map defect that workflow tests alone had missed: the strict financial graph excluded contextual identities referenced by a case record, so the shared map rejected that record and displayed a zero-record hub. The engine now provides a separate map projection retaining the original record identity, sources and geography while restricting displayed references to the selected financial participants. The full original record remains unchanged in the reader and export; the browser suite now checks that source-backed cases actually appear in the map hubs.

Other changes from review:

- Removed between-step connecting lines: editorial order does not establish a reconciled chain of the same money. Only the payer-to-payee arrow inside a sourced step implies direction.
- Kept the strongest response or limitation visible rather than hiding it behind a disclosure control.
- Made the contextual section include procedural findings as well as ownership and public roles; neither becomes cash movement.
- Reset the independently scrolling cash reader when the selected investigation changes.
- Exposed the full investigation dossier directly from the path heading.
- Reduced repeated graph headings and control spacing to bring the relationship nodes into view sooner.
- Filled available width when an investigation has one hypothesis or one context card.
- Made browser assertions wait for committed route state, not just HashRouter URL changes; the two can occur in separate frames.

The browser checks compare each downloaded packet with the complete data exporter, including original records, sources, responses and counter-evidence. Responsive checks inspect the actual app container as well as the document, so horizontal clipping cannot conceal overflow. The immutable production-build run is recorded separately by the release lead.

Final development acceptance: **96 checks passed** across five reviewed investigations on `http://127.0.0.1:5197`, with zero browser runtime exceptions. Receipt and inspected screenshots: `/tmp/money-trails-round2-full/acceptance.json`, `money-map-1440.png`, `money-map-320.png`, and `money-network-1440.png`. TypeScript passed. These development receipts are superseded by the immutable production acceptance below.


## Immutable production acceptance

The complete browser suite passed **96 checks** across all five investigations against the frozen production build at port 5198, with **zero runtime exceptions**. The served index was independently fetched and hashed before and after testing: `a76cade33269a6a735cbeec7482fc8c292a2dbfcf32965caa3678df45267dac9`. No app or data files changed during this run.

The final visual review inspected desktop map/network views, the 320-pixel map, and the 390-pixel cash reader. It confirmed corrected prose spacing and display-only ordinal removal, source-backed map counts, readable financial stages, visible responses, and separate contextual network scope. The portable receipt is [acceptance/browser-release.json](acceptance/browser-release.json); screenshots and local run output remain under `/tmp/money-trails-release`. This is acceptance of the immutable production artifact, not a claim that the public deployment has completed.

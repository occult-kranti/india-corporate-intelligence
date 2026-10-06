# Two-round investigation redesign panel

Date: 6 October 2026. Baseline: `11a78e2`. Advisor: root agent.
User decision: **geographic India map with a linked relationship graph**.
This ledger records decisions and independently observed findings; it does not
claim human expert participation or model consensus as evidence.

## Round one — define the system and challenge the assumptions

| Role / delegated agent | Finding | Decision adopted |
| --- | --- | --- |
| Design / `public_works_ui` | Separate article pages conceal relationships and repeatedly reset the reader's context. | Every route opens a shared map workspace. Five surfaces preserve geographic and evidence context; original sector tools remain in Dossier. |
| Spatial/graph / `graph_platform` | The legacy 36-polygon asset has outdated administrative geography: undivided Jammu and Kashmir, no separate Ladakh, separate pre-merger territories. | Source current 36-unit geometry with licence, original hash and reproducible transformation. Do not reassign ambiguous historical records to modern units. |
| Data / `procurement_data` | Existing fleets repeat local claim IDs, source quality varies, and headquarters is often the only available geography. | Namespace identities and claims; resolve repeated claim IDs with endpoints and fleet context; hold unsupported joins. Type the geographic basis and separate national/unknown records. |
| Finance / `roads_research` | Live PM CARES pages publish newer audited accounts than the retained corpus. Write-offs, insolvency plans and collected recoveries are different accounting stages. | Refresh original accounts, retain previous snapshots and correction ledger, reconcile amounts, and create a debt/recovery lens. |
| Justice / `state_security` | Legal status is often lost in graphs; final findings and closure procedures materially change how a connection can be interpreted. | Add sourced decisions and public judicial authorship roles, explicit procedural status/date, responses and case-level limitations. |
| Welfare / `social_utilities` | Audit observations have bounded samples and overlapping populations; recipient, constituency and project location are not interchangeable. | Add primary implementation records with denominators, period and geography limits; retain auditee replies and financial-stage distinctions. |
| Advisor / root | A large project needs a useful current investigation workflow and measurable expansion gates. | Build selection→source→path→casebook now; specify source refresh, identity, spatial storage, ingestion, model review and collaboration separately in ROADMAP.md. |

The release uses the repository's substantial existing React/TypeScript and
source corpus. No stack migration is needed to implement the user journey.
Open-source model retrieval remains advisory and reproducible; it does not
publish legal conclusions or infer relationships from textual similarity.

## Round two — review original evidence and the rendered candidate

| Reviewer | Actual observation | Implemented correction / acceptance condition |
| --- | --- | --- |
| Welfare → finance | Latest PM CARES scans cast to the rupee; comparative 2022–23 receipts/payments are netted by equal refunds, with closing balance unchanged. | Preserve the presentation change and amount components. Do not describe all receipts as donations or the equal netting as missing cash. |
| Finance → welfare | Paid/pending/estimated amounts overlap; verified housing cases differ from the larger similar-record population; nutrition exclusions are cumulative entries. | Keep those populations and stages separate. Constituency attribution is not a project geocode; a dash does not establish zero release or closure. |
| Data validation | Legacy claim IDs recur in multiple fleets; response links can collide if claim ID alone is used. | Stable claim IDs include the original endpoint/predicate tuple. Response lookup also includes the fleet domain. Source hash collisions fail validation. |
| Advisor → reading brief | Initial Markdown export omitted linked counter-evidence and accounting context that JSON retained. | Both exports include explicit response closure, amount stages, alternatives, falsifiers, geography and source ledger. Regression tests cover cyclic response links and unpinned final outcomes. |
| Advisor → rendered desktop | Search label wrapped within the submit button; initial record titles were generic relationship labels. | Prevent button shrinking, add endpoint context to record titles, and show a transparent chronological ordering rather than a risk ranking. |
| Graph → rendered desktop/mobile | A fixed initial zoom clipped overview nodes and over-spread small mobile neighbourhoods. | Fit to measured pane dimensions, compact small neighbourhoods, retain selected/path labels and preserve manual zoom. |
| Design → React/state review | Filters and state coverage recalculated on unrelated selection changes; old state routes lacked default map context. | Memoise using filter-only keys. Resolve unambiguous route states, allow explicit All India, and explain ambiguous historical geography. |
| Advisor audit → casebook import | A 249-pin casebook silently dropped one of two new imported pins at the cap. | Reject an over-capacity merge atomically with explicit counts; preserve the existing casebook. Duplicate views do not consume capacity twice. Verified in Chromium and unit tests. |
| Advisor audit → cross-sector filters | DDUGJY and school-work source records remained only in the public-works lens. | Apply reviewed sector tags consistently to documents, findings, rules and relationships; Energy exposes seven DDUGJY records and Education exposes the Azamgarh audit. |
| Dossier regression reviewer | Original filter resets discarded `iw_view`, leaving the dossier unexpectedly. | Shared query helper preserves workspace parameters when original filters are replaced; reset, graph and cross-lens links use it. |
| Responsive reviewer → 768px | Place and Topic controls compressed until the selected values were unreadable. | Give the scope controls their own row at tablet widths and test minimum usable widths. |
| Advisor audit → exports | Geographic citations and filtered-out linked responses were absent from the record CSV. | Include geographic source metadata and exact linked responses regardless of the current text filter; inspect those responses directly in the record panel. |
| Targeted navigation review | A state inferred from `/states/ka` disappeared on cross-lens navigation; a rapid search→Back could leave a stale draft. | Materialize unambiguous route state in navigation links, retain explicit All India, and reconcile dossier drafts on native history events. Stress-test repeated Back/Forward cycles. |
| Final source consistency review | The older Atlas M7 summary still claimed accounts were unpublished after FY2022-23, despite the refreshed primary statements. A news-sourced CAG relationship also lacked scope and response context. | Correct the motif to an analytic reconciliation question with a computed 9/109 Atlas census. Scope the relationship to reported West Bengal implementation findings, retain mixed PM CARES/CSR funding and hospital replies, and distinguish it from an audit of the trust. A 15-check production probe verifies both surfaces. |
| Dossier reviewer → actual mobile entry | Energy’s byline ended at y891 and its graph began at y1449, so the explicit dossier opened before its reading content and the touch test addressed an off-screen coordinate. | A one-time mobile dossier entry effect waits for the visible lazy heading, focuses and scrolls the existing container, and cancels if the reader interacts. Default map mode is unchanged. Original Energy AC61/AC64 passed unchanged on the final candidate. |

The browser and source reviewers report their exact commands and outcomes in
DESIGN.md, FINANCE_RESEARCH.md, JUSTICE_RESEARCH.md, WELFARE_RESEARCH.md and
VERIFICATION.md. Outstanding observations must be resolved or disclosed before
publication. A polished screenshot alone is not acceptance of the workflow.

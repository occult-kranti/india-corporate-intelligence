# Education evidence roadmap

The working product supports finding and checking evidence. Geographic navigation
is not a claim of a complete census of funding, NGOs, schools, or cities.

| Order | Deliverable | Why this order | Evidence required to finish |
| --- | --- | --- | --- |
| 1 — this branch | Education register, sourced government-school series, funding channels, investigations, responsive navigation, export and explicit gaps. | Gives readers a usable evidence desk immediately. | Source and schema checks, reconciled tables, browser behavior, existing regression gates. |
| 2 | School-level longitudinal register keyed by UDISE code; college register keyed by AISHE code. | Stable identifiers are needed before interpreting institution openings, mergers and closures. | Two or more comparable reporting years, merger/closure orders, management transitions and boundary crosswalks. |
| 3 | Local demand and access measures. | Total population cannot establish demand for school places. | Age-specific estimates with uncertainty, catchment boundaries, enrollment/attendance, travel distance, receiving-school capacity, rural/urban definition. |
| 4 | State and district funding ledgers with original accounting stages. | Program envelopes are not money received by a particular school. | Approved budgets, central/state releases, treasury expenditure, utilization certificates and audit observations; units and financial years preserved. |
| 5 | NGO/CSR/FCRA destination joins. | Registered address and national donor totals cannot locate beneficiaries. | CSR project district, implementing-agency identifiers, recipient audited accounts, FC-4 purpose/donor schedules, duplicate project checks. |
| 6 | Broader news monitoring and original-document retrieval. | News is useful for finding a question; orders and audits can settle it. | Deduplicated outlet/date/claim/response records, original documents, correction history and named review owner. |
| 7 | Human-reviewed model-assisted extraction at scale. | Ranking can reduce reading effort; generated assertions cannot verify themselves. | Held-out labelled evaluation, page-level quotations, deterministic financial/geographic checks, abstention threshold, revision and reviewer history. |

## Definition of a substantiated access concern

Compare the same boundary, period, education level and management definition.
Distinguish a closed institution from a merged identifier, upgraded school or
classification change. Examine school-age population and enrollment alongside
transport, receiving-school capacity and learning access. Preserve the policy
explanation and evidence that would refute the concern. An unexplained difference
is a question for investigation, not a finding of fraud.

## Expansion protocol

Add sources with publication and retrieval dates, document type, geographic scope,
page/table location, a bounded supported statement and a limitation. Retain raw
research separately from curated records. Add identifiers before joining entities;
never join only on a similar name. Every new measurement must pass its source,
units, period and denominator checks. Review coverage before using terms such as
“all”, “total”, “none” or “closed”.

## Existing platform performance follow-up

The production build reports an approximately 9.86 MB uncompressed / 2.32 MB gzip
shared entry chunk because the existing data provider imports the research graph.
Education itself is separately loaded (about 38 KB gzip in this build). Profile
initial transfer and graph construction before moving graph data behind route
boundaries or a worker. Preserve the current cross-route filters and watchlist;
unmounting the provider merely to reduce a bundle would lose active research state.

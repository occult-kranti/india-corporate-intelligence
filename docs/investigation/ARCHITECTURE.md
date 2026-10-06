# India investigation platform

Baseline: `11a78e22a9998796c3c90b31fc4b708e98196c9c`. Design decision date:
6 October 2026. The user selected a geographic India map with a linked
relationship graph and requested this layout across the website.

## Primary task

Follow a place, institution, person, funding decision or legal proceeding through
its documented relationships, examine the underlying records, test a question,
and retain a reproducible evidence packet. Geographic coverage and graph paths
are navigation tools. They are not measures of corruption or causal influence.

## Shared workspace

Every route enters the same investigation workspace. The route selects a domain
lens; `iw_*` parameters hold map, graph, date, evidence and selection context.
Legacy query parameters retain their original meaning in an explicit sector
dossier view. Saved watchlists, education/water reading lists and existing
register data retain their namespaces.

The geographic canvas leads. A linked relationship view, record/source inspector
and investigation casebook support the same filters. Layer controls distinguish
people, organisations, funding, procurement, legal process, welfare, services,
policy and review questions. The map exposes coverage counts, national context
and unknown geography separately. On narrow screens, the user switches between
Map, Connections, Evidence, Casebook and Dossier without discarding context.

Records preserve amount stage, observed period, source publication date, event
or relationship date, legal status and its as-of date. A financial estimate,
loan guarantee, award, payment, accounting write-off, debt waiver, IBC plan
realisation and collected recovery cannot be combined into one money total.
A judge's authorship or bench membership connects a person to a decision; it
carries no implication about influence or misconduct.

## Data and graph architecture

1. Retained original documents and retrieval receipts with file hashes.
2. Source-specific evidence records and auditable adapter transformations.
3. Stable namespaced entities, relationships, records and source identifiers.
4. Explicit identity reconciliation only when evidence establishes the same
   legal person or body. Unresolved identities and unsupported edges remain held.
5. Geographic associations with a declared basis: project/institution location,
   programme coverage, headquarters, constituency, legacy association, national
   context or unknown. Headquarters never silently becomes a work site.
6. Query selectors for domains, layers, dates, evidence tiers and geography.
7. Bounded graph neighbourhoods and source-backed path tracing. Truncation,
   searched population and disconnected endpoints remain visible.
8. Review questions linked to their comparison population, competing explanation
   and evidence that would close the question.
9. A local casebook retains pins, notes and saved views and exports provenance
   with selected records. Analyst notes remain distinct from published evidence.

The first implementation uses the existing React/TypeScript application and its
substantial evidence corpus. It does not pretend to operate an unbuilt national
crawler or a live, comprehensive criminal-case database. The long-term services
and data expansion are specified in ROADMAP.md with measurable entry gates.

## Geographic model

The new map uses current 36-unit boundaries with retained source/licence and
transformation metadata. Legacy Jammu and Kashmir or Dadra/Nagar Haveli and
Daman/Diu associations cannot be mechanically allocated to modern units.
Ambiguous historical associations stay explicit. Small territories remain
selectable by keyboard and a named state control; their polygons are not
replaced with fabricated shapes.

## Research programme

The finance panel refreshes PM CARES statements and audit disclosures and adds
primary records on bank write-offs, waivers, settlements and insolvency outcomes.
The justice panel adds dated decisions, institutional oversight and judicial
roles, retaining adverse outcomes, responses and findings that allegations were
not established. The welfare panel adds primary implementation audits, delivery
and recipient-accounting records and verified government replies.

A source must establish the specific relationship displayed. A news mention,
shared address, political donation, temporal proximity or short path does not
supply a missing contract, payment or causal link. Courts and government bodies
are sources with defined jurisdiction and documentary scope, not global truth
labels for every adjacent claim.

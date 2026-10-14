# Investigation workspace

## Routes and information architecture

- `/investigations`: provenance network, source-ledger equivalent, source-complete dossier.
- `/leads`: testable research questions with prediction, alternative, falsifier and records to obtain.
- `/game-theory`: linked simulation workspace, implemented separately.

Query parameters: `q`, `sector`, `status`, `entity`, `case`. The network also uses zero-based `page`; leads use `saved=1`. Defaults show the complete available case collection, with no named party selected. Case and filter URLs are shareable. Graph display choice is ephemeral presentation state.

## Visual and semantic design

The existing editorial dark-ink, muted gold and serif system remains. Public-subject labels occupy the first map column, case dossiers the second, cited source records the third. Nodes are native buttons and anchors over decorative SVG paths. A subject link means only “subject of this dossier”; a source link means only “cited by this dossier.” No direct actor-to-actor edge is generated, and subject strings are not presented as identity resolution. Node size does not encode risk, influence or guilt.

Five dossiers per map page keep the map legible; its footer reports the exact range out of filtered cases and the distinct subjects/sources visible on that page. The table includes all filtered cases. Source nodes and dossier citations open the original URL. Case nodes open the dossier without hiding its response. Graph lines are provenance links, not financial transfers or adjudicated claims. Case status uses explicit text and differentiated border styles/shapes.

Every dossier gives the finding and response/limitations equal-width adjacent panels (equal sequential panels on mobile). Every cited record includes publisher, publication date, accessed depth and what it supports. Source entries are never hidden behind “show more.” Missing citation records produce an explicit unavailable notice. Existing PM CARES, energy, welfare, atlas and network pages stay linked.

## Interaction and resilience

- Filters use URL search state and show a live filtered/full denominator. Changing scope clears the selected case and resets map pagination.
- Search includes titles, summary, findings, limitations, public subjects and hypothesis questions.
- Native graph controls work with Tab/Enter/Space; the scrolling map and table regions can be focused and scrolled with a keyboard.
- Export JSON includes full case objects and only their cited source objects. CSV includes limitations, hypotheses, source URLs and review date; potential spreadsheet formula prefixes are escaped.
- Clipboard failures expose a selectable share URL. No clipboard permission assumption.
- Saved leads use a versioned localStorage key with parse/write exceptions handled. Storage failure preserves session selections and reports the limit. Sharing does not transfer private saved selections.
- Zero-case and zero-filter states use explicit text, not blank charts. No statistics or findings are fabricated for an empty dataset.
- Graph/table overflow is contained; at 390px filters and evidence panels stack. Reduced-motion preferences are honored; no continuous layout animation or external dependencies.

## Content boundaries

The unresolved page calls hypotheses proposed investigations. Game theory is linked as a way to generate discriminating tests, never evidence that a specific person committed an act. A record status describes the specific dossier finding, not guilt. The case collection is explicitly selected, not a complete national census.

## Implementation ownership

`src/pages/Investigations.tsx`, `src/pages/Leads.tsx`, `src/components/investigations/*`, `src/investigations.css`. Cases are consumed from `src/data/investigations.ts`; routing and navigation integration are separate.

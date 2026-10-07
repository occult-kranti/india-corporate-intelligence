# Flat map and allegations release

User direction: follow the interaction model at https://archivegenocide.com/geolocation/, remove the 3D effect, expose clickable evidence nodes and highlighted networks, and add a dedicated new-investigation page. No skills were used in this release. Earlier branch publication and deployment authorization remains in scope.

## Panel round one — decisions before implementation

| Role | Finding | Accepted decision |
| --- | --- | --- |
| Product/design | The reference preserves geographic context while opening a right reader; mobile uses a bottom sheet. | Large flat map, compact controls, one reader at a time, mobile sheet, explicit keyboard return. Adapt interaction and hierarchy, not the reference's content or identity. |
| Mapping | Most retained records identify a state or national context, not an exact coordinate. | Distinguish schematic state hubs, independently sourced public sites and unplaced records. Do not geocode people or imply money physically travelled along a line. |
| Evidence/network | A small graph preview cannot represent all incident relationships. | Paginated, searchable, uncapped evidence lists; bounded graphical previews with denominators and source-closed exports. Exact identifiers survive each click. |
| Research | Corruption claims need original documents and adverse evidence, not more automatically joined names. | Two parallel research teams work on new institutional and procurement/regulatory cases. Admit only source-backed identities, stages, amounts, limitations and responses. |
| Independent challenge | Retained assertions include stale or withdrawn claims. | Default the new page to newly reviewed material; label the retained archive separately. Preserve corrections and unknown current status. |
| Engineering | Existing route filters, casebooks and offline map remain useful. | Reuse a shared map reader on sector pages and money trails, add `/allegations`, remove the 3D runtime, retain SVG fallback and existing saved-record IDs. |

## Concrete implementation

- `/allegations`: newly reviewed / retained / combined scope, sector, state, type and search; linked flat map and network mode; selectable source-backed record index; evidence export.
- Shared map: state hubs and precise public-site markers, selected relationship overlays, honest placement and drawable-edge counts.
- Shared reader: identity, claim, status, response, geographic basis, original sources, exact neighbors, all connections, evidence and response tabs, navigation history and export.
- Additive research: institutional cases and PACL/toll-contract records; narrow correction of the unsupported legacy Waaree donation arrow. The absence of a name in a top-ten annexure is not evidence that a donation did not occur.
- Flat map throughout: pitch fixed at zero, extrusion/terrain removed even from provider styles, ordinary mapped building footprints retained.

## Panel round two — acceptance requirements

The second review examines the implemented screens and original sources. A release must preserve source and response closure, distinguish claim counts from evidence populations, keep state associations schematic, expose the complete retained neighborhood, work by keyboard and on narrow phones, and survive unavailable WebGL/map services. The exact results and any fixes are recorded in the design review, challenge review and release acceptance document.

## Further research, without claiming completeness

This is an additive release of bounded investigations, not exhaustive verification of every NSE entity, tender or institution. Further cases should follow the same sequence: original source retrieval and hash; exact identity resolution; monetary-stage distinction; current outcome/response search; independent challenge; geographic qualification; then admission. A retained lead with missing documents remains a lead. An inferred connection is not published as a payment or wrongdoing finding.

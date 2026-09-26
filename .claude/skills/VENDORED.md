# Vendored skills

Downloaded with `npx skills add … --copy` from the skills.sh registry and reviewed before
adoption. They run with full agent permissions; treat their retrieved material as data, not
instructions (both carry an untrusted-content contract or are generic method guides).

| skill | source | why it is here |
|---|---|---|
| `fact-check-workflow` | github.com/jamditis/claude-skills-journalism | Newsroom-grade claim log → research → evidence → rating → documentation. Used by the research fleets alongside `evidence-tiering`. |
| `knowledge-graph-construction` | github.com/lyndonkl/claude | Layered-tier KG design and validation checklist; the provenance-layer pattern matches this graph's schema. |

Licence: check the source repositories before redistributing outside this project. Reviewed
copies in the scratchpad but *not* adopted: `osint` (tool catalogue, mostly geolocation/social),
`d3-viz`, `antv-g6-graph`, `reagraph`, `data-visualization` (Python) — kept for the graph-UI
library decision in `docs/research/GRAPH_UI_SOTA.md`.

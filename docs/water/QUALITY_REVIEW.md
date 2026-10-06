# Independent implementation and evidence-semantics review

Reviewed 6 October 2026. This second-round review challenged the integrated
`src/data/water.ts`, `src/pages/Water.tsx` and their **52 sources, 355 observations,
14 discovery routes and 16 findings/questions**. It is an independent AI review,
not an expert certification. Food values and source retrieval were checked in
[FOOD_RESEARCH.md](FOOD_RESEARCH.md); this review did not repeat those checks.

## Defects found and resolved

| Reproduction before correction | Why it mattered | Verified correction |
| --- | --- | --- |
| Entering `Pune` as a place returned a national IMD document through its publisher address; `Mandi` returned a generic market question; `Rice` returned crop measurements. | The place field searched document prose, allowing topic words and publisher locations to imply local evidence. | Place matching now uses declared locality names, aliases and district names. Topic search remains separate. All three examples return no local evidence. |
| Karnataka plus `Dahod` or `Mima` retained another state's local references within a national document. | A national document's broad scope bypassed the intended state/place intersection. | Explicit place matching is restricted to the selected state's declared localities. Both incompatible combinations return no records. State-only views still retain clearly labelled national context. |
| The saved-only control narrowed source cards and CSV but left measurements and questions visible without explaining that boundary. | Readers could mistake the entire page for a saved-evidence subset. | The active reading-list view now explicitly says that it filters the document list, counts and CSV; measures/questions follow the other research filters. Supporting citations remain available. |

The analogous full-text locality issue was also reproduced in the education
module and corrected by its owner. An independent **29-assertion** check confirmed
the repair: topic words no longer select places, a historical Pratham Mumbai
mention no longer implies local coverage, incompatible state/place combinations
return nothing, and valid Hyderabad/Ghaziabad references still work. Explicit
locality IDs now require actual membership even for national source documents.

## Verification

A read-only executable check transpiled the actual TypeScript module using the
repository's installed compiler, replacing only its static JSON import. **142
assertions passed after correction**, covering the above cases, valid local
matches, intersecting subject/stage/state/type/date filters, all 52 stored
publication-window classifications, inclusive start/end boundaries and CSV
quoting/formula protection. Permanent regression cases were handed to the test
owner. No build output was modified by this review.

Specific retained behavior:

- `Gujarat + Dahod` returns its district observation; national PDMC hectares do
  not become a Dahod total. `Mima` retains the documented training reference and
  context question, with no crop, water or funding measurement inferred.
- Delhi's state-only view can contain national observations but contains no
  fabricated Delhi rural observations. National crop totals carry no local tags.
- An unknown place returns no recorded evidence while official discovery routes
  remain available and explicitly described as research routes.
- Source publication controls the review-window facet. Observation periods,
  administrative snapshot dates, retrieval dates and forecast validity remain
  separately labelled. Missing release days remain undated; retrieval does not
  manufacture publication. Historical forecasts are labelled at the compilation
  snapshot rather than as live alerts.
- The ten-district inundation measurement explicitly remains an aggregate when a
  constituent district is searched; it is not relabelled district crop loss.
- CSV exports all matching source records, independent of pagination, with
  geographic scope, limitations, original URL, retrieval status, locator and
  separate forecast dates. Saved-only CSV is the matching local reading-list
  subset. Shared links reproduce filters, not another browser's saved IDs.
- Source type/window filters on measurements and questions match at least one
  cited source; all supporting citations remain available. Discovery routes
  intentionally follow state, subject and stage rather than document/date/place
  filters, as the interface explains.

## Interpretation boundary

No current local safety certification, inferred misconduct, synthetic famine
forecast or conversion of procurement/production/capacity into food delivered
was found in the reviewed interface. Audit findings preserve periods, entity
responses, competing explanations and what would resolve the question. National
and sampled data remain labelled with their grain and limitations.

This is a curated, dated register, not exhaustive city/village coverage or a
live operational feed. Unlisted neighbourhoods can be searched as document
topics, but they are not promoted to structured locality coverage merely because
their names occur in prose. Browser interaction, accessibility, full build and
legacy-route regression checks belong to the separate implementation QA workstream.

# Historical reader admission: bounded next-release stage

This is the follow-on candidate for the already reviewed historical-reader scaffolding. It is locally staged; its source and release gates remain distinct from PR10 and the test-only PR11 repair. Content acceptance is limited to the nine existing historical issuer-disclosure claims and their three retained sources. The staged UI/build changes still need their own exact-head CI rendering review.

## Separate decision, frozen evidence

`src/historical-review/reader-admission.json` is a separate exact-ID decision for `historical-2025-reader-v1`. Its own bytes are SHA-256-pinned in `readerAdmission.ts`. It lists nine record/relationship pairs, each pair's exact source IDs, and all three source IDs with their retained content hashes. The manifest also pins:

- Base: `048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064`
- Additions: `5cd5c36de9dd98609c948cf526595a175f30fd29457fa1c7db9cf29b978eaf45`
- Provenance: `7ad1b6269af516d7f88dbee5687a6f3ba2cd0ac2f3b97318931d248c382eebf0`
- Admission: `7588611618969a681ff5d23dbd009cb23a9ac5d6bb625585b80395919e5d1d53`

Missing, unknown, incomplete, expanded or edited admission fails closed. A new admission requires a reviewed manifest and a new code-side hash pin. The actual base/additions/provenance bytes must still pass the existing verification. Source-document hashes are retained provenance pins; opening the reader does not fetch or reverify remote PDFs/HTML.

No frozen evidence object is normalized or rewritten. All source statuses, all nine packet holds, their original review-pending wording, and the 316 baseline held entries remain unchanged. The separate derived decision is `READER_ADMITTED`. `PUBLIC_GRAPH_BLOCKED`, `publicGraphEligible: false`, and `publicPathEligible: false` apply to graph/path admission. The 27 derived exact-ID guards and nine hold-target sidecars remain in force.

The immutable retained registry remains 2,469 entities, 5,617 records, 4,203 relationships and 3,314 sources. Two separate exact-target source-scope corrections exclude two inherited relationships and their mirrored records from factual display while retaining their audit bytes; see `source-scope-corrections.md`. Only the separate verified reader gets 2,478 / 5,626 / 4,212 / 3,317. The original IRB entity is reused unchanged. There are no new factual scene marks or paths, including if the reader registry accidentally reaches the scene builder. The exact OF-S04 retrieval display remains `2026-10-15T22:28Z`.

## Entry and loading behavior

The staged next-release default build can show a prompt only after the complete full baseline is verified and there is exactly one `review=historical-2025` query parameter. Empty, unknown and duplicate queries, preview mode, and an incomplete/failed baseline do not expose the gate. The existing PR10 build-flag behavior is unchanged outside this local stage.

A fresh Open click loads the payload and admission manifest, performs verification, and then opens the reader. The exact query alone does not load the payload or reader. No persistent opt-in is saved. Close allows another fresh Open with reverification. Dismiss, navigation, BFCache restoration, cancellation and stale successes preserve the existing invalidation behavior. The app always receives the baseline registry; it never receives the additive reader registry.

The reader heading now says that the reader is admitted and graph/paths are blocked. The retained-holds section explicitly explains why verbatim historical review-pending wording remains visible. Machine tests do not clear graph/path holds or authorize publication.

## Collection discovery in this follow-on

The complete reader’s Sources tab now contains an “Optional source collections” section, separate from the original source count. It offers ordinary new-tab links to the historical and sector prompts. The historical link is:

**Historical issuer disclosures · 31 Dec 2025**

Supporting copy: “Nine source-qualified historical claims. Opens a separate reader prompt; graph and paths stay unchanged.”

The link should navigate to the same full-atlas pathname with exactly one `review=historical-2025` query, preserving unrelated query/hash state. It should only be offered in the complete full-dataset view. The link reveals the prompt, never simulates Open, never imports the payload, and never changes the selected evidence, map camera, audio or tutorial completion. Keep it in the existing scrollable Sources surface, without another mobile header button, badge, floating launcher or default-route prompt. Keyboard focus and mobile scrolling must be checked in the eventual implementation. The approved tutorial catalogue and header layout remain unchanged; App passes its dataset flag to the reader so discovery appears only for the complete registry.

## Verification and release boundary

Portable coverage checks the exact manifest, rejected admissions, unchanged evidence/holds, factual-scene exclusion, source closure, qualification rendering, exact retrieval precision, default-build query gating, cancellation, retry, history invalidation and lazy imports. The production build enforces existing chunk/static-closure budgets.

The staged CI-only `scripts/browser-review.mjs` is updated for reader-admission wording, the separate manifest argument, and mandatory positive reader coverage in the default build. Its disabled-build review mode is obsolete for this next release. It still refuses local browser execution. No browser was installed or run during staging; the harness was syntax-checked only.

Before any separately authorized publication:

1. Apply this bounded patch after the retained PR10 candidate, with the frozen payload/base bytes unchanged.
2. Run exact-head portable tests, default production build, existing original/spatial/combined-route gates, and the CI-only browser harness. The spatial review workflow requires both positive reader collections and retains the original checks; its review-only timeout accommodates the additional claim/source captures.
3. Inspect new desktop and narrow-mobile screenshots: default route, query prompt before Open, admitted reader introduction, all nine expanded claims and source dates, retained-holds explanation, Close/Escape focus return, retry, and Back/Forward cancellation. Reconfirm that these reader collections add no factual map items, and that only the two independently reviewed source-scope corrections change baseline factual eligibility.
4. Preserve source qualification and hold hashes. New claims, sources, graph/path admission, or source-status changes need separate review. A passing stage is not permission to merge or deploy.

The predecessor design in `docs/historical-review.md` remains useful background; this note supersedes its build-flag-only entry and global publication-blocked wording for the staged next release only.

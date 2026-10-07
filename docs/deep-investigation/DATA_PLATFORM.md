# Data platform acceptance — 7 October 2026

The final raw inputs contain **13 reviewed casefiles**, 87 research entities,
103 research relationships and 71 source records across procurement, corporate,
services and governance. They integrate into a registry of **2,096 entities,
3,801 relationships, 5,378 records, 3,146 sources and 315 held items**. Counts are
catalogue entries, not unique incidents, independent sources or payments.

The original NSE equity file contains **2,599 securities**. Exact ISIN matching
links **155** to the retained company register. **2,444** remain unmatched;
**101** symbol candidates are held (94 lack retained ISINs; seven conflict).
Only **three securities** currently have explicit reviewed-case identity
bridges: ADANIENT, ADANIGREEN and LT. This is not an all-company investigation.
The complete original CSV, receipt, source headers and SHA-256 are retained.

The registry supports a complete exact incident ledger, a full sourced component
and separate case/response/source closure. Contextual case edges are not counted
as direct incident edges. Analytic and response predicates never expand paths.
All amounts preserve stage, currency, unit and period; no pooled loss total or
risk score is generated. The withdrawn Aurobindo-to-MNRE award remains available
at its old saved record ID as a correction, with no drawable replacement edge.

The actual pinned Apache-2.0 MiniLM model ran locally over **252 source summaries
from ten inputs**, covering **230 distinct source URLs**. Seven questions return
35 unverified relevance suggestions. The final inference took
**22.572 seconds** on CPU. No model-generated
claim, identity bridge or allegation is promoted into the registry.

- Model: `sentence-transformers/all-MiniLM-L6-v2`
- Revision: `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`
- Final corpus SHA-256: `77836f3f6f02f9415f450f9d9d2f9f7029c66721238c194d8db4a1d1e47d2fae`
- Model artifact SHA-256: `3f2ffee8efd8f0d6f1dfa822ceb70d9365e615b4611b3bd66a1caedd3b6eb7dc`
- Assembled registry SHA-256: `5f82b36c353b1b40c4eb6399d910f9f8e8c394b63dd65f83322df8178e21f571`

The deterministic corpus census covers all **3,801 retained relationships** in
**122 predicates** and **525 sourced connected components**. Shared exchange,
sector and institutional nodes can create large components; connectivity is
not evidence of misconduct. The archive manifest verifies **257
artifacts / 69,712,742 bytes**. It includes
successful responses, labelled excerpts, receipts, explicit access failures and
research inputs, not 257 independently corroborating primary sources. Transient
Python caches and partial files are excluded.

Validation completed after the final HZL target-versus-cash-recipient correction:

- `npm run generate` — passed, including the solarwind consent-status correction.
- `npm run validate:deep-investigation` — passed; exact universe derivation,
  four slice admission gates, joined registry, case closure and archive hashes.
- `npm run test:deep-investigation` — 10 tests passed.
- `npm run test:deep-investigation:model` — corpus/revision/artifact verification
  and four model provenance tests passed.
- `node scripts/deep-investigation/discovery-audit.mjs --verify` — passed.
- `npx tsc -b --pretty false` — passed against the final data/model imports.
- `npm run validate:investigation` — passed.
- `npm run test:investigation` — 42 tests passed before the final corporate
  label/limitation precision edit; final deep tests revalidated that input.

Source owners confirmed all four raw slices and evidence subtrees frozen.
The final corporate raw SHA-256 is
`44b745dc04a21af98ca1d94d3d255f2f674fad655e4e80d7e07538c03ec08eba`.
Further input edits must rerun corpus derivation, actual inference, registry
inventory and archive inventory before release. UI/browser/build acceptance is
owned by the integration and design reviewers.

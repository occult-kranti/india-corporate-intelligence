# Round 4 additive candidate

Run `python assemble_round4.py` from integration to regenerate staging/dataset-round4.json. It reads the previously verified releases/v0-dataset.json as a hash-verified immutable baseline and adds the round4-changes and round4-cases artifacts. It does not replace the release or UI data.

Current candidate: 237 records, 150 typed relationships, 305 source entries, 11 document-change cases. Fifteen case claims and 24 graph entities cover Malta/Slovakia public records; 15 typed edges preserve acquittal, appeal, conviction, inquiry, historical shareholding, attributed receipts and protest response distinctions. Do not call every edge a criminal connection. Search-only evidence is quarantined automatically; AP S5 was upgraded to opened text during research and its commemoration edge is now eligible for editorial review, still blocked from causal-path inference.

Three document-change additions distinguish DOJ's filed representations about temporary withdrawal/reposting from additive FARA filing amendments and a reported status change. Originals and amendments remaining separately accessible are not deletion. priorRecordId links the updated DOJ evidence to E-D04 without rewriting history. All 11 change cases lack paired acquired byte snapshots, so before/after hashes remain null.

NAO Electrogas and OLAF PDFs were actually acquired by the case researcher. Their source entries contain originalBytesRetained, verified SHA-256, byte count and acquisition URL. Those single-version file hashes are distinct from before/after comparisons and from local research artifact hashes. Selected passage review is not exhaustive file verification.

Fifty integration tests pass, including preservation of every prior released record/source/edge/change, referential integrity, namespace collision checks, procedural status separation, source-family deduplication, no time/financial promotion, acquired-byte verification and no fabricated change hashes.

Promotion requires independent source/admissibility review and staged UI verification. No external publication is authorized or performed here.

Replay reads releases/v0-dataset.json and validates releases/v0-manifest.json. It never reads canonical output/dataset.json, so promoting a newer output cannot cause duplicate append. Keep both baseline files in the bundle.

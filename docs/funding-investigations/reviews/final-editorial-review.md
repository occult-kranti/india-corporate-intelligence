# Final editorial review: financial stages and named recipients

Reviewer: police/border research agent. Review performed 9 October 2026 UTC for the 8 October 2026 research cutoff. This closure checks three corrections raised during the final five-stream editorial review. No frozen stream was edited during this check.

Reviewed utilities JSON SHA-256: `ed04006ea496fc3b05e32a518d9c23766af6890df0f7a3ef1e2442f2b36d1f3d`.

| Edge | Original concern | Verified correction and disposition |
| --- | --- | --- |
| `fi:utilities:edge:mcl-hnpcl-bill` | An invoice was encoded as an approval amount. | **Closed.** Stage is `context`, amount is `null`, and the visible label preserves ₹250.53 crore billed in August 2023 as an invoice, not approval or receipt. Retained CAG text distinguishes that bill from ₹177.95 crore realised through July 2024 and includes management's response. The bill is no longer a stage-compatible numeric financial edge. |
| `fi:utilities:edge:kwa-suez-award` | The full agreement value pointed to one JV member without an immediately visible allocation boundary. | **Closed with a documentary limit.** Stage is `context`, amount is `null`, and the visible label retains the ₹1,141.28 crore agreement total while saying individual member allocation is unestablished. Limits preserve the 17 May 2025 permission naming the SUEZ Projects/SUEZ Eau France JV and the 7 October release order naming SUEZ Projects when describing the 22 May agreement. The signed agreement and member allocation were not obtained. No assumption resolves the shortened party wording or attributes the whole amount to one member. |
| `fi:utilities:edge:kwa-lisu` | The full consultancy JV permission appeared as an approval amount to Tractebel alone. | **Closed.** Stage is `context`, amount is `null`, and the visible label says ₹299,533,978.70 is the whole LISU JV permission, not Tractebel's individual share. Limits name all three partners and preserve the absence of member allocation or disbursement evidence. |

The source passages were reread in the retained indexed extracts: CAG compensation discussion in `fetch-1.txt`, the 17 May sanction paragraph 7 in `fetch-final-1.txt`, and the 7 October release order paragraphs 1–3 in `fetch-adb-0.txt`. Their registered SHA-256 values are respectively:

- `37c804045df6bf1007b5114f05131adab6ebe3208d009d4d589efb2c814de956`
- `eb63309d569d1af013688f4fdc12d98b348e5f9ebc175ffe2b6e00f1a371343d`
- `42caef51488fa9763ea83762c1de45f60300163bcb8a29450ae1588f3c1e149f`

These are extract receipts, not a claim that signed contracts, underlying bank receipts or the court order cited by CAG were inspected. Context edges may support document navigation but cannot establish an onward cash flow or a partner's share. None of these three editorial concerns remains blocking at the reviewed JSON hash.

The wider editorial pass also identified the Telangana `TG`/registry `TS` mismatch, missing explicit graph identity flags, and the distinction between prosecution-recited ownership and a judicial ownership finding. Those concerns were sent to the relevant owners and lead. Final bundle assembly, graph eligibility and browser interaction remain separate integration checks; this source-selective review does not certify exhaustive investigation or current real-world account balances.

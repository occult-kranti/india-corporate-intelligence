# Review of the ten executed investigative workups

The ten questions were frozen before new candidate output and executed **once after the independent final evaluation**, using the development-selected `codefuse-ai/F2LLM-v2-80M` rank-8 adapter at epoch 1 with reciprocal-rank fusion. The candidate was explicitly selected experimentally: it failed the independent promotion gate, so the retained default remains MiniLM.

Local CPU ranking took **73.671 seconds** for ten questions against **435 source-summary documents**. All 4,350 ranking positions are preserved. There are 46 distinct sources among the 50 top-five slots. Exact graph expansion returns 387 displayed relationship occurrences, representing **264 distinct existing relationships**, and 143 distinct cited source rows. These are retrieved/expanded objects already in the registry, **not 264 newly discovered links**.

The execution and full packets are in [`investigation-packets.json`](../../../research/research-radar/next-model/investigation-packets.json); complete rankings are in [`investigation-rankings.json`](../../../research/research-radar/next-model/investigation-rankings.json). The compact browser findings bind to both by SHA-256. Offline verification reproduced every packet from its saved ranking and checked the exact browser projection without re-running neural inference.

## What the outputs show

This is an AI-agent qualitative review of retained source identities and packet content, not new original-document verification or an independent accuracy benchmark. The questions overlap development illustration material and must not be used to claim held-out performance.

| Question | Observed retrieval and boundary |
| --- | --- |
| Delhi Jal Board | The recall order and older bail source appear, but the top five also include Mumbai catering and a separate hospital case. Exact graph closure supplies additional DJB material; shared litigation language does not link the cases. |
| BMC catering | One BMC response and the reported historical business-role source appear, alongside GVPR bond material and an Uttar Pradesh school-revision report. The top five do not directly establish the requested two-prime-contractor payment reconciliation. |
| Honnavar Port | The 2026 and 2025 port rating sources and GVPR's rating are retrieved. Other hits do not establish a specific upstream cash origin. Loan sanction and disclosed promoter support remain distinct from verified drawdown and onward cash tracing. |
| Meter SPV | The relevant Vijaya rating is fifth; other hits include unrelated scholarship and DJB material. Existing model-contract context is useful, but there is no learned proof of collections, lender disbursement or a cross-case scheme. |
| Bond identity | The two serial-level purchase/redemption mirrors and the ADR source rank first three. Other procurement sources are not identity evidence joining a similarly labelled purchaser to a contractor. Exact legal-identity resolution remains a stop. |
| C295 | The project and contract sources rank first two; MQ-9 and other procurement hits broaden the neighborhood. They do not allocate the prime contract price among firms or establish vendor cash payments. |
| BrahMos | Identity, signed contract and award sources appear. Additional procurement hits are context, not evidence of common beneficiaries. Ownership, award, delivery, final acceptance and receipt remain separate. |
| Bhushan | Acquisition closing/approval and the IBBI named-case material appear; an unrelated corporate price source also ranks. Claim haircut, acquisition finance and creditor settlement are not interchangeable amounts. |
| NDTV | All five retrieved sources concern NDTV/related transactions. This is a more focused candidate set, but issuer capital, seller consideration, exercised warrants and proposed equalisation still require separate source-led reading. |
| Radhikapur West | The appeal and judgment rank first two, followed by different court/procurement cases. Procedural similarity does not prove cash recovery, final termination or a related network. |

The mixed results are preserved rather than cleaned up to make the model look stronger. Existing graph closure can bring useful related evidence into a packet even when a source rank is weak. That is a deterministic retrieval aid, not evidence that the trained model reasoned correctly or discovered a causal connection.

## Using the packets responsibly

Each returned missing-record question is traceable to an existing authored step or disconfirmation test. A broad retrieved neighborhood may contain tasks from more than one case. The current deterministic priority places authored acquisition steps ahead of generic falsifiers; it **does not establish that the first displayed task is the most relevant question-specific lead**. Inspect the source IDs, case/entity identities, amount stage and stated holder before following it.

No displayed neighborhood was truncated by the 150-edge limit in these ten runs. Nevertheless, two-hop navigation is bounded, and source coverage is curated. Missing edges remain unknown, not proof that no real-world connection exists. No amounts are added, no beneficiary allocation is inferred, and no forecast probability is estimated.

The independent six-family evaluation is separate and remains authoritative for promotion. Its failure is not repaired by these illustrations. Further model work needs newly specified data and a fresh evaluation set; these outputs can inform future error analysis, not an undisclosed second attempt on the consumed final test.

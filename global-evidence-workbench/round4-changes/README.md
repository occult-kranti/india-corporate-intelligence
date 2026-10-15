# Document-change verification: three bounded cases

Reviewed 14 October 2026. This is an additive research packet; the existing release is unchanged.

## Findings

1. **Epstein release: directly read DOJ withdrawal account.** The February 2, 2026 letter filed as United States v. Maxwell, 1:20-cr-00330-PAE, docket 848, pp. 1–3, reports several thousand documents/media temporarily taken down for victim-privacy corrections. It describes reposting under the same Bates number and reindexing search metadata. This upgrades earlier record E-D04 from news-only attribution to a directly read primary filed letter, available through CourtListener RECAP. The letter does not supply a per-file manifest, prove its own explanation or show all records were restored. [Document 848](https://storage.courtlistener.com/recap/gov.uscourts.nysd.539612/gov.uscourts.nysd.539612.848.0.pdf)
2. **OFBJP-USA: disclosed correction of a contribution omission.** Amendment 6861-Amendment-20210405-3, p. 1, adds an August 26, 2020 USD 1,000 event contribution to Hindus of Georgia PAC to both the initial registration and Vasudev Patel short form. Their original contribution tables are still separately readable. This is an additive amendment, not a silently replaced PDF. The records do not establish foreign funding, illegality or why the contribution was initially omitted. [Amendment](https://efile.fara.gov/docs/6861-Amendment-20210405-3.pdf)
3. **OFBJP-USA: disclosed status update.** Amendment 6861-Amendment-20200902-1, p. 1, reports Anugula's resignation effective August 31, 2020; his August 27 short form had listed him as president. Both remain separate records. This is a dated change of status, not proof the original filing was false. [Amendment](https://efile.fara.gov/docs/6861-Amendment-20200902-1.pdf)

## Scope and comparison population

Targeted, nonrepresentative sample: deepen one existing Epstein batch lead and inspect the three amendment rows in the official FARA index for registrant 6861. Two amendment texts were readable; the other returned cache miss. No prevalence, partisan comparison or concealment rate is estimated. A Cornerstone India services-renewal amendment and unrelated Kurdistan amendment appeared during discovery but were excluded from this three-case packet; they add less to the requested literal comparison.

The December 2025 EFTA00000468 restoration lead was checked in reporting, which links a DOJ social post. The original post could not be retrieved by the web tool; the existing news-attributed status is not upgraded. No photograph or victim-identifying record was retrieved or retained. Prior speculative deletion/redaction leads CHG-002 and CHG-003 are unchanged.

## Hypotheses and discriminating evidence

- Ordinary disclosure maintenance: explicit amendment notices, prior versions retained, consistent identifiers and dated processing logs. These FARA examples match notice-and-retain behavior.
- Privacy correction: item-level review tickets, privacy rationale, permitted redacted before/after versions and restoration timestamps should correspond. The DOJ letter supports a stated process, not item-level compliance.
- Improper concealment: authenticated directives, selective treatment of otherwise comparable records, knowingly false stated reasons or adjudicated findings would be needed. A changed URL/hash or omission alone cannot establish intent.
- Measurement failure: CDN restrictions, extraction cache miss, indexing changes or access gates can mimic disappearance. HTTP failure is an access observation until corroborated by historical/version evidence.

## Acquisition and privacy

Only selected public-document text was read. No original PDF bytes were retained, and no byte hashes or visual-diff claims are made. The curated source ledger omits home/contact details, signatures, birth/citizenship data and unnecessary contribution histories. Original-form screenshot requests returned cache miss; table comparisons are explicitly text-extraction-based. Primary-document provenance is distinguished from claims inside the document. A FARA filing is a registrant statement, not DOJ endorsement.

The prior denied NYDFS consent-order and SDNY January 21 Maxwell byte downloads were not retried. No login, access-control bypass, mirror recovery of removed private material, external contact or publication occurred.

## Next discriminating acquisition jobs

1. DOJ: public, privacy-safe EFTA change manifest covering January 30–February 3, 2026, with Bates ID, removed/restored time, reason class and approved-version hash. Success: one permitted item-level pair reconciled to a processing entry. Do not request or recover removed victim details.
2. FARA: any publicly available deficiency letter or registrant explanation specifically associated with amendment 6861-Amendment-20210405-3. Success: a dated explanation for the omission, rather than an inference from the elapsed time. No contact authorized or made.
3. FARA: ordinary authorized retrieval of the second September 2 amendment only if the cache failure clears. Its text is currently unknown and cannot be inferred from the index.

## Validation

Run `python validate.py` in this directory. Checks assert source coverage, literal cross-references, null byte hashes, additive amendment classifications and preserved uncertainty. This is an internal consistency check, not independent factual verification. `artifact-sha256.txt` hashes curated deliverables only, not the source PDFs.

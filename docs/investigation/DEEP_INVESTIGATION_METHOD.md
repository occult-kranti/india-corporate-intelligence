# Follow the money: scope, identity and discovery

This page combines source-led case research with access to the full retained
investigation registry. It does not claim every NSE company, tender, school,
hospital, NGO or startup has been investigated. Reviewed cases are a purposive
sample selected for a traceable public-money or financial chain and adequate
records to challenge the apparent story.

## Populations remain separate

The original NSE `EQUITY_L.csv` was downloaded directly on 7 October 2026 with
HTTP 200. The retained file contains 2,599 securities and 2,599 distinct ISINs:
2,333 EQ, 237 BE and 29 BZ. Its SHA-256 is
`c470fce28a45d441114b7f6b7614c9e187aff75268c5df8ce0a9c83a1327ee8e`.
The response did not supply a publisher-certified data-as-of date. This file is
not a census of all Indian legal companies, all exchange instruments, the SME
market, or historical/delisted issuers. The original bytes, response headers,
retrieval time, access basis and content hash are retained under
`research/raw/deep-investigation/universe/`.

The existing company register contains 259 company records, 161 with an ISIN.
Exactly 155 securities match one retained company ISIN. The remaining 2,444
security identities are available for future review and are not silently added
to the graph. The derivation holds 101 matching-symbol candidates whose ISIN is
missing or conflicts. Corporate actions may explain conflicts; they require a
dated issuer/exchange record. Names and symbols alone never resolve them.
An exact ISIN link establishes continuity with the existing registry identity,
not a new verification of its claims. A separate reviewed-case membership count
uses explicit, source-reviewed identity bridges. Listing coverage, retained
identity coverage and case coverage therefore have different denominators.

## Admission and investigation contract

Each reviewed case has an exact set of legal entities and retained directed
relationships, the original sources and page/section locators, the asserted
financial/procedural stage and its as-of date. Every money observation preserves
value, currency, unit, stage and period. Approved financing, loan disbursement,
enterprise value, debt assumed, equity proceeds, concession rights, annuity,
insurance claim and cash recovery are distinct measures. Ownership percentages
are relationships, not currency transfers. The page never adds these measures
into a public-loss or corruption total.

Research is stored in independent `deep-procurement`, `deep-corporate`,
`deep-services` and `deep-governance` namespaces. A bridge to an inherited
identity requires an explicit reviewed canonical identifier and a retained
documentary basis. It means same-identity navigation, not a new contract,
payment or causal arrow. Parent companies, project SPVs, subsidiaries, trusts,
lenders and government departments remain separate entities. Shared names,
addresses, state, industry, political donors, directors or model similarity do
not supply missing identity or transfer evidence.

Every case states the strongest supported interpretation, respondent reply or
explicit response gap, competing explanation and evidence that would falsify
the interpretation. A legal complaint establishes that a party alleged a fact;
it does not establish that fact. Bail, arrest, investigation, discharge,
acquittal, settlement and a procedural dismissal retain their precise meaning.
A later outcome does not erase the original dated record. A counter-evidence
record remains inspectable even when an unresolved edge is held.

Geography keeps project/programme/institution coverage separate from registered
headquarters and other association. National programmes do not become projects
in every state, and a corporate headquarters does not locate the purchased
asset. Unknown geography remains unknown; no coordinate is fabricated.

## Reusable discovery procedure

1. Declare the population and snapshot before searching: security file, legal
   company register, notice table, award table, audit sample or selected cases.
2. Search retained primary records, the existing evidence catalogue and news
   follow-ups. Save original response bytes or explicit access failures with
   retrieval time, URL, locator, rights/access basis and hash.
3. Extract legal identities and exact contract/project/ISIN/CIN identifiers.
   Count duplicate keys before joining. Hold unresolved or conflicting matches.
4. Follow directed source-supported links from public body to recipient, SPV,
   parent, lender or service provider. Preserve the exact stage of each amount;
   never substitute group membership for the recipient of a payment.
5. Search for a respondent statement, court disposition, government reply,
   corrected account and ordinary commercial explanation. State missing links
   and the documentary evidence needed to close or disprove them.
6. Have a separate reviewer compare the claim, original record and rendered
   map/edge/source presentation; retain the correction ledger.
7. Validate joins, amount stages, date semantics, archive integrity, source and
   response closure, then render the whole evidence packet for review.

`scripts/deep-investigation/discovery-audit.mjs` runs a deterministic census of
the complete assembled registry. Its artifact counts relationships by predicate,
amount-bearing observations by their separate dimensions and sourced connected
components. It produces no generated claim, risk score or financial total.
The full retained ledger can be searched from the page. Complete incident-edge
and connected-component APIs have no top-N cutoff; visual layouts may be
bounded only if they declare their total and expose the equivalent full ledger.
Analytic, response, contra, denial, comparison and supersession links remain
inspectable but do not expand discovery paths. Shared exchange/sector nodes can
make very large components; component membership has no implication of guilt.

## Open model execution

The discovery workflow executes the pinned Apache-2.0 model
`sentence-transformers/all-MiniLM-L6-v2`, revision
`1110a243fdf4706b3f48f1d95db1a4f5529b4d41`, locally through its hash-verified
ONNX uint8 CPU model and tokenizer. The corpus consists of researcher-authored
source summaries and limitations from ten research slices. It does not contain
every legacy source document or a researched report for every NSE company.
Seven explicit questions rank summaries for follow-up. The corpus, input-file
hashes, actual run metadata, model licence/revision/asset hashes and top-five
results per question are retained in `research/deep-investigation/`.

Similarity is an unverified discovery ranking. It is not factual confidence,
proof of identity, a probability of corruption, a legal finding or a newly
established connection. No model result is promoted automatically into the graph.
Changing the corpus requires fresh inference; verification rejects stale hashes,
invented citations, an unexpected model revision and automatic verification.

## Reproduction

`scripts/deep-investigation/fetch-universe.py --output <new-snapshot-directory>`
retains a fresh official response and refuses to overwrite a historical snapshot.
Review the new file's grain, identifiers, corporate actions and population before
promoting it to the active universe.

```sh
python3 scripts/deep-investigation/universe.py --verify
node scripts/deep-investigation/manifest.mjs
npm run validate:deep-investigation
npm run test:deep-investigation
node scripts/deep-investigation/discovery-audit.mjs --verify
npm run test:deep-investigation:model
```

Run inference only after the source summaries are final:

```sh
node scripts/deep-investigation/model-corpus.mjs
/tmp/india-education-model-env/bin/python scripts/deep-investigation/model-rank.py --offline
```

The retained source archives and full model corpus are audit artifacts, outside
the main frontend bundle. Only reviewed compact evidence, universe metadata and
the small actual model result are imported for display. Original PDFs or an
access-failure hash prove the bytes retained, not that their content is true or
that a failed original-source retrieval succeeded.

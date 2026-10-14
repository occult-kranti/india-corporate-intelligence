# Political funding: two issuers, shared trust, dated energy relationships

Reviewed 14 October 2026. This is a purposive documentary sample, not a national donor census, an exhaustive corruption search or an estimate of intent.

## New result

Two downloaded issuer annual reports identify **₹75 crore of FY2024–25 contributions to Prudent Electoral Trust**: Torrent Power ₹65 crore and Arvind ₹10 crore. Exact equity ISINs in those reports match one row each in the preserved official NSE universe (2 selected issuers; 2 unique matches; 0 ambiguous/unmatched). The universe contains 2,599 securities, but only these two companies were selected for this test. The ₹75 crore subtotal is not the trust's total income or a party allocation.

The same companies have a disclosed commercial connection through captive renewable-power agreements. The version chain matters:

| Record | Documentary state |
|---|---|
| Arvind, 12 May 2025 | Proposed 15.96% subscription in Torrent Urja 28; company ceiling ₹21 crore. |
| Arvind, 25 August 2026 | Original agreement terminated; issuer says no equity infusion into Urja 28. Replacement proposals: Urja 12, 13.30%, up to ₹3.47 crore; Urja 21, 26.60%, up to ₹17.33 crore. |
| Torrent, 31 March 2025 ownership snapshot | Torrent Green Energy is a 100% subsidiary; Urja 12/21/28 are listed as its 100% subsidiaries. This snapshot predates the replacement investment proposals. |
| Secondary index, 17 September 2026 | Reports Urja 21 completion and links a BSE filing; original BSE retrieval returned 403. Completion is an acquisition lead, not a proved payment edge. |

The issuer describes ordinary captive-power economics and reports that the replacement transactions are not related-party transactions. Its NSE XML also marks the Urja 21 transaction arm's length. These are attributed issuer representations, not external compliance findings. A shared electoral-trust recipient plus a commercial agreement does not establish coordinated political payments.

An independent institutional record supplies a useful adverse observation: GERC's 25 March 2026 Surat order approved an FY2026–27 revenue requirement ₹95.30 crore below Torrent's request (₹3,189.94 crore requested; ₹3,094.64 crore allowed). This is a regulated revenue allowance, not a government payment or profit. Return-on-equity alone is not the total return: the table also allows return on capital employed. One selected order is not a causal comparison.

## Identity, amount and source rules applied

- Used standalone donation notes once. Consolidated repetitions are not extra contributions.
- Preserved Torrent's FY2024–25 party dashes as null/not reported, not numeric zeros. Its FY2023–24 named-recipient amounts sum to ₹50 crore: BJP 25, NCP 1.5, INC 12 and Prudent 11.5. The note does not identify the NCP faction or the payment mechanism.
- Matched legal issuers through equity ISIN, not symbols or name similarity. Arvind's August 2026 NSE XML independently supplies the same issuer ISIN. Subsidiary links are explicit named relationships in filings, not algorithmic identity joins to MCA records.
- No existing national-graph entity ID is attached without a separately resolved registry bridge. Arvind is unmatched in the existing national graph even though its NSE identity resolves.
- The August PDF and XBRL describe the same issuer event and share one source family. Multiple copies are not independent corroboration. GERC is independent in origin from the donation disclosure but does not corroborate the donation.
- Agreements, terminated commitments, ownership snapshots, expenses and regulatory revenue approvals remain different stages. They are never summed into one money-flow total.

## Acquisition receipts and inspection

Official annual PDFs exceeded the web reader's size limit or returned a fetch error; ordinary direct downloads succeeded. Both PDFs were parsed with `pdftotext -layout`. The standalone donation pages were rendered and visually inspected. The parent independently inspected both page images and agreed on amounts, years and standalone scope. That verifies transcription, not the underlying transaction. The GERC PDF and the August NSE PDF/XML were also downloaded and inspected. Full document availability is not a claim that every paragraph was manually reviewed.

| Input | Bytes | SHA-256 |
|---|---:|---|
| Torrent FY2025 PDF | 20,516,278 | `7ee9a8c3478035ca62fd1dd2cbeae969e181248db7f102ca56ff73e8decd930b` |
| Arvind FY2025 PDF | 13,675,519 | `2936f75ad629b5c587db051fbfdba963805735c8cb7b949d3ebfaf27b6f80cc8` |
| Arvind May2025 PDF | 824,033 | `ddc1f996d420b484d8687cc1ab6f55ade6368695494903c39d5d40a4612245b0` |
| Arvind August2026 PDF | 836,969 | `082f5facbed3a129b7167e3a5c48808515694e5d34c07e1c0d33d63f1b540995` |
| Arvind Urja21 August2026 XML | 10,540 | `772f8a680ebd3cd237084b75deb6359e6b69a5002c6e4f51ab7ff62f31528a28` |
| GERC March2026 PDF | 2,301,579 | `ec64fe248a5d4201483c1aa5b553157a607dbab4f2c756bdfcb7cb6f8527277d` |
| NSE CSV, preserved 7 October snapshot | See original receipt | `c470fce28a45d441114b7f6b7614c9e187aff75268c5df8ce0a9c83a1327ee8e` |

URLs, page locators, source limitations and selected extracted cells are embedded in `research/investigation-program/political-funding.json`. Acquisition scratch files are in `/tmp/pf-research` for the current independent review; they are not public app assets. The JSON embeds the original selected numerical observations and join receipts, so their survival does not depend on that temporary directory.

## Reproduction

Run from the repository root after downloading the two official annual reports from the URLs in the JSON to `torrent25.pdf` and `arvind25.pdf` and applying `pdftotext -layout`. Confirm their hashes first. The public JSON also preserves the selected source cells, including dashes, if the remote version changes.

```python
import csv, hashlib, json
from decimal import Decimal
from pathlib import Path

r = json.loads(Path('research/investigation-program/political-funding.json').read_text())
p = Path('research/raw/deep-investigation/universe/EQUITY_L.csv')
assert hashlib.sha256(p.read_bytes()).hexdigest() == r['reproduction']['inputUniverseSha256']
rows = list(csv.DictReader(p.open()))
assert len(rows) == 2599
for claim in r['reproduction']['exactMatches']:
    matches = [x for x in rows if x[' ISIN NUMBER'].strip() == claim['isin']]
    assert len(matches) == 1
    assert matches[0]['NAME OF COMPANY'] == claim['nseLegalName']
    assert matches[0]['SYMBOL'] == claim['nseSymbol']
assert sum(map(Decimal, ['25', '1.5', '12', '11.5'])) == Decimal('50')
assert Decimal('65') + Decimal('10') == Decimal('75')
assert Decimal('3189.94') - Decimal('3094.64') == Decimal('95.30')
```

## Negative results and remaining coverage

The ECI FY2024–25 Prudent file was located at `https://www.eci.gov.in/eci-backend/public/pdf/report/December/1766120456.pdf`, but both web and ordinary direct retrieval returned 406. A search excerpt of one corporate certificate is **not** the complete donor or party ledger. No allocation from either selected company through the trust to any party was computed. The old FY2023–24 Prudent file exceeded the web size limit and direct retrieval also failed. The YSR contribution report returned 406. No complete new ECI/SBI bond population was acquired in this pass; the repository's earlier selected bond joins were read and not relabelled as fresh work.

Existing PM CARES accounts, refund and BEL cases, foreign-disclosure cases, the prior amended RSS lobbying audit, political-finance hypotheses, funding stream files and official-universe documentation were reviewed to avoid repetition. This pass adds no new PM CARES transaction-level finding and no new ultimate-payer or authorization finding for foreign disclosures. Those coverage gaps remain explicit.

Next steps are a complete trust-ledger reconciliation, original Urja 21 completion/allotment evidence, and a predeclared comparison population of regulatory outcomes. None requires assuming unlawful conduct. Records showing ordinary contract economics, no earmarking, cancellations, corrected identities or less favorable regulatory treatment must remain in the analysis.

### Web references for parent review

- Torrent donation note indexed primary excerpt: `turn108search25`; fully acquired original PDF and visual page are stronger evidence.
- Arvind May agreement primary: `turn119view0`.
- GERC full primary: `turn100view1` / `turn115search2`.
- August NSE PDF web reader failed, but ordinary direct download succeeded; original URL and hash above are decisive.
- NSE XBRL content-type unsupported by web reader (`turn125view0`), ordinary direct XML download succeeded.
- ECI blocked Prudent file: `turn109view0`; discovery excerpt `turn108search24` only.
- Completion discovery index: `turn124view1`; primary link failed `turn125view2`.

No current judicial finding of bribery or unlawful coordination is claimed for the selected companies. Donation amounts are documentary facts; intent and causation remain separate questions.

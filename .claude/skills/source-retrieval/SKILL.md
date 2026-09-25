---
name: source-retrieval
description: Get at primary sources when corporate and government portals block automated fetching. Use when WebFetch returns 403, renders an empty JS page, hits a size cap, or reports a PDF as unextractable — before downgrading a claim's evidence tier or recording it as a gap.
---

# Source Retrieval

A claim's tier depends on whether a **primary** record was actually read. Most of the
difference between `documented` and `reported` in this project is not analytical
skill — it is whether the filing could be opened at all.

So exhaust these before you downgrade a tier or write a gap. Two independent
research passes lost hours re-discovering the first technique below, and one of them
had already written the fact off as unsourceable.

## 1. WebFetch says it cannot extract a PDF — it is lying about the file

WebFetch **saves the binary to disk and prints the path in its result**, even when it
reports the content as FlateDecode-compressed, encrypted, or otherwise unextractable.
That message is about *its own* text extraction, not about the file.

```bash
# Take the path WebFetch printed, then read it properly:
python3 -c "
import sys
from pypdf import PdfReader
r = PdfReader(sys.argv[1])
print(f'{len(r.pages)} pages')
for p in r.pages: print(p.extract_text())
" /path/that/webfetch/printed.pdf
```

This recovered a 20-page CARE Ratings rationale including a 256-row consolidation
annexure that WebFetch had declared unreadable. **Treating "cannot extract" as a dead
end discards usable primary sources.**

## 2. The file exceeds WebFetch's 10 MB cap — use curl

Integrated annual reports routinely run 15-60 MB. WebFetch refuses them; curl does not.

```bash
curl -sSL -o /tmp/ar.pdf 'https://…/annual-report.pdf'
python3 -c "from pypdf import PdfReader; print('\n'.join(p.extract_text() for p in PdfReader('/tmp/ar.pdf').pages))" | head -400
```

An FY24-25 integrated annual report retrieved this way became the backbone of an
entire subsidiary map — with CINs, former names and exact ownership percentages from
the auditor's CARO annexure and the related-party note.

## 2b. The exchange archives serve annual reports directly — start here

`nsearchives.nseindia.com/corporate/…` hosts listed companies' annual report PDFs as
static files. They download cleanly with `curl` even when the company's own site
403s and when WebFetch times out on them.

A 404-page FY2026 integrated annual report retrieved this way settled, from one
document: the full cement holding chain through Mauritius, three completed
amalgamations with exact appointed and effective dates, two pending ones with their
share-swap ratios, and the promoter structure. **An annual report is the single most
productive artefact in this domain** — it carries the related-party note, the
subsidiary list with ownership percentages, and the auditor's CARO annexure with
CINs and former names.

Look for the AR before spending rounds on registry mirrors.

## 3. The corporate domain 403s — try the *business unit's* domain

"All Adani domains are blocked" turned out to be false. `adani.com`,
`adanienterprises.com`, `adaniports.com` and `connect.adani.com` all 403 — but
`adaniairports.com` served its full annual report PDF without complaint.

Check the operating subsidiary's own site, its investor-relations subdomain, and its
media-asset paths (`/-/media/…`) before concluding a group is unreachable.

## 4. The exchange page renders empty — it is JavaScript

BSE and NSE shareholding-pattern pages fetch successfully and return an empty body,
because the table is client-rendered. Alternatives, in order of preference:

1. The **PDF** behind the page — exchange filing archives serve static PDFs.
2. The company's own investor-relations page, which often posts the same PDF.
3. A **credit-rating agency rationale** (CARE, CRISIL, ICRA, India Ratings). These are
   static PDFs, they cite the filings, and they frequently carry a full
   entities-consolidated annexure. They are the single most productive substitute.
4. A broker mirror of the filing — **lowest preference**, and it caps the claim at
   `reported`, because you have read a mirror and not the record.

## 4b. Foreign entities — two open registries that are not blocked

Indian mirrors cover nothing offshore, and offshore registries mostly refuse
automated fetching. These two do not, and between them they resolve most of it.

**GLEIF (Legal Entity Identifier), unauthenticated:**

```
https://api.gleif.org/api/v1/lei-records?filter[fulltext]=<term>&page[size]=100
https://api.gleif.org/api/v1/lei-records/<LEI>
https://api.gleif.org/api/v1/lei-records/<LEI>/direct-parent
```

Returns legal name, jurisdiction, legal form, **the local registry entity ID**
(Singapore UEN, Indian CIN, JAFZA number) and parent relationships. The
`direct-parent` endpoint is the useful one — it contradicted a widely-repeated claim
about which entity a Singapore subsidiary sits under, and the API is the better
authority.

**Australian Business Register — fully fetchable, including history:**

```
https://abr.business.gov.au/ABN/View?abn=<digits>
https://abr.business.gov.au/AbnHistory/View?abn=<digits>      ← the valuable one
https://abr.business.gov.au/Search/ResultsActive?SearchText=<term>
```

`AbnHistory` returns the complete entity-name history with exact dates.

### The trap it caught: a trading name is not a rename

Press widely reported that Adani Mining Pty Ltd "was renamed Bravus" in November
2020. The ABR history shows the registered **company** name has been *Adani Mining
Pty Ltd* continuously since 28 July 2010. *Bravus Mining and Resources* is a
registered **business name** on the same ABN from 4 November 2020.

Those are different facts with different consequences, and a dataset that records a
rename where only a trading name was registered has the corporate history wrong. The
same register showed a *real* three-step rename on a sibling entity — APCT #1 →
Adani Abbot Point Terminal → North Queensland Export Terminal, on 9 October 2020 —
so the distinction is checkable, not theoretical.

**Always separate: legal name change · trading/business name · brand.** Only the
first changes what the entity is.

## 5. Registry mirrors — which lies, and how

Indian MCA mirrors disagree, and the disagreements are systematic rather than random:

| Mirror | Behaviour |
|---|---|
| `thecompanycheck.com/company/<slug>/<CIN>` | Accepts a **superseded** CIN and serves the **current** record. This is what surfaces renames and state-shift CIN changes. |
| `companydetails.in/company/<slug>` | Resolves **without** a CIN, but serves **stale** snapshots — it showed a company as live in Hyderabad years after it had moved and been renamed. |
| `quickcompany.in/company/<slug>` | Resolves without a CIN; CIN field often renders empty. |
| `indiafilings.com`, `tofler.in` | Require the CIN in the URL. Reliable when you have one. |
| `zaubacorp.com`, `tracxn.com`, `trendlyne.com`, `falconebiz.com` | 403/405 to automated fetching. Do not budget rounds on them. |

**Never cite a search-result snippet as a source.** Two date conflicts in one pass
traced to unfetched Zauba snippets contradicting pages that were actually opened. If
you did not open it, it is not a source.

## 6. Negative evidence is evidence

A comprehensive list that **omits** an entity is a documented finding about that
entity. The absence of Adani Realty, Adani Properties, Adani Infra and the Dharavi SPV
from a 256-row consolidation annexure is what establishes — at `documented` tier —
that the realty business sits outside the listed flagship. No positive source was
needed or available.

Look for the authoritative complete list before concluding something is unsourceable.

## What none of this licenses

- **Never guess a CIN to construct a registry URL.** If you lack the CIN, the entity
  is a gap.
- **Never infer a parent from a shared registered address.** A dozen entities at
  Adani Corporate House is circumstantial, not a filing. Record the gap.
- **A mirror is not a filing.** Reading a broker's rendering of a shareholding pattern
  caps the claim at `reported`. Say which you read.
- Respect robots.txt and rate limits. A 403 is a refusal, and repeatedly working
  around one is not research technique.

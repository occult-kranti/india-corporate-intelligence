# Fleet research contract

*2026-09-25. The output contract every research-fleet agent writes to. Enforced by
`scripts/validate.mjs` §4 at the quarantine boundary; assembled into typed modules by
`scripts/assemble-fleet.mjs` (`npm run generate`).*

Five fleets, five directories, one set of invariants. The list is not repeated in code:
`FLEETS` in `scripts/lib/vocab.mjs` is the one table the assembler, `validate.mjs` §4
(which directories are research) and §5 (which modules must exist and be fresh) read.
Adding a fleet is one row there, one import in `src/context/DataContext.tsx`, and a row
here.

| directory | fleet (`key`) | kind | generated module (export prefix) | what a file holds |
|---|---|---|---|---|
| `research/raw/energy/` | energy & natural-resources power map (`energy`) | graph | `src/graph/energy.generated.ts` (`ENERGY_`) | entities, claims (with `benefit`), voids, narratives, base rates, symmetry check |
| `research/raw/welfare/` | distribution funds, 2000–2026 (`welfare`) | welfare | `src/data/welfare.generated.ts` (`WELFARE_`) | schemes (announced/approved/launched, ministers, outlay, election context, status history, results, who else benefits), entities, claims, elections, coverage, base rates, narratives |
| `research/raw/finance/` | external finance — lenders, loans, conditions (`finance`) | graph | `src/graph/finance.generated.ts` (`FINANCE_`) | entities, claims (`loan` with `terms`), voids, narratives, base rates, symmetry check |
| `research/raw/ngo/` | NGOs and foreign contributions (`ngo`) | graph | `src/graph/ngo.generated.ts` (`NGO_`) | entities, claims (`grant`, `enforce` with `contra`), voids, narratives, base rates, symmetry check |
| `research/raw/capital/` | foreign capital in listed India (`capital`) | graph | `src/graph/capital.generated.ts` (`CAPITAL_`) | entities, claims (`own`, `role`, `award`, `law`), voids, narratives, base rates, symmetry check |

A **graph** module exports `<P>_NODES`, `<P>_EDGES`, `<P>_EDGE_DOMAIN`, `<P>_BENEFITS`,
`<P>_VOIDS`, `<P>_NARRATIVES`, `<P>_BASE_RATES`, `<P>_SYMMETRY`, `<P>_GAPS`,
`<P>_IDENTITY` and `<P>_META`. The **welfare** module exports `WELFARE_SCHEMES`,
`WELFARE_ENTITIES`, `WELFARE_SCHEME_NODES`, `WELFARE_CLAIMS`, `WELFARE_ELECTIONS` and
`WELFARE_COVERAGE` in place of nodes and edges, and the same sections otherwise. A fleet
whose directory does not exist yet (or holds no research file) still gets its module,
with empty lists and `META.empty: true` — the build never waits on research. A directory
holding one file is a fleet of one file.

Files whose name starts with a capital letter (`RECONCILIATION.json`, `AUDIT.json`) are
fleet by-products, not research, and are not validated as research.

Existing graph ids are reused verbatim: `pol:<minister>` (research/raw/cabinet.json),
`co:<company>` (companies-by-state.json), `grp:<group>` (conglomerates.json),
`min:<ministry-slug>`, `per:<person-slug>`, `for:<partner-slug>`, `sec:<sector-slug>` (derived in
`src/graph/build.ts`), and the Money-Trail Atlas ids in `src/graph/data.ts`. New ids carry the
fleet prefix: `energy:`, `wel:`, `scheme:`, and for Phase G `fin:` (lenders, loan
instruments) and `ngo:` (associations, donors). Foreign companies already in the Atlas keep
`for:`.

---

## Energy & natural-resources research sweep — output contract

You are one research agent in a fleet. You research ONE domain and write ONE file:
`research/raw/energy/<domain>.json` (path given in your prompt). Other agents write other
files; never touch theirs. The repository root is `/home/user/india-corporate-intelligence`.

Read first (5 minutes, no more): `HANDOFF.md`, `.claude/skills/evidence-tiering/SKILL.md`,
`.claude/skills/pattern-discipline/SKILL.md`, and the inventory of existing graph ids at
`the id inventory described above`.

## The stance

Skeptical, calibrated, evenhanded. The question behind every record is **who benefits, and
by what mechanism, and what is the boring explanation**. Two failures are equal: repeating a
narrative as fact, and waving away a documented uncomfortable fact as "conspiracy theory".
Treat each claim on its own evidentiary merits. Search first, then reason. Never fabricate a
source, figure, date, quote, ticker, CIN or DIN. If you cannot verify it, set it `null` and
record the gap.

Use WebSearch and WebFetch (load them with ToolSearch if they are not in your tool list).
`curl` through the proxy works for most hosts; `api.github.com`, `eci.gov.in`,
`niftyindices.com` and `mca.gov.in` are known to be blocked — use Wikipedia, PIB, PRS,
ADR/myneta, Reporters' Collective, Scroll, The Wire, Reuters, Bloomberg, FT, Mint, ET, BS,
Newslaundry, screener.in, company annual reports, CAG, SEBI, Supreme Court/NGT judgments,
Global Energy Monitor, CEA, MNRE, MoC/MoM press releases.

## The four invariants (enforced in CI — your file will be rejected otherwise)

1. **Provenance.** Every claim carries `srcs: [[label, url], ...]` (≥1) OR has
   `tier: "alleged"` or `"analytic"`. A URL you have not opened does not count.
2. **Resolution.** One real-world entity → one node. REUSE an existing id from the inventory
   when the entity already exists (e.g. `adani`, `vedanta`, `co:ntpc`, `pol:pralhad-joshi`,
   `min:ministry-of-power`, `grp:adani`). Never create a second node for a spelling variant.
   A person is identified by DIN, office-with-dates, constituency or DOB — never by name
   alone. If identity is unconfirmed: `resolved: false`, add `collisionRisk`, and give that
   node NO claims.
3. **Supersession.** If a fact you find replaces an earlier one, add both, and on the older
   claim set `supersededBy` to the newer claim's id. Never drop the old one.
4. **Contradiction.** Every `alleged` claim ships with the denial or response of the party
   it concerns (a `contra` claim). If they were asked and did not respond, record that. If
   nobody asked, record that — it is a weakness of the claim.

## Tiers

| tier | requirement |
|---|---|
| `documented` | primary record: gazette, filing, court order, audit report, RTI reply, official portal, exchange filing, annual report. Or two independent credible outlets. |
| `reported` | one credible outlet with named sourcing or published documents. |
| `alleged` | a named party asserts it (indictment, petition, opposition, short-seller). Attributed, unproven. MUST carry a `contra`. |
| `analytic` | our own comparison/inference. MUST carry `innocentReading`. Implies no wrongdoing. |

Run the tests in order before assigning a tier: date test (tenure/ownership windows overlap?),
identity test, base-rate test (what fraction of comparables share the property?), falsifier
(what specific evidence would kill it?), then tier, then denial, then `upgradeIf`/`killIf`.

## Predicates

`award` (contract/block/licence/PPA/clearance awarded) · `bond` (electoral bond purchase) ·
`trust` (electoral trust routing) · `direct` (declared donation) · `pmin` (money into a fund)
· `pmout` (money out of a fund) · `csr` · `own` (shareholding / MDO / JV) · `family` · `role`
(office, directorship, portfolio; date-ranged) · `law` (statute/rule/notification governs or
changes) · `enforce` (investigation, proceeding, audit, order) · `hq` · `listed` · `sector`
· `contra` (denial / counter-evidence) · `supersede` · `analytic` (non-causal comparison)
· `loan` (lender → borrower) · `grant` (donor → recipient association).

Direction: money flows s→t (`bond`, `trust`, `direct`, `pmin`, `pmout`, `csr`, `loan`,
`grant` — `MONEY_PREDS` in `scripts/lib/vocab.mjs`; each draws an arrowhead); `award` goes awarder→winner; `role` goes person→institution;
`own` goes owner→owned; `law` goes rule→entity governed; `enforce` goes agency→subject;
`contra` goes denier→the claim id it answers (put the claim id in `t` prefixed `claim:`).

## Node types and families

`ty`: ministry|psu|agency|company|shell|person|party|fund|trust|sangh|law|mechanism|state|industry|exchange|group
`fam`: state (public power) | capital (private capital) | recipient (trusts, funds, NGOs) |
instrument (laws, schemes, mechanisms) | enforce (regulators, auditors, courts) | market.
`st`: two-letter state code of the REGISTERED office (an|ap|ar|as|br|ch|ct|dn|dd|dl|ga|gj|hr|hp|jk|jh|ka|kl|ld|mp|mh|mn|ml|mz|nl|or|py|pb|rj|sk|tn|tg|tr|up|ut|wb) or `null` for
non-geographic nodes (persons, laws, mechanisms, parties).
`sz`: 1–4 visual weight.

## File shape

```jsonc
{
  "asOf": "2026-09-25",
  "domain": "<domain>",
  "scope": "one paragraph: what this file covers and what it deliberately leaves out",
  "sources": [["label", "url"], ...],                  // every URL you actually opened
  "entities": [
    {
      "id": "energy:<slug>" | "<existing id>",           // existing ids are reused verbatim
      "label": "...", "sub": "one-line qualifier", "ty": "...", "fam": "...", "st": "gj"|null, "sz": 2,
      "al": ["alias", ...],
      "resolved": true, "collisionRisk": "only when resolved:false",
      "identity": { "cin": null, "din": null, "nse": null, "office": "Minister of Power, 2024-06-10→", "dob": null },
      "publicRole": "why this person is a legitimate subject (office, promoter of a listed company, party officer). Persons with no public role are NOT recorded.",
      "d": ["fact [documented]", "fact [reported]", ...],   // each fact ends with its tier marker
      "srcs": [["label","url"], ...]
    }
  ],
  "claims": [
    {
      "id": "<domain>:c001",
      "s": "<node id>", "t": "<node id>", "pred": "award", "tier": "documented",
      "a": 1234.5,                        // ₹ crore, omit when not monetary
      "lab": "short edge label", "d": "one or two sentences: what, when, per whom",
      "from": "2023-11-15", "to": null,   // ISO dates; the window in which this is true
      "srcs": [["label","url"]],
      "innocentReading": "REQUIRED for analytic",
      "upgradeIf": "...", "killIf": "...",
      "benefit": { "who": "<node id>", "how": "mechanism in one sentence", "amountCr": 1234, "confidence": "documented|estimated|unknown" },
      "supersededBy": null
    }
  ],
  "voids": [ { "what": "the documented absence", "whyItMatters": "...", "srcs": [...] } ],
  "narratives": [
    {
      "claim": "the circulating narrative in one sentence",
      "status": "established|well-supported|contested|speculative|unsupported|debunked",
      "strongestCase": "...", "strongestCounter": "...",
      "whatWouldChangeThis": "...", "srcs": [...]
    }
  ],
  "symmetryCheck": "Run the same lens on a control you have no theory about (an opposition-governed state, a rival group, an earlier government). What did it produce?",
  "baseRates": [ { "property": "...", "numerator": 0, "denominator": 0, "label": "what the denominator is", "srcs": [...] } ],
  "gaps": ["what you could not verify, and where it would be found"]
}
```

## Rules of engagement

- Aim for depth over breadth: 15–40 well-sourced entities and 30–80 claims beat 300 thin
  ones. Every claim must be something a reader can click through and check.
- Prefer primary documents: PIB releases, gazette notifications, CAG reports, SEBI/SC/NGT
  orders, annual reports, exchange filings, ECI/ADR bond data, court indictments.
- Amounts in ₹ crore. Convert USD at the rate the source used, and say so in `d`.
- Dates ISO 8601 — `YYYY-MM-DD`, or `YYYY-MM` / `YYYY` when that is all the source supports; never invent a day. A claim without a date is nearly useless — the date test is the primary
  falsifier. Try hard to get them.
- Record what the accused party said. Record what the beneficiary's rival got. Record the
  boring explanation. Record what you did NOT find.
- Do not record private individuals. Promoters of listed companies, office holders, party
  officers, and persons named in public court/regulatory records are public roles.
- The symmetry check is mandatory: if your lens produces an equally alarming picture for a
  control set, say so — that is a finding about the lens.
- When done, run `node -e "JSON.parse(require('fs').readFileSync('<your file>','utf8'))"`
  to prove the file parses, then return the structured summary you were asked for.

---

## Distribution funds — cash-transfer and welfare-scheme research sweep — output contract

You are one research agent in a fleet. You research ONE domain and write ONE file:
`research/raw/welfare/<domain>.json`. Other agents write other files; never touch theirs.
Repository root: `/home/user/india-corporate-intelligence`. Today: 2026-09-25.

Read first (≤5 minutes): `HANDOFF.md`, `.claude/skills/evidence-tiering/SKILL.md`,
`.claude/skills/pattern-discipline/SKILL.md`, `.claude/skills/fact-check-workflow/SKILL.md`
(claim log → research → evidence → rating), and the inventory of existing graph ids at
`the id inventory described above`
(ministers are `pol:<id>`; reuse those ids verbatim).

## The question

Direct-benefit and distribution schemes — Ladli Behna, Ladki Bahin, Gruha Lakshmi, Lakshmir
Bhandar, Rythu Bandhu, PM-KISAN, PMGKAY, MGNREGA, KALIA, Orunodoi, Subhadra, Maiya Samman,
Kalaignar Magalir Urimai Thogai, loan waivers, free grain, free electricity, cycles, TVs —
from 2000 to 2026. For each: who announced it, who approved it (cabinet, date), which
ministers carried it, which party, how much per head and in total, how many beneficiaries,
what share of the state budget, how many months before which election, what the election
result was, what happened to the scheme afterwards (cut, scaled, renamed, discontinued —
supersession, never deletion), what evaluations found, and who benefited beyond the
beneficiaries (banks, business-correspondent networks, vendors, contractors, the party).

## The stance

Skeptical and evenhanded. "Cash transfers buy elections" and "cash transfers are welfare,
not bribes" are both hypotheses; the data decides per case. The symmetry check is mandatory:
the same lens on every party — BJP (MP, Maharashtra, Odisha, Assam, Chhattisgarh, Delhi,
Haryana, Bihar), Congress (Karnataka, Himachal, Telangana, Chhattisgarh 2018–23), TMC (WB),
DMK/AIADMK (TN), BRS (Telangana), YSRCP/TDP (AP), BJD (Odisha), JMM (Jharkhand), AAP (Delhi,
Punjab), RJD/JD(U) (Bihar). The PM's July 2022 "revdi" speech against freebies sits beside
the BJP's own state schemes; record both. Never fabricate a figure, a date, a study or a URL.
If you cannot verify, `null` it and log the gap.

## Invariants (CI-enforced; the file is rejected otherwise)

1. **Provenance.** Every claim carries `srcs: [[label, url], ...]` OR is tier `alleged`/
   `analytic`. Every scheme figure carries a source and an as-of date.
2. **Resolution.** One entity, one id. Persons only in public roles (CM, minister, party
   officer, MP/MLA), identified by office-with-dates. Existing ids reused.
3. **Supersession.** Amount changes, eligibility tightening, scrutiny drives and
   discontinuations are recorded as `status` entries, never by overwriting.
4. **Contradiction.** Every `alleged` claim ships with the answering party's response as a
   `contra` claim; every `analytic` claim ships with `innocentReading`.

## Tiers, predicates, node types

As in the energy contract: tiers documented | reported | alleged | analytic. Predicates:
`role` (person→scheme: announced / approved / presented in budget / administers),
`law` (rule or scheme → who it governs), `pmout` (scheme → beneficiary class, with ₹ cr and FY),
`award` (state/ministry → vendor or bank for scheme delivery), `own`, `enforce` (audit, court,
CAG), `analytic` (timing vs election; outcome vs control), `contra`, `supersede`.
Node types: `mechanism` for a scheme (fam `instrument`), `person` (fam `state`), `party`,
`ministry`, `agency` (CAG, RBI, courts — fam `enforce`), `company` (fam `capital`).
`st`: state code of the scheme (an|ap|ar|as|br|ch|ct|dn|dd|dl|ga|gj|hr|hp|jk|jh|ka|kl|ld|mp|mh|mn|ml|mz|nl|or|py|pb|rj|sk|tn|tg|tr|up|ut|wb) or `null` for a central scheme
(then set `applicableStates: "all"`).

## File shape

```jsonc
{
  "asOf": "2026-09-25", "domain": "<domain>", "scope": "one paragraph",
  "sources": [["label","url"], ...],                     // every URL you opened
  "schemes": [
    {
      "id": "scheme:mp-ladli-behna", "name": "Mukhyamantri Ladli Behna Yojana", "al": ["Ladli Behna", "लाड़ली बहना"],
      "level": "state" | "central", "st": "mp" | null, "applicableStates": "all" | null,
      "category": "women-cash | farmer-cash | pension | grain | unemployment | student | housing | energy-subsidy | loan-waiver | consumer-goods | transport | other",
      "party": "BJP",
      "announced": { "date": "2023-01-28", "byPersonId": "pol:shivraj-singh-chouhan" | "wel:<slug>", "office": "Chief Minister, Madhya Pradesh", "srcs": [...] },
      "approved": { "date": "2023-02-25", "body": "Madhya Pradesh Cabinet", "srcs": [...] },
      "launched": { "date": "2023-06-10", "srcs": [...] },
      "benefit": { "amount": 1000, "unit": "₹ per month", "changes": [ { "date": "2023-10-01", "amount": 1250, "note": "raised before the Nov 2023 election", "srcs": [...] } ] },
      "eligibility": "women 21–60, family income < ₹2.5 lakh, …",
      "beneficiaries": [ { "asOf": "2024-03-31", "count": 12900000, "srcs": [...] } ],
      "outlay": [ { "fy": "2023-24", "budgetedCr": 8000, "actualCr": null, "pctOfStateBudget": 2.6, "pctOfGSDP": null, "srcs": [...] } ],
      "electionContext": { "election": "Madhya Pradesh assembly", "date": "2023-11-17", "monthsFromLaunch": 5, "incumbentParty": "BJP", "result": "incumbent won", "seatChange": "+46", "srcs": [...] },
      "status": [ { "date": "2024-04-01", "status": "live | raised | cut | eligibility-tightened | paused | renamed | discontinued | promised-not-enacted", "note": "...", "srcs": [...] } ],
      "results": [ { "finding": "what an evaluation, audit, survey or court found", "tier": "documented|reported|alleged|analytic", "srcs": [...] } ],
      "ministers": [ { "personId": "pol:…" | "wel:<slug>", "role": "Chief Minister", "action": "announced | approved | presented budget | administers | opposed", "date": "…", "party": "BJP", "srcs": [...] } ],
      "whoElseBenefits": [ { "who": "<node id or plain name>", "how": "BC commissions / DBT vendor contract / LPG sales / political mobilisation", "amountCr": null, "tier": "…", "srcs": [...] } ],
      "srcs": [...]
    }
  ],
  "entities": [ /* persons, parties, ministries, agencies, companies referenced above — same record shape as the energy contract: id, label, sub, ty, fam, st, sz, al, resolved, identity, publicRole, d, srcs */ ],
  "claims": [ /* graph edges — same shape as the energy contract: id, s, t, pred, tier, a, lab, d, from, to, srcs, innocentReading, upgradeIf, killIf, benefit */ ],
  "elections": [ { "st": "mp", "election": "assembly", "date": "2023-11-17", "incumbentParty": "BJP", "winner": "BJP", "srcs": [...] } ],   // only if your domain asks for it
  "coverage": [ { "st": "mp" | "central", "fromYear": 2018, "toYear": 2026, "categories": ["all"], "method": "what you searched and how", "srcs": [...] } ],   // OPTIONAL — see below
  "baseRates": [ { "property": "cash scheme launched within 12 months before an election", "numerator": 0, "denominator": 0, "label": "all state cash schemes 2018–26 in this file", "srcs": [...] } ],
  "narratives": [ { "claim": "…", "status": "established|well-supported|contested|speculative|unsupported|debunked", "strongestCase": "…", "strongestCounter": "…", "whatWouldChangeThis": "…", "srcs": [...] } ],
  "voids": [ { "what": "…", "whyItMatters": "…", "srcs": [...] } ],
  "symmetryCheck": "…",
  "gaps": ["…"]
}
```

`coverage` is optional and is the only thing that can turn "no record" into "searched, none
live" on the map. Each entry declares a state (or `"central"`), the inclusive year range you
actually searched, the scheme categories that search covered (`["all"]` when it was not
category-specific — the map's no-filter view only honours `"all"`), the method, and the
sources you searched. Only `st` and a non-empty `srcs` are checked at the gate; a missing
`categories` is read as `["all"]` with a warning; every other field passes through as written.
The earlier `{ years: [from, to], searched: true }` form is still accepted. A state-year is
only ever painted "searched, none live" when a file declares coverage for it.

New person ids use the prefix `wel:` (e.g. `wel:mamata-banerjee`) unless the person already
exists in the inventory (`pol:…`). Give every person `identity.office` with dates.

## Rules of engagement

- 8–20 schemes per domain file, each complete, beats 60 stubs. Depth over breadth.
- Primary sources first: state budget documents, cabinet press releases (state PR
  departments, PIB), scheme portals, CAG state finance audits, RBI State Finances reports,
  ECI results, peer-reviewed evaluations, Lokniti-CSDS post-poll surveys. Then credible press
  (Indian Express, The Hindu, Mint, ET, BS, Scroll, The Print, The Wire, Newslaundry, IndiaSpend,
  Reuters), and Wikipedia only as a pointer to a primary source.
- ₹ crore for outlays; per-head amounts in ₹ with unit. Dates ISO. Months-before-election is
  computed from the launch date, not the announcement, and both dates are recorded.
- Record cuts and broken promises as loudly as launches (Maharashtra's ₹2,100 promise vs
  ₹1,500 paid; MP's ₹3,000 promise; eligibility scrutiny drives; delayed instalments) — with
  sources and dates. Record the innocent reading (fiscal space, targeting errors) alongside.
- The symmetry check and the base rates are mandatory sections.
- When done, prove the file parses with node, then return the structured summary. List in
  `contested` every claim or scheme result whose tier is alleged/reported/analytic and that
  could be read as implying vote-buying, misuse, or a specific beneficiary — most
  consequential first.

---

## Phase G — loans, grants and the FCRA record (finance, ngo, capital fleets)

*2026-09-26. Everything above applies. These are the additions; `validate.mjs` §4 and the
assembler gate both enforce them.*

### `loan` and `grant` claims

```jsonc
// research/raw/finance/<domain>.json — lender → borrower
{
  "id": "<domain>:c001", "s": "fin:ibrd", "t": "min:ministry-of-finance",
  "pred": "loan", "tier": "documented",
  "a": 4150,                                  // ₹ crore at the rate the source used …
  "d": "US$500m; ₹83/US$ (the rate the source used). …",   // … and that rate is stated here
  "from": "2023-06-30",                        // approval date
  "to": "2028-12-31",                          // closing date
  "terms": {                                   // optional; only the keys the source states
    "instrument": "IPF",                       // the lender's name for it, verbatim
    "ratePct": null,                           // number or null — never 0 for "not stated"
    "tenorYears": 18,
    "graceYears": 5,                           // graceYears — not gracePeriodYears
    "conditions": ["procurement under World Bank rules"]   // a list of strings, one per condition
  },
  "srcs": [["World Bank project P000001", "https://projects.worldbank.org/…/P000001"]]
}

// research/raw/ngo/<domain>.json — donor → association
{
  "id": "<domain>:c010", "s": "ngo:<donor>", "t": "ngo:<association>",
  "pred": "grant", "tier": "documented",
  "a": 12.4,                                   // ₹ crore for the financial year named in d
  "d": "FCRA receipts FY2019-20 as filed (FC-4).",
  "from": "2019-04", "to": "2020-03",
  "srcs": [["…", "https://…"]]
}
```

- **An amount, or the words "amount not stated".** A `loan` or `grant` without a numeric
  `a` must contain `amount not stated` in `d`; otherwise the file is rejected. Never write
  `a: 0` for an amount you do not have — pages sum `a` into ₹ totals and a zero is a
  claim. A US$ figure with no conversion is recorded as `a` absent, the US$ figure in
  `d`, and "amount not stated" in ₹ in `d`.
- **`terms` keys are fixed:** `instrument`, `ratePct`, `tenorYears`, `graceYears`,
  `conditions`. Any other key is rejected by name. `conditions` is a list of strings;
  the numbers are numbers or `null`.
- Node typing: multilateral lenders and foreign foundations are `ty: "fund"`,
  `fam: "capital"`; associations are `ty: "trust"`, `fam: "recipient"`; regulators (MHA
  FCRA wing, SEBI, RBI) stay `ty: "agency"`, `fam: "enforce"`. No new node type.

### FCRA cancellations with no recorded response

An FCRA cancellation, suspension or prior-permission order is an `enforce` claim MHA →
association. When the association's response cannot be found, the claim ships as
`alleged` or `reported` with a `contra` that says so, in exactly these words:

```jsonc
{
  "id": "<domain>:c021", "s": "ngo:<association>", "t": "claim:<domain>:c020",
  "pred": "contra", "tier": "alleged",
  "lab": "no response recorded",
  "d": "No response recorded — asked/not asked unknown"
}
```

If you know the association was asked and did not answer, say that instead ("Asked on
<date> by <outlet>; no response"), with the source. Never omit the `contra`: an
allegation without its answer — or without the statement that there is none on record —
does not ship.

### Court rulings

A court is not an agency acting on a subject: a writ dismissed, an order quashed or stayed,
an award set aside is a **ruling on a claim already in the file**. Courts keep the Atlas
ids — `sc` (Supreme Court), `delhi-hc`, `bombay-hc`, `madras-hc`, `allahabad-hc`, `ap-hc`,
`jharkhand-hc`, `sikkim-hc` (`ty: "agency"`, `fam: "enforce"`, `st` of the seat) — never
a fleet-prefixed id; a High Court the Atlas lacks is added there, not under `energy:` or
`wel:`. A ruling is modelled as `enforce` (court → the party the order runs against) and its
`d` **begins** `Judicial ruling on <claim id>: ` naming the claim (or claims, comma-separated)
it rules on, so a reader knows the edge is judicial review and not enforcement:

```jsonc
{ "id": "fcra-actions:c046", "s": "delhi-hc", "t": "ngo:commonwealth-human-rights-initiative", "pred": "enforce", "tier": "documented",
  "lab": "Delhi HC dismisses CHRI plea against suspension, 2022-02-14",
  "d": "Judicial ruling on fcra-actions:c043: Court: judicial review \"should be exercised only when it is a case of mala fide, arbitrariness, or an ulterior motive\" …" }
```

`validate.mjs` §4 warns on a court's `enforce` claim whose `d` lacks the prefix, and rejects a
prefix that names a claim not in the file. A dismissal is not a finding of merit; say so in `d`.

### Fleet-prefixed ids resolve inside their fleet

`energy:`, `wel:`/`scheme:`, `fin:`, `ngo:` and `cap:` are owned by one fleet each (`prefixes`
in `FLEETS`, `scripts/lib/vocab.mjs`). A claim endpoint, `benefit.who`, `ministers[].personId`,
`announced.byPersonId` or `whoElseBenefits[].who` written with one of these prefixes must be
defined as an entity or scheme in a file of **that** fleet's directory, whichever fleet's file
references it (`validate.mjs` §4, `scripts/lib/fleet-refs.mjs`). A `wel:` person an ngo file
needs is defined in `research/raw/welfare/`; the ngo file may keep a minimal copy. A plain name
in `whoElseBenefits[].who` carries no prefix. National ids (`pol:` … `for:`) and Atlas ids pass
by inventory; `party:` and other unprefixed-by-contract ids must be defined in the file.

### Structured fields the /finance page reads (FINANCE_PAGE.md §3.3)

The fields below are the research side of the §3.3 prerequisites (P1, P7, G3a–c, G4). Each
is checked twice: by the assembler (`npm run generate` refuses the fleet) and by
`validate.mjs` §4 (raw file) and §5 (generated module — a module generated before a mark
changed fails as stale). Every field is optional unless its paragraph says otherwise; when
set it is never a guess.

#### Finance — `projectId` and the counting marks

**`projectId`** — on a `loan` or `award` claim only: a World Bank project id, `P` and six
digits (`WB_PROJECT_ID`), and **only where the claim's own text names it**. In
`worldbank-projects.json` (the census) the fetcher `scripts/finance/fetch-worldbank.mjs`
writes it from the Projects API row. On a researched file `scripts/finance/mark-loans.mjs`
writes it by rule: the one distinct `P######` token in `lab`, or, when `lab` names none, the
one in `d`; two or more distinct tokens in the deciding field → not set, listed for review.
It never overwrites a value already present. Do not type a project id the text does not name.

**Counting marks** — `countable`, `countedAs`, `notCountableReason`, on researched `loan`
claims only (on any other predicate the assembler errors). A census claim **must not**
carry them: its counting comes from its `projects[]` leg (`legs[].countable`,
`legs[].notCountableReason`, e.g. a pipeline leg), and a mark on the claim is an error.
Absent means countable. Two shapes, and nothing else:

- **A repeat** — `countable: false`, `countedAs: "<claim id>"`, `notCountableReason: "<why>"`:
  this record describes a loan another record already counts. `countedAs` must be a loan
  edge in the same fleet, **from the same lender** (`s`), **on the same project** when both
  name one, and **itself countable** — no chains; point at the record that counts.
- **Not one loan** — `countable: false`, `notCountableReason: "<why>"`, no `countedAs`:
  the record repeats nothing but is not a loan of the count. Classes
  (`NOT_COUNTABLE_CLASSES`): `non-binding-mou` (a framework or pledge MoU, not a loan
  agreement), `portfolio-aggregate` (a lender's portfolio summed — many loans, not one),
  `facility-envelope` (a multitranche facility ceiling; its recorded tranches are the loans).

`countedAs` set ⇒ `countable: false`; a `notCountableReason` set ⇒ `countable: false`;
`countable: false` ⇒ a `countedAs` or a `notCountableReason`. A duplicate is **never**
superseded and never deleted: supersession is a dated correction, not a count.

**Owner: `research/raw/finance/RECONCILIATION.json`.** Every mark on a claim is recorded
there, and every entry there is carried by its claim — the assembler and §5 both refuse a
disagreement in either direction:

```jsonc
"countedAs": [
  { "claimId": "worldbank:c001", "countedAs": "worldbank:c0754", "projectId": "P173943",
    "lender": "fin:ibrd", "file": "worldbank.json", "note": "Repeats World Bank project P173943 …" }
],
"notCountable": [
  { "claimId": "adb-aiib:c005", "file": "adb-aiib.json", "class": "facility-envelope",
    "tranches": ["adb-aiib:c006", "adb-aiib:c007", "adb-aiib:c008"],
    "notCountableReason": "Facility envelope, not a loan: …" }
]
```

A `facility-envelope` entry lists its `tranches` (countable loan edges in the fleet);
`tranches` on any other class is an error; one claim is never in both lists. Researchers
add the entry; `node scripts/finance/mark-loans.mjs --write` copies it onto the claim
(`countedAs.note` / `notCountable.notCountableReason` verbatim as `notCountableReason`),
re-reading each file before it writes and never touching a claim that already carries a
different mark. Researched records are listed and drawn one mark each, **never summed**
(FINANCE_PAGE.md F3, D5), marked or not.

#### Capital — `holding`, `coverage.json`, `controls.json`

**`holding`** (G3a) — on an `own` claim only, and **required** on every `own` claim in a
`holders*.json` file. Exactly the keys `HOLDING_KEYS`, each present (write `null` for a
stated absence, never omit):

```jsonc
"holding": { "pct": 3.62, "shares": 45123456, "asOf": "2025-12-31",
             "category": "fpi", "line": "BlackRock … 3.62%", "aggregate": false }
```

`pct` a number in 0–100 or null, and **printed in the claim's own `d`/`lab`** as `N%`;
`shares` a whole number or null, printed there as digits (commas allowed); `asOf` ISO or
null; `category` one of `HOLDING_CATEGORIES` (`promoter`, `promoter-group`, `fpi`, `fdi`,
`custodian`, `domestic-insurer`, `other`); `line` required, a **verbatim substring** of
`d` or `lab`; `aggregate` required, and `true` exactly when the claim is in
`holders-aggregates.json` (a lower bound summed from fund files, never a filing line). A
holding never says more than the record it structures; no figure is parsed from prose.

**`coverage.json`** (G3b) — a declaration, not research: top-level `asOf`, `declares`,
`builtFrom`, and `rows`, **one per NIFTY 50 constituent** in `research/raw/indices.json`
(no more, no fewer):

```jsonc
{ "company": "co:adani-enterprises", "asOf": "2025-12-11", "read": "primary",
  "domain": "holders-b1", "srcs": [["Adani Enterprises — Shareholding Pattern …", "https://…"]], "note": null }
```

`company` a `co:` id, once; `read` one of `COVERAGE_READ`: `primary` (a named-holder table
in the company's own filing), `aggregator` (category totals only — no holder can be named
or ruled out), `not-read`; `asOf` is null **exactly** when `read` is `not-read`; `domain` a
research file stem of the fleet (the file that records the read); `srcs` at least one
(a failed attempt is cited too). A company declared `not-read` may not have a filing line
(`aggregate: false`) recorded against it.

**`controls.json`** (G3c) — the declared comparison sets, promoted from the fleet SPEC:
top-level `asOf`, `declares`, `declaredIn`, `declaration` (the SPEC text verbatim), and
`rows` **in declared order** (the order is part of the declaration):

```jsonc
{ "id": "cap:blackrock", "label": "BlackRock, Inc.", "role": "subject", "resolved": true,
  "declaredIn": "scratchpad/capital/SPEC.md §Controls …", "note": null }
```

`role` one of `CONTROL_ROLES` (`subject`, `comparison`, `domestic-control` for holders;
`adviser-subject`, `adviser-comparison` for mandates); `resolved` required. A resolved row
names an id that is a fleet, inventory or Atlas id and not `resolved: false` in the
research; a declared member the fleet has no entity for is `id: null, resolved: false`, and
carries no claims. An id appears once.

Both files are read by name (`OWNERSHIP_DECLARATIONS`) and carry no `claims` or `entities`.

#### NGO — `fcByState`

**`fcByState`** (G4/P5) — a top-level list, read **only** from `fcra-receipts.json` (FLEETS
`fcState`; elsewhere it is warned about and not exported): the state/UT × FY rows of a
Parliament annexure, transcribed one row per state × FY. Keys `FC_STATE_KEYS`:

```jsonc
{ "st": "tn", "stateName": "Tamil Nadu", "fy": "2019-20", "receivedCr": 1234.56,
  "utilisedCr": null, "note": null, "srcs": [["Rajya Sabha … Annexure", "https://…"]] }
```

`st` a state code, or `null` with a `note` saying what the annexure calls the row; `fy`
written `YYYY-YY`; `receivedCr` required and ≥ 0 (a row the annexure prints no figure for
is not transcribed); `utilisedCr` ≥ 0 or null; `srcs` required; one row per state × FY.
**The sum rule:** for every FY the rows name, their `receivedCr` must sum to within
**₹1 crore** (`FC_STATE_TOLERANCE_CR`) of each current (unsuperseded) national `grant`
claim in the same file whose `from`/`to` span exactly that FY (`YYYY-04-01` →
`YYYY+1-03-31`) and that cites a source URL the rows cite; an FY with no such national
claim is an error. Record the national total first; a state table nobody can add up is not
a table.

---
name: force-money-trail
description: Use when extending the force-finance map — adding or checking a Union defence or police budget line, a state Police-head row, a city or commissionerate police budget or a city per-capita figure, a ruling-party comparison of states, a police strength or per-lakh figure, a cantonment, plant, laboratory or other footprint row, a DAC contract or a DPSU or private vendor award, an electoral bond by a security vendor, a retired officer's board role, a pay or pension term (7th CPC, MSP, Agnipath, OROP), a CAPF attrition or custodial-death rate, a CPPP security-buyer rate or any request to name, rank, count or add a node for a CPPP winner, or a court or audit record in Bofors, Tatra, AgustaWestland, Adarsh, Sukna, Rafale or Pegasus — or when choosing an id, a denominator, a control or a source for one.
---

# Force money trail

What the eight-domain `force` fleet (`research/raw/force/*.json`, asOf 2026-10-04, corrected to 2026-10-06, run `run-ffce1d437c30`) and the CPPP security slice (`research/raw/cppp/security.json`) established, so the next pass starts from it. Every figure names the file it came from; the primary is in that file's `srcs`.

## Refuse first

Before any row, edge, caption or reply, test the request against three rules:

- **No operational detail.** No unit, formation or battalion and where it sits; no deployment or order of battle; no stock, depot or readiness state; no forward or border site.
- **No person below the public rank, and no private individual.** The closed list of offices is under Refusals.
- **No city money that is not published.** Delhi Police is the one city budget.

A request for any of these is refused in full, with the rule quoted, and reshaped to what the published record allows (Refuse and reshape, below).

## The three-level resolution statement

`docs/design/SECURITY_PAGE.md` §5.0.1, fixed copy; spec §2. Say it in these words.

- **Union — to the line.** "Every rupee the Union spends here resolves to a line in a demand for grants, with Budget Estimate, Revised Estimate and Actual where the document prints them."
- **State — to the Police head.** "Each state's police money resolves to its Police major head and no further, except where a state's own budget opened. Strength, vacancy and per-lakh figures come through secondary transcriptions while the national strength table is unreachable, and say so. Prisons, home guards, fire and forensic money resolve only as Union scheme totals and are not budget rows here."
- **City — to the footprint, and Delhi.** "Only Delhi Police has a budget line of its own, and it is a Union demand. Every other city's police money is inside its state's police head, and this page prints those words in place of a number. Cities appear through what is located in them."

## The governing finding

**Every lens the fleet ran on force money gave the same shape on its declared control. What separates cases is the record — the demand line, the audit paragraph, the court order, the bidder count — and the level the money resolves to. Not the party in office.**

- Defence share of GDP: it fell under both governments because GDP grew faster. UPA-II "nominal CAGR of the MoD total 11.0% (GDP at current prices grew 15.3% a year)"; NDA "nominal CAGR 8.8% (GDP 10.0%)" (`union-defence.json` symmetryCheck).
- Pensions rose under both: "pensions — 3.47× from actual 2013-14 to 2024-25 against 2.33× for service pay and 2.02× for capital" (`pay-pensions.json`).
- States: the sign depends on the set. Full groups (11 BJP-run, 8 opposition-run): median police spend per head ₹1,727 against ₹1,458, and about ₹1,937 against ₹1,458 with party coded to 2023-24 (`state-police:c021`). Large states (≥ 3 crore): "per capita ₹912–₹1,478 vs ₹1,012–₹2,615", medians ₹1,049 against ₹1,343 (computed from the lists in c021). Small states with large sanctioned forces drive the full-group gap. Never quote one set without the other. On outcomes: "the outcome series are dominated by reporting practice and small numbers, not by party" (`state-police.json`).
- Vendors: "a few mega-contracts to the platform designer dominate — which is a finding about the lens (concentration by platform design), not about any vendor" (`procurement-industry.json`).
- Footprint: BJP-run large states "114 installations / 984m = 0.12 per million", opposition-run "57 / 415.6m = 0.14 per million" (`footprint.json`).
- Bonds: Megha alone 966 bonds of ₹1 crore = ₹966 crore, 584 of them (60.5%) to the BJP (`money-people:c009`–`c017`, ADR/MyNeta bond-level table). The three defence-linked donors: "Megha Engineering, Mahindra & Mahindra and Cyient: 61.8% of Rs 1,001 cr to the BJP (Megha alone Rs 966 cr, 60.5% BJP), against 47.6% for all donors of Rs 10 cr or more and 46.1% for all matched bonds" (`money-people:c021`, as corrected after the cross-examiner refuted a defence-specific tilt).
- Cases: named cases with a final conviction in the records opened, 0 / 7 (`money-people.json` baseRate 5).

## Refusals

Spec §5 (`docs/superpowers/specs/2026-10-04-force-finance-design.md`). They bind every claim, row, caption, chat reply, commit message, fixture and log.

**Operational detail**

- **No operational detail.** Record nothing below the published installation: no unit, formation or battalion and where it sits; no deployment; no order of battle; no strength below the whole force; no stock, holding or depot; no readiness state (including "days of war" figures from an audit); no procurement the Ministry has not announced. Only published budgets, published awards, published lists of installations, and published court and audit records at the level of their finding.
- **A published mention of a single site is not a published list.** Write no footprint row for an airfield, advanced landing ground, forward base, border post, depot, magazine, radar or missile site, or for any installation chosen because it is near the LAC, the LoC or an international border, even where PIB names it. A layer of published points chosen by nearness to a border is deployment detail. The footprint admits only kinds on a published list: DGDE cantonments, DRDO cluster pages, DPSU unit pages, CAPF training menus, and command HQs a PIB release places in a city.
- **An audit on stocks or readiness** (`force:doc-cag-ammo-2017`) is recorded at catalogue level and by its finding on process: procurement delay, or a shortfall against an authorisation, in the audit's own words. No holding, days-of-war figure, item-wise shortfall or depot is transcribed.
- **Strength is the whole force; kinds are closed.** Armed-service and CAPF strength rows carry `st` null. `ordnance` (0 rows) is unused and never means a depot or magazine; `other` is never a military operating site (`references/tables.md` §2).
- **Coordinates (S7).** When `lat` and `lon` land, they go only on civil-facing rows (commissionerates, academies, forensic laboratories, DPSU headquarters, DGDE offices) and on cantonments at the cantonment-board office address. No coordinate is written for a military operating site, a factory's production area, or anything a published list does not address.
- **A refusal is not a void.** Operational sites, units, stocks and deployments never go into `voids[]` or `gaps[]`. They are out of scope by rule, not unreached. Write them, if at all, as one sentence in the file's `scope`: "Out of scope by rule: deployments, units, order of battle, stocks, depots, forward and border sites."

**People**

- **No person below the public rank, in any field.** A person is a node, or is named in `d`, `note`, `label`, `contra`, a caption or a `srcs` title, only while holding, or for an act done in, one of these offices: Union or state minister; Member of Parliament or of a state legislature; party office-bearer; Secretary to the Government of India or Chief Secretary; service chief; Director General of a CAPF, the DRDO or a state police (DGP); head of a Union agency (Director of the CBI, the ED or the IB; DG of the NIA or the NCB); Commissioner of Police heading a commissionerate (not a Joint, Additional, Deputy or Assistant Commissioner); a judge of the Supreme Court or a High Court, or the CAG, acting in office; a listed-company director. Nobody else, whatever the office.
- **Rank is judged at the date of the act.** An officer later promoted to DGP is named only for acts done as DGP. A retired chief on a board is named for the board role, dated, with the cooling-off rule.
- **Everyone else by office and force.** "The station-house officer, `force:tn-police`." A court record is cited by court, case number and date, never by a party's name below the rank. The Sukna and Tatra officers are referred to by rank class and case (`force:case-sukna`), never by name; a source title that names one is relabelled to the office.
- **Outcomes are rates, not accusations** (spec §3 rule 4). A single custodial death, encounter or firing is never a node or a case. It is counted in the state-police NHRC and NCRB rate rows, with the ruling party as text. Nobody in it is named: not the accused officers, not the victim, not the family, not the complainant. Tiering and a `contra` do not cure a naming this rule forbids. Refuse first; tier only what survives.
- **No intermediary as a node.** The fact stays on the case node, without the name unless the person holds an office on the list: "an alleged intermediary, named in the court record".
- **No private individuals.** No salary of a named person; pay levels only. No family, religion, caste or ethnicity as an actor.

**Money and cities**

- **No city money that is not published.** Published means printed by the paying government in its own budget document or accounts. A city figure from the press, PRS or RBI is not a row under any tier. Every city but Delhi gets "inside the state's police head" and no number. GNCTD's own residual police line is not a row (`state-police.json` void 6).
- **No gate catches a city row.** `budgetRowProblems` (`scripts/lib/vocab.mjs`) checks keys, payer, body, head, component, fy, stage, cr and srcs; a state-payer row on a `force:<city>-police` body passes `npm run validate`. You are the gate. Before writing any `budgets` row whose body is a commissionerate or a `force:<city>-police` other than `force:delhi-police`, stop and write the city sentence instead.
- **Not published is not the same as not reached.** Four of the five largest states' budget documents did not open (`state-police.json` void 2). If a source says a state's Detailed Demands print a city or commissionerate sub-head, write no number: write a gap naming the volume, the head it would sit under, and an `upgradeIf`. If the document opens and prints the sub-head, write it as a part of `force:<st>-police` under MH 2055: `payer` the state code, `head` as printed with its code, `note` "part of MH 2055; never add to the state row". Narrow `state-police` void 1 for that city, citing the document. The page's city sentence changes only through a reviewed change to `CITY_POLICE_TEXT` (SECURITY_PAGE).
- **A figure needs its document.** A rounded or "about" figure is never `cr`. A figure without its stage and its head as printed is not a row. A figure the user supplies is a lead: find the document it came from before anything is written. If you cannot, record what was claimed, by whom and on what date as a gap, and use no number.
- **No city map and no city denominator.** The map is a state map; `city` is a readout label with no coordinates until S7. No per-head figure is computed for a city. Per head is state-level only, on the projected population, never the 2011 Census. The state per-head figures in `state-police.json` may be quoted in text, each with its file and its whole family; the page's per-person mode stays disabled until S3 lands the population series.
- **No rate without its family.** Every ₹ beside its denominator and its comparison set. A single-bidder rate with its family size, its Wilson interval, the whole-file rate and the same-portal rate, never as a national statistic ("No rate here is an Indian national statistic."). A party-group median with n per group, the range, the same median on the other set (full groups and large states) and the date-coded regrouping; a gap between medians smaller than either group's spread is printed as overlap. There is no score, ranking or index.

**Vendors, bonds and the CPPP slice**

- **No vendor shown alone.** HAL beside Adani Defence, Mazagon Dock beside L&T, BEL beside Tata Advanced Systems, with identical fields. No vendor named as a beneficiary without a primary record naming it.
- **No CPPP winner is a node, a fact or an edge.** The slice is a dataset-only population whose verification links were all dead (`security.json → caveat`). It enters the graph only as class-level `analytic` rates on the buyer bodies (`force:crpf`, `force:bsf` …). A winner string is never resolved to a graph id, even where it reads like a DPSU: resolution needs a primary record (PIB, an exchange filing, the DPSU's own disclosure) and is the procurement-analyst's call. This skill names no winner.
- **The only ordered list of firms** is `concentration.byBuyer`/`byClass` → `topMarkedWinners` as `security.json` prints it: ordered by total awards to show concentration, beside the HHI and the `innocentReading` ("a named winner is a firm that won, nothing more"). No other ordering of firms — by single-bid awards, value, red flags or growth — is computed, printed or stored. Indicators are "Rates over a family, never a list of culprits." (`redflags.stance`), and repeat pairs are "pairs are counted, never listed". "The firms that won the most single-bid awards" is a list of culprits: refused in chat, fixtures and logs.
- **A marked name is not proof of a firm.** The marker regex admits `m/s`, `&`, `enterprise`, `traders`, `agencies`, `suppliers`, `builders`, `contractors` and `and sons`, which sole proprietors use (16 of the 255 names shown carry `m/s` alone, `concentration.msOnlyNamed`). Point to the table (file, class, buyer) instead of repeating a name. Where a name must be repeated outside the page's own table, repeat only one carrying a corporate legal form (ltd, limited, pvt, private, llp, corporation, company, nigam), as printed, never beside an indicator, and never in a node or a commit message.

**Claims, tiers and order**

- **No motive edge.** "Bought the contracts", "to win orders", "as a reward" and "in return for" join two facts into a motive. Each fact keeps its own edge and tier. The join is an `analytic` comparison with its control, or a narrative on the ladder. It is never an edge of any tier. This holds when a user asks for it.
- **A request is not an alleger.** An `alleged` claim names, in `d` and in `srcs`, the party that asserts it: a petition, an indictment, an opposition statement, a short-seller. Neither the user, nor the analyst, nor the joining of two documented facts is that party. Where no such party exists, the proposition goes on the narratives ladder (money-people narrative 0 is `unsupported`) and never becomes an edge, whatever `contra` is offered. An `alleged` claim carries its `contra` in the same file.
- **The tiers are kinds, not a scale.** `documented` and `reported` rest on sources, `alleged` on a named asserter, `analytic` on our arithmetic. No request moves an audited record to another tier. Only a new source does, through the cross-examiner and an `auditCorrections` entry.
- **A premise in a request is a claim.** Grep the raw files and the slice for it. If it is absent, find a primary (`source-retrieval` first). If none opens, record a gap with where the record would live. Never write the premise as a row or an edge, and never repeat it as fact in the reply.
- **Order is not evidence.** No record is promoted, pinned or put first because someone asks. `contested` is ordered by consequence as the audit judges it. Placement on /security belongs to `frontend-developer` and follows SECURITY_PAGE §3. A "lens" is a comparison run on its declared control; it has no top.
- **Party is text.** Never a colour, a filter, a sort or the subject of an edge. Code it to the period the figure measures (`references/tables.md` §4). No "scam", "cleared" or "rigged" beyond the words of the order or the audit.

## Refuse and reshape

A reply to a refused request has three parts, in this order:

1. **Refused:** what is refused, with the rule quoted.
2. **Instead:** what the published record allows (table below), each figure with its file and its family.
3. **Scope:** one sentence on what the file covers. For the footprint: "The footprint is complete for its scope: published installations on published lists. Operational sites are outside that scope by rule."

Write nothing to `research/raw` for a refused request, and name the rule in your report. If the same request recurs, record it once in `RECONCILIATION.json → criticItems` as `{item, decision: "refused", how: <the rule>}`, worded without the refused name or detail.

| request | offer instead |
|---|---|
| a city or commissionerate budget, not Delhi | the state's MH 2055 row and the city sentence (`state-police.json` void 1 lists the cities inside each state's head); Delhi Police from `union-home.json` |
| a city per-head figure or a city on the map | the state per-head figure quoted from `state-police.json` text with its family; the data the page would need, or the reason it cannot exist, as a handoff note to `frontend-developer` |
| the top single-bid winners of a class | the class rate (capf 9.53% [8.83, 10.28] of 6,275) beside the same portal (17.67%) and the whole file (11.22%); the repeat-pair rate (capf 40.24% of 415) beside the slice (37.76%) and the whole file (51.28%), pairs counted, never listed; the state-police class as control (8.11% against 7.59%; repeat pairs 13.31%); each `innocentReading` printed (`security.json → rates.byClass`, `redflags.indicators`) |
| "X-run states spend more (or do worse)" | the same-year table on both codings (party in FY2024-25 and in 2023-24) and both sets (full groups and large states), party as text; the claim filed as a narratives entry with its strongest counter and sent to `cross-examiner` |
| "the vendor bought bonds to win contracts" | the bond rows, the award rows and `money-people:c021` with its like-for-like control; money-people narrative 0 (`unsupported`) |
| a named officer or victim in an outcome case | the state's NHRC and NCRB rate rows (`state-police.json` baseRates 2, 3, 6, 7, 11), with the ruling party as text |
| forward sites, depots, units, stocks | command HQs a PIB release places in a city; the service's or the BRO's Union budget line; an audit at catalogue level |
| "put it first", "pin it to the top" | nothing: order follows consequence (Order is not evidence) |

## Before you write

**REQUIRED BACKGROUND:** `cui-bono` (the ledger row), `evidence-tiering` (the tier), `pattern-discipline` (the denominator), `source-retrieval` (before any gap), and the sibling skills `energy-money-trail` and `foreign-money-trail`. Shape and invariants: `docs/research/FLEET_CONTRACT.md`, the **Phase H** section and the common sections. The `security-analyst` agent owns the fleet directory and the slice; the `procurement-analyst` agent shares the slice.

- Reuse every id; never mint a second node (`references/tables.md` §1).
- Three series, exact keys, one row per key; `cr` ≥ 0 as printed; a line the document does not print is a void; a secondary transcription begins `note` with `reported:`; a footprint row carries `st` and `city` or is not a row (§2).
- Every comparison runs on its declared control and prints the result whatever it says (§4, §5).
- Supersede, never edit; check the failure modes before you write (§9).

**Where the rest lives.** `references/tables.md`: §1 ids and mappings · §2 predicates and the three series · §3 denominators · §4 controls and their traps · §5 which lenses over-fire · §6 voids · §7 sources that opened and did not · §8 the narratives ladder · §9 failure modes · §10 where the files disagree. `references/ledger.md`: counting rules, coverage, every base rate, void, gap and symmetry check, the refuted and killed register, the audit corrections and the records audited late. `references/narratives.md`: every narrative with its status, strongest case, strongest counter and the cross-examiner's verdict.

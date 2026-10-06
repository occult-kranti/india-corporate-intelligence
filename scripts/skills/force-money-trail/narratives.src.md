# Force fleet — the calibrated narratives ladder

Every `narratives` entry in the eight domain files of `research/raw/force/` (asOf {{v::ud::asOf}}; {{cnt::narratives}} narratives), emitted verbatim by the generator recorded at the foot of this page: the narrative as filed, the file's status, its strongest case, its strongest counter, what would change it, and the cross-examiner's verdict from `research/raw/force/AUDIT.json` ({{cnt::audit}} verdicts, {{cnt::auditNarr}} of them on narratives). The ladder: established → well-supported → contested → speculative → unsupported → debunked. Statuses are a ladder for narratives only; they are never a claim tier.

**How to read the two status columns.** The corrections pass recorded in `research/raw/force/RECONCILIATION.json → auditCorrections` applied the cross-examiner's narrative corrections to the files ({{cnt::ac:applied}} corrections applied in all, {{cnt::ac:refused}} refused, {{cnt::ac:deferred}} deferred; see `ledger.md` §11). So the **status** column is the file's status *after* that pass, and the **cross-examiner** column is the verdict on the text the cross-examiner read *before* it. A verdict marked "refuted" therefore says what was wrong with the earlier text; the status beside it is the corrected one. Two literature narratives (15 and 16) were written after the main audit and were pending cross-examination when this skill was commissioned; their state at generation: narrative 15 — {{late::literature:narrative:15}}; narrative 16 — {{late::literature:narrative:16}}. Nothing pending may be cited as established.

The one finding that governs the whole ladder: every narrative that selects a party, a vendor or a government produced the same shape when the identical lens ran on its declared control — UPA-II beside NDA on the same demand lines, BJP-run beside opposition-run states on the same rates, the competing DPSU beside the private vendor, Bofors beside Rafale. No narrative here is established; none is debunked. What moves a status is a record (an unsealed report, a court finding, a published price, a matched award list), and the "what would change it" column names it.

**The ladder, one line per status.** A status says how the records bear on the narrative as phrased. It is never a claim tier.

- **established** — primary records settle it as phrased, and no record on file contradicts it.
- **well-supported** — records support it as phrased; the counter qualifies it but does not reverse it.
- **contested** — the strongest case and the strongest counter both rest on records, and the answer turns on the set, the year or the definition.
- **speculative** — the record that would decide it is sealed, unpublished or does not exist yet.
- **unsupported** — no record supports it as phrased, though parts of it may be documented.
- **debunked** — a record on file contradicts it as phrased.

## Why each `unsupported` narrative is not `alleged`{{@unsupportedGuard}}

An `alleged` claim needs a named party that asserts it (a petition, an indictment, an opposition statement), in `d` and in `srcs`, and its `contra` in the same file. A narrative needs neither. These seven are `unsupported` on the ladder. None of them becomes an edge of any tier; a fact inside one keeps its own edge and tier. The response line reads what the file records. Narratives carry no response slot; an `alleged` claim cut from one fills its slot with a denial, with "Asked on <date> by <outlet>; no response", or with exactly "No response recorded — asked/not asked unknown" (`docs/research/FLEET_CONTRACT.md`).

- **money-people 0 — {{ncl::money-people::0}}** Why not alleged: "{{x::mp::narratives[0].strongestCase::No party or petitioner in the sources makes a defence-specific allegation, so the narrative is weighed as unsupported, not as an alleged claim\.}}" Decisive counter: the Supreme Court "{{x::mp::narratives[0].strongestCounter::on 2 Aug 2024 dismissed pleas \(Common Cause, CPIL\) for an SIT into alleged bond quid pro quo, calling the premises 'assumptions at the present stage' \(LiveLaw\)}}"; and "{{x::mp::narratives[0].strongestCounter::the bond buyers and the contract holders differ in two of the cases \(M&M parent vs MDS subsidiary in 2021; MEIL vs its group company ICOMM\)}}". Response: "{{x::mp::narratives[0].strongestCounter::M&M, MEIL and Cyient were not asked\.}}" The energy fleet's audit words the MEIL response as "not known to have been asked" (`research/raw/energy/AUDIT.json`); carry both.
- **money-people 1 — {{ncl::money-people::1}}** Why not alleged: "{{x::mp::narratives[1].strongestCase::No source alleges reward or access in either named case\.}}" Decisive counter: "{{x::mp::narratives[1].strongestCounter::Both roles began about 3 years and about 6 years 7 months after retirement, outside the one-year window}}". Response: none recorded.
- **money-people 7 — the Sukna court-martial narrative.** Why not alleged: the charges were tried, and the final records do not convict. Decisive counter: "{{x::mp::narratives[7].strongestCounter::The AFT on 5 Sep 2014 acquitted the first officer of all charges}}"; "{{x::mp::narratives[7].strongestCounter::the Supreme Court on 24 Jan 2019 voided the entire GCM because it sat below his rank, without ruling on the merits}}". The officers are below the public rank: refer to them by rank class and `force:case-sukna`, never by name. Response: none recorded.
- **money-people 9 — {{ncl::money-people::9}}** Why not alleged: it is a comparison, and "{{x::mp::narratives[9].strongestCase::Each side's partisans cite the other's cases\.}}" Decisive counter: "{{x::mp::narratives[9].strongestCounter::Zero final convictions in all seven named cases}}"; "{{x::mp::narratives[9].strongestCounter::no comparative metric or census exists either way}}". Response: not applicable.
- **procurement-industry 0 — {{ncl::procurement-industry::0}}** Why not alleged: the file names no party that asserts it. Decisive counter: "{{x::pi::narratives[0].strongestCounter::₹2,770 crore jointly with Bharat Forge is 0\.68% of this file's ₹4\.07 lakh crore sample of 45 PIB-named award claims, calendar 2021-25}}", the two PIB-named contracts dated {{x::pi::narratives[0].strongestCase::the ([0-9-]+) CQB carbine::1}} and {{x::pi::narratives[0].strongestCase::the ([0-9-]+) DRDO-CABS contract::1}}. Response: none recorded.
- **state-police 1 — {{ncl::state-police::1}}** Why not alleged: no party is accused, and "{{x::sp::narratives[1].strongestCase::No source was found in which the 'best-funded' phrasing itself circulates}}". Decisive counter: "{{x::sp::narratives[1].strongestCounter::₹1,212 per capita in 2023-24 Accounts, 13th of 20 states with population above 70 lakh}}". Response: not applicable.
- **literature 0 — Rafale: the price was inflated.** Why not alleged as filed: the asserters are unnamed in the file ("{{x::lit::narratives[0].strongestCase::opposition figures put the per-aircraft price at ₹1,570 crore against ₹526 crore}}"); an `alleged` claim cut from it must name them. Decisive counter: "{{x::lit::narratives[0].strongestCounter::The Supreme Court \(2018-12-14; review 2019-11-14\) found the process broadly followed and declined to compare prices}}"; "{{x::lit::narratives[0].strongestCounter::no court or audit has found corruption}}". Response: "{{x::lit::narratives[0].strongestCase::Dassault and the MoD deny corruption}}" (reported).

## Status counts by file

{{@statusCounts}}

{{@narrativeTables}}

## Where files rate the same subject — carry both, name the file

Two files rating one subject is the fleet working as designed: the literature file calibrates the narratives the other seven rate (literature.json `scope`). Where the wording differs, the claims are different claims and both stand. The statuses below are read from the files; the verdicts from `AUDIT.json`.

{{@overlaps}}

The duplicate text "Pensions are eating the defence budget." appears word for word in `union-defence` narrative 1 and `pay-pensions` narrative 3; `literature` narrative 6 is the stronger variant ("leaving nothing for modernisation"), whose second clause the cross-examiner found contradicted by the same PRS document. The Rafale entries split the price limb (literature 0, money-people 3) from the offset-partner limb (procurement-industry 1, literature 15) and the process limb (literature 1); keep them split.

## The records audited late (the brief's pending set)

{{@pending}}

## How this file was generated

`node scripts/skills/force-money-trail/gen.mjs .` from the repository root (written 2026-10-06; the script and its four `*.src.md` templates sit beside it in `scripts/skills/force-money-trail/`). It reads the eight domain files in `research/raw/force/`, `AUDIT.json`, `RECONCILIATION.json`, `research/raw/cppp/security.json` and the `FORCE_META` block of `src/graph/force.generated.ts`, and writes all four files of this skill. No figure is retyped. Each narrative row is the file's `narratives[]` entry verbatim (`|` escaped; `procurement-industry` names the last field `whatWouldChange`, the others `whatWouldChangeThis`). The verdict column joins `AUDIT.json → verdicts[]` on `(domain, "narrative:<index>")` and prints `refuted`, `recommendedTier` and the first sentence of `reason`. The late-audited set is the task brief's pending list; each record's state (no verdict / verdict without a recorded correction / settled) is read from `AUDIT.json` and `RECONCILIATION.json` at run time. The overlap table's grouping by subject is the one hand-made element; its statuses and verdicts are read from the files. A placeholder that does not resolve stops the run. Regenerate after any edit to a fleet file or a new `AUDIT.json` verdict; never edit these tables by hand.

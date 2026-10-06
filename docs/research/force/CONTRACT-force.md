# Fleet research contract — `force` addendum (read AFTER fleet-common/CONTRACT.md)

You are one research agent in the `force` fleet: the money India spends on force — defence,
central armed police, state and city police, intelligence and investigation, prisons and
allied bodies — its budgets, pay and pensions, procurement, footprint by state and city, and
who sits on both sides of the money. You write ONE file `research/raw/force/<domain>.json`.
Repository root `/home/user/india-corporate-intelligence`. Today: 2026-10-04.

Read first: `fleet-common/CONTRACT.md` (the common contract — stance, invariants, tiers,
predicates, file shape; where it says finance/ngo/capital read `force`), then this file, then
`docs/superpowers/specs/2026-10-04-force-finance-design.md` §0–§4 (the stance for THIS
subject in §3: spending is a policy choice not a scandal; pay and pensions are contracts with
people; vendors are vendors; outcomes are rates not accusations; cases are records), then
`scratchpad/force/SPEC.md` (your domain's question, controls and reachability), then the
inventory `scratchpad/force/inventory.json` (1,458 ids — reuse verbatim: `min:ministry-of-defence`,
`min:ministry-of-home-affairs`, `pol:rajnath-singh`, `pol:amit-shah`, `cag`, `sc`, `delhi-hc`,
`co:mazagon-dock`, `co:bharat-electronics`, `co:larsen-toubro`, `co:bharat-forge`,
`co:solar-industries`, `co:mahindra-mahindra`, `grp:adani`, `grp:reliance`, every `co:` in the
companies dataset, every `pol:` minister).

## Ids and prefixes

New ids are `force:<slug>` — forces, headquarters, DPSUs not in the companies dataset,
laboratories, schemes (MPF, SRE, Agnipath, OROP), rules (the cooling-off rule, the Defence
Acquisition Procedure), cases as `force:case-<slug>` law/mechanism nodes, documents as
`force:doc-<slug>`. Footprint rows are `force:fp-<slug>`. Listed DPSUs that ARE in the
companies dataset keep their `co:` id (HAL `co:hindustan-aeronautics` if present — check the
inventory; BEL `co:bharat-electronics`; Mazagon `co:mazagon-dock`; BDL, GRSE, BEML, Cochin
Shipyard, MIDHANI, Data Patterns, Zen, Astra, Paras, MTAR likewise if present). A person is
only a node in a public role at a public rank: minister, secretary, service chief, DGP,
commissioner, listed-company director, party officer; `per:<slug>` with `identity.office`
dated. Nobody below that rank. No private individual.

## Node types and families for this subject

Services, forces, headquarters, DRDO, BRO, DGDE: `ty: "agency"`, `fam: "state"`. Ministries:
`ty: "ministry"`, `fam: "state"`. DPSUs: `ty: "psu"`, `fam: "state"`. Private vendors:
`ty: "company"`, `fam: "capital"`. Courts, CAG, the SC committee on Pegasus: `ty: "agency"`,
`fam: "enforce"`. Rules, schemes, procedures, cases: `ty: "law"` or `"mechanism"`, `fam:
"instrument"`. State governments: reuse `energy:state-<name>` / `fin:state-<name>` ids from
the inventory where they exist; otherwise `force:state-<name>` with `ty: "state"`.

## Predicates for this subject

`award` buyer → vendor (DAC-approved contract signed, PIB-named vendor; `a` ₹ crore; `from`
the signing date; `d` the category and the AoN date). `own` state → DPSU (% in `d`). `role`
person → body, dated (ministers; retired officers on boards — `d` names the retirement date
and the cooling-off rule node). `law` rule → class governed (Agnipath → the recruits; OROP →
pensioners; the cooling-off rule → retired officers; MPF → state police). `enforce` CAG or a
court → subject (`d` begins `Judicial ruling on <claim id>: ` when it rules on a claim in this
fleet). `bond` vendor → party (SBI disclosure via ADR). `contra` the other side → `claim:<id>`.
`analytic` for every comparison you compute. No `loan`, `grant`, `csr` unless a record is one.

## The three tabular series (validated in CI; exact keys, exact order)

Any file may carry any of these top-level arrays. Every row cites a primary record in
`srcs` (a budget document page, a BPR&D table, an RBI table, an official list); a row
transcribed from PRS, a newspaper or Wikipedia is still written but its `note` begins
`reported:` and names the route.

```jsonc
"budgets": [ { "payer": "union",            // "union" or a state code
               "body": "force:crpf",       // an entity id defined in THIS fleet (or min:/co:)
               "head": "Demand 48 — Police: CRPF",   // the demand / major head as printed
               "component": "total",       // total | revenue | capital | pension | pay | grant-to-states | other
               "fy": "2024-25", "stage": "BE",       // BE | RE | actual
               "cr": 31543.2,              // ₹ crore as printed (never converted)
               "note": null, "srcs": [["Expenditure Budget 2024-25, Demand 48, p. 3", "https://www.indiabudget.gov.in/doc/eb/sbe48.pdf"]] } ],
"strength": [ { "st": "mh", "body": "force:maharashtra-police", "year": 2023,
                "sanctioned": 232000, "actual": 196000, "perLakh": 155.3, "womenPct": 12.1,
                "note": null, "srcs": [["BPR&D Data on Police Organisations 2023, table 1.1", "https://bprd.nic.in/..."]] } ],
"footprint": [ { "id": "force:fp-pune-cantonment", "kind": "cantonment",   // cantonment | dpsu-plant | drdo-lab | command-hq | capf-hq | commissionerate | prison | forensic-lab | training | ordnance | other
                 "label": "Pune Cantonment", "body": "force:dgde", "st": "mh", "city": "Pune", "since": "1817",
                 "note": null, "srcs": [["DGDE — cantonment boards", "https://dgde.gov.in/..."]] } ]
```

A budgets row is unique on (payer, body, head, component, fy, stage). A strength row on
(body, year). A footprint row on id and MUST carry `st` and `city` — a row the map cannot
place is not written. `cr` may be 0 when the document prints 0; it is never null (a line the
document does not print is not a row — record the void instead).

## The controls you must run (symmetryCheck)

- Union: the same line under the previous government (UPA-II FY2009–14 beside NDA
  FY2014–26) — growth, share of GDP, pay-to-capital ratio.
- States: BJP-run beside opposition-run states on police spend per capita, strength per
  lakh, vacancy share and the outcome rates. Party as text in `d`, never as the subject.
- Vendors: a private vendor's orders beside the DPSU that competes in the same category,
  and beside the other private vendors in the same years.
- Cases: Bofors beside Rafale; AgustaWestland beside Tatra; identical fields.

## Refusals (the file is rejected or the claim killed otherwise)

No deployment, order of battle, or unannounced procurement. No person below the public
rank. No city police budget that is not published (write the void). No vendor named as a
beneficiary without a primary record naming it. No rate without its family. No family,
religion or ethnicity as an actor. No `alleged` claim without its `contra` in the same file.

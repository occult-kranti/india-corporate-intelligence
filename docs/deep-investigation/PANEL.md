# Follow the money: independent model-agent review

Baseline: `031558e`, branch `codex/education-funding-intelligence`.
Review date: 7 October 2026. Moderator/integrator: root. Independent adversarial,
research-presentation and senior-technology review: `deep_adversarial`. Design,
data platform, procurement, corporate and services work have separate agent owners.
These are model-agent perspectives, not human expert endorsement or participant
research. Marketing findings concern audience, task and message clarity; no user
interviews, conversion measurements or user success rates are claimed.

## Round one: baseline, decisions and acceptance

The baseline observations below come from repository source and an executed
registry census. They are not browser observations. Round two must inspect the
changed `/follow-the-money` build and repeat the actual tasks before acceptance.

| Finding and evidence | Impact | Decision / owner | Observable acceptance |
| --- | --- | --- | --- |
| The retained registry has 2,009 entities, 3,687 relationships, 5,313 cards and 3,073 sources. This is a curated corpus, not an NSE census. | A large graph can give a false impression of exhaustive scrutiny. | Show the official securities universe, resolved registry matches and reviewed-case membership separately; data platform. | A listed security with no retained case remains searchable and says what is absent. No zero-case company is described as cleared or suspicious. |
| There are 315 held items: 296 `contra`, seven `analytic`, two `role`, ten entities. Of all held items, 230 have sources. | A count of “315 hidden connections” would mostly rebrand responses as missing accusations. | Expose reasons and source-backed responses without mass promotion; platform/design. | Held details retain their reason, source IDs and linked claim. No unresolved endpoint or response becomes a money-transfer edge. |
| Existing IRB/NHAI and PM CARES records already provide multi-stage records but are spread across dossiers. | More data alone will not answer where a chain is documented and where it stops. | Curate readable cases with directed, typed steps and explicit stopping points; researchers/design. | Entry map → case → money hop → source and response → save/export works using the same stable IDs. |
| `src/graph/data.ts` includes a Penicillin-G PLI edge to MNRE and several inherited `documented` labels backed by one news report. | Blind reuse can turn a wrong authority or inherited tier into fresh verification. | Curated cases must recheck the administering authority, instrument, legal entity and source basis; research/platform. | No new case calls the PLI renewable-energy support or presents a legacy tier as a fresh source audit. |
| Older `docs/RESEARCH_PLAN.md` still describes PM CARES publication ending in FY2022–23; newer primary statements supersede that gap. | A research plan can become misinformation if copied into the current product. | Treat old plans as historical questions; use current retrieved source inventory; root/research. | Current case names FY2023–24/FY2024–25 accounts and separately identifies missing transaction notes or implementation records. |
| Contract award, licence bid, enterprise value, equity consideration, release, recognised income and payment have different meanings. | Uniform arrows and a grand total manufacture a cash trail. | Every monetary step needs payer, recipient, stage, period, currency and unit; research/platform/design. | A licence/concession can flow toward government; enterprise value is not treasury receipt; missing payment is visible and never zero-filled. |
| Legacy records often have null `statusAsOf` and generic response copy. | Search recency can be mistaken for current legal status. | New contested cases retain separately dated allegation, response and subsequent procedural outcome; researchers. | Inspector and export contain later bail, stay, dismissal or merits outcome with its limited significance. |
| Evidence and disclosure relationships have different graph semantics. | Ownership plus award plus donation can imply causation without evidence. | Label each relation and keep analytical links and responses outside factual money-path expansion; platform. | Following a path does not convert corporate control, ministerial office or an analyst hypothesis into a payment or influence finding. |
| Saved work already has stable identifiers, source closure and response closure. | A new case surface could lose context when exporting or navigating back. | Reuse that contract, retain current query/history, and test invalid IDs; design/platform. | Save/reload/JSON and Markdown retain source, response, limitation and stage. Deep links and native Back/Forward recover the selected case. |
| Search, map and long source ledgers create narrow-screen and keyboard risks. | A screenshot can hide an unusable core task. | Keep the primary task visible, disclose specialized evidence, preserve focus; design. | At mobile width no page overflow, reachable case/source/save controls, visible focus, Escape and native-history behavior. |

The held-item reasons further reconcile to six entities without direct citations,
four explicitly unresolved identities, 227 unresolved/absent/claim-target
endpoints, and 78 uncited relationships. Those categories describe different
failures. In particular, a claim-target response can be good evidence without
being a valid entity-to-entity graph edge.

## Research sequence and negative controls

Priority is editorial and practical, not a misconduct score. A case moves forward
when a new record resolves a specific uncertainty; it does not advance because
its actors are prominent or its headline amount is large.

| Priority | Checkable question / existing foothold | Next evidence and exact stopping rule | Negative control / alternative |
| --- | --- | --- | --- |
| P0 | Is the payment direction and accounting stage correct? | Trace sanction or borrowing → contract → bill/certificate → payment → recipient recognition. Keep gaps between stages; do not manufacture intermediate transfers. | Licence revenue reverses ordinary procurement direction. Accrual income can exceed receipts without missing money. |
| P0 | Does the named legal entity exist at the relevant date? | Match official CIN/ISIN/LEI/DIN or dated office identity, preserve legal names and ownership window, and separately identify reporting groups. | Similar names, shared addresses, common promoters and trading brands are insufficient identity keys. |
| P0 | What happened after the allegation or audit? | Read respondent position, action-taken report and later order; distinguish allegation, interim assessment, bail/stay and merits decision. | A subsequent procedural dismissal neither proves the allegation nor clears its merits. No located reply is a search limit, not proof of silence. |
| P1 | Can the existing NHAI → IRB project/ownership/donation chain be read coherently? | Use March 2023 package table and FY2023–24 annual-report perimeters. Keep package award, corporate holdings and consolidated political contributions distinct. | Standalone parent reports NIL political donations while the consolidated group reports ₹67.62 crore. Subsidiary amounts cannot be added again or allocated to parties without a source. |
| P1 | Does a selected procurement screen survive original-document inspection? | Obtain notice, amendments, bid evaluation, award/contract, exact lot and payment. Old seven-case CPPP follow-up verified zero fresh original documents. | Same buyer/category/year multi-bid comparison is illustrative; differing route/lot scope prevents treating it as a matched causal control. |
| P1 | Is a public-service or welfare finding correctly bounded? | Retain audited year, scheme, population, sample and auditee reply, then obtain expenditure and service-output records for that same scope. | Audit samples are not national prevalence; procedures are not necessarily patients; cumulative exclusions are not a current caseload. |
| P1 | What does privatisation transfer, and what cash was received? | Separate asset/equity transfer, assumed debt, enterprise value, sale proceeds and later capital investment; identify purchaser/SPV and completion date. | A large headline valuation can include debt. A concession is not necessarily a sale of government assets. |
| P2 | Does allocation or donation concentration exceed the appropriate market baseline? | Define complete eligible population, period and procedure, then preserve donor-volume and industry opportunity in comparisons. | Rival groups, earlier governments and opposition-run states receive the identical screen; reshuffling dates alone may be invalid with windowed bond purchases. |
| P2 | Are apparently repeated works the same asset or obligation? | Require chainage, asset ID, package/lot, scope, maintenance period and bill references. | Similar descriptions can be separate stretches, renewals, maintenance, amendments or database versions. |
| P2 | Which company/sector gaps can be closed next? | Use official universe coverage and missing source classes to choose records; expand one bounded source family at a time. | An absent company or relationship reflects this corpus until a complete authoritative list demonstrates a true absence. |

Existing source-backed findings worth exposing include the IRB standalone versus
consolidated disclosure distinction; PM CARES receipts/payments versus announcements;
debt write-off versus waiver or cash recovery; coal auction versus later vesting
chronology; and recorded auditee replies in welfare. They are useful even when
they weaken an apparent impropriety narrative. Their visibility must not require
promoting refuted or unresolved claims.

## Sourcebook used for the review

These pages were actually opened on 7 October 2026. Their methodological advice
informs the checklist; it does not corroborate any Indian case. The GIJN articles
are paraphrased here, not reproduced. Search results alone were not accepted as
reading a source.

| Source opened | Relevant guidance and application | Limit |
| --- | --- | --- |
| [GIJN, Researching Corporations and Their Owners](https://gijn.org/resource/researching-corporations-and-their-owners/), updated 7 December 2023 | Start with corporate filings and financial-statement notes; use company, court, land, subsidy and procurement records to test ownership and activity. Follow the reporting perimeter. | A registry entry is not necessarily ultimate beneficial ownership. The guide is older; its descriptions of current registration laws are not used as current legal advice. |
| [GIJN, Introduction to Investigative Journalism: Following the Money](https://gijn.org/resource/introduction-investigative-journalism-following-money/), Miranda Patrucic and Jelena Cosic, 26 November 2024 | Broaden searches across jurisdictions; identify intermediaries and controlling interests; examine notes, receivables, liabilities and court records. Ask what record discriminates between explanations. | Shared address or an offshore company alone is not evidence of illicit activity. No access to private databases or human-source reporting is claimed. |
| [Open Contracting Data Standard 1.1.5, Release Reference](https://standard.open-contracting.org/latest/en/schema/reference/) | Separate planning, tender, award, contract and implementation. Preserve distinct party roles and legal identifiers; issue a new version when the record changes. This supports typed stages and append-only source history. | A data standard is not an Indian procurement-law finding. Its schema and examples do not supply a missing payment in this corpus. |
| [Department of Expenditure, manuals inventory](https://doe.gov.in/manuals) | The live publisher lists the Works Second Edition 2025, dated 5 January 2026, separately from the 2022 manual. Check the applicable version and organisation before applying a procedural rule. | The inventory verifies version availability only. A current manual cannot retroactively establish the rule governing an older contract. |

The open repository protocols also apply: `.claude/skills/cui-bono/SKILL.md`,
`evidence-tiering/SKILL.md`, `source-retrieval/SKILL.md` and
`investigation-workspace/SKILL.md`. A locally requested persona/model is not a
claim that that external model ran. Sources read through an indexed mirror must
remain labelled as such; a hash proves the retained bytes, not their truth.

## Round two: implemented-artifact review

The following corrections resulted from the source challenge, before final
browser acceptance:

| Actual check | Resulting correction / acceptance |
| --- | --- |
| Opened original PIB release 1691185, 22 January 2021, and the 12 April 2024 Reporters’ Collective article. The former already lists Penicillin G approval through Lyfius; neither supports an MNRE award. | Withdraw wrong live edge. Preserve its original object and correction rationale in `legacy-corrections.json`, and its old saved-record ID as a withdrawn card with no drawable replacement relationship. |
| Legacy M3 combined November 2022 and November 2023 events while declaring a 90-day window. | Replace asserted match with an analytic question and the disconfirming chronology. Keep the separate reported bond amount at its stable ID; no 48-hour “first approval” claim. |
| Opened retained original SEC LR26554. It says proposed judgments subject to court approval; penalty payment is not established. | Correct six Atlas source lines, including nodes, old status edge, consent edge and counter-record. Before/after source lines are archived; explicit IDs preserve prior content-hash identifiers. Root owns correction of the generated fleet’s raw counterpart. |
| Old research plan claimed FY2023–24/FY2024–25 PM CARES accounts unavailable. Newer original statements are already retained. | Update that agenda to reconcile published statements and obtain referenced notes/audit report/implementation records; remove assumed refusal and unaudited-period assertions. |
| Independently read the retained Air India closing release, budget, AAI receipt release and IRB closing announcement. | Air India ₹2,700 crore receipt differs from ₹15,300 crore retained-in-airline debt; budget provisions differ from subsequent actuals. AAI ₹710.88 crore concession fees cover six airports. IRB ₹1,714.92 crore covers equity plus debentures, with seller allocation not established. |
| Opened the subsequent 2023–24 budget, whose FY2021–22 actual column reports AIAHL equity of ₹62,365.40 crore; the previous revised estimate was ₹62,057 crore. | Preserve both stages and the changed past-dues component. Do not describe the difference as an extra payment to Talace. |
| Read SEC complaint §§131–141 and both retained August/September 2026 district-court orders. The proposed $200 million arrow pointed to a purchasing programme, although no such recipient was established; the transfer date reused a later PPA announcement. | Remove the pseudo-payee relationship, keep the named regulator’s allegation in a response-linked record, and leave exact transfer date null with the December 2022/February 2023/December 2023 sequence. Verify the allegation record remains in case/export closure. |
| The same legal source review confirms the split criminal disposition, while the later mandamus event is secondary reporting. | Keep the three dismissed defendants separate from the five others. Label the combined later DOJ-position edge reported, remove the unopened MLex lead from substantive claims, and retain the unverified final-appellate-outcome limitation. |
| Read the original Byju’s Supreme Court judgment: GLAS is an administrative/collateral agent. It is not identified as the beneficial lender population. | Change the GLAS link from `loan` to `credit-facility-agent`; distinguish the $1.2 billion facility, guarantee and ₹158 crore escrow direction. No new funder is invented. |
| Services’ generic status text said “Documented” on reported/self-reported rows; some entity and finance geography inherited a case’s location. | Use neutral source-retained status. GLAS/US Alpha do not acquire Karnataka headquarters; national courts and ministries do not acquire the hospital address; trust-wide funds do not become kitchen-local spending. |
| Visually inspected the Akshaya Patra report’s printed pp155–156, alongside the researcher’s typed record. | Schedule B ₹36,788.98 lakh receipts and its adjustments support the distinction from recognised state-support income. No implied missing-money subtraction or earmarked-grant-to-rent trace is accepted. |
| Actual Vite page at `http://127.0.0.1:4178/#/follow-the-money`, 1440×1000 and 390×844, while researcher slices were still pending. | No horizontal overflow observed. Requested mobile map before the full case brief and removal of a blanket “documented entities” label. This is an interim UI observation, not acceptance of the complete case task. |
| Implemented source buttons called every linked item an original, although some court texts are indexed mirrors; matched company rows did not yet distinguish reviewed-case membership. | Use “cited source”, expose matched-company case links/count or explicit absence, add an inspectable retained response card to the held appendix, and change the action to “Follow this trail”. |
| A keyboard trail jump initially moved the viewport without focus. | Focus the trail container as it scrolls; the next Tab reaches a trail step, and Enter opens/focuses its evidence inspector. |
| Intermediate corporate/procurement payloads contained concatenated prose. | Researchers rewrote user-facing summaries, stages, limitations and responses before freezing their slices. This was a reading-task defect, not evidence against the source claims. |

`npm run validate` passed after the Atlas corrections. An executed registry
assertion confirmed wrong edge absent, old withdrawn card present, bond/SEC IDs
preserved, and proposed-consent wording present. These checks do not validate
unrelated inherited claims.

The independent task runner is `scripts/deep-investigation/panel-browser.mjs`.
An interim run against the actual development page with all 13 cases passed
24 checks across four scenarios with zero page errors. It exercised the full
Khyati source/response/save/export task, exact-ISIN company coverage,
Back/Forward restoration and mobile keyboard access. Two early runner assertions
read React state before the scheduled render/focus completed; they were corrected
to await the requested observable state. They were test-harness timing defects,
not reported as product defects.

## Final panel: frozen production artifact

**Accepted for the bounded, source-attributed investigation workflow.** The
independent reviewer served the existing `dist-deep-release` directory without
rebuilding it, completed the tasks below in Chromium, and inspected the resulting
desktop and mobile screenshots. This decision concerns the implemented workflow
and the challenged case claims; it is not certification of every inherited
relationship, an all-company investigation, or a finding of misconduct.

Executed command:

```sh
PANEL_DIST=dist-deep-release node scripts/deep-investigation/panel-browser.mjs
```

The run passed **24 assertions across four task scenarios**, with **zero failed
tasks and zero browser page errors**, in the build containing 13 casefiles.
Khyati was the complete end-to-end browser example; this does not claim that all
13 cases received the same browser task coverage. The
entry page SHA-256 is
`dfe2e8b2fafecb3ed3b23b4d7034e632c0619c05f23e08d87a44218d493d3e8a`.
Its entry bundle is `assets/index-DP0q_fdz.js`, SHA-256
`8803d583bd19124c7e658d1f0a40e4e270b89ca7afb3ec733d76e401a4d17aa8`.
The [machine-readable receipt](panel-browser/review.json) also identifies the
entry stylesheets. A relative-asset-path error in an added receipt hash collector
was fixed before the final successful run; it did not change the application or
the frozen directory.

| Model-agent perspective | Actual task and observed evidence | Final decision |
| --- | --- | --- |
| UI/UX design | At 1440×1000, select Gujarat on the map, open Khyati, inspect the reported-earnings hop, then its Indian Express citation and later response. Reload the exact source URL. The map state, case ID and source inspection persist. At 390×844 the map precedes the full brief and the page does not overflow horizontally. Keyboard activation of “Follow this trail” preserves the route, moves focus, and makes the next trail step reachable with Tab and Enter. | Accept. The geographic entry, readable case brief and inspectable evidence now form one working task. The source's sessions-order access limit is visible. Long source and response text appropriately extends beyond one viewport. |
| Audience, presentation and marketing research | The title explains the task: trace contracts, financing and ownership to documents. Case amounts name their stage and explicitly are not added together. Khyati's ₹16.64 crore reported earnings are not described as verified cash or proven loss; the later bail and reported discharge refusal are retained. Exact-ISIN searches produce an unmatched listing with an explicit coverage gap and a matched listing with separate reviewed-case membership. | Accept for readers seeking checkable public records. Counts describe casefiles, retained relationships and securities, not independently proved incidents. This is a message-clarity review, with no invented audience interviews, conversion result or corruption claim. |
| Senior technology | Save the case, reload, export evidence JSON and the casebook's Markdown reading brief. Every expected response record and citation remains in the case packet; amount observations keep period, stage, currency and unit. Native Back/Forward restores exact company searches. Code review confirms reuse of the shared casebook, lazy route, memoized indexes/closures, paginated discovery, and deferred held-item rendering. The old withdrawn claim's ID remains recoverable without restoring its invalid edge. | Accept within the tested dataset and Chromium environment. Stable IDs, explicit identity failures and retained correction history support reproducibility. No graph size or relevance score upgrades a hypothesis to fact. Cross-browser, screen-reader and slow-device performance certification are not claimed. |

Retained visual evidence:

- [Map and selected case, desktop](panel-browser/map-and-case-desktop.png)
- [Money step and evidence inspector, desktop](panel-browser/money-step-desktop.png)
- [Cited source inspection, desktop](panel-browser/source-and-response-desktop.png)
- [Keyboard-selected evidence, mobile](panel-browser/mobile-evidence-inspection.png)

One nonblocking visual issue remains: long entity labels can overlap in the
compact network view, including the hospital company's full legal name in the
retained desktop screenshot. The exact ledger and evidence inspector remain
readable and reachable. A later graph-layout pass should improve label placement
without shortening or merging the legal identities; it is not a reason to
rewrite the frozen, tested release.

The accepted scope still has substantive research limits. The 2,599-security
universe is a coverage denominator: 155 exact registry matches and only three
explicit reviewed-case identity bridges do not establish nationwide company
coverage. Held items keep their failure reasons. Some primary documents are
retained only through indexed mirrors; some payment reconciliations, beneficial
owners and final appellate outcomes remain unavailable. Case-specific closure
tests identify what would resolve each gap. These are research priorities, not
implied exonerations or accusations, and the next update must preserve the old
record and its source history when new evidence changes the answer.

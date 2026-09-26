---
name: cui-bono
description: The who-benefits protocol. Use whenever a decision — an award, PPA, clearance, rule change, auction, privatisation, subsidy or cash scheme — is being recorded, to name the beneficiary, the mechanism, the amount, the rivals, the boring explanation and the falsifier, and to cross-examine the result before it enters the graph.
---

# Cui bono

"Who benefits?" is the right first question and the wrong last one. Asked first, it
turns a policy event into a ledger row that can be checked. Asked last — as a verdict —
it is the engine of every conspiracy board: someone always benefits from everything, so
the answer is always "yes", and a question whose answer is always yes measures nothing.

This skill makes the question **a ledger row, not a verdict**. It pairs with
`evidence-tiering` (the tier), `pattern-discipline` (the denominator) and
`fact-check-workflow` (the claim log). The research fleets record its output in the
`benefit` field of a claim (see `docs/research/FLEET_CONTRACT.md`).

## 1. Fill the row before you form a view

| field | what goes in it | if you cannot fill it |
|---|---|---|
| **who** | the entity that gained — a node id, never a family name or a "group" that has no legal existence | the row is a hypothesis; do not record it as a benefit |
| **how** | the mechanism, one sentence, from the taxonomy in §2 | you have an association, not a benefit |
| **amount** | ₹ crore, with the source and whether it is contract value, revenue, margin, subsidy or market-cap move — these are not interchangeable | `confidence: unknown` and say why |
| **when** | the decision date AND the beneficiary's position date (did they hold the asset / the licence / the office at the time?) | run the date test; it kills most rows |
| **rivals** | who else bid, applied or qualified, and what they got | a beneficiary with no rivals is either a monopoly fact or an unexamined field |
| **counterfactual** | what the beneficiary would have got under the rule that applied before | without it "benefit" has no size |
| **boring explanation** | the reading in which nobody did anything wrong that also fits every fact in the row | if none fits, say so — that is a finding; if one fits, it goes in `innocentReading` |
| **falsifier** | the specific, findable record that would kill the row | none → unfalsifiable → does not enter the graph |

## 2. Mechanisms — name the one you mean

- **Price** — a tariff, a floor, a ceiling, a pricing-formula change (gas price, PPA tariff, revenue-share bid). Measured as ₹ per unit × volume.
- **Volume** — a mandate, a quota, a purchase obligation, a captive market (coal-import direction, ALMM, renewable purchase obligation).
- **Exclusivity** — a licence, a block, a geographical area, a sole-bidder award. Measured against the number of eligible rivals.
- **Timing** — an approval, extension or clearance whose date carried value (a PPA signed before a tariff fell; a scheme launched before a poll). Measured in months and in the price difference.
- **Risk transfer** — a guarantee, a take-or-pay, a late-payment surcharge, a liability cap (nuclear liability, discom dues). Measured as the expected loss moved.
- **Regulatory moat** — a standard or list that rivals cannot meet (ALMM, domestic-content, technical qualification). Measured as rival exclusion.
- **Information** — early sight of a rule change or tender. Almost never documentable; record as a void, not a benefit.
- **Political** — votes, cadre, funds. Only for the welfare fleet, and only with the control (§4) attached.

## 3. Two failure modes, equal and opposite

**Credulity**: the beneficiary is named, therefore the decision was for them. This is the
post-hoc fallacy with a ledger attached. The cure is the base rate: what share of
comparable decisions produced a comparably concentrated beneficiary? If most do, the
row is a fact about the industry, not about the decision.

**Reflexive dismissal**: "that is just how procurement works" — waving off a documented,
dated, sized benefit because the story sounds familiar. The cure is the same base rate,
read the other way: if the concentration is far above comparables, the boring explanation
has to carry more weight than it can.

The row is finished only when both readings have been written down and one has been
found wanting on the evidence — or when the honest verdict is *contested*.

## 4. The cross-examination pass

Run after the row is filled and before the tier is set. Switch roles: you are now trying
to destroy your own row.

1. **Steelman the innocent reading.** Write it as its strongest advocate would.
2. **Key assumptions.** List every unstated premise ("the minister knew", "the bid was
   rigged", "the timing was chosen"). Strike each you cannot source.
3. **Competing hypotheses.** At least three: intent, incompetence, coincidence. Which
   evidence discriminates between them? If none does, the row is *speculative* at best.
4. **The crux.** One findable fact that would settle it (a file noting, a bid register, a
   dated letter). Name where it would live. That is the `upgradeIf` / `killIf`.
5. **Premortem.** Assume the row is published and turns out wrong. What was the most
   likely error? Date? Identity (a Reddy for a Reddy)? A conjunction that felt stronger
   than its parts?
6. **The symmetric control.** Run the identical row on a rival group, an opposition-run
   state, an earlier government. If it produces an equally striking benefit, the method is
   generating the finding.
7. **Conjunction check.** Each clause added to the story lowers its probability and
   raises its persuasiveness. Count the clauses.

## 5. Calibration ladder (for narratives, not for claims)

`established` · `well-supported` · `contested` · `speculative` · `unsupported` ·
`debunked`. Record, for each narrative, the strongest case, the strongest counter and
**what would change the verdict** — the last is the most valuable line on the page.

## 6. What this skill will not do

- Name a beneficiary that is a private individual with no public role.
- Record a benefit without an amount *or* an explicit `confidence: unknown`.
- Let "who benefits" stand in for "who decided" — the second needs a record, the first
  needs only arithmetic.
- Convert a ledger row into an allegation. A benefit is a fact about outcomes; an
  allegation is a claim about intent, and it lives in the graph as `alleged` with its
  denial, or not at all.

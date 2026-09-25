---
name: investigative-desk
description: Assemble documented-but-unreported links between bills, schemes, contracts, companies, individuals and parties — through a reporter/documentalist/skeptic pipeline that publishes only what a primary record establishes. Use when asked to investigate connections, write up findings, or turn prospector output into publishable work.
---

# Investigative Desk

Three roles, run in order, on every claim. You play all three, and the third one has
a veto.

## The reframe that makes this work

The ask is usually phrased as **"find the links the media hasn't reported"**. Taken
literally that is unfalsifiable — an unreported link with no record behind it is
indistinguishable from an invented one, and a page built on that premise is a
conspiracy board with citations bolted on.

There is a version of the same ask that is rigorous, valuable, and mostly untouched:

> **Documented but unreported.** A primary record establishes the fact. No outlet has
> assembled or published it.

That is not a lesser version. It is what investigative journalism actually is —
someone reading the annexure nobody read. And in this domain the supply is enormous:
consolidation annexures listing 258 entities, AOC-1 schedules with CINs and former
names, gazette notifications, RTI replies, concession agreements published on a port
authority's own site, ABR name histories.

So the test for publication is two questions, both required:

1. **Is there a primary record?** Filing, gazette, court order, audit report, RTI
   reply, official portal, statutory annexure.
2. **Has any outlet published this?** Search properly before claiming novelty.

| Record | Coverage | Verdict |
|---|---|---|
| Yes | No | **Publish.** This is the category the desk exists for. |
| Yes | Yes | Cite the outlet, add what they missed, or drop it. |
| No | No | **Not a link.** It is a hypothesis — send it to the prospector. |
| No | Yes | Report *that an outlet claims it*, tiered `reported`, with the denial. |

Row three is where most "unreported links" actually sit, and calling it what it is —
a hypothesis — is the single most important thing this skill does.

---

## Role 1 — The reporter

**Job:** find what happened and who was involved.

- Start from the record, not the theory. A concession agreement, an annexure, a
  gazette notification. Read `source-retrieval` before concluding a document is
  unreachable — the annual report is usually on the exchange archive even when the
  company's own site 403s.
- Establish the **chronology first**. Who held which office on which date, who owned
  which entity in which quarter. Most bad investigative work is a true set of facts
  attached to the wrong year.
- Name the parties precisely. Legal name, CIN, and the distinction between a legal
  name change, a trading name, and a brand. "Adani Mining Pty Ltd was renamed Bravus"
  is false; Bravus is a business name on the same ABN.
- Record what you looked for and did not find. An absence you searched for is
  evidence; an absence you never checked is not.

## Role 2 — The documentalist

**Job:** make every assertion traceable and every gap visible.

- Every claim gets a source you actually opened. A search-result snippet is not a
  source. A broker mirror of a filing caps the claim at `reported` — say which you read.
- Every figure gets an `asOf`. A market cap or a shareholding without a quarter is a
  claim about now, and it is false by the time it is read.
- Build the **citation ledger** as you go: URL, what it establishes, what it does not,
  retrieval date, and whether it is primary or secondary.
- Publish the gaps in the same artefact as the findings, at the same prominence.
  A dossier whose gaps live in a footnote is arguing, not documenting.
- Where a document could not be reached, say which one and why. "adaniports.com
  returns 403 to automated fetching" is a useful fact for the next person.

## Role 3 — The skeptic

**Job:** try to destroy the story. This role has a veto and is expected to use it.

Run these in order and stop at the first failure:

1. **The date test.** Does the event fall inside the tenure or ownership window it is
   attached to? In the reference corpus four of seven allegations died here. It is the
   cheapest check and the highest-yield.
2. **The identity test.** Same person? Same company? Require DIN, CIN, constituency,
   or office-with-dates. Two distinct companies share the name "Adani New Industries
   Limited" with different CINs — one operating, one a dissolved shell.
3. **The base rate.** What share of comparable entities show this same property? If
   most do, the link proves nothing. 82.45% of electoral-trust money went to one
   party; ~100% of responding PSUs gave to PM CARES; CSR is a statutory 2% levy.
4. **The denominator.** "Won 9 blocks" is not a fact until it is "9 of 125, against 91
   distinct winners". The second sentence often destroys the first.
5. **The innocent reading.** Write the boring explanation that also fits. If you
   cannot write one, you have not understood the situation well enough to publish.
6. **The control.** Run the identical analysis on a comparable entity nobody has a
   theory about. If it looks equally striking, the method is producing the result.
7. **The denial.** Find what the named party said. If they were never asked, say so —
   that is a weakness in the piece, not a neutral fact.

**A killed story is a successful output.** Say plainly which check killed it and move on.

---

## Using the prospector

The prospector generates candidates exhaustively and hands over survivors. Those are
**questions, not leads with momentum**. Treat a survivor exactly as you would treat a
tip from a stranger: interesting, unverified, and subject to all three roles above.

Never publish a prospector survivor as a finding. Its q-value says it beat a null
model on a graph — it says nothing about whether the underlying facts are true, or
whether the entities are correctly resolved.

## What the desk publishes

A page per investigation, carrying:

- **What the record establishes**, tiered, with the primary document cited inline
- **What no outlet has published**, with the search that establishes novelty
- **The chronology**, because most errors are date errors
- **The base rate**, so the reader can see whether the pattern is unusual
- **The innocent reading**, given the same prominence as the claim
- **The gaps**, including documents that could not be reached
- **What would change the conclusion** — the upgrade and kill conditions

## What the desk never publishes

- A link with no primary record. That is a hypothesis; label it one.
- A pattern without its denominator.
- An allegation about a named individual without the record and the response.
- A claim of novelty that was not actually searched for.
- Anything about a private individual with no public role.
- The phrase "the media hasn't reported this" as a substitute for establishing that
  it is true.

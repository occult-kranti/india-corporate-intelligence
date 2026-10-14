# Political finance and institutional oversight — research log

Review date: **14 October 2026**. Primary period is **26 May 2014–14 October 2026**. The earlier fifteen-year project window would begin 14 October 2011; this stream uses a clearly marked March 2014 judgment and its pre-2010 transactions as historical context. No inaccessible private account, complete donor universe or secret correspondence was assumed available.

The delivered stream contains **3 cases, 13 source entries, 18 source-scoped entities, 19 recorded relationships, 4 separate proposed questions, 6 discriminating tests, 4 rejected joins and 5 coverage entries**. These counts describe this selected file, not the population of Indian political funding. No money amounts are attached to these institutional edges, and no totals, crime probabilities or newly trained model results are claimed.

## Round 1: research questions and source acquisition

The political-finance AI research agent proposed three themes to the lead: electoral-bond disclosure and the corporate cap, retrospective FCRA donor classification, and the election-overseer appointment design. These were narrowed into concrete missing records: the post-2019 collection inventory, donor-specific reclassification decisions, and candidate-selection/oversight decision records.

The Exa Search skill and its searching/source-quality references were read. All three initial Exa queries failed with **HTTP 402, credits exhausted**; their 18 requested slots are **not sources reviewed**. The lead disclosed the failure and confirmed that the user's instruction to use all available resources authorized an explicitly logged alternative. Subsequent discovery used the generic web connector, and known original URLs were fetched directly with Python's standard-library HTTP client. `searchLog` records query families; entries prefixed “Alternate web” are not Exa. A zero requested-results value means the alternative tool offered no equivalent result-count parameter, not zero results inspected. Search returns included unrelated foreign tax statutes and cases with the same case number; they were excluded.

Original documents freshly acquired and inspected:

- Supreme Court **15 February 2024** bond judgment: selected lead-opinion paragraphs 24, 108, 124–127, 209–219 and amendment table. This was already a source in the wider repository, but its **217–218 collection-duty issue** was newly inspected for this hypothesis; the existing summary was not promoted without rereading.
- Supreme Court **2 August 2024** order in Common Cause and connected petitions: all eight substantive order pages read. Court registry appearance sheets were not substantively analyzed.
- MHA-hosted two-page Gazette extracts of **Finance Act 2016 section 236** and **Finance Act 2018 section 220**: both scans visually checked, including covers and highlighted substantive sections. These official files are the source for the amendment language, rather than news paraphrases.
- MHA's **7 March 2018** parliamentary explanation reproduced by PIB: release body read and exact HTML retained. This is the government's own explanation, not independent proof of consequences.
- Parliament's appointment **Bill as passed by Rajya Sabha on 12 December 2023**: cover and relevant clauses read. It remains labelled a Bill; it is not substituted for an enacted statute.
- The **23 September 2026** original-form Supreme Court opinions and joint order in *Dr Jaya Thakur*, copied by Supreme Court Observer: opening statutory definitions, selected Datta reasoning/conclusion, Sharma's relevant reasoning and the final joint order read. Most precedent discussion was not read. The mirror's byte equivalence to a court-hosted copy was not verified.

Additional source limits are visible in each source entry:

- Delhi High Court's **28 March 2014** text was inspected through Indian Kanoon because direct HTTP retrieval returned 403. Selected exact court paragraphs were captured with the tool's link markup. It is a mirror, not a certified court-hosted PDF.
- IndiaCode and official Gazette endpoints timed out or returned 503. The final **Act 49/2023** and **S.O.35(E)** were read as Gazette text reproduced by Gazette Tracker. This limitation is explicit. Some commercial search summaries said commencement was 2 February 2024; the reproduced notification says **2 January 2024**. The inconsistent summary was rejected. Final official byte verification remains desirable.
- The ADR litigation tracker is an interested-party source. Its FCRA entry still contains a prospective **6 February 2026** listing lead even though other parts of the page have newer dates. That entry cannot establish current case status. The short captured extract retains this staleness.
- PTI's **4 April 2025** report describes a **26 March 2025** dismissal of a review concerning confiscation. The original review order was not obtained; the source is labelled secondary-only.
- Economic Times reporting dated **8 October 2026** describes an oral recall mentioning on **7 October**. It is not a signed later order. No personal-bias or family-influence edge was created. The reporting itself distinguishes apprehension of impartiality from imputing actual bias.

The original ADR 2018 petition was inspected through the web tool for discovery, but its full PDF contains private identifiers that were unnecessary for this task. It was not downloaded into the publication corpus. Only the short case-tracker extract needed for attribution is retained. No emails, requests for records or external messages were sent.

## Findings and tests

**Electoral-bond collection:** the specific documented anomaly is the divergence between ECI counsel's reported one-window collection and the Court's interpretation of a continuing duty. It is not evidence of a Finance Ministry instruction to suppress information. That possible inter-agency influence is a separate question requiring the versioned note, advice, dispatch chain and inventory. The August 2024 order directly attacks the stronger leap from donation/award proximity to quid pro quo. Its refusal to order an SIT also does **not** exonerate every individual transaction. The required next step is to distinguish data absence, custody mismatch, interpretive error and deliberate obstruction with actual records.

**FCRA reclassification:** the enacted text confirms the conditional exception and retrospective extension, but it does not identify which receipts qualified or what enforcement files were closed. A donor must meet the applicable foreign-investment limits; “all foreign contributions became lawful” is an invalid generalisation. MHA's stated FDI/company-law/CSR consistency rationale is retained. Comparators must include both BJP and Congress, other recipients and companies with the same date-specific ownership and investment conditions. The 2014 Court used **prima-facie** language and directed reappraisal. Calling this a criminal conviction, as advocacy shorthand can imply, is rejected. Historical Vedanta, Sterlite and Sesa entities are not merged with current successors.

**Appointment and oversight:** statutory composition creates a possible incentive channel. It does not establish selectors' votes, private commands or biased outcomes. Transparent procedure, no reappointment and removal protections are rival institutional mechanisms. The September 2026 joint order places papers before the CJI to consider a Constitution Bench; it does not decide the constitutional merits. A valid follow-up would use predefined comparable oversight decisions, all parties and adverse as well as favourable outcomes, alongside selection minutes. The pre-2023 appointment baseline must be included; treating the short interim court-prescribed mechanism as India's entire earlier history would mislead.

All six tests are **retrospective analytical specifications**, created after inspecting the outcomes. Future review dates are administrative reminders, not forecasts. No Nash equilibrium, private payoff estimate or causal effect was calculated.

## Round 2: actual independent challenge and corrections

The separate hypothesis-challenge AI agent independently read the August 2024 order and the end of the September 2026 opinion PDF. It required preserving ordinary-remedy reasoning without treating the SIT refusal as exoneration, and the final joint disposition rather than merging separate opinions. Both qualifications were retained.

Its material correction concerned temporal authority: the initial appointment worksheet dated its decision to **12 December 2023** while listing the later statutory selectors as if those selection powers already existed. The worksheet now describes the **Bill-stage Parliament and sponsoring Law Ministry decision**, explicitly marks the later selector roles as prospective, and labels assent/commencement as later outcomes. No statutory power is backdated.

Self-review also removed an unsupported exact Finance Act 2017 assent date from a graph edge (the year remains), attached the commencement source to each dated statutory-role edge, and made the party-name identity source explicit: the inspected historical judgment uses numbered respondents, while ADR identifies the parties by name. This avoids suggesting that every name is spelled out in the retained court extract.

## Captures, validation and handoff

`raw/political-finance/acquisition-receipts.json` records each source URL, local capture path, byte count, filesystem timestamp, inspection scope and SHA-256. Original downloaded bytes are distinguished from source-text excerpts and researcher paraphrases. A hash certifies the retained bytes, not the truth of a proposition. Complete PDF acquisition is never called complete reading.

Per-stream schema validation through `validateStream` passed after chronology and actor-role corrections. The lead's combined validation, rendered-page and deployment tests remain separate responsibilities. No git commit was made by this researcher.

Remaining gaps are consequential: no all-donor join, no newly acquired account-to-contract transfer trace, no receipt-level FCRA closure census, no full selection minutes, no matched ECI outcome panel and no complete current disposition for the FCRA constitutional challenge. Electoral trusts, party RTI, tax exemptions and post-bond channel migration are roadmapped and explicitly uninvestigated in this stream. These selected questions cannot substantiate a claim that the entire Modi administration forms a conspiracy.

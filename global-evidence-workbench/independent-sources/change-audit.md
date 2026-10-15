# Deleted/replaced-record audit addendum

The machine-readable ledger distinguishes reported history from independently captured file versions. None of its cases has an independently obtained before/after byte pair; all original-file hashes remain null. A 403, a 404, an absent index entry, a changed file length and a changed visible page are different observations.

## Reported withdrawal and return

[AP reported](https://apnews.com/article/9290fcaad1cb6fcb1cbc1befabc01994) on December 20, 2025 that at least 16 previously available files had become inaccessible. [TIME's December 22 follow-up](https://time.com/7342104/epstein-files-trump-doj-redactions-backlash/) identifies EFTA00000468 and attributes its restoration to DOJ's December 21 statement: a victim-protection review found no evidence victims were depicted, and the image was reposted unchanged. This supports a reported temporary publication change, not an independently verified same-byte restoration or an inference about motive. The directly linked DOJ social statement failed to render in our retrieval; no photograph was downloaded.

## Independent change-audit leads

The [rhowardstone removal audit](https://github.com/rhowardstone/Epstein-research/blob/main/institutional/DOJ_DOCUMENT_REMOVAL_AUDIT.md) discloses major corrections: its initial 78,234 count included roughly 10,450 false positives associated with age-gate 404s. A later sample found further live files. Its estimated approximately 64,259 historical removals therefore must not be presented as our verified count or current state. EFTA00053963 is a dated case-level lead (author-reported February 21, 2026 404), with no independently verified original capture/hash here. The report acknowledges HEAD checks do not inspect content. Its legal conclusions about permissible withholding were not independently validated.

The [alteration report](https://github.com/rhowardstone/epstein-research/blob/main/institutional/DOJ_DOCUMENT_ALTERATION_FORENSICS.md), updated March 5, 2026, describes word, pixel and LLM comparisons. EFTA00339454 is useful because the author distinguishes visual privacy redactions, text-layer errors and restored sender text within one reprocessing episode. That mixed pattern undermines treating every text difference as concealment. Its broad percentages and labels are unvalidated here. The report also calls an August 6, 2025 email post-enactment, although EFTA was signed in November 2025: this is a concrete chronology warning requiring correction before reuse. No linked archived originals or removed personal details were retrieved.

## Minimum proof of replacement

For each authorized record, preserve: custodian URL; observed final URL; dataset and Bates/page IDs; retrieval UTC; request method; response class and content type; index-membership evidence; actual source-byte SHA-256; page count; extraction version; and transformation hash. For before/after versions, compare bytes, rendered-page appearance and text layer separately. PDF recompression may change bytes without changing content; OCR may change searchability without changing appearance. A withdrawn file may later move, merge or return. Timing needs actual captures rather than an article's update date.

Maintain competing hypotheses: justified privacy correction; technical reprocessing/migration; temporary gating/CDN failure; accidental publication; substantive withholding. Require a discriminating record such as a custodian revision log, official correction explanation, or authenticated permitted capture pair. Never recover removed private information, de-redact protected content, bypass a denied gate, or mistake an AI label for a legal conclusion.

This pass stops at documented history and a screened verification queue. It has not established a live deletion count, systematic suppression, or a causal explanation for changes.

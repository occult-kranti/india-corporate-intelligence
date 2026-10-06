# Education intelligence: panel decision ledger

Baseline: `76c0c3548a833ffad37fcb00c3c7ab4a781cd2d7` on
`claude/india-market-intelligence-build-n7in1n`. Working branch:
`codex/education-funding-intelligence`. Research retrieved 6 October 2026.

These are independent AI role reviews, not interviews with users or professional
endorsements. The lead moderates and integrates; specialist agents own research,
funding, data engineering, education UX, shared design, and model tooling. The
available Codex agents perform the reviews. Repository personas that request
Claude Opus are treated as role instructions, not a claim that Opus was invoked.
The separately executed open-source model is recorded in `MODELS.md`.

## Round 1: baseline assessment and implementation

| Finding and evidence | Task impact | Decision and owner | Acceptance check |
| --- | --- | --- | --- |
| `Layout.tsx` mobile header expands a flat list of more than 30 destinations without a bounded scrolling region. | Lower destinations can become unreachable. | Accepted: grouped searchable navigation, native modal mobile menu, Escape/focus restoration; design lead. | Mobile navigation reaches education and the final tools, keyboard focus remains in the dialog and returns to its trigger. |
| `Dashboard.tsx` puts a long manifesto before useful entry points. | New readers have difficulty choosing an investigation. | Accepted: concise editorial introduction and education entry, while retaining existing metrics and their qualifications; design lead. | Existing routes remain reachable; first viewport provides useful destinations. |
| Existing register semantics distinguish primary records, reports, allegations, and analysis. | A new funding total or closure label could misrepresent the source. | Accepted: source-first education register with publisher, period, scope, limitations; data engineer and education UX. | Every source reference resolves; claims retain limitations at their point of use. |
| Official school-count series measure institutional stock, not closure events. | Subtraction can be mistaken for verified closures. | Accepted: label net changes; require closure orders and comparable child-population evidence for further investigation; public researcher and data engineer. | Missing/mismatched population, management, geography, or dates cannot produce a confirmed anomaly. |
| Official population projections separate total population from school-age cohorts. | A growing city may still have a falling child population. | Accepted: total growth is contextual only; publish alternative explanations and falsifiers; public researcher. | No causal inference or wrongdoing conclusion from total-population growth. |
| CSR, FCRA, loans, scheme allocations, releases, and private equity use different units and stages. | Summing them double-counts funds and misstates recipients. | Accepted: separate funding instruments and amount stages; funding researcher. | No grand rupee total across instruments; announced investments do not become school grants. |
| Source reach and locally extracted data have different coverage. | National programs can falsely imply every city was checked. | Accepted: all-state navigation with explicitly bounded local evidence and useful empty states; education UX. | Unknown city returns no local match; district is not labelled city; national context is identified. |
| Small local ONNX models can rank document similarity on CPU. | Useful research assistance without requiring a hosted service. | Accepted: pinned open-source embeddings run on public evidence, output labelled unverified; platform engineer. | Record model revision, license, file hashes, actual run and reproducible command. |

Deferred: a new backend or technology migration. The existing React/TypeScript
static architecture supports the requested browsing, filtering, export and
evidence analysis. A database migration would add operational requirements
without increasing source coverage. Also deferred: automatic accusation scoring,
school-level funding estimates from state totals, and claims of exhaustive NGO or
city coverage; the required evidence does not support them.

## Round 2: challenge the implemented artifact

Reviewers repeat the source interpretation and navigation tasks against the new
implementation. Record defects, implemented corrections, and verification below
before release. This round reviews changed files and running interactions, not
the unchanged baseline.

Reviewed artifact: the implemented `/education` route, 38-source assembled dataset,
shared navigation, editorial components and home page, on the working branch.

| Finding | Decision / resulting revision | Review result |
| --- | --- | --- |
| Raw in-page `#section` anchors replaced the HashRouter route. Independently found by lead, platform and design reviewers. | Replaced with route-preserving scroll controls that focus the heading and retain active query parameters. Education UX owner. | Chromium clicks preserve route and filters; heading focus verified. |
| A Delhi-removal array operation could remove Telangana when Delhi was absent. | Replace positional removal with an explicit geographic filter. Data engineer. | Telangana retained for the actual platform-presence evidence. No city investment amounts inferred. |
| NGO-wide amount rows inherited unrelated funding-channel tags. | Government contributions retain government/NGO tags; mixed receipts carry category-scope limitations; entity named in each amount title. | Funding researcher checked all 15 source date/URL pairs and nine extracted amount/unit/currency triples; passed. |
| Missing-data lists were insufficient falsifiers. | Added specific disconfirming outcomes: continuity, reclassification, receiving-school access, eligible claims and reconciled accounting stages. | Public evidence review retains alternative explanations and government responses; no allegation promoted. |
| National row could inflate the state denominator to 37. | National aggregate is labelled separately; state/UT denominator excludes `IN`. | 36 state/UT series, 75 UP district series and one national series reconcile across five years. |
| Hidden source descriptions escaped table bounds on narrow screens. | Contain positioned source descriptions and the education page; recompose trend chart on mobile. | 320/390px widths match viewport; jumps keep window scroll at zero and the masthead in place. |
| Retrieval status and PDF page locators were absent from the displayed/exported provenance. | Expose retrieval status, exact locator and geographic description in details and CSV. | Unavailable-origin/indexed-extract distinction remains visible. |
| Population inputs needed stricter validation. | Reject unknown citations, mixed year formats, missing age bands/boundaries and changing management/level. | An aligned synthetic fixture produces only a review signal; the real UI states that matched population data are not loaded. |
| A later cross-page review found locality searches could match topic text or a publisher address. | Match explicit locality metadata and intersect it with the selected state; preserve national context only for state-only browsing. | Added regression cases and an independent 29-assertion review; valid locality records remain findable. |
| Rapid state selection followed by a search could compose the URL from stale render parameters. | Compose from the current HashRouter query and synchronise text drafts only when their own values change. | Browser regression submits an immediate state-to-topic sequence and requires the channel and state to survive. |
| Model similarity can retrieve a school project for a broad college-financing query. | Keep the model output research-only, outside the published evidence gate; pin model/corpus hashes. | Actual local CPU inference completed on 38 source summaries; no automatic verification. |
| External Google Fonts requests intermittently returned HTTP 503 during regression checks. | Bundle the same three font families locally with licences and a version/hash manifest. Classify legacy-cache network errors by their resource URL without ignoring local asset errors. | All 12 requested family/weight combinations loaded locally in the font-delivery review; final shared QA is recorded in `VERIFICATION.md`. |
| The shared shell pushed Finance's mobile rail summary 16.5px below the 844px viewport; the new footer used 9px mono text. | Recover 20px through mobile vertical-spacing changes and set mobile footer mono text to 12px. Preserve the summary, content and acceptance thresholds. | Final-build Finance AC-96/97/98/103/105 all passed, with zero skips; results are recorded in the release verification ledger. |

The design reviewer checked home and education at 320, 390, 768 and 1440 CSS pixels,
and actual finance/map pages at desktop and mobile widths. Native mobile menu
reachability, search, Escape/focus restoration, route focus, skip navigation and
reduced motion passed. These are browser and code observations, not screen-reader
certification or participant usability research.

The public-data reviewer independently re-extracted the archived parliamentary PDF:
all 112 school series / 560 values matched, with zero transcription differences.
This establishes transcription and arithmetic consistency; it does not independently
validate every school submission. See `PUBLIC_EVIDENCE_AUDIT.md` and `RESEARCH.md`.

Release gates and final regression outcomes are recorded in `VERIFICATION.md`.

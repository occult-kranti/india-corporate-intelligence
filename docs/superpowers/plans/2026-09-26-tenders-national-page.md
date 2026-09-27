# /tenders national section (CPPP scrape) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the national CPPP-scrape section to `/tenders` (`?section=national`, alias `?view=national`), quality first, every figure read from `research/raw/cppp/*.json`, without changing the central and state registers.

**Architecture:** A typed accessor `src/data/cppp.ts` discovers the pipeline outputs with `import.meta.glob` (so a build without `research/raw/cppp/` succeeds and prints the absence sentence) and exposes one `import()` per file; the concentration file is normalised inside its own lazily loaded module (`src/data/cpppConcentration.ts`) so its raw key names live only in that chunk. A small static shell (`NationalSection`) renders the kicker and `h2#cppp` at once and lazy-loads the body (`NationalBody`), which composes one component per spec subsection under `src/components/tenders/`. `Tenders.tsx` gains the alias rewrite, the unrecognised-param note, the head link, the byline sentence and labelled View/Scope groups; nothing else in the register changes.

**Tech Stack:** React 18, TypeScript, Vite 6 (`import.meta.glob`), Tailwind v4, react-router-dom 7 (`HashRouter`), hand-written SVG. No new dependency.

**Spec:** `docs/design/TENDERS_NATIONAL.md` (judged, U1–U21 applied); criteria `docs/design/TENDERS-NATIONAL_ACCEPTANCE.md`; RED suite `scripts/pages/tenders.test.mjs` (read-only).

## Global Constraints

- No runtime fetch; data is compiled in and code-split (`import()` of bundled modules only).
- No new dependency; charts are hand-written SVG; CSV via `src/components/energy/csv.ts` and `DownloadButton`.
- Never hand-write a figure: every number is read from the JSON at module or render scope.
- Never compose a winner name; render `topMarkedWinners[].name` only as emitted, one `<li>` each.
- `selected_bidder_address` never appears; no party or leader named in the page's own words.
- Marks are neutral greys (HSL saturation ≤ 0.10); portals told apart by shape (circle central, square state) and direct end labels; no `strokeDasharray` on any mark (frozen tier channel); `--color-rose` never on a rate.
- No-data hatch (`NODATA_STYLE`) never means zero; a null HHI reads `not computed`.
- Two dates, always labelled: `scraped …` (today `scrape date not yet a field`) and `computed {asOf}`.
- Every `<table>`: caption with n/rows, `scraped`, `computed {asOf}`, `tier: reported (dataset-only; portal agreement unknown)`; `scope` on every `th`; inside a `role="region"` `tabIndex=0` `overflow-x:auto` container; sticky first column; `scrolls →` hint.
- Every filter is a search param written with `replace`; unknown values fall back with one `role="status"` note.
- British spelling in prose; comments explain why.
- Do not edit: `*.generated.ts`, `scripts/assemble-fleet.mjs`, `src/context/DataContext.tsx`, `src/components/viz/*`, `src/App.tsx`, `src/components/Layout.tsx`, `research/raw/**`, any test. No git commits (task instruction supersedes the skill's commit steps).

## Review Focus

- A build with `research/raw/cppp/` absent must still compile and render the absence sentence and no zero (`dist-empty-cppp`, AC-04/05).
- The raw key `hhiMarkedValue` must appear only in the concentration chunk, or the AC-06 delay stalls the whole section.
- Buyer strings containing commas or `||` are never split; `||` gets a `<wbr>` without changing `textContent`.
- `state` values that match no emitted key print the coverage sentence, never an empty table, and are not reported as unrecognised.
- Numeric tie-breaks are explicit (`localeCompare` for concentration, code-unit order for `byOrganisation`), so a reload reproduces every row order.

---

## File map

| file | responsibility |
|---|---|
| `src/data/cppp.ts` (create) | Types for the seven files as emitted; glob discovery; `CPPP_PRESENT`; `loadCore()`, `loadProvenance()`, `loadConcentration()`; state-portal alias table; derived helpers (scrape year, plotted/not-plotted/thin, families, states split). |
| `src/data/cpppConcentration.ts` (create) | Eager-globs `concentration.json`, maps it to renamed keys (`hhiValue`, `hhiCount` …). Only ever reached through `import()`. |
| `src/components/tenders/params.ts` (create) | Parse and validate `portal`, `state`, `sort`, `rows`, `buyers`; list unrecognised values with their fallbacks. |
| `src/components/tenders/ui.tsx` (create) | Shared primitives: `Twin` (region + table + caption + hint + download), `Stamp`, `JumpLink`, `FamilyLink`, `WbrText`, number formatters, `csvComments`, findings text class. |
| `src/components/tenders/NationalSection.tsx` (create) | Static shell: kicker, `h2#cppp`, focus on arrival, absence sentence, lazy body. |
| `src/components/tenders/NationalBody.tsx` (create) | Loads core + concentration, composes subsections in spec order, hash scroll. |
| `src/components/tenders/Head.tsx` | §3.0 head: chip, strip, verification line, caveat, source line, jump list. |
| `src/components/tenders/Quality.tsx` | §3.1 key/value quality table and folds. |
| `src/components/tenders/Families.tsx` | §3.1a families table. |
| `src/components/tenders/Rates.tsx` | §3.2 figure sentence, small multiples, captions, twins. |
| `src/components/tenders/States.tsx` | §3.2a states on the state portal. |
| `src/components/tenders/BandsTypes.tsx` | §3.3 value bands and tender types. |
| `src/components/tenders/Timing.tsx` | §3.4 histogram, two-day rate, FY months. |
| `src/components/tenders/RedFlags.tsx` | §3.5 indicator cards, named-buyer table, tenths. |
| `src/components/tenders/Concentration.tsx` | §3.6 concentration table and controls. |
| `src/components/tenders/Sample.tsx` | §3.7 verification sample. |
| `src/components/tenders/GapsProvenance.tsx` | §3.9 gaps panel and §3.8 provenance footer. |
| `src/pages/Tenders.tsx` (modify) | Alias rewrite, note, head link, byline sentence, View/Scope groups, section placement. |

## Task 1: Data accessor and scaffold

**Files:** create `src/data/cppp.ts`, `src/data/cpppConcentration.ts`.

**Interfaces — Produces:**
- `CPPP_PRESENT: boolean` (quality.json discovered).
- `loadCore(): Promise<CpppCore>` where `CpppCore = { provenance, quality, rates, redflags, timing, sample }`, each typed or `null` when its file is absent.
- `loadProvenance(): Promise<ProvenanceFile | null>`; `loadConcentration(): Promise<Concentration | null>`.
- `STATE_PORTAL_ALIASES: Record<string, string>`; `splitStates(byOrg, stateNames)`; `yearRows(rates, portal, scrapeYear)`; `scrapeYearOf(prov, rates)`.

- [ ] Step 1: RED — `node --test scripts/pages/tenders.test.mjs` against the current `dist`; expected: AC-01…AC-86 fail on `h2#cppp missing`.
- [ ] Step 2: write the accessor with `import.meta.glob(['../../research/raw/cppp/*.json', '!**/concentration.json'], { import: 'default' })` and the concentration module with an eager glob.
- [ ] Step 3: `npx tsc -b` — expected: no errors.

## Task 2: Page wiring (Tenders.tsx, params, shell)

**Consumes:** `CPPP_PRESENT`, `loadProvenance`. **Produces:** `parseNationalParams(params) → { portal, state, sort, rows, buyers, unrecognised: {param, value, fallback}[] }`; `<NationalSection />`.

- [ ] `view=national` → `replace` to `section=national`, other params kept (AC-02).
- [ ] Head link `The CPPP award scrape — {rows} award rows, reported, not a national statistic` + sibling `<span aria-hidden="true">→</span>`, passing `state: { focusCppp: true }`; scaffold reads `… — not present in this build` (AC-03, AC-05, AC-73).
- [ ] Byline sentence and link in the default view; `Showing the national CPPP scrape (reported, unverified) above the register.` after the section (AC-01, AC-03).
- [ ] `<p role="status">` note after the header, one sentence per unrecognised value (AC-58); unmatched `state` is not unrecognised (AC-45).
- [ ] View and Scope: `role="group"` + `aria-label` + `aria-pressed` (AC-79).
- [ ] Shell: kicker immediately before `h2#cppp` (`tabIndex=-1`), focus + scroll on arrival (AC-01, AC-73), absence sentence when `!CPPP_PRESENT` (AC-04).

## Task 3: §3.0 head, §3.1 quality, §3.1a families

DOM contracts (from the criteria): `data-strip-fact` 1–6 inside a sticky strip that is a child of the section-spanning body; verification line text exactly as AC-11 with `a[href$="#cppp-sample"]`; `p#cppp-caveat` at the Standfirst's size (18px); two identical `[data-source-line]`; `Copy citation` + status; jump list with `Rates` etc.; quality table with four `thead th` (`count`, `what is counted`, `base`, `share of base`), a `td` corner cell, `th[scope=row]` on every row, per-portal-year rows headed `portal year`, `10^12` only inside `<code>`, the dedup-range sentence, folds whose summaries carry counts, no bare number text node inside `<details>`; families table headed `family definition | N | used in | reconciles to {dedup}`.

## Task 4: §3.2 rates and §3.2a states

One `svg[role=img]` with both panels; points `circle` (central) / `rect` (state) carrying `data-mark="point" data-portal data-year data-flag`; hollow + `pointer-events:all` for thin and partial; polylines only through runs of plain points; ribbons are `path[data-ribbon]`; end labels `central` / `state`; the scrape-year label `{year} (partial; scrape date not yet a field)`. Twins with the ten fixed headers, one-decimal intervals, two-decimal shares, `not plotted` in the row header and the reason alone in the flag cell. States twin: matched rows (one per state, exact name or reviewed alias), a heading row `spellings that match no state name, or repeat one already listed`, unmatched rows, then one hatched row per absent state reading `{name} not present on the state portal in this scrape; absence here is coverage, not conduct`.

## Task 5: §3.3 bands/types and §3.4 timing

Band marks `<g data-mark="bar" data-key>` sharing one `<g>`; the unusable-value mark in its own hatched `<g>` headed `rows with no usable value`, `data-flag="nodata"`; types order Works, Goods, Services, `tr[role=separator]`, Limited, Other/unknown; axis label `category, and one method`. Histogram bars as labelled `<g data-mark="bar">` (bin + n as text, no `<title>`); `[data-rate]` immediately followed by `[data-innocent]`; exclusion sentences with both bases; FY-month table `aria-describedby` a `<p>` holding the reading.

## Task 6: §3.5 red flags and §3.6 concentration

Cards: `<section>` + `<h4>` + `<dl>` (`div > dt + dd`, grid so the rate and the reading sit one row apart); by-portal table rows headed `central portal` / `state portal`. Buyer table: first `[data-effect]` in the section is the buyers control's; not-asked sentence then `[data-innocent]` before the table; base rows; `response` = `not asked`; unparsed keys hatched with the raw key in mono; `buyers=all` sorted n desc, key code-unit order, pooled last, plus the tenths table. Concentration: portal `role=group` with a sibling `[data-effect]`, rows `<select>`, one `aria-live="polite"` region before the table, sortable headers `awards` / `value sum …` / `buyer` with buttons and `aria-sort`, HHI headers without `aria-sort`, buyer cell exactly the emitted string, winners as `<ol><li>`, `note` column, export ignores `rows`.

## Task 7: §3.7 sample, §3.9 gaps, §3.8 provenance; CSV everywhere

Sample in the spec's order; agreement cells `not checkable` hatched when every page is gone; rows collapsed to `verdict (all fields)` with one legend row last; `organisation_name` cell exact with `<wbr>`; links with unique `aria-label`s. Gaps as `[data-gap]` lines at findings size, derived. Provenance inputs twin, counts, rule, generator, `computed {asOf}`, README link, second source line. Every twin: `DownloadButton`, `cppp-{twin}-{asOf}.csv`, comment block (caveat, family + N, scraped/computed, generator, digests, params), raw values, `status` column.

## Task 8: Gates

- [ ] `npm run generate && npm run validate && npm run build && npm run smoke && npm run viewport`
- [ ] `node --test scripts/pages/tenders.test.mjs` (pinned `TENDERS_DIST` copy); every red criterion either fixed or recorded below with its reason.

---

## Ledger

- Ruling: no commits, no worktree, no per-task commit steps — the task forbids history-changing git commands; the skill's commit steps are superseded. Cost if wrong: none; the tree holds every change.
- Task 1: RED baseline on the pre-change `dist`: 86 tests, 1 pass (AC-05, vacuously), 85 fail.
- Task 1–7: complete. `npx tsc -b` clean.
- Ruling: `rates.byOrganisation` is not split from `rates.json` — one JSON module cannot become two chunks without `manualChunks` in `vite.config.ts`, which is not this task's file, and §3.2a needs `byOrganisation` on first render anyway. AC-86 passes (the rates chunk is the byOrganisation chunk, disjoint from concentration). Cost if wrong: ~45 KB gzip loaded one step early.
- Ruling: §3.0's `<h3>` is the `Read this first` label before the caveat, not a heading after `h2` — keeps the verification line and the caveat inside the first phone screen (AC-82). Cost if wrong: one heading's position.
- Ruling: rate marks carry no `<title>`: the suite reads row text without cell separators, so no tooltip number can be matched to its twin (AC-78); the twin carries every number. Cost if wrong: hover tooltips.
- Ruling: the composition table (`rates.byPortalTenderType`) and stacked narrow-screen rows are not built; the field is not emitted (gap line printed) and stacked rows are optional (AC-84).
- Suite defects (test not edited; criterion built to): AC-01, AC-03, AC-58 (Layout sidebar `h1` and stats block precede the page); AC-16, AC-25, AC-29, AC-43 (`findSentence` trims its literal parts, so ` of ` becomes `of`); AC-19 (needle `String(seed)` = `2026` first matches the finding's "June 2026"); AC-23 (verbatim caveat, verification line and redraw carry the fetch date, which equals `asOf`); AC-27 (concentration cell must both equal `complement not emitted` and contain `1215 of 4216`).
- Scratch copy of the suite with only the `findSentence` trim and the seed needle corrected: 78 pass, 2 skip, 6 fail (the Layout three, AC-23, AC-27, and one real AC-19 ordering bug, then fixed: seed and rng now separate elements).
- Task 8: generate OK, validate OK (warnings only), build OK, smoke OK, viewport OK; official suite on the pinned gate build: 74 pass, 2 skip, 10 fail (the defects above).
- Final review: self-review (no subagent tool).

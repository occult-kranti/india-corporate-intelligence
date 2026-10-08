# The hand-off bundle

`icip-bundle.zip` is a self-contained snapshot: source, data, research quarantine,
docs, agents, skills, a runnable build, and the hand-off prompt. No network access is
needed to read it. The repository is the record; the bundle is a convenience for
reading the project cold without cloning.

The zip on hand was cut on 2026-10-08 from `cc6e302`, after a full green `npm run check`
(the gate table at the end). It carries Phase H, the force-finance work and the built
`/security` page, and the layout below is its tree.

## Layout

```
icip/
├── HANDOFF.md            ← start here if you are picking this up cold
├── README.md             ← what the project is, the four invariants, the routes
├── docs/
│   ├── INDEX.md          ← every file, what it is, what depends on it
│   ├── CUSTOM_PLAN.md    ← the phased plan; Phase F the energy/welfare build, Phase G foreign
│   │                        money and tenders, Phase H the money India spends on force
│   ├── PLUGINS.md        ← the plugin-shaped build fleet and what each stage produced
│   ├── design/           ← judged page specs, acceptance criteria, UX reviews, WCAG audits;
│   │                        Phase H adds the SECURITY_* set (below)
│   ├── research/         ← FLEET_CONTRACT, DATA_SOURCES, GRAPH_UI_SOTA, the six literature
│   │                        reviews (FORCE_LITERATURE new), force/ (the fleet's own documents)
│   ├── superpowers/      ← specs/ (the Phase G and Phase H designs) and plans/ (every
│   │                        implementation plan, the /security build plan among them)
│   └── legacy/           ← superseded, retained so nothing is lost
├── .claude/
│   ├── agents/           ← 15 agents, each with an explicit refusal surface (security-analyst new)
│   └── skills/           ← 15 skills (two vendored, see skills/VENDORED.md; force-money-trail new)
├── src/
│   ├── graph/            ← schema, the Atlas case study, base rates, null model, motif engine,
│   │                        the GENERATED energy, finance, ngo, capital and force modules, mergeFleet
│   ├── data/             ← geometry, companies, politics, conglomerates, indices, welfare types,
│   │                        the GENERATED welfare module, financeView, the CPPP accessors
│   │                        (loadSecurity() reads the security slice)
│   ├── components/viz/   ← the map, the geographic network, the canvas force graph + a11y
│   │                        overlay + layout worker, the flow diagram
│   ├── components/energy ← the /energy page's parts (its own SVG graph renderer)
│   ├── components/welfare← the /welfare page's parts (map, time lanes, twins)
│   ├── components/finance← the /finance page's parts (three lenses on one route)
│   ├── components/tenders← the national CPPP section of /tenders, with its "security buyers" line
│   ├── components/security ← the /security page's parts (see "The /security page" below)
│   └── pages/            ← 34 routes (/security the new one)
├── research/
│   ├── raw/              ← the QUARANTINE ZONE. Untrusted until promoted or assembled
│   │   ├── energy/       ← 12 domain files + AUDIT.json + RECONCILIATION.json
│   │   ├── welfare/      ← 7 domain files + AUDIT.json + RECONCILIATION.json
│   │   ├── finance/      ← 7 domain files (worldbank-projects.json is fetcher output) + AUDIT + RECONCILIATION
│   │   ├── ngo/          ← 5 domain files + AUDIT + RECONCILIATION
│   │   ├── capital/      ← 16 domain files + AUDIT + RECONCILIATION
│   │   ├── force/        ← 8 domain files + AUDIT + RECONCILIATION
│   │   ├── cppp/         ← 8 aggregate JSON files from scripts/cppp/build.py (security.json the
│   │   │                    seventh, security-page.json its slim projection, the one the pages
│   │   │                    read) + sample-verification.json from verify_sample.py; no award rows
│   │   └── indices.json  ← NIFTY 50 / SENSEX 30 / SENSEX 50 membership by company id
│   └── promotion-report.json
├── scripts/              ← promote, assemble-fleet (generate), validate, smoke, graph-viewport,
│                            pages/*.test.mjs (the acceptance suites, security.test.mjs among them),
│                            lib/vocab, lib/fleet-refs, finance/ (the World Bank fetcher),
│                            cppp/ (the Python award pipeline, security.py the slice),
│                            skills/force-money-trail/ (the skill generator and its templates)
├── dist/                 ← runnable build (see below)
└── .github/workflows/    ← CI: promote → generate → test:assemble → validate → check:skills →
                             build → smoke → viewport → test:pages
```

## What Phase H adds

Every count here is read from the file or commit named beside it.

**The force fleet.** `research/raw/force/` holds eight domain files: `union-defence`,
`union-home`, `state-police`, `procurement-industry`, `footprint`, `money-people`,
`pay-pensions` and `literature`. Beside them sit `AUDIT.json` and `RECONCILIATION.json`.
`AUDIT.json` carries 214 cross-examiner verdicts. `RECONCILIATION.json` carries 7 id
mappings, 34 refused merges, 22 killed claims (held, not deleted) and 214 audit
corrections, one for each verdict.

**The generated module.** `src/graph/force.generated.ts` is assembled from those ten
files and never hand-edited. Its `FORCE_META` block records 8 files, 266 nodes, 394
edges and 22 killed, run `run-122278453551`. Its tabular series hold 4,097 budget rows,
142 strength rows and 228 footprint rows.

**The CPPP security slice.** `research/raw/cppp/security.json` is a seventh output of the
CPPP pipeline (`scripts/cppp/security.py`, called by `build.py`). It states first what it
is not: defence capital acquisition, GeM and most state police buying are not on CPPP.
It counts 558,291 raw rows; its single-bidding rates rest on 365,600 award decisions.
Rates are by buyer class, each beside the whole file. `/tenders` gains one "security
buyers" line that reads it and links to `/security?lens=procurement` (`76c0c35`).

**The skill and its generator.** `.claude/skills/force-money-trail/` holds `SKILL.md` and
three references (`ledger.md`, `narratives.md`, `tables.md`). No figure in them is typed
by hand. `scripts/skills/force-money-trail/gen.mjs` fills four templates (`*.src.md`)
from the raw files, `FORCE_META` and `security.json`, and stops on any placeholder that
does not resolve (`4a6e079`). `npm run check:skills` regenerates the skill and fails on
any difference from the committed copy (`67f27ab`).

**The agent.** `.claude/agents/security-analyst.md`, pressure-tested with the skill
(`4a6e079`).

**The fleet's documents.** `docs/research/force/` holds the fleet contract addendum
(`CONTRACT-force.md`), the fleet brief (`SPEC.md`) and the reconnaissance digest
(`recon.json`, `recon-notes.md`).

**The design set.** `docs/design/` gains `SECURITY_PAGE.candidate-A.md` and
`SECURITY_PAGE.candidate-B.md` (the design duel), `SECURITY_JUDGEMENT.md`, the judged
spec `SECURITY_PAGE.md`, `SECURITY_UX_REVIEW.md` (synthetic, five seats) and
`SECURITY_ACCEPTANCE.md` (152 criteria). `docs/superpowers/` gains the Phase H design
(`specs/2026-10-04-force-finance-design.md`), its plan
(`plans/2026-10-04-force-finance.md`) and the /security build plan
(`plans/2026-10-04-security-page.md`).

**The RED suite.** `scripts/pages/security.test.mjs` holds 152 Playwright checks, one
per acceptance criterion. All 152 fail against the scaffold, each on a missing element,
none on a test error (`2f922b2`).

**The literature and the sweep.** `docs/research/FORCE_LITERATURE.md` is new.
`docs/research/DATA_SOURCES.md` gains the Phase H sweep (`3a7ff00`).

**The /security page.** `src/pages/Security.tsx`, ten files in `src/components/security/`
and `src/data/securityView.ts`, with 19 tests on the data layer's derivations
(`scripts/security-view.test.mjs`, `npm run test:security-view`). `loadSecurity()` reads
`research/raw/cppp/security-page.json`, a slim projection of the slice with no winner-bearing
field (`f9e8656`); `security.json` stays in the bundle as the pipeline's output but out of the
build. The acceptance suite passed 153 of 153 (the 152 criteria and the §0.6 keyed-hooks
check) on three independent pinned runs and is the fifth file in `test:pages`. The WCAG 2.1
AA audit is `docs/design/SECURITY_A11Y.md`: 0 critical; 4 serious and 7 moderate, all fixed;
12 minor, of which 8 are fixed, 1 in part and 3 not.

## How it is cut

The recipe is unchanged. The bundle is cut from the working tree after a full
`npm run check` has passed on it, with `dist/` built by that run. `HANDOFF.md` names the
commit of that check, and the dated line under the gate table names the tree it was cut
from. What is left out is listed in the next section.

For Phase H the re-cut followed the `/security` build, so that `dist/`, the page suite and
the gate table describe the same tree. Its size and file count: `icip-bundle.zip` is 19,647,354 bytes
(sha256 `3af377a6a322e373…`), 631 files, 88,765,871 bytes unpacked, 132 of them under `dist/`. It
was cut by copying every tracked file's working-tree content and `dist/` under `icip/`.

## Running it

**Just look at it.** Serve `dist/` with any static server (`npx serve dist`, or
`python3 -m http.server -d dist`) and open `/#/`. Routes are hash-routed, so no
rewrite rules are needed. `file://` does not work: the main bundle is a module script
and browsers refuse it over `file://`.

**Work on it.**

```bash
npm install
npm run dev           # vite dev server
npm run generate      # assemble research/raw/{energy,welfare,finance,ngo,capital,force} into the generated modules
npm run check:skills  # regenerate force-money-trail from the raw files; fail on any difference
npm run check         # promote → generate → test:assemble → test:security-view → validate → check:skills → build → smoke → viewport → test:pages
```

`npm run check:skills` compares with `git diff`, and the snapshot carries no git
history. Outside a repository it stops with git's "Not a git repository" (exit 129), so
`npm run check` stops there too. Run `git init && git add -A` once in the unpacked tree
first; the gate then exits 0 on an unchanged snapshot. Both results were checked on a
history-free copy of `878edcd`.

`npm run smoke` drives a headless Chromium over the routes and URLs in
`scripts/smoke.mjs` and serves `dist` itself; three of them are `/security` URLs
(`0073a0f`). `npm run test:pages` runs the page acceptance suites the same way (energy
67, welfare 85, tenders national 86, finance 110, security 152 criteria); point
`ENERGY_DIST` / `WELFARE_DIST` / `FINANCE_DIST` / `TENDERS_DIST` / `SECURITY_DIST` at a copied build when
something else may rebuild `dist` mid-run. All of them use a pinned browser
at `PLAYWRIGHT_CHROMIUM_PATH` (default `/opt/pw-browsers/chromium`) if it exists,
otherwise Playwright's own Chromium (`npx playwright install chromium`).

The `/security` suite (`scripts/pages/security.test.mjs`, 152 criteria and the §0.6
keyed-hooks check) joined `test:pages`, and so CI, after it passed 153 of 153 on three
independent runs against pinned builds, 46 to 49 minutes each. It builds its own empty and
zero-series scaffolds (`dist-empty-security/`, `dist-zero-security/`), so none of its tests
skips on a full build.

The six generated modules (`src/graph/{energy,finance,ngo,capital,force}.generated.ts`,
`src/data/welfare.generated.ts`) are never hand-edited: `npm run validate` §5 fails when
any no longer matches a fresh assembly of its inputs. The CPPP pipeline is offline
(Python 3.11, duckdb, pyarrow; `scripts/cppp/README.md`); its eight JSON outputs are
committed, and its tests assert a byte-identical rebuild.

## What is deliberately not in the bundle

- `node_modules/` — restore with `npm install`.
- Git history — the bundle is a snapshot. The repository is the record.
- The session scratchpad (fleet logs, pinned builds, probes). Every conclusion that
  matters was written into `docs/` or a commit message.
- `.claude/worktrees/` — isolated agent worktrees are scratch, never content
  (`.gitignore`, `7564bab`).

## Verifying the snapshot

Everything in the zip on hand passed, at the moment it was cut (`npm run check` at `cc6e302`,
2026-10-08; the docs commit recording it follows):

| Gate | Result |
|---|---|
| `npm run promote` | OK — 461 records promoted, 100 quarantined, run `run-6ef7c1044cda` (a hash of inputs, not a clock) |
| `npm run generate` | OK — energy 404/711 (run-ac2b087e866e); welfare 286/335/78 schemes (run-e3cc0f891306); finance 353/1,168 (run-e10a8edef94a); ngo 138/292 (run-169c3129a1ec); capital 133/221 (run-916d30d537ff); force 266/394, 22 killed held, series 4,097 budgets / 142 strength / 228 footprint (run-96e7211bfc4e); every module byte-identical to the committed one |
| `npm run test:assemble` | OK — 65 tests |
| `npm run test:security-view` | OK — 19 tests |
| `npm run validate` | OK — 30 declared warnings (29 court rulings modelled as `enforce` in the frozen fleets; SENSEX 50 lists 49 of 50) |
| `npm run check:skills` | OK — the force-money-trail skill regenerates byte-identical |
| `npm run build` | OK |
| `npm run smoke` | OK — 52 routes/URLs, no console errors |
| `npm run viewport` | OK — camera, canvas pixels, hit-testing, keyboard cursor, jump-to / as-of / why-drawn |
| `npm run test:pages` | OK — 501 tests, 483 pass, 0 fail, 18 skipped: energy 67/67; welfare 70 pass, 15 skipped; tenders national 84 pass, 2 skipped; finance 109 pass, 1 skipped; security 153/153 |

*Cut on 2026-10-08 from the tree at `cc6e302`, after the full check above; it replaces the
2026-09-27 cut.*

Re-running `npm run promote` and `npm run generate` on an unchanged bundle reproduces
every run id byte-for-byte. That is the check that the pipeline is deterministic: if
an id moves, an input did.

# The hand-off bundle

`icip-bundle.zip` is a self-contained snapshot: source, data, research quarantine,
docs, agents, skills, a runnable build, and the hand-off prompt. No network access is
needed to read it. The repository is the record; the bundle is a convenience for
reading the project cold without cloning.

## Layout

```
icip/
├── HANDOFF.md            ← start here if you are picking this up cold
├── README.md             ← what the project is, the four invariants, the 33 routes
├── docs/
│   ├── INDEX.md          ← every file, what it is, what depends on it
│   ├── CUSTOM_PLAN.md    ← the phased plan; Phase F the energy/welfare build, Phase G foreign money and tenders
│   ├── PLUGINS.md        ← the plugin-shaped build fleet and what each stage produced
│   ├── design/           ← judged page specs, acceptance criteria, UX reviews, WCAG audits
│   ├── research/         ← FLEET_CONTRACT, DATA_SOURCES, GRAPH_UI_SOTA, the five literature reviews
│   ├── superpowers/      ← specs/ (the Phase G design) and plans/ (every implementation plan)
│   └── legacy/           ← superseded, retained so nothing is lost
├── .claude/
│   ├── agents/           ← 14 agents, each with an explicit refusal surface
│   └── skills/           ← 15 skills (two vendored, see skills/VENDORED.md)
├── src/
│   ├── graph/            ← schema, the Atlas case study, base rates, null model, motif engine,
│   │                        the GENERATED energy, finance, ngo and capital modules, mergeFleet
│   ├── data/             ← geometry, companies, politics, conglomerates, indices, welfare types,
│   │                        the GENERATED welfare module, financeView, the CPPP accessors
│   ├── components/viz/   ← the map, the geographic network, the canvas force graph + a11y
│   │                        overlay + layout worker, the flow diagram
│   ├── components/energy ← the /energy page's parts (its own SVG graph renderer)
│   ├── components/welfare← the /welfare page's parts (map, time lanes, twins)
│   ├── components/finance← the /finance page's parts (three lenses on one route)
│   ├── components/tenders← the national CPPP section of /tenders
│   └── pages/            ← 33 routes
├── research/
│   ├── raw/              ← the QUARANTINE ZONE. Untrusted until promoted or assembled
│   │   ├── energy/       ← 12 domain files + AUDIT.json + RECONCILIATION.json
│   │   ├── welfare/      ← 7 domain files + AUDIT.json + RECONCILIATION.json
│   │   ├── finance/      ← 7 domain files (worldbank-projects.json is fetcher output) + AUDIT + RECONCILIATION
│   │   ├── ngo/          ← 5 domain files + AUDIT + RECONCILIATION
│   │   ├── capital/      ← 16 domain files + AUDIT + RECONCILIATION
│   │   ├── cppp/         ← 6 aggregate JSON files from scripts/cppp/build.py (no award rows)
│   │   └── indices.json  ← NIFTY 50 / SENSEX 30 / SENSEX 50 membership by company id
│   └── promotion-report.json
├── scripts/              ← promote, assemble-fleet (generate), validate, smoke, graph-viewport,
│                            pages/*.test.mjs (the acceptance suites), lib/vocab, lib/fleet-refs,
│                            finance/ (the World Bank fetcher), cppp/ (the Python award pipeline)
├── dist/                 ← runnable build (see below)
└── .github/workflows/    ← CI: promote → generate → test:assemble → validate → build →
                             smoke → viewport → test:pages
```

## Running it

**Just look at it.** Serve `dist/` with any static server (`npx serve dist`, or
`python3 -m http.server -d dist`) and open `/#/`. Routes are hash-routed, so no
rewrite rules are needed. `file://` does not work: the main bundle is a module script
and browsers refuse it over `file://`.

**Work on it.**

```bash
npm install
npm run dev        # vite dev server
npm run generate   # assemble research/raw/{energy,welfare,finance,ngo,capital} into the generated modules
npm run check      # promote → generate → test:assemble → validate → build → smoke → viewport → test:pages
```

`npm run smoke` drives a headless Chromium over 49 routes and URLs and serves `dist`
itself. `npm run test:pages` runs the page acceptance suites the same way (energy 67,
welfare 85 criteria; finance 110 and tenders-national 86 once they join); point
`ENERGY_DIST` / `WELFARE_DIST` / `FINANCE_DIST` / `TENDERS_DIST` at a copied build when
something else may rebuild `dist` mid-run. All three use a pinned browser
at `PLAYWRIGHT_CHROMIUM_PATH` (default `/opt/pw-browsers/chromium`) if it exists,
otherwise Playwright's own Chromium (`npx playwright install chromium`).

The five generated modules (`src/graph/{energy,finance,ngo,capital}.generated.ts`,
`src/data/welfare.generated.ts`) are never hand-edited: `npm run validate` §5 fails when
any no longer matches a fresh assembly of its inputs. The CPPP pipeline is offline
(Python 3.11, duckdb, pyarrow; `scripts/cppp/README.md`); its six JSON outputs are
committed, and its tests assert a byte-identical rebuild.

## What is deliberately not in the bundle

- `node_modules/` — restore with `npm install`.
- Git history — the bundle is a snapshot. The repository is the record.
- The session scratchpad (fleet logs, pinned builds, probes). Every conclusion that
  matters was written into `docs/` or a commit message.

## Verifying the snapshot

Everything in the bundle passed, at the moment it was cut (`npm run check`, commit
noted in `HANDOFF.md`):

| Gate | Result |
|---|---|
| `npm run promote` | OK — deterministic run id (hash of inputs, not a clock) |
| `npm run generate` | OK — energy 404/711 (run-ac2b087e866e); welfare 286/335/78 schemes (run-e3cc0f891306); finance 353/1,168 (run-e10a8edef94a); ngo 138/292 (run-169c3129a1ec); capital 133/221 (run-916d30d537ff) |
| `npm run test:assemble` | OK — 55 tests |
| `npm run validate` | OK — 30 declared warnings (29 court rulings modelled as `enforce` in the frozen fleets; SENSEX 50 lists 49 of 50) |
| `npm run build` | OK |
| `npm run smoke` | OK — 49 routes/URLs, no console errors |
| `npm run viewport` | OK — camera, canvas pixels, hit-testing, keyboard cursor, jump-to / as-of / why-drawn |
| `npm run test:pages` | OK — energy 67/67; welfare 70 pass, 0 fail, 15 skipped; tenders national 84 pass, 0 fail, 2 skipped |

*The table is refreshed when the bundle is re-cut; `HANDOFF.md` names the commit of the last full `npm run check`.*

Re-running `npm run promote` and `npm run generate` on an unchanged bundle reproduces
both run ids byte-for-byte. That is the check that the pipeline is deterministic: if
an id moves, an input did.

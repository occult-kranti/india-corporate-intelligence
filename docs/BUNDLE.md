# The hand-off bundle

`icip-bundle.zip` is a self-contained snapshot: source, data, research quarantine,
docs, agents, skills, a runnable build, and the hand-off prompt. No network access is
needed to read it. The repository is the record; the bundle is a convenience for
reading the project cold without cloning.

## Layout

```
icip/
├── HANDOFF.md            ← start here if you are picking this up cold
├── README.md             ← what the project is, the four invariants, the 32 routes
├── docs/
│   ├── INDEX.md          ← every file, what it is, what depends on it
│   ├── CUSTOM_PLAN.md    ← the phased plan; Phase F is the energy/welfare build
│   ├── PLUGINS.md        ← the plugin-shaped build fleet and what each stage produced
│   ├── design/           ← judged page specs, acceptance criteria, UX reviews, WCAG audits
│   ├── research/         ← FLEET_CONTRACT, DATA_SOURCES, GRAPH_UI_SOTA, the two literature reviews
│   ├── superpowers/plans ← implementation plans, including the canvas renderer
│   └── legacy/           ← superseded, retained so nothing is lost
├── .claude/
│   ├── agents/           ← 12 agents, each with an explicit refusal surface
│   └── skills/           ← 14 skills (two vendored, see skills/VENDORED.md)
├── src/
│   ├── graph/            ← schema, the Atlas case study, base rates, null model, motif engine,
│   │                        the GENERATED energy module, mergeFleet
│   ├── data/             ← geometry, companies, politics, conglomerates, indices, welfare types,
│   │                        the GENERATED welfare module
│   ├── components/viz/   ← the map, the geographic network, the canvas force graph + a11y
│   │                        overlay + layout worker, the flow diagram
│   ├── components/energy ← the /energy page's parts (its own SVG graph renderer)
│   ├── components/welfare← the /welfare page's parts (map, time lanes, twins)
│   └── pages/            ← 32 routes
├── research/
│   ├── raw/              ← the QUARANTINE ZONE. Untrusted until promoted or assembled
│   │   ├── energy/       ← 12 domain files + AUDIT.json + RECONCILIATION.json
│   │   ├── welfare/      ← 7 domain files + AUDIT.json + RECONCILIATION.json
│   │   └── indices.json  ← NIFTY 50 / SENSEX 30 / SENSEX 50 membership by company id
│   └── promotion-report.json
├── scripts/              ← promote, assemble-fleet (generate), validate, smoke, graph-viewport,
│                            pages/*.test.mjs (the acceptance suites), lib/vocab
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
npm run generate   # assemble research/raw/{energy,welfare} into the generated modules
npm run check      # promote → generate → test:assemble → validate → build → smoke → viewport → test:pages
```

`npm run smoke` drives a headless Chromium over 46 routes and URLs and serves `dist`
itself. `npm run test:pages` runs the /energy (67 criteria) and /welfare (85 criteria)
acceptance suites the same way; point `ENERGY_DIST` / `WELFARE_DIST` at a copied
build when something else may rebuild `dist` mid-run. All three use a pinned browser
at `PLAYWRIGHT_CHROMIUM_PATH` (default `/opt/pw-browsers/chromium`) if it exists,
otherwise Playwright's own Chromium (`npx playwright install chromium`).

The generated modules (`src/graph/energy.generated.ts`, `src/data/welfare.generated.ts`)
are never hand-edited: `npm run validate` §5 fails when either no longer matches a
fresh assembly of its inputs.

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
| `npm run generate` | OK — energy 404 nodes / 711 edges (run-4a86ff2b4fe6); welfare 286 nodes / 335 claims / 78 schemes (run-33317dc6d234) |
| `npm run test:assemble` | OK — 30 tests |
| `npm run validate` | OK — one declared warning (SENSEX 50 lists 49 of 50 constituents) |
| `npm run build` | OK |
| `npm run smoke` | OK — 46 routes/URLs, no console errors |
| `npm run viewport` | OK — camera, canvas pixels, hit-testing, keyboard cursor |
| `npm run test:pages` | OK — energy 67/67; welfare 70 pass, 0 fail, 15 skipped (9 scaffold criteria need the EMPTY build; 6 are a documented data void) |

Re-running `npm run promote` and `npm run generate` on an unchanged bundle reproduces
both run ids byte-for-byte. That is the check that the pipeline is deterministic: if
an id moves, an input did.

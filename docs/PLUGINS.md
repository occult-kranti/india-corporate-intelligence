# Plugins and skills in use

*2026-09-25. What is installed, at which scope, and how each is applied to the work in
this repository. Plugin code is never vendored into the repository — the repository has
no licence file of its own, and SweetClaude is AGPL-3.0 — so plugins live at user scope
and are referenced, not copied.*

## Installed at user scope (`~/.claude/plugins`)

| plugin | version | licence | how it is used here |
|---|---|---|---|
| **SweetClaude** (`carson-sweet/sweetclaude`) | 4.5.2 | AGPL-3.0-or-later | Its review and implementation agents are registered at user scope as `sc-*` (`sc-code-reviewer`, `sc-security-reviewer`, `sc-performance-reviewer`, `sc-tests-reviewer`, `sc-architecture-reviewer`, `sc-qa-caucus-component`, `sc-qa-caucus-integration`, `sc-qa-caucus-service`, `sc-test-writer`, `sc-implementer`, `sc-workflow-guardian`). The **caucus review** pattern — five specialty reviewers in parallel, findings kept only on consensus — is the review stage of every build fleet. **`code-verify`** (no completion claim without fresh evidence) is the gate discipline: every fleet ends with `generate → validate → build → smoke → viewport` output pasted, not summarised. **`testing-accessibility`** (WCAG 2.1 AA: automated scan, keyboard, screen reader, visual) is run on every new page. **`design-ux-review`** (persona-based virtual review, labelled synthetic) is run on the judged page specs before build. **`product-user-stories` / `code-tdd`** shape the page builds: acceptance criteria → a test-writer writes failing Playwright checks → an implementer builds until they pass. The project is *not* initialised with `/sweetclaude:init` (its phase-gate state and hooks assume one interactive session; this repository is built by orchestrated fleets). Run `/sweetclaude:help` in an interactive session to adopt the full lifecycle. |
| **superpowers** (`obra/superpowers`) | 6.4.1 | MIT | `writing-plans` (a plan an engineer who has not seen the codebase can execute), `subagent-driven-development` (fresh implementer per task, reviewer after each, broad review at the end — the shape of the build fleets), `requesting-code-review`, `systematic-debugging` (root cause before fixes — the fix stage), `verification-before-completion` (same gate as code-verify), `using-git-worktrees`. |

## Account-level plugins not available in this session

Enabled on the claude.ai account but not loaded here (no MCP transport in this sandbox):
Exa web search, Evermuse product-management, autoresearch, the design and engineering
workflow packs, the data pack. Research fleets use WebSearch/WebFetch and `curl` through
the proxy instead, per `.claude/skills/source-retrieval/SKILL.md`.

## Skills vendored into the repository (`.claude/skills/`)

See `.claude/skills/VENDORED.md`: `fact-check-workflow` (claim log → research → evidence →
rating) and `knowledge-graph-construction` (layered-tier KG validation). Reviewed before
adoption; rejected candidates listed there.

## Skills native to the repository

`evidence-tiering`, `pattern-discipline`, `graph-schema`, `india-map`, `cui-bono`,
`source-retrieval`, `investigative-desk`, `pattern-prospecting`, `interface-design`,
`frontend-implementation`. The research fleets' contract is `docs/research/FLEET_CONTRACT.md`.

## Claude.ai skills used by the research lead

`research-scholar` (evidence calibration ladder, cross-examination protocol — the basis of
`cui-bono` §4 and the `cross-examiner` agent), `skill-creator` (for new skills), `docs`.

## How a build fleet is composed from these

```
judged design spec (interface-designer ×2 → judge)
   → design-ux-review (SweetClaude, synthetic personas)        critique before build
   → acceptance criteria (product-user-stories)                 what "done" means
   → sc-test-writer: failing Playwright checks                  RED
   → frontend-developer / sc-implementer: build                 GREEN
   → caucus: sc-code-reviewer · sc-security-reviewer ·          consensus findings
             sc-performance-reviewer · sc-tests-reviewer ·
             sc-architecture-reviewer · house semantics reviewer
   → fix (systematic-debugging)                                 root cause first
   → code-verify / verification-before-completion               evidence, then the claim
   → testing-accessibility                                      WCAG 2.1 AA
```

#!/usr/bin/env node
// Generator for .claude/skills/force-money-trail/{SKILL.md,references/tables.md,references/ledger.md,references/narratives.md}.
//
// No figure in the three outputs is typed by hand. The hand-written prose lives in the three
// four *.src.md templates beside this script; every figure in them is a placeholder that this script
// resolves against the raw files at run time, and every table of base rates, voids, gaps,
// symmetry checks, narratives, audit verdicts, kills and corrections is emitted from the files.
// A placeholder that does not resolve stops the run.
//
// Usage: node gen.mjs <repo root>
//
// Placeholders (aliases: ud uh sp pi fp mp pp lit audit recon sec meta):
//   {{br::ALIAS::I}}        numerator / denominator of baseRates[I], Indian digit grouping
//   {{brn::ALIAS::I}} {{brd::ALIAS::I}} {{brl::ALIAS::I}} {{brp::ALIAS::I}}  numerator, denominator, label, property
//   {{v::ALIAS::PATH}}      the value at PATH (a.b[3].c[key=value])
//   {{x::ALIAS::PATH::REGEX[::N]}}  the first match (or group N) of REGEX in the string at PATH
//   {{t::REPO-RELATIVE-FILE::REGEX[::N]}}  the same over a text file
//   {{meta::PATH}}          FORCE_META in src/graph/force.generated.ts
//   {{cnt::NAME}}           a count computed here over the raw files (inputs named in the output)
//   {{nst::DOMAIN::I}} {{ncl::DOMAIN::I}}  narrative status / claim
//   {{aud::DOMAIN::ID}}     the cross-examiner's verdict, short form; PENDING if none
//   {{@SECTION}}            a generated block (see SECTIONS)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || process.cwd());
const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, '.claude/skills/force-money-trail');
const DOMAINS = ['union-defence', 'union-home', 'state-police', 'procurement-industry', 'footprint', 'money-people', 'pay-pensions', 'literature'];
const ALIAS = { ud: 'union-defence', uh: 'union-home', sp: 'state-police', pi: 'procurement-industry', fp: 'footprint', mp: 'money-people', pp: 'pay-pensions', lit: 'literature' };
// The records the task brief (2026-10-06) listed as pending cross-examination. Their state is read
// at run time: no verdict → PENDING; a verdict but no recorded correction outcome → still pending;
// a verdict and an outcome → settled (and printed as a late verdict). Never cited as established
// while pending.
const PENDING = {
  claims: ['money-people:c095', 'money-people:c096', 'money-people:c097', 'money-people:c098', 'money-people:c100', 'money-people:c101', 'money-people:c102', 'union-defence:c047', 'procurement-industry:c066'],
  narratives: [['literature', 15], ['literature', 16]],
};

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const F = {};
for (const d of DOMAINS) F[d] = readJson(`research/raw/force/${d}.json`);
F.audit = readJson('research/raw/force/AUDIT.json');
F.recon = readJson('research/raw/force/RECONCILIATION.json');
F.sec = readJson('research/raw/cppp/security.json');
F.meta = (() => {
  const ts = fs.readFileSync(path.join(ROOT, 'src/graph/force.generated.ts'), 'utf8');
  const at = ts.indexOf('export const FORCE_META: FleetMeta = ');
  if (at < 0) throw new Error('FORCE_META not found');
  let i = ts.indexOf('{', at), depth = 0, j = i;
  for (; j < ts.length; j++) { if (ts[j] === '{') depth++; else if (ts[j] === '}') { depth--; if (depth === 0) break; } }
  return JSON.parse(ts.slice(i, j + 1));
})();
const SRC = (alias) => {
  if (ALIAS[alias]) return { obj: F[ALIAS[alias]], file: `research/raw/force/${ALIAS[alias]}.json` };
  if (alias === 'audit') return { obj: F.audit, file: 'research/raw/force/AUDIT.json' };
  if (alias === 'recon') return { obj: F.recon, file: 'research/raw/force/RECONCILIATION.json' };
  if (alias === 'sec') return { obj: F.sec, file: 'research/raw/cppp/security.json' };
  if (alias === 'meta') return { obj: F.meta, file: 'src/graph/force.generated.ts (FORCE_META)' };
  throw new Error(`unknown alias ${alias}`);
};

// ---------- formatting ----------
const fmtNum = (n) => (typeof n !== 'number' ? String(n) : Math.abs(n) >= 1000 ? n.toLocaleString('en-IN', { maximumFractionDigits: 6 }) : String(n));
const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const fmt = (v) => (v === null ? 'null' : typeof v === 'number' ? fmtNum(v) : Array.isArray(v) ? `[${v.map(fmtNum).join(', ')}]` : typeof v === 'object' ? JSON.stringify(v) : String(v));

function getPath(obj, p) {
  let cur = obj;
  for (const seg of p.split('.').filter(Boolean)) {
    const m = seg.match(/^([^[\]]*)((?:\[[^\]]+\])*)$/);
    if (!m) throw new Error(`bad path segment ${seg}`);
    if (m[1]) cur = cur?.[m[1]];
    for (const b of m[2].match(/\[[^\]]+\]/g) || []) {
      const inner = b.slice(1, -1);
      if (/^\d+$/.test(inner)) cur = cur?.[Number(inner)];
      else {
        const conds = inner.split('&&').map((c) => { const at = c.indexOf('='); return [c.slice(0, at), c.slice(at + 1)]; });
        const hits = Array.isArray(cur) ? cur.filter((r) => conds.every(([k, v]) => String(r[k]) === v)) : [];
        if (hits.length !== 1) throw new Error(`selector [${inner}] matched ${hits.length} rows (need exactly 1)`);
        cur = hits[0];
      }
    }
    if (cur === undefined) throw new Error(`path ${p} did not resolve at ${seg}`);
  }
  return cur;
}
const rx = (s, re, n = 0) => {
  const m = String(s).match(new RegExp(re));
  if (!m) throw new Error(`regex /${re}/ found nothing in: ${String(s).slice(0, 160)}…`);
  return m[Number(n)];
};

// ---------- counts over the raw files ----------
const all = (k) => DOMAINS.flatMap((d) => (F[d][k] || []).map((r) => ({ ...r, _d: d })));
const verdictKey = (v) => (v.claimId.startsWith(v.domain + ':') ? v.claimId : `${v.domain}:${v.claimId}`);
const AUD = new Map(F.audit.verdicts.map((v) => [verdictKey(v), v]));
const ACO = new Map(F.recon.auditCorrections.map((a) => [a.claimId.startsWith(a.domain + ':') ? a.claimId : `${a.domain}:${a.claimId}`, a]));
const LATE = new Set([...PENDING.claims, ...PENDING.narratives.map(([d, i]) => `${d}:narrative:${i}`)]);
const lateState = (key) => (!AUD.has(key) ? 'no-verdict' : !ACO.has(key) ? 'verdict-no-outcome' : 'settled');
const lateText = (key) => {
  const st = lateState(key), v = AUD.get(key), a = ACO.get(key);
  if (st === 'no-verdict') return 'PENDING — no verdict in AUDIT.json yet';
  const vd = `${v.refuted ? 'refuted' : 'holds'}, recommends ${v.recommendedTier}`;
  if (st === 'verdict-no-outcome') return `verdict landed (${vd}); correction not yet recorded — still pending`;
  return `late verdict: ${vd}; correction ${a.outcome}`;
};
const ABBR = /(?:\b(?:Reg|No|Nos|Ltd|Rs|St|Mr|Dr|vs|v|cf|Art|para|pp|p|Vol|ch|Co|Inc|Jr|Sr|Govt|approx|viz|al|etc)|\b[A-Z]|G\.S\.R|S\.O|e\.g|i\.e)$/;
const firstSentence = (s) => {
  const t = String(s);
  const re = /[.!?](?=\s+[A-Z“"'(\[])/g;
  let m;
  while ((m = re.exec(t))) { if (!ABBR.test(t.slice(0, m.index))) return t.slice(0, m.index + 1); }
  return t;
};
const audShort = (key) => {
  const v = AUD.get(key);
  if (!v) return 'PENDING — no verdict in AUDIT.json yet';
  if (LATE.has(key)) return lateText(key);
  return `${v.refuted ? 'refuted' : 'holds'}; recommends ${v.recommendedTier}`;
};
// Figures computed from one record's own lists (state-police:c021 large-state per-capita lists; the MEIL bond rows).
const spC021 = () => { const c = F['state-police'].claims.find((x) => x.id === 'state-police:c021'); if (!c) throw new Error('state-police:c021 not found'); return c.d; };
const spList = (re) => { const m = spC021().match(re); if (!m) throw new Error(`c021: /${re}/ found nothing`); return m[1].split(',').map((x) => Number(x.trim())); };
const median = (a) => { const s = [...a].sort((x, y) => x - y), n = s.length; if (!n) throw new Error('median of nothing'); return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const spGroup = (re) => { const m = spC021().match(re); if (!m) throw new Error(`c021: /${re}/ found nothing`); return m[1].split(',').length; };
const meilBondRows = () => F['money-people'].claims.filter((c) => c.s === 'meil' && c.pred === 'bond');
const CNT = {
  spLargeBjpMedian: () => median(spList(/BJP-run [A-Z/]+ per capita ₹\[([^\]]+)\]/)),
  spLargeOppMedian: () => median(spList(/opposition-run [A-Z/]+ per capita ₹\[([^\]]+)\]/)),
  spLargeBjpN: () => spList(/BJP-run [A-Z/]+ per capita ₹\[([^\]]+)\]/).length,
  spLargeOppN: () => spList(/opposition-run [A-Z/]+ per capita ₹\[([^\]]+)\]/).length,
  spGroupBjpN: () => spGroup(/BJP-run \(([A-Z, ]+)\)/),
  spGroupOppN: () => spGroup(/Opposition-run \(([A-Z, ]+)\)/),
  meilBondCr: () => meilBondRows().reduce((t, c) => t + c.a, 0),
  meilBondRows: () => meilBondRows().length,
  narratives: () => all('narratives').length,
  baseRates: () => all('baseRates').length,
  voids: () => all('voids').length,
  gaps: () => all('gaps').length,
  claims: () => all('claims').length,
  entities: () => new Set(all('entities').map((e) => e.id)).size,
  budgets: () => all('budgets').length,
  strength: () => all('strength').length,
  footprint: () => all('footprint').length,
  budgetsByFile: () => DOMAINS.filter((d) => (F[d].budgets || []).length).map((d) => `${d} ${fmtNum(F[d].budgets.length)}`).join(' + '),
  strengthByFile: () => DOMAINS.filter((d) => (F[d].strength || []).length).map((d) => `${d} ${F[d].strength.length}`).join(' + '),
  footprintByFile: () => DOMAINS.filter((d) => (F[d].footprint || []).length).map((d) => `${d} ${F[d].footprint.length}`).join(' + '),
  budgetsZero: () => all('budgets').filter((r) => r.cr === 0).length,
  budgetsReported: () => all('budgets').filter((r) => String(r.note || '').startsWith('reported:')).length,
  strengthReported: () => all('strength').filter((r) => String(r.note || '').startsWith('reported:')).length,
  footprintReported: () => all('footprint').filter((r) => String(r.note || '').startsWith('reported:')).length,
  budgetsPayers: () => new Set(all('budgets').map((r) => r.payer)).size,
  budgetsStatePayers: () => new Set(all('budgets').filter((r) => r.payer !== 'union').map((r) => r.payer)).size,
  budgetsUnion: () => all('budgets').filter((r) => r.payer === 'union').length,
  fyMin: () => all('budgets').map((r) => r.fy).sort()[0],
  fyMax: () => all('budgets').map((r) => r.fy).sort().at(-1),
  fpCities: () => new Set(all('footprint').map((r) => `${r.st}|${r.city}`)).size,
  fpStates: () => new Set(all('footprint').map((r) => r.st)).size,
  audit: () => F.audit.verdicts.length,
  refuted: () => F.audit.verdicts.filter((v) => v.refuted).length,
  auditNarr: () => F.audit.verdicts.filter((v) => v.claimId.startsWith('narrative:')).length,
  killed: () => F.recon.killed.length,
  killedDup: () => F.recon.killed.filter((k) => k.reason.startsWith('duplicate')).length,
  killedOther: () => F.recon.killed.filter((k) => !k.reason.startsWith('duplicate')).length,
  refusedMerges: () => F.recon.refusedMerges.length,
  mappings: () => F.recon.mappings.length,
  predicateFixes: () => F.recon.predicateFixes.length,
  addedContras: () => F.recon.addedContras.length,
  otherFixes: () => F.recon.otherFixes.length,
  criticItems: () => F.recon.criticItems.length,
  entityRecordsConsolidated: () => F.recon.entityRecordsConsolidated.length,
  acTotal: () => F.recon.auditCorrections.length,
  pendingClaims: () => PENDING.claims.length,
  pendingNarr: () => PENDING.narratives.length,
  late: () => LATE.size,
  lateNoVerdict: () => [...LATE].filter((k) => lateState(k) === 'no-verdict').length,
  lateNoOutcome: () => [...LATE].filter((k) => lateState(k) === 'verdict-no-outcome').length,
  lateSettled: () => [...LATE].filter((k) => lateState(k) === 'settled').length,
  lateRefuted: () => [...LATE].filter((k) => AUD.get(k)?.refuted).length,
};
function count(name) {
  if (CNT[name]) return CNT[name]();
  let m;
  if ((m = name.match(/^(narratives|baseRates|voids|gaps|claims|entities):(.+)$/))) return (F[m[2]][m[1]] || []).length;
  if ((m = name.match(/^status:(.+)$/))) return all('narratives').filter((n) => n.status === m[1]).length;
  if ((m = name.match(/^audit:(.+)$/))) return F.audit.verdicts.filter((v) => v.domain === m[1]).length;
  if ((m = name.match(/^refuted:(.+)$/))) return F.audit.verdicts.filter((v) => v.domain === m[1] && v.refuted).length;
  if ((m = name.match(/^tier:(.+)$/))) return F.audit.verdicts.filter((v) => v.recommendedTier === m[1]).length;
  if ((m = name.match(/^ac:([^:]+)$/))) return F.recon.auditCorrections.filter((a) => a.outcome === m[1]).length;
  if ((m = name.match(/^ac:([^:]+):(.+)$/))) return F.recon.auditCorrections.filter((a) => a.domain === m[1] && a.outcome === m[2]).length;
  if ((m = name.match(/^fpkind:(.+)$/))) return all('footprint').filter((r) => r.kind === m[1]).length;
  if ((m = name.match(/^component:(.+)$/))) return all('budgets').filter((r) => r.component === m[1]).length;
  if ((m = name.match(/^stage:(.+)$/))) return all('budgets').filter((r) => r.stage === m[1]).length;
  throw new Error(`unknown count ${name}`);
}

// ---------- the refuted register: failure mode per verdict (hand-assigned; every refuted verdict must appear once) ----------
const MODES = [
  ['Arithmetic that does not reproduce, or a numerator and a denominator on different bases',
    ['footprint:c012', 'literature:c021', 'pay-pensions:c013', 'pay-pensions:c022', 'union-home:c030'],
    'Recompute from the printed table on one basis and print the inputs beside the ratio.'],
  ['A list called complete that is not ("only", "first", "all", a hand-picked sample labelled as the universe)',
    ['footprint:c014', 'procurement-industry:c063', 'procurement-industry:narrative:0'],
    'Name the set as a sample and say which way it is biased; search for the counter-example before writing "only".'],
  ['The date test: a start, end or decision date the primary contradicts, an undated rule that was superseded, or a grouping key that fails its own dates',
    ['union-defence:c002', 'union-defence:c004', 'money-people:c024', 'money-people:c029', 'money-people:c091', 'money-people:c092', 'money-people:c093', 'literature:c015'],
    'Date every role and rule from the gazette, PIB or the annual report; key a case by the decision date and say so.'],
  ['The wrong node: owner, payer, subject, or a money predicate where no money moved',
    ['union-defence:c016', 'literature:c028', 'money-people:c071'],
    'The owner of record is the one the filing names; a buyer is not a payee; an allegation is not a payment.'],
  ['The source does not say it: misattributed words, a dropped qualifier, a figure the source contradicts',
    ['literature:c007', 'literature:c023', 'literature:narrative:1', 'literature:narrative:9', 'literature:narrative:15', 'money-people:c031', 'money-people:c053', 'money-people:c062', 'procurement-industry:c062'],
    'Quote the sentence and the speaker; open the page before writing "no biography" or "no figure".'],
  ['Documented facts joined into a motive or an incidence no source states',
    ['money-people:narrative:0', 'money-people:narrative:1', 'money-people:narrative:6', 'literature:narrative:7', 'literature:narrative:10', 'literature:narrative:14'],
    'Each fact keeps its tier; the join is analytic with an innocent reading, or it is a narrative on the ladder.'],
  ['The control or the comparator dissolves the headline, or the counter itself is wrong',
    ['money-people:c021', 'money-people:c022', 'pay-pensions:c023', 'pay-pensions:c026', 'literature:c026', 'literature:narrative:0', 'literature:narrative:6', 'literature:narrative:11', 'union-defence:narrative:0', 'union-defence:narrative:2', 'state-police:narrative:0', 'state-police:narrative:2', 'state-police:c027', 'footprint:narrative:0'],
    'Run the like-for-like control (same size, same years, same series) before the headline; run the narrative\'s own falsifier first.'],
];
{
  const assigned = MODES.flatMap((m) => m[1]);
  const refuted = F.audit.verdicts.filter((v) => v.refuted).map(verdictKey);
  const missing = refuted.filter((k) => !assigned.includes(k));
  const extra = assigned.filter((k) => !refuted.includes(k));
  const dup = assigned.filter((k, i) => assigned.indexOf(k) !== i);
  if (missing.length || extra.length || dup.length) throw new Error(`mode map: missing ${missing} extra ${extra} dup ${dup}`);
}

// Narratives that more than one file rates (hand-grouped by subject; statuses read from the files)
const OVERLAPS = [
  ['India under-spends on defence', [['union-defence', 0], ['literature', 5]]],
  ['Pensions (and pay) are eating the defence budget', [['union-defence', 1], ['pay-pensions', 3], ['literature', 6]]],
  ['Rafale: price and offset partner', [['money-people', 3], ['literature', 0], ['literature', 1], ['procurement-industry', 1], ['literature', 15]]],
  ['Bofors', [['money-people', 2], ['literature', 2]]],
  ['AgustaWestland', [['money-people', 4], ['literature', 4]]],
  ['Tatra/BEML', [['money-people', 5], ['literature', 14]]],
  ['Adarsh', [['money-people', 6], ['literature', 13]]],
  ['Pegasus', [['money-people', 8], ['literature', 3]]],
  ['Agnipath and money', [['pay-pensions', 1], ['literature', 7]]],
  ['Make in India and imports', [['procurement-industry', 2], ['literature', 12]]],
  ['Police strength and vacancies', [['state-police', 2], ['literature', 8]]],
  ['Custodial torture', [['literature', 10], ['literature', 16]]],
];

// ---------- generated sections ----------
const nKey = (d, i) => `${d}:narrative:${i}`;
const isPendingN = (d, i) => LATE.has(nKey(d, i)) && lateState(nKey(d, i)) !== 'settled';
// The narratives.md block on why each unsupported narrative is not alleged is hand-written per entry;
// this guard stops the run if the files' unsupported set no longer matches the entries written.
const UNSUPPORTED_WRITTEN = ['state-police:narrative:1', 'procurement-industry:narrative:0', 'money-people:narrative:0', 'money-people:narrative:1', 'money-people:narrative:7', 'money-people:narrative:9', 'literature:narrative:0'];
const SECTIONS = {
  unsupportedGuard: () => {
    const now = DOMAINS.flatMap((d) => F[d].narratives.map((n, i) => [nKey(d, i), n.status])).filter(([, st]) => st === 'unsupported').map(([k]) => k).sort();
    const want = [...UNSUPPORTED_WRITTEN].sort();
    if (now.join() !== want.join()) throw new Error(`unsupported narratives changed: files ${now} vs written ${want} — rewrite the block in narratives.src.md`);
    return '';
  },
  mappings: () => ['| loser | survivor | why (RECONCILIATION.json → mappings, verbatim) |', '|---|---|---|',
    ...F.recon.mappings.map((m) => `| \`${m.from}\` | \`${m.to}\` | ${esc(m.reason)} |`)].join('\n'),
  refusedMerges: () => ['| a | b | why not one node (RECONCILIATION.json → refusedMerges, verbatim) |', '|---|---|---|',
    ...F.recon.refusedMerges.map((m) => `| \`${esc(m.a)}\` | \`${esc(m.b)}\` | ${esc(m.reason)} |`)].join('\n'),
  baseRates: () => DOMAINS.map((d) => [`### ${d} (${F[d].baseRates.length})`, '', '| # | property | numerator / denominator | label | first source |', '|---|---|---|---|---|',
    ...F[d].baseRates.map((b, i) => `| ${i} | ${esc(b.property)} | ${fmt(b.numerator)} / ${fmt(b.denominator)} | ${esc(b.label)} | ${esc(b.srcs?.[0]?.[0] ?? '—')} |`)].join('\n')).join('\n\n'),
  voids: () => DOMAINS.map((d) => [`### ${d} (${F[d].voids.length})`, '', '| # | what is absent | why it matters | first source |', '|---|---|---|---|',
    ...F[d].voids.map((v, i) => `| ${i} | ${esc(v.what)} | ${esc(v.whyItMatters)} | ${esc(v.srcs?.[0]?.[0] ?? '—')} |`)].join('\n')).join('\n\n'),
  gaps: () => DOMAINS.map((d) => [`### ${d} (${F[d].gaps.length})`, '', ...F[d].gaps.map((g, i) => `${i}. ${esc(g)}`)].join('\n')).join('\n\n'),
  symmetry: () => DOMAINS.map((d) => `### ${d}\n\n> ${esc(F[d].symmetryCheck)}`).join('\n\n'),
  refuted: () => ['| failure mode | claim ids (domain:id → recommended tier) | the rule that follows |', '|---|---|---|',
    ...MODES.map(([mode, ids, rule]) => `| ${mode} | ${ids.map((k) => `\`${k}\` → ${AUD.get(k).recommendedTier}`).join('; ')} | ${rule} |`)].join('\n'),
  refutedReasons: () => ['| verdict | source check | first sentence of the reason (AUDIT.json, verbatim) |', '|---|---|---|',
    ...MODES.flatMap(([, ids]) => ids).map((k) => `| \`${k}\` | ${AUD.get(k).sourceCheck} | ${esc(firstSentence(AUD.get(k).reason))} |`)].join('\n'),
  killed: () => ['| killed claim | reason (RECONCILIATION.json → killed, verbatim) |', '|---|---|',
    ...F.recon.killed.map((k) => `| \`${k.id}\` | ${esc(k.reason)} |`)].join('\n'),
  predicateFixes: () => F.recon.predicateFixes.map((p) => `\`${p.id}\` ${p.from} → ${p.to}`).join('; '),
  corrections: () => {
    const outcomes = [...new Set(F.recon.auditCorrections.map((a) => a.outcome))];
    const rows = DOMAINS.map((d) => {
      const v = F.audit.verdicts.filter((x) => x.domain === d);
      return `| ${d} | ${v.length} | ${v.filter((x) => x.refuted).length} | ${v.filter((x) => x.claimId.startsWith('narrative:')).length} | ${outcomes.map((o) => F.recon.auditCorrections.filter((a) => a.domain === d && a.outcome === o).length).join(' | ')} |`;
    });
    const tot = `| **all** | ${F.audit.verdicts.length} | ${F.audit.verdicts.filter((x) => x.refuted).length} | ${F.audit.verdicts.filter((x) => x.claimId.startsWith('narrative:')).length} | ${outcomes.map((o) => F.recon.auditCorrections.filter((a) => a.outcome === o).length).join(' | ')} |`;
    const notApplied = F.recon.auditCorrections.filter((a) => a.outcome !== 'applied').map((a) => `| \`${a.claimId}\` | ${a.outcome} | ${esc(a.note)} |`);
    const tiers = [...new Set(F.audit.verdicts.map((v) => v.recommendedTier))].map((t) => `${t} ${F.audit.verdicts.filter((v) => v.recommendedTier === t).length}`).join(' · ');
    const sc = [...new Set(F.audit.verdicts.map((v) => v.sourceCheck))].map((t) => `${t} ${F.audit.verdicts.filter((v) => v.sourceCheck === t).length}`).join(' · ');
    return [`| domain | verdicts | refuted | of which narratives | ${outcomes.join(' | ')} |`, `|---|---|---|---|${outcomes.map(() => '---').join('|')}|`, ...rows, tot, '',
      `Recommended tiers across all verdicts: ${tiers}. Source checks: ${sc}.`, '',
      'Every correction not applied, with its recorded reason (RECONCILIATION.json → auditCorrections, verbatim):', '',
      '| verdict | outcome | note |', '|---|---|---|', ...notApplied].join('\n');
  },
  pending: () => {
    const cell = (k) => { const v = AUD.get(k), a = ACO.get(k); return `${lateState(k) === 'settled' ? 'settled' : '**pending**'} | ${v ? `${v.refuted ? 'refuted' : 'holds'} → ${v.recommendedTier}; ${esc(firstSentence(v.reason))}` : 'no verdict'} | ${a ? `${a.outcome}: ${esc(firstSentence(a.note))}` : 'not recorded'}`; };
    const rows = PENDING.claims.map((id) => {
      const d = id.split(':')[0];
      const c = F[d].claims.find((x) => x.id === id);
      return `| \`${id}\` | ${c ? `${c.pred} · ${c.tier}` : '(not in file)'} | ${esc(c ? c.lab : '')} | ${cell(id)} |`;
    });
    for (const [d, i] of PENDING.narratives) rows.push(`| \`${d}:narrative:${i}\` | narrative · ${F[d].narratives[i].status} | ${esc(F[d].narratives[i].claim)} | ${cell(nKey(d, i))} |`);
    return ['| record | predicate · tier in the file now | label | state | AUDIT.json verdict (first sentence) | RECONCILIATION.json outcome (first sentence) |', '|---|---|---|---|---|---|', ...rows].join('\n');
  },
  lateShort: () => {
    const ks = [...LATE], by = (st) => ks.filter((k) => lateState(k) === st);
    const settled = by('settled'), ref = settled.filter((k) => AUD.get(k).refuted);
    const parts = [`${settled.length} of ${ks.length} settled (verdict in AUDIT.json, outcome in RECONCILIATION.json): ${settled.length - ref.length} hold${ref.length ? `, ${ref.length} refuted (${ref.map((k) => `\`${k}\` → ${AUD.get(k).recommendedTier}, correction ${ACO.get(k).outcome}`).join('; ')})` : ''}`];
    if (by('verdict-no-outcome').length) parts.push(`${by('verdict-no-outcome').length} with a verdict but no recorded correction — still pending (${by('verdict-no-outcome').map((k) => `\`${k}\``).join(', ')})`);
    if (by('no-verdict').length) parts.push(`${by('no-verdict').length} without a verdict — pending (${by('no-verdict').map((k) => `\`${k}\``).join(', ')})`);
    return parts.join('; ');
  },
  coverage: () => {
    const B = all('budgets'), S = all('strength'), P = all('footprint');
    const by = (rows, k) => [...new Set(rows.map((r) => r[k]))].sort().map((v) => `${v} ${fmtNum(rows.filter((r) => r[k] === v).length)}`).join(' · ');
    return [
      '| series | rows by file | rows by key | tier marks |', '|---|---|---|---|',
      `| budgets | ${CNT.budgetsByFile()} = ${fmtNum(B.length)} | payer: union ${fmtNum(CNT.budgetsUnion())}, ${CNT.budgetsStatePayers()} state payers ${B.length - CNT.budgetsUnion()} · component: ${by(B, 'component')} · stage: ${by(B, 'stage')} · FY ${CNT.fyMin()} → ${CNT.fyMax()} | note begins \`reported:\` on ${CNT.budgetsReported()}; \`cr\` = 0 on ${CNT.budgetsZero()} |`,
      `| strength | ${CNT.strengthByFile()} = ${S.length} | st null ${S.filter((r) => r.st === null).length}, state rows ${S.filter((r) => r.st !== null).length} · year: ${by(S, 'year')} | note begins \`reported:\` on ${CNT.strengthReported()} of ${S.length} |`,
      `| footprint | ${CNT.footprintByFile()} = ${P.length} | kind: ${by(P, 'kind')} · ${CNT.fpStates()} state codes, ${CNT.fpCities()} distinct state-and-city pairs | note begins \`reported:\` on ${CNT.footprintReported()} |`,
      '',
      `Union financial years with at least one \`actual\` row: ${[...new Set(B.filter((r) => r.payer === 'union' && r.stage === 'actual').map((r) => r.fy))].sort().join(', ')}.`,
      '',
      `State payers (codes): ${[...new Set(B.filter((r) => r.payer !== 'union').map((r) => r.payer))].sort().join(', ')}. Bodies with budget rows: ${new Set(B.map((r) => r.body)).size}. Bodies with strength rows: ${new Set(S.map((r) => r.body)).size}.`,
    ].join('\n');
  },
  narrativeTables: () => DOMAINS.map((d) => {
    const rows = F[d].narratives.map((n, i) => {
      const v = AUD.get(nKey(d, i));
      const late = LATE.has(nKey(d, i)) ? ` *(${lateText(nKey(d, i))})*` : '';
      const verdict = isPendingN(d, i) && !v ? '**PENDING** cross-examination (no verdict in AUDIT.json yet; do not cite as established)'
        : v ? `${v.refuted ? '**refuted**' : 'holds'}; recommends ${v.recommendedTier}; ${esc(firstSentence(v.reason))}${late}` : 'no verdict';
      return `| ${i} | ${esc(n.claim)} | **${n.status}** | ${esc(n.strongestCase)} | ${esc(n.strongestCounter)} | ${esc(n.whatWouldChangeThis ?? n.whatWouldChange)} | ${verdict} |`;
    });
    return [`## ${d} (${F[d].narratives.length})`, '', '| # | narrative | status | strongest case | strongest counter | what would change it | cross-examiner (AUDIT.json) |', '|---|---|---|---|---|---|---|', ...rows].join('\n');
  }).join('\n\n'),
  statusCounts: () => {
    const st = [...new Set(all('narratives').map((n) => n.status))];
    const head = `| file | ${st.join(' | ')} | total |`;
    const rows = DOMAINS.map((d) => `| ${d} | ${st.map((s) => F[d].narratives.filter((n) => n.status === s).length).join(' | ')} | ${F[d].narratives.length} |`);
    return [head, `|---|${st.map(() => '---').join('|')}|---|`, ...rows, `| **all** | ${st.map((s) => count('status:' + s)).join(' | ')} | ${count('narratives')} |`].join('\n');
  },
  overlaps: () => ['| subject | how each file rates it (status from the file; verdict from AUDIT.json) |', '|---|---|',
    ...OVERLAPS.map(([subj, list]) => `| ${subj} | ${list.map(([d, i]) => `${d} narrative:${i} **${F[d].narratives[i].status}** (${isPendingN(d, i) ? 'PENDING' : audShort(nKey(d, i))})`).join('; ')} |`)].join('\n'),
  ladderShort: () => ['| file | # | narrative (as filed) | status | cross-examiner |', '|---|---|---|---|---|',
    ...DOMAINS.flatMap((d) => F[d].narratives.map((n, i) => `| ${d} | ${i} | ${esc(n.claim.length > 150 ? n.claim.slice(0, n.claim.lastIndexOf(' ', 150)) + ' …' : n.claim)} | ${n.status} | ${isPendingN(d, i) ? '**PENDING**' : audShort(nKey(d, i))} |`))].join('\n'),
};

// ---------- placeholder resolution ----------
const stats = { figures: 0, sections: 0, rowsGenerated: 0 };
function resolve(text) {
  return text.replace(/\{\{([^{}]+)\}\}/g, (_, body) => {
    const parts = body.split('::');
    const k = parts[0];
    if (k.startsWith('@')) {
      const fn = SECTIONS[k.slice(1)];
      if (!fn) throw new Error(`unknown section ${k}`);
      stats.sections++;
      const out = fn();
      stats.rowsGenerated += out.split('\n').filter((l) => /^\| /.test(l) && !/^\|---/.test(l)).length;
      return out;
    }
    stats.figures++;
    switch (k) {
      case 'br': { const b = SRC(parts[1]).obj.baseRates[Number(parts[2])]; if (!b) throw new Error(`no baseRate ${body}`); return `${fmt(b.numerator)} / ${fmt(b.denominator)}`; }
      case 'brn': return fmt(SRC(parts[1]).obj.baseRates[Number(parts[2])].numerator);
      case 'brd': return fmt(SRC(parts[1]).obj.baseRates[Number(parts[2])].denominator);
      case 'brl': return esc(SRC(parts[1]).obj.baseRates[Number(parts[2])].label);
      case 'brp': return esc(SRC(parts[1]).obj.baseRates[Number(parts[2])].property);
      case 'v': return esc(fmt(getPath(SRC(parts[1]).obj, parts[2])));
      case 'x': return esc(rx(getPath(SRC(parts[1]).obj, parts[2]), parts[3], parts[4]));
      case 't': return esc(rx(fs.readFileSync(path.join(ROOT, parts[1]), 'utf8'), parts[2], parts[3]));
      case 'meta': return esc(fmt(getPath(F.meta, parts[1])));
      case 'cnt': return fmtNum(count(parts[1]));
      case 'nst': return F[parts[1]].narratives[Number(parts[2])].status;
      case 'ncl': return esc(F[parts[1]].narratives[Number(parts[2])].claim);
      case 'aud': { const key = parts[2].startsWith('narrative:') ? `${parts[1]}:${parts[2]}` : parts[2]; return audShort(key); }
      case 'late': return lateText(parts[1]);
      default: throw new Error(`unknown placeholder ${body}`);
    }
  });
}

fs.mkdirSync(path.join(OUT, 'references'), { recursive: true });
const jobs = [['SKILL.src.md', 'SKILL.md'], ['tables.src.md', 'references/tables.md'], ['ledger.src.md', 'references/ledger.md'], ['narratives.src.md', 'references/narratives.md']];
const report = {};
for (const [src, dst] of jobs) {
  const before = { ...stats };
  const out = resolve(fs.readFileSync(path.join(HERE, src), 'utf8'));
  if (/\{\{|\}\}/.test(out)) throw new Error(`unresolved braces in ${dst}`);
  fs.writeFileSync(path.join(OUT, dst), out);
  report[dst] = { bytes: Buffer.byteLength(out), lines: out.split('\n').length, figurePlaceholders: stats.figures - before.figures, sections: stats.sections - before.sections, generatedTableRows: stats.rowsGenerated - before.rowsGenerated };
}
console.log(JSON.stringify({ report, totals: stats, read: { auditAsOf: F.audit.asOf, verdicts: F.audit.verdicts.length, corrections: F.recon.auditCorrections.length, metaRunId: F.meta.runId, late: [...LATE].map((k) => [k, lateState(k)]) } }, null, 2));

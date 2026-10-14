/**
 * Derived graph construction.
 *
 * Turns the factual datasets — cabinet roster, conglomerate ownership, listed
 * companies — into graph nodes and edges. Everything produced here is either
 * `documented` (a roster or ownership fact with a source) or `analytic` (a
 * comparison we are drawing ourselves, which therefore carries an innocentReading
 * and asserts nothing).
 *
 * CRITICAL: this builder never creates an edge between a person and a company on
 * the basis of shared state, shared sector, or portfolio reach. Those are rendered
 * as FILTERS and as ANALYTIC context, never as relationships. A minister's
 * regulatory reach over a sector is a fact about the constitution, not about the
 * minister.
 */

import { MINISTERS, RANK_LABEL, economicPortfolioLabels, sectorsTouchedBy, type Minister } from '../data/politics';
import { GROUPS } from '../data/conglomerates';
import { COMPANIES, EXCHANGE_OF, type Company } from '../data/companies';
import type { GNode, GEdge, NodeFamily, NodeType } from './schema';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function ministerNode(m: Minister): GNode {
  return {
    id: `pol:${m.id}`,
    label: m.name,
    sub: RANK_LABEL[m.rank],
    ty: 'person',
    fam: 'state',
    st: m.stateCode,
    sz: m.rank === 'pm' ? 4 : m.rank === 'cabinet' ? 3 : 2,
    al: [m.name],
    resolved: true,
    d: [
      `${m.portfolios.join('; ')} [documented]`,
      `${m.house}${m.constituency ? ` — ${m.constituency}` : ''}, ${m.state} [documented]`,
      ...(m.notes ? [`${m.notes} [documented]`] : []),
    ],
    srcs: m.srcs,
  };
}

function ministryNode(label: string, srcs: [string, string][]): GNode {
  return {
    id: `min:${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label,
    sub: 'Union ministry',
    ty: 'ministry',
    fam: 'state',
    st: 'dl',
    sz: 3,
    resolved: true,
    srcs,
  };
}

const SECTOR_SRC: [string, string][] = [['NSE India — sectoral indices', 'https://www.nseindia.com/']];

function sectorNode(sector: string): GNode {
  return {
    id: `sec:${sector.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label: sector,
    sub: 'sector',
    ty: 'industry',
    fam: 'market',
    st: null,
    sz: 2,
    resolved: true,
    srcs: SECTOR_SRC,
  };
}

function companyNode(c: Company): GNode {
  const ty: NodeType = c.ownership.startsWith('psu') ? 'psu' : 'company';
  const fam: NodeFamily = c.ownership.startsWith('psu') ? 'state' : 'capital';
  const sz = c.marketCapCr == null ? 1 : c.marketCapCr > 500000 ? 4 : c.marketCapCr > 150000 ? 3 : c.marketCapCr > 40000 ? 2 : 1;
  return {
    id: `co:${c.id}`,
    label: c.shortName || c.name,
    sub: `${c.industry} · ${c.hqCity}`,
    ty,
    fam,
    st: c.stateCode,
    sz: sz as 1 | 2 | 3 | 4,
    al: [c.name, c.shortName, c.nse ?? '', c.isin ?? ''].filter(Boolean) as string[],
    resolved: true,
    d: [
      `${EXCHANGE_OF(c).join(' + ')}${c.nse ? ` · ${c.nse}` : ''}${c.bse ? ` · BSE ${c.bse}` : ''} [documented]`,
      c.marketCapCr != null ? `Market cap ₹${c.marketCapCr.toLocaleString('en-IN')} cr (as of dataset date) [documented]` : 'Market cap not recorded [gap]',
      `Registered HQ: ${c.hqCity}, ${c.state} [documented]`,
    ],
    srcs: c.srcs,
  };
}

function groupNode(id: string, name: string, stateCode: Company['stateCode'], srcs: [string, string][], mcap: number | null): GNode {
  return {
    id: `grp:${id}`,
    label: name,
    sub: mcap ? `group · ₹${Math.round(mcap / 100000)} lakh cr combined` : 'promoter group',
    ty: 'group',
    fam: 'capital',
    st: stateCode,
    sz: 4,
    resolved: true,
    srcs,
  };
}

export interface DerivedGraph {
  nodes: GNode[];
  edges: GEdge[];
}

export function buildNationalGraph(): DerivedGraph {
  const nodes = new Map<string, GNode>();
  const edges: GEdge[] = [];
  const put = (n: GNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
    return n.id;
  };

  // --- political layer -----------------------------------------------------
  for (const m of MINISTERS) {
    const pid = put(ministerNode(m));
    for (const p of m.portfolios) {
      const mid = put(ministryNode(p, m.srcs));
      edges.push({
        s: pid,
        t: mid,
        pred: 'role',
        tier: 'documented',
        lab: RANK_LABEL[m.rank],
        from: m.since ?? undefined,
        d: `${m.name} holds ${p}.`,
        srcs: m.srcs,
      });
    }
    // Regulatory reach: ministry → sector. A constitutional fact about which
    // sectors a ministry regulates, NOT a claim about the minister.
    for (const sector of sectorsTouchedBy(m)) {
      const sid = put(sectorNode(sector));
      for (const label of economicPortfolioLabels(m)) {
        const mid = `min:${m.portfolios.find((p) => p.toLowerCase().includes(label.split(' ')[0].toLowerCase())) ?? label}`
          .toLowerCase()
          .replace(/[^a-z0-9:]+/g, '-');
        if (!nodes.has(mid)) continue;
        edges.push({
          s: mid,
          t: sid,
          pred: 'law',
          tier: 'documented',
          lab: 'regulatory reach',
          d: `${label} is the union ministry with policy responsibility touching the ${sector} sector. This is an allocation-of-business fact, not a claim about any individual.`,
          srcs: [['Government of India (Allocation of Business) Rules 1961', 'https://cabsec.gov.in/']],
        });
      }
    }
  }

  // --- capital layer -------------------------------------------------------
  // A roster entity that is also in the companies dataset is the SAME node (`co:<company.id>`),
  // resolved by NSE symbol, then BSE code — never by name. Only an entity the dataset does not
  // carry is minted from its own symbol. Before this join the graph carried two nodes for 34 of
  // the 64 roster entities (`co:lt` beside `co:larsen-toubro`, `co:tcs` beside
  // `co:tata-consultancy-services`), and the Atlas and the finance fleet cite the dataset id.
  const byNse = new Map(COMPANIES.filter((c) => c.nse).map((c) => [c.nse as string, c]));
  const byBse = new Map(COMPANIES.filter((c) => c.bse).map((c) => [String(c.bse), c]));
  for (const g of GROUPS) {
    const gid = put(groupNode(g.id, g.name, g.stateCode, g.srcs, g.combinedMcapCr));
    for (const e of g.listedEntities) {
      const known = (e.nse && byNse.get(e.nse)) || (e.bse && byBse.get(String(e.bse))) || null;
      const rosterFacts = [
        e.promoterHoldingPct != null ? `Promoter holding ${e.promoterHoldingPct}%${e.asOfQuarter ? ` as of ${e.asOfQuarter}` : ''} (group roster) [documented]` : null,
        e.notes ? `${e.notes} [documented]` : null,
      ].filter((x): x is string => Boolean(x));
      let id: string;
      if (known) {
        id = put(companyNode(known));
        const n = nodes.get(id)!;
        for (const f of rosterFacts) if (!n.d?.includes(f)) n.d = [...(n.d ?? []), f];
        for (const a of [e.name, e.nse ?? '']) if (a && !n.al?.includes(a)) n.al = [...(n.al ?? []), a];
      } else {
        const slug = (e.nse ?? e.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        id = put({
          id: `co:${slug}`,
          label: e.name.replace(/ (Ltd|Limited)\.?$/, ''),
          sub: e.sector,
          ty: 'company',
          fam: 'capital',
          st: e.hqState,
          sz: (e.mcapCr == null ? 1 : e.mcapCr > 500000 ? 4 : e.mcapCr > 150000 ? 3 : e.mcapCr > 40000 ? 2 : 1) as 1 | 2 | 3 | 4,
          al: [e.name, e.nse ?? ''].filter(Boolean) as string[],
          resolved: true,
          d: [
            `${e.nse ? `NSE ${e.nse}` : ''}${e.bse ? ` · BSE ${e.bse}` : ''} [documented]`,
            e.mcapCr != null ? `Market cap ₹${e.mcapCr.toLocaleString('en-IN')} cr [documented]` : 'Market cap not recorded [gap]',
            ...(e.notes ? [`${e.notes} [documented]`] : []),
          ],
          srcs: e.srcs,
        });
      }
      edges.push({
        s: gid,
        t: id,
        pred: 'own',
        tier: 'documented',
        a: e.mcapCr ?? 0,
        lab: e.promoterHoldingPct != null ? `promoter ${e.promoterHoldingPct}%` : 'group entity',
        d:
          e.promoterHoldingPct != null
            ? `Promoter holding ${e.promoterHoldingPct}%${e.asOfQuarter ? ` as of ${e.asOfQuarter}` : ''}.`
            : 'Group entity; promoter holding not recorded.',
        srcs: e.srcs,
      });
      const sid = put(sectorNode(normaliseSector(e.sector)));
      edges.push({
        s: id,
        t: sid,
        pred: 'sector',
        tier: 'documented',
        lab: 'operates in',
        srcs: e.srcs,
      });
    }
    for (const p of g.keyPeople) {
      const pid = put({
        id: `per:${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: p.name,
        sub: p.role,
        ty: 'person',
        fam: 'capital',
        st: g.stateCode,
        sz: p.family ? 3 : 2,
        al: [p.name],
        resolved: true,
        srcs: p.srcs,
      });
      edges.push({
        s: pid,
        t: gid,
        pred: p.family ? 'family' : 'role',
        tier: 'documented',
        lab: `${p.role}, ${p.entity}`,
        from: p.since ?? undefined,
        srcs: p.srcs,
      });
    }
    for (const f of g.foreignPartners) {
      const fid = put({
        id: `for:${f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: f.name,
        sub: `${f.country} — foreign partner`,
        ty: 'company',
        fam: 'capital',
        st: null,
        sz: 2,
        resolved: true,
        srcs: f.srcs,
      });
      edges.push({
        s: fid,
        t: gid,
        pred: 'own',
        tier: 'documented',
        lab: f.stake,
        d: `${f.name} (${f.country}) — ${f.stake} in ${f.entity}.`,
        srcs: f.srcs,
      });
    }
  }

  // --- market layer --------------------------------------------------------
  for (const c of COMPANIES) {
    const id = put(companyNode(c));
    const sid = put(sectorNode(c.sector));
    edges.push({ s: id, t: sid, pred: 'sector', tier: 'documented', lab: c.industry, srcs: c.srcs });
    if (c.group) {
      const gid = `grp:${c.group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (nodes.has(gid)) {
        edges.push({ s: gid, t: id, pred: 'own', tier: 'documented', lab: 'group entity', srcs: c.srcs });
      }
    }
  }

  return { nodes: [...nodes.values()], edges: dedupe(edges) };
}

const SECTOR_MAP: Record<string, string> = {
  'oil to chemicals / diversified': 'Energy',
  'oil & gas': 'Energy',
  refining: 'Energy',
  petrochemicals: 'Chemicals',
  'financial services': 'Financials',
  telecom: 'Telecom',
  'digital services': 'Telecom',
  retail: 'Consumer Discretionary',
  media: 'Media',
  ports: 'Infrastructure',
  power: 'Utilities',
  'renewable energy': 'Utilities',
  transmission: 'Utilities',
  cement: 'Cement',
  metals: 'Metals & Mining',
  mining: 'Metals & Mining',
  steel: 'Metals & Mining',
  automobile: 'Auto',
  auto: 'Auto',
  it: 'IT',
  'information technology': 'IT',
  pharmaceuticals: 'Healthcare',
  'engineering & construction': 'Infrastructure',
};

export function normaliseSector(s: string): string {
  const k = s.toLowerCase().trim();
  if (SECTOR_MAP[k]) return SECTOR_MAP[k];
  for (const [needle, out] of Object.entries(SECTOR_MAP)) if (k.includes(needle)) return out;
  return cap(s.split('/')[0].trim());
}

function dedupe(edges: GEdge[]): GEdge[] {
  const seen = new Set<string>();
  const out: GEdge[] = [];
  for (const e of edges) {
    const k = `${e.s}|${e.pred}|${e.t}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

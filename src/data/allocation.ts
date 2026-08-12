import { COAL_BLOCKS, MINERAL_BLOCKS, HC_BLOCKS } from './resources';
import { ALL_AWARDS } from './tenders';
import type { GNode, GEdge } from '../graph/schema';

/**
 * The allocation graph — every register on one bipartite network.
 *
 * The question it exists to answer is one no single register can: does the same
 * company appear as a winner in more than one allocation process? Coal blocks,
 * mineral concessions, hydrocarbon acreage and government contracts are run by
 * different ministries under different statutes, and nothing joins them except the
 * winner's name.
 *
 * WHICH IS THE PROBLEM, AND IT IS STATED RATHER THAN WORKED AROUND.
 *
 * The platform's entity-resolution invariant is that entities join on CIN or DIN and
 * never on a name. This module breaks that invariant deliberately and openly,
 * because there is no alternative: 60 of 126 coal rows carry no CIN, the mineral
 * register prints winners as free text, and DGH publishes operator names without
 * identifiers. Name normalisation is the only join available.
 *
 * So everything this module produces is tier `analytic`, carries an innocent reading,
 * and is never rendered as a documented relationship. The errors run in BOTH
 * directions and both are real:
 *
 *  - OVER-MERGING: two genuinely distinct companies sharing a normalised name become
 *    one node. "Adani New Industries Limited" exists twice with different CINs.
 *  - UNDER-MERGING: one company printed differently across registers stays two nodes.
 *    A group bidding through separately-named subsidiaries is invisible here, which
 *    is exactly the shell-layering pathway `/capture` reports as untestable.
 *
 * Under-merging is the larger error, which means the overlap count below is a FLOOR.
 */

/**
 * Strip the corporate-form words that vary between registers for the same company —
 * "Ltd", "Limited", "Pvt", "Private". Everything else is preserved, so
 * "Adani Power" and "Adani Power Maharashtra" stay correctly distinct.
 */
export function normaliseCompany(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(private|pvt|limited|ltd|company|co|corporation|corp|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export type RegisterId = 'coal' | 'minerals' | 'hydrocarbons' | 'awards';

export const REGISTER_META: Record<RegisterId, { label: string; body: string; statute: string }> = {
  coal: {
    label: 'Coal blocks',
    body: 'Ministry of Coal — Nominated Authority',
    statute: 'CMSP Act 2015 / MMDR Act 1957',
  },
  minerals: {
    label: 'Mineral concessions',
    body: 'Ministry of Mines and state DMGs',
    statute: 'MMDR Act 1957 as amended 2015 and 2023',
  },
  hydrocarbons: {
    label: 'Hydrocarbon acreage',
    body: 'Directorate General of Hydrocarbons',
    statute: 'HELP / OALP, and NELP before it',
  },
  awards: {
    label: 'Government contracts',
    body: 'Union ministries and state governments',
    statute: 'General Financial Rules and sectoral concession regimes',
  },
};

export interface AllocationWinner {
  key: string;
  /** The name as printed in the register where it first appeared. */
  name: string;
  registers: RegisterId[];
  /** Lots won, per register. */
  lots: Record<RegisterId, number>;
  total: number;
  /** A CIN where any register published one. Its absence is the point. */
  cin: string | null;
}

/**
 * Every winner across all four registers, with how many lots each took where.
 * Includes every single-lot winner — they are the denominator, and truncating them
 * would manufacture the appearance of concentration.
 */
export function allocationWinners(): AllocationWinner[] {
  const m = new Map<string, AllocationWinner>();

  const add = (raw: string | null, reg: RegisterId, cin: string | null) => {
    if (!raw) return;
    const key = normaliseCompany(raw);
    if (!key) return;
    let w = m.get(key);
    if (!w) {
      w = {
        key,
        name: raw,
        registers: [],
        lots: { coal: 0, minerals: 0, hydrocarbons: 0, awards: 0 },
        total: 0,
        cin: null,
      };
      m.set(key, w);
    }
    if (!w.registers.includes(reg)) w.registers.push(reg);
    w.lots[reg] += 1;
    w.total += 1;
    if (!w.cin && cin) w.cin = cin;
  };

  for (const b of COAL_BLOCKS) add(b.winnerLegalName, 'coal', b.winnerCin);
  for (const b of MINERAL_BLOCKS) add(b.winnerAsPrinted, 'minerals', null);
  for (const b of HC_BLOCKS) add(b.awardee, 'hydrocarbons', null);
  for (const a of ALL_AWARDS) add(a.winner, 'awards', null);

  return [...m.values()].sort(
    (a, b) => b.registers.length - a.registers.length || b.total - a.total || a.name.localeCompare(b.name),
  );
}

/**
 * The base rate for cross-register appearance.
 *
 * This is the number that decides what the overlap means, and it has to be read
 * before the list of names. If most large industrial firms appear in two registers,
 * appearing in two registers tells you nothing about any particular firm.
 */
export function crossRegisterBaseRate(): {
  winners: number;
  inOne: number;
  inTwoPlus: number;
  inThreePlus: number;
  inAllFour: number;
  ratePct: number;
  withCin: number;
} {
  const ws = allocationWinners();
  return {
    winners: ws.length,
    inOne: ws.filter((w) => w.registers.length === 1).length,
    inTwoPlus: ws.filter((w) => w.registers.length >= 2).length,
    inThreePlus: ws.filter((w) => w.registers.length >= 3).length,
    inAllFour: ws.filter((w) => w.registers.length === 4).length,
    ratePct: ws.length ? (ws.filter((w) => w.registers.length >= 2).length / ws.length) * 100 : 0,
    withCin: ws.filter((w) => w.cin).length,
  };
}

/**
 * The graph. Awarding bodies on one side, winners on the other — the natural shape
 * of an allocation register, and the reason a force layout is right here where it
 * was wrong for an ownership hierarchy.
 *
 * Every edge is tier `analytic`, because the join is a name match. None of them is
 * a documented relationship and none may be promoted to one without a CIN.
 */
export function allocationGraph(opts: { minRegisters?: number } = {}): {
  nodes: GNode[];
  edges: GEdge[];
} {
  const minRegisters = opts.minRegisters ?? 1;
  const winners = allocationWinners().filter((w) => w.registers.length >= minRegisters);
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];

  for (const reg of Object.keys(REGISTER_META) as RegisterId[]) {
    const meta = REGISTER_META[reg];
    nodes.push({
      id: `reg:${reg}`,
      label: meta.label,
      sub: meta.body,
      ty: 'ministry',
      fam: 'state',
      sz: 4,
      st: null,
      d: [meta.statute],
    });
  }

  for (const w of winners) {
    nodes.push({
      id: `win:${w.key}`,
      label: w.name,
      sub: w.cin ?? 'no CIN published in any register',
      ty: 'company',
      fam: 'capital',
      // Size is lots won — a declared magnitude, never a computed importance.
      sz: w.total >= 8 ? 4 : w.total >= 4 ? 3 : w.total >= 2 ? 2 : 1,
      st: null,
      // A winner with no CIN anywhere is unresolved, and the schema forbids
      // unresolved nodes from bearing documented edges. Every edge here is
      // analytic, which is the only tier that may attach to one.
      resolved: w.cin != null,
      collisionRisk: w.cin
        ? undefined
        : 'Joined by normalised name, not by CIN. May merge two distinct companies, or fail to merge one company printed two ways.',
    });

    for (const reg of w.registers) {
      edges.push({
        s: `reg:${reg}`,
        t: `win:${w.key}`,
        pred: 'award',
        tier: 'analytic',
        lab: `${w.lots[reg]} lot${w.lots[reg] === 1 ? '' : 's'}`,
        innocentReading:
          'Winning lots in two allocation processes is what a vertically integrated industrial firm does. A cement company holding a limestone concession and a coal block is describing its own supply chain, not a network.',
      } as GEdge);
    }
  }

  return { nodes, edges };
}

import type { ReactNode } from 'react';
import { TierChip } from '../Editorial';
import { FAMILY_LABEL, PRED_LABEL, isDirected } from '../viz/ForceGraph';
import { TIERS, TIER_ORDER, type GEdge, type GNode, type Source, type Tier } from '../../graph/schema';
import { STATE_NAMES } from '../../data/geo';
import {
  BENEFIT_OF,
  DRAWABLE,
  NODES,
  companyOf,
  labelOf,
  membershipWords,
  responsesOf,
} from '../../data/energy';
import { FOCUS } from './hooks';

/**
 * Small, shared pieces of the /energy margin and canvas cards.
 *
 * SOURCES AS VISIBLE TEXT. Every source renders its label AND its full URL as the
 * link text: a URL that appears only on hover cannot be checked on deadline, and a
 * screenshot of the card has to carry it.
 */
export function SourceLines({ srcs, className = '' }: { srcs?: Source[]; className?: string }) {
  if (!srcs?.length) return <p className={`font-mono text-[11px] text-text-muted ${className}`}>no source recorded</p>;
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {srcs.map(([label, url], i) => (
        <li key={url + i} className="text-[12.5px] leading-snug [overflow-wrap:anywhere]">
          <span className="text-text-secondary">{label}</span>
          <br />
          <a href={url} target="_blank" rel="noopener noreferrer" className={`font-mono text-[12px] text-text-muted underline underline-offset-2 hover:text-accent ${FOCUS}`}>
            {url}
          </a>
        </li>
      ))}
    </ul>
  );
}

export const dateText = (e: { from?: string | null; to?: string | null }) =>
  e.from ? `${e.from}${e.to ? ` – ${e.to}` : ''}` : 'undated';

export const claimLabel = (e: GEdge) => e.lab ?? PRED_LABEL[e.pred] ?? e.pred;

/** The spoken name of every button that opens a claim — not the raw id. */
export const openClaimName = (e: GEdge) => `Open claim ${claimLabel(e)}, ${e.tier}, ${e.from ?? 'undated'}`;

/** A claim's ₹: never ₹0, never blank. */
export const amountText = (a: number | null | undefined) => (a ? `₹${a.toLocaleString('en-IN')} cr` : null);

export function benefitAmount(b: { amountCr: number | null; confidence: string | null }): string {
  if (b.amountCr == null || !b.amountCr || b.confidence === 'unknown') return 'amount unknown';
  if (b.confidence === 'estimated') return `≈ ₹${b.amountCr.toLocaleString('en-IN')} cr (estimate)`;
  return `₹${b.amountCr.toLocaleString('en-IN')} cr`;
}

const TY_WORD: Record<string, string> = {
  ministry: 'ministry',
  psu: 'public-sector company',
  agency: 'agency or regulator',
  company: 'company',
  shell: 'shell company',
  person: 'person',
  party: 'political party',
  fund: 'fund',
  trust: 'electoral trust',
  sangh: 'Sangh organisation',
  law: 'law or rule',
  mechanism: 'mechanism',
  state: 'state or government',
  industry: 'industry',
  exchange: 'exchange',
  group: 'business group',
};
export const tyWord = (ty: string) => TY_WORD[ty] ?? ty;

/**
 * Claim and response counts per entity, over the whole drawable register — not the
 * filtered view. Every place that prints them says "in the register", so a card beside
 * a node under a sweep or tier filter does not read as a count of what the canvas shows.
 */
const TOUCH = new Map<string, { tiers: Record<Tier, number>; n: number; responses: number }>();
for (const e of DRAWABLE) {
  for (const id of new Set([e.s, e.t])) {
    const t = TOUCH.get(id) ?? TOUCH.set(id, { tiers: { documented: 0, reported: 0, alleged: 0, analytic: 0 }, n: 0, responses: 0 }).get(id)!;
    t.tiers[e.tier]++;
    t.n++;
    t.responses += responsesOf(e).length;
  }
}
export const touchOf = (id: string) => TOUCH.get(id) ?? { tiers: { documented: 0, reported: 0, alleged: 0, analytic: 0 }, n: 0, responses: 0 };

/**
 * The text equivalent of the two channels that are otherwise colour and area only
 * (WCAG 1.4.1, audit A11Y-001 M3): hue = family, size = the researcher's declared band.
 * One function, so the accessible name, the hover card and the table twin say it the
 * same way.
 */
export const SIZE_BANDS = 4;
export function encodingWords(n: GNode): string {
  return `${FAMILY_LABEL[n.fam]} family · size band ${n.sz} of ${SIZE_BANDS}, declared by the researcher`;
}

/** The same two channels, compact, for the table twin's endpoint cell and its CSV. */
export function encodingShort(n: GNode): string {
  return `${FAMILY_LABEL[n.fam]} · size band ${n.sz} of ${SIZE_BANDS}`;
}

/** The node's accessible name carries what the hover card shows (spec A11). */
export function nodeName(n: GNode): string {
  const t = touchOf(n.id);
  // "in the register" goes at the end: the claims/responses phrase is the fixed shape AC-33 reads.
  return `${n.label}, ${n.sub ?? tyWord(n.ty)} · ${encodingWords(n)} · ${t.n} claims · ${t.responses} responses recorded · ${membershipWords(n.id)} · counts are for the whole register, not the current view`;
}

export function TierCounts({ tiers }: { tiers: Record<Tier, number> }) {
  return (
    <span className="inline-flex flex-wrap gap-1 items-center">
      {TIER_ORDER.filter((t) => tiers[t] > 0).map((t) => (
        <span key={t} className="inline-flex items-center gap-0.5">
          <TierChip tier={t} /> <span className="font-mono text-[11px]">{tiers[t]}</span>
        </span>
      ))}
    </span>
  );
}

export function NodeHoverCard({ n }: { n: GNode }) {
  const t = touchOf(n.id);
  const co = companyOf(n.id);
  return (
    <div className="space-y-1">
      <p className="text-text text-[13px]">{n.label}</p>
      {n.sub && <p>{n.sub}</p>}
      <p className="font-mono text-[10.5px]">
        {tyWord(n.ty)} · {FAMILY_LABEL[n.fam]} · size band {n.sz} of {SIZE_BANDS}
      </p>
      <p>{membershipWords(n.id)}</p>
      {co && <p>sector {co.sector}</p>}
      {n.st && <p>registered office: {STATE_NAMES[n.st] ?? n.st} — not the location of any plant, block or line</p>}
      <p>
        {t.n} claims in the register: <TierCounts tiers={t.tiers} />
      </p>
      {t.responses > 0 && <p className="text-rose">{t.responses} responses recorded in the register</p>}
      <p className="font-mono text-[10px] text-text-muted">click: details · shift-click: path end</p>
    </div>
  );
}

export function BenefitLine({ e }: { e: GEdge }) {
  const b = BENEFIT_OF(e.id ?? '');
  if (!b) return <p>no beneficiary recorded</p>;
  const isNode = NODES.has(b.who);
  const endpoint = b.who === e.s || b.who === e.t;
  return (
    <p>
      Benefits: {isNode ? labelOf(b.who) : b.who}
      {b.how ? ` — ${b.how}` : ''} · {benefitAmount(b)}
      {/* benefitAmount already says "(estimate)" or "unknown". For a documented amount the
          word is labelled as the amount's confidence, as ClaimCard does, so it cannot be
          read as the claim's evidence tier printed beside it. */}
      {b.confidence === 'documented' ? ' · amount confidence: documented' : ''}
      {!isNode && ' (named by the claim; not a node in this graph)'}
      {isNode && !endpoint && ' (named by the claim; not joined by any edge)'}
    </p>
  );
}

export function EdgeCard({ e }: { e: GEdge }) {
  const r = responsesOf(e);
  return (
    <div className="space-y-1">
      <p className="font-mono text-[10.5px]">
        {PRED_LABEL[e.pred] ?? e.pred} · <TierChip tier={e.tier} /> · {dateText(e)} · {amountText(e.a) ?? 'no amount recorded'}
      </p>
      <p className="text-text">
        {labelOf(e.s)} {isDirected(e.pred) ? '→' : '—'} {labelOf(e.t)}
      </p>
      {e.lab && <p>{e.lab}</p>}
      <BenefitLine e={e} />
      {r.length ? (
        <p className="text-rose">{r.length === 1 ? '1 response' : `${r.length} responses`}</p>
      ) : (
        <p className="text-text-secondary">
          no response recorded — the register does not record whether {labelOf(e.s)} or {labelOf(e.t)} was asked
          {e.tier === 'alleged' ? ' — the build gate forbids this; listed in Gaps' : ''}
        </p>
      )}
      <p className="font-mono text-[10px] text-text-muted">click to open the claim</p>
    </div>
  );
}

/** The claim's accessible name: ends with its response phrase, so a screen reader hears the answer. */
export function edgeName(e: GEdge): string {
  const n = responsesOf(e).length;
  const tail = n ? `${n} responses recorded` : e.tier === 'alleged' ? 'no response recorded — listed in Gaps' : 'no response recorded';
  return (
    `${labelOf(e.s)} ${isDirected(e.pred) ? '→' : '—'} ${labelOf(e.t)} · ${PRED_LABEL[e.pred] ?? e.pred} · ${TIERS[e.tier].label.toLowerCase()}` +
    `${e.a ? ` · ₹${e.a} cr` : ''}${e.lab ? ` · ${e.lab}` : ''} · ${tail}`
  );
}

export function Btn({ children, onClick, label, className = '' }: { children: ReactNode; onClick: () => void; label?: string; className?: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`text-left underline decoration-border-light underline-offset-2 hover:text-accent hover:decoration-accent ${FOCUS} ${className}`}>
      {children}
    </button>
  );
}

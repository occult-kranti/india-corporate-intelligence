import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { TIERS, TIER_ORDER, type Tier } from '../../graph/schema';
import { FOCUS } from './hooks';
import { NODATA_STYLE } from './StackTable';
import { INDEX_KEYS, indexLabel, type ConstituentRow } from '../../data/energy';

// Built from the index keys the build ships (spec §3.2: labels exactly as in the file),
// so the box never names an index the lists do not contain, or omits one they do.
const INDEX_PLACEHOLDER = `symbol or name of a ${INDEX_KEYS.map(indexLabel).join(' / ')} constituent…`;

export interface SweepChip {
  slug: string;
  label: string;
  /** null = no file for this sweep in this build. Never shown as 0. */
  claims: number | null;
  tiers: Record<Tier, number>;
  voids: number;
  span: [number, number] | null;
  asOf: string | null;
  /** The Offices sweep's extra line (spec A6). */
  extra?: string;
}

export const STRIP_CAPTION =
  "A chip selects the research sweep a claim was recorded in, not its sector. A coal company's electoral bond is recorded under Money trail.";

const spanText = (s: [number, number]) => `${s[0]}–${String(s[1]).slice(-2)}`;

function TierSamples({ tiers }: { tiers: Record<Tier, number> }) {
  return (
    <>
      {TIER_ORDER.filter((t) => tiers[t] > 0).map((t) => (
        <span key={t} className="inline-flex items-center gap-0.5">
          <svg width="14" height="6" role="img" aria-label={TIERS[t].label} className="text-text-secondary">
            <line x1="0" y1="3" x2="14" y2="3" stroke="currentColor" strokeWidth="1.4" strokeDasharray={TIERS[t].dash || undefined} />
          </svg>
          {tiers[t]}
        </span>
      ))}
    </>
  );
}

function Chip({ c, active, onToggle }: { c: SweepChip; active: boolean; onToggle: () => void }) {
  const absent = c.claims == null;
  return (
    <button
      type="button"
      aria-pressed={active && !absent}
      disabled={absent}
      data-nodata={absent ? '' : undefined}
      onClick={() => !absent && onToggle()}
      style={absent ? NODATA_STYLE : undefined}
      className={`text-left rounded border px-2 py-1 max-sm:px-1.5 max-sm:py-0.5 text-[12px] max-sm:text-[11.5px] leading-snug ${FOCUS} ${
        absent
          ? 'border-border text-text-muted cursor-not-allowed'
          : active
            ? 'border-accent text-text bg-accent/10'
            : 'border-border-light text-text-secondary hover:border-accent'
      }`}
    >
      {absent ? (
        <span>{c.label} — not yet researched</span>
      ) : (
        <>
          <span>{c.label}</span> <span className="font-mono text-text">{c.claims}</span>
          <span className="max-sm:hidden font-mono text-[10px] text-text-muted">
            {' '}
            <TierSamples tiers={c.tiers} />
            {c.voids > 0 && <span> ◌ {c.voids} voids</span>} <span>{c.span ? spanText(c.span) : 'no dated claims'}</span>
            {c.extra && <span className="block">{c.extra}</span>}
          </span>
        </>
      )}
    </button>
  );
}

export function breakdownLine(c: Pick<SweepChip, 'tiers' | 'voids' | 'span'>) {
  const t = TIER_ORDER.filter((x) => c.tiers[x] > 0).map((x) => `${TIERS[x].label.toLowerCase()} ${c.tiers[x]}`);
  return `${t.join(' · ')}${c.voids ? ` · ${c.voids} voids` : ''} · ${c.span ? spanText(c.span) : 'no dated claims'}`;
}

export default function SweepStrip({
  rows,
  active,
  onToggle,
  effect,
  all,
  statesLine,
  footer,
}: {
  rows: { heading: 'Sector sweeps' | 'Cross-cutting sweeps'; chips: SweepChip[] }[];
  active: Set<string>;
  onToggle: (slug: string) => void;
  effect: { from: number; to: number } | null;
  all: Pick<SweepChip, 'tiers' | 'voids' | 'span'>;
  statesLine: string;
  footer?: React.ReactNode;
}) {
  const chips = rows.flatMap((r) => r.chips);
  const absent = chips.filter((c) => c.claims == null);
  const researched = chips.length - absent.length;
  const activeChips = chips.filter((c) => active.has(c.slug) && c.claims != null);
  return (
    <div className="mt-4 max-sm:mt-2 [overflow-wrap:anywhere]">
      {rows.map((r, i) => (
        <div key={r.heading} className="flex flex-wrap items-start gap-1.5 max-sm:gap-1 mb-1.5 max-sm:mb-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted sm:min-w-[9rem] pt-1.5 max-sm:pt-1 max-sm:leading-tight">
            {r.heading}
          </span>
          {r.chips.map((c) => (
            <Chip key={c.slug} c={c} active={active.has(c.slug)} onToggle={() => onToggle(c.slug)} />
          ))}
          {i === 0 && effect && (
            <span className="max-sm:hidden ml-auto font-mono text-[11px] text-amber pt-1.5" data-effect="">
              {effect.from} → {effect.to} claims
            </span>
          )}
        </div>
      ))}
      {effect && (
        <p className="sm:hidden font-mono text-[11px] text-amber">
          <span data-effect="">{effect.from} → {effect.to} claims</span>
        </p>
      )}
      <div className="sm:hidden font-mono text-[10px] leading-snug text-text-muted space-y-0.5 mt-1">
        {activeChips.length ? (
          activeChips.map((c) => (
            <p key={c.slug}>
              {c.label}: {breakdownLine(c)}
            </p>
          ))
        ) : researched > 0 ? (
          <p>
            {statesLine} · all researched sweeps: {breakdownLine(all)} · select a sweep for its own breakdown
          </p>
        ) : (
          <p>{statesLine}</p>
        )}
        {activeChips.length > 0 && <p>{statesLine}</p>}
      </div>
      <p className="text-[12px] text-text-muted mt-1">{STRIP_CAPTION}</p>
      {absent.length > 0 && (
        <p className="text-[12px] text-text-muted">
          {researched} of {chips.length} sweeps researched; not yet: {absent.map((c) => c.label).join(', ')}
        </p>
      )}
      {footer}
    </div>
  );
}

/**
 * "Start from a listed company" — the ARIA 1.2 combobox over the index constituents.
 * Searching by symbol, BSE code and name; the options say membership in words.
 */
export function CompanyBox({
  rows,
  words,
  disabled,
  onChoose,
}: {
  rows: (ConstituentRow & { bse?: string | null })[];
  words: (r: ConstituentRow) => string;
  disabled: string | null;
  onChoose: (r: ConstituentRow) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [act, setAct] = useState(-1);
  const uid = useId().replace(/:/g, '');
  const listId = `energy-co-list-${uid}`;
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return rows.filter(
      (r) => r.symbol.toLowerCase().includes(s) || r.name.toLowerCase().includes(s) || (r.bse ?? '').toLowerCase().includes(s),
    );
  }, [q, rows]);
  const expanded = open && matches.length > 0;
  const choose = (r: ConstituentRow) => {
    setOpen(false);
    setAct(-1);
    setQ(r.symbol);
    onChoose(r);
  };
  const onKey = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setOpen(true);
      setAct((a) => Math.min(matches.length - 1, a + 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setAct((a) => Math.max(0, a - 1));
    } else if (ev.key === 'Enter') {
      const r = matches[act >= 0 ? act : 0];
      if (r) {
        ev.preventDefault();
        choose(r);
      }
    } else if (ev.key === 'Escape') {
      setOpen(false);
      setAct(-1);
    }
  };
  return (
    <div className="relative mt-3 max-w-[34rem]">
      <label htmlFor={`${listId}-input`} className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">
        Start from a listed company
      </label>
      <input
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && act >= 0 ? `${listId}-opt-${act}` : undefined}
        disabled={!!disabled}
        placeholder={disabled ?? INDEX_PLACEHOLDER}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setAct(-1);
        }}
        onKeyDown={onKey}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className={`input-field !py-1.5 !text-[13px] ${FOCUS}`}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Index constituents"
        hidden={!expanded}
        className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-bg-elevated border border-border-light rounded"
      >
        {matches.map((r, i) => (
          <li
            key={r.key}
            id={`${listId}-opt-${i}`}
            role="option"
            aria-selected={i === act}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(r);
            }}
            className={`px-2 py-1.5 text-[12.5px] cursor-pointer ${i === act ? 'bg-accent/15 text-text' : 'text-text-secondary'}`}
          >
            <span className="font-mono">{r.symbol}</span> · {r.name}
            {r.id ? '' : ' — not in platform dataset'} · <span className="text-text-muted">{words(r)}</span>
          </li>
        ))}
      </ul>
      <p role="status" className="font-mono text-[10.5px] text-text-muted mt-1">
        {disabled ? disabled : q.trim() ? `${matches.length} matching constituents` : `constituents only; ${rows.filter((r) => !r.id).length} not in platform dataset`}
      </p>
    </div>
  );
}

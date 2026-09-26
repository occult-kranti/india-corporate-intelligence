import type { ReactNode } from 'react';
import type { ControlWindow, ElectionRow, Window } from '../../data/welfareView';
import { aOfB, stateName, namesAlliance } from '../../data/welfareView';
import { ListDetails, Src, TableBlock, HashLink, type TableCtx, QLink } from './ui';

/**
 * The control: every assembly election in the file, with and without a fresh state
 * scheme, for every party, in three windows printed together. Text and fractions
 * only — no bars, no colour — because the comparison is two `a of b` side by side,
 * and a bar would lend a count of five the authority of a measurement.
 */

export function BallotGlyph({ r }: { r: ElectionRow }) {
  const ink = r.muted ? 'var(--color-text-muted)' : 'var(--color-text)';
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true" className="inline-block align-middle mr-1.5">
      <rect x="2.5" y="4.5" width="7" height="7" fill={r.outcome === 'retained' ? ink : 'none'} stroke={ink} strokeWidth="1.1" />
      {r.outcome === 'unclassified' && <path d="M 2.5 4.5 L 2.5 11.5 L 9.5 11.5 Z" fill={ink} />}
      {r.exposedBy[12].length > 0 && <line x1="2.5" x2="9.5" y1="2" y2="2" stroke={ink} strokeWidth="1.4" />}
    </svg>
  );
}

const outcomeWord = (r: ElectionRow) => (r.outcome === 'retained' ? 'incumbent kept power' : r.outcome === 'lost' ? 'incumbent lost' : 'coalition or unclassified');

/** One election as a list row: state first (never the year), then the recorded strings, then sources. */
export function ElectionItem({ r, w = 12, search }: { r: ElectionRow; w?: Window; search?: (kv: Record<string, string | null>) => string }) {
  const fresh = r.exposedBy[w];
  return (
    <span>
      {search && r.e.st ? <QLink search={search({ st: r.e.st })} className="underline underline-offset-2 hover:text-accent">{stateName(r.e.st)}</QLink> : <span>{stateName(r.e.st)}</span>}
      {` · ${r.e.election} ${r.e.date} · ${r.e.incumbentRaw ?? 'incumbent not recorded'} → ${r.e.winnerRaw ?? 'winner not recorded'} · ${outcomeWord(r)} · fresh within ${w} m: ${fresh.length ? `yes (${fresh.map((s) => s.name).join('; ')})` : 'no'} `}
      <Src srcs={r.e.srcs} />
    </span>
  );
}

export function YearElectionList({ y, rows, search }: { y: number; rows: ElectionRow[]; search: (kv: Record<string, string | null>) => string }) {
  return (
    <ul className="space-y-1.5 text-[13px] leading-snug">
      {rows.map((r) => (
        <li key={r.key}>
          <BallotGlyph r={r} />
          <QLink search={search({ st: r.e.st })} className="underline underline-offset-2 hover:text-accent">{stateName(r.e.st)}</QLink>
          {` · ${r.e.date} · ${r.e.incumbentRaw ?? 'incumbent not recorded'} → ${r.e.winnerRaw ?? 'winner not recorded'} · fresh within 12 m: ${r.exposedBy[12].length ? 'yes' : 'no'} `}
          <Src srcs={r.e.srcs} />
        </li>
      ))}
      {!rows.length && <li className="text-text-muted">{`no assembly election recorded in ${y}`}</li>}
    </ul>
  );
}

const decided = (x: { retained: ElectionRow[]; lost: ElectionRow[] }) => [...x.retained, ...x.lost];

function WindowLine({ w, search }: { w: ControlWindow; search: (kv: Record<string, string | null>) => string }) {
  const a = w.exposed.retained.length;
  const b = decided(w.exposed).length;
  const c = w.notExposed.retained.length;
  const d = decided(w.notExposed).length;
  const u = w.exposed.unclassified.length + w.notExposed.unclassified.length;
  return (
    <div className="mt-2">
      <p className="font-mono text-[12px] text-text leading-snug">{`${w.months} m · retained after a fresh scheme: ${a} of ${b} · without: ${c} of ${d} · unclassified: ${u}`}</p>
      <ListDetails summary={`which elections, ${w.months} m, fresh scheme, decided (${b})`} items={decided(w.exposed).map((r) => <ElectionItem key={r.key} r={r} w={w.months} search={search} />)} />
      <ListDetails summary={`which elections, ${w.months} m, no fresh scheme, decided (${d})`} items={decided(w.notExposed).map((r) => <ElectionItem key={r.key} r={r} w={w.months} search={search} />)} />
      <ListDetails summary={`which elections, ${w.months} m, unclassified (${u})`} items={[...w.exposed.unclassified, ...w.notExposed.unclassified].map((r) => <ElectionItem key={r.key} r={r} w={w.months} search={search} />)} />
    </div>
  );
}

export interface ControlCardProps {
  empty: string | null;
  windows: ControlWindow[];
  n: number;
  union: { w: ControlWindow; count: number } | null;
  partyLines: { party: string; w: ControlWindow }[];
  year: { y: number; rows: ElectionRow[] } | null;
  /** The category and level filters, which do reach the card (they shape the scheme pool), in words derived from the URL. */
  scope: { text: string; noStateSchemes: boolean };
  runId: string;
  search: (kv: Record<string, string | null>) => string;
  onCopy: (text: string) => void;
}

export function ControlCard(p: ControlCardProps) {
  const title = 'Every assembly election in the file, with and without a fresh state scheme';
  if (p.empty) {
    return (
      <section className="border border-border rounded-lg p-3 bg-bg-elevated/60">
        <h3 className="text-[15px] text-text font-medium leading-snug">{title}</h3>
        <p className="text-[14px] text-text-secondary mt-2">{p.empty}</p>
      </section>
    );
  }
  const w12 = p.windows.find((w) => w.months === 12)!;
  const b = decided(w12.exposed).length;
  const d = decided(w12.notExposed).length;
  const min = Math.min(b, d);
  const lines = p.windows.map((w) => {
    const u = w.exposed.unclassified.length + w.notExposed.unclassified.length;
    return `${w.months} m · retained after a fresh scheme: ${w.exposed.retained.length} of ${decided(w.exposed).length} · without: ${w.notExposed.retained.length} of ${decided(w.notExposed).length} · unclassified: ${u}`;
  });
  const foot = `computed here from ${p.n} elections in this file · rule: fresh = launch or raise by the incumbent's party within 12 whole months · run ${p.runId} · association, not effect`;
  return (
    <section className="border border-border rounded-lg p-3 bg-bg-elevated/60 text-[13px]">
      <h3 className="text-[15px] text-text font-medium leading-snug">{title}</h3>
      <p className="text-[12.5px] text-text-muted mt-1">all years, whatever year is chosen · the party filter and search never reach this card</p>
      <p className="font-mono text-[12px] text-text-secondary mt-1">{`category and level filters apply: ${p.scope.text}`}</p>
      {p.scope.noStateSchemes && <p className="font-mono text-[12px] text-amber mt-1">no state scheme in view, so no assembly election can be exposed</p>}
      {p.windows.map((w) => <WindowLine key={w.months} w={w} search={p.search} />)}
      <p className="font-mono text-[12px] text-text-secondary mt-3">{`n = ${p.n} assembly elections recorded · reference class not in file · no test is run at this n`}</p>
      <p className="font-mono text-[12px] text-text-secondary mt-1">
        {b >= 10 && d >= 10 ? `one election moves a row by up to ${Math.ceil(100 / min)} points` : 'one election changes a row by one count; too few to express in points'}
      </p>
      <p className="font-mono text-[12px] text-text-muted mt-1">selection: elections are in this file because research reached them, not by census</p>
      <p className="font-mono text-[12px] text-text-muted mt-1">challenger promises not recorded: the control measures incumbents only</p>
      {p.union ? (
        <div className="mt-3">
          <p className="font-mono text-[12px] text-text leading-snug">
            {`Union · ${p.union.count} Lok Sabha elections in the file · 12 m: incumbent retained after a fresh central scheme ${p.union.w.exposed.retained.length} of ${decided(p.union.w.exposed).length} · without ${p.union.w.notExposed.retained.length} of ${decided(p.union.w.notExposed).length} · unclassified ${p.union.w.exposed.unclassified.length + p.union.w.notExposed.unclassified.length}`}
          </p>
          {(() => {
            // Why the Union line can read 0 of 0: say it, rather than leave an empty comparison to be read as a result.
            const uncl = [...p.union.w.exposed.unclassified, ...p.union.w.notExposed.unclassified];
            if (!uncl.length) return null;
            const alliance = uncl.filter((r) => namesAlliance(r.e.incumbentRaw) || namesAlliance(r.e.winnerRaw)).length;
            const other = uncl.length - alliance;
            const why = `${alliance} because an incumbent or winner string names an alliance${other ? `, ${other} because a party is not recorded or the records of the poll disagree` : ''} (listed in the gaps)`;
            return (
              <p className="font-mono text-[12px] text-text-muted mt-1">
                {uncl.length === p.union.count
                  ? `none of the ${p.union.count} is classified kept or lost, so the Union comparison is empty: ${why}`
                  : `${uncl.length} of ${p.union.count} unclassified: ${why}`}
              </p>
            );

          })()}

          <ListDetails summary={`which elections, Union, 12 m (${p.union.count})`} items={[...decided(p.union.w.exposed), ...p.union.w.exposed.unclassified, ...decided(p.union.w.notExposed), ...p.union.w.notExposed.unclassified].map((r) => <ElectionItem key={r.key} r={r} />)} />
        </div>
      ) : (
        <p className="font-mono text-[12px] text-text-muted mt-3">Union: no Lok Sabha election recorded, so the Union is not measured here</p>
      )}
      {p.partyLines.map(({ party, w }) => (
        <p key={party} className="font-mono text-[12px] text-text mt-3 border-l-2 border-accent pl-2">
          {`${party} as incumbent · 12 m: ${w.exposed.retained.length} of ${decided(w.exposed).length} with · ${w.notExposed.retained.length} of ${decided(w.notExposed).length} without`}
        </p>
      ))}
      <p className="font-mono text-[12px] text-text-muted mt-3">
        {foot}{' '}
        <button type="button" className="underline underline-offset-2 hover:text-accent" onClick={() => p.onCopy([foot, ...lines, window.location.href].join('\n'))}>copy citation</button>
      </p>
      {p.year && <p className="font-mono text-[12px] text-text mt-3">{`${p.year.y} · every assembly election recorded that year`}</p>}
      {p.year && <YearElectionList y={p.year.y} rows={p.year.rows} search={p.search} />}
      <p className="text-[12.5px] mt-3"><HashLink to="control">the control, long form ↓</HashLink></p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// TwoByTwo — a real table, so it is its own twin
// ---------------------------------------------------------------------------

const cellOf = (rows: ElectionRow[], w: Window) => (
  <details>
    <summary className="cursor-pointer font-mono tabular-nums text-text">{rows.length}</summary>
    <ul className="mt-1 space-y-1 text-[12.5px]">{rows.map((r) => <li key={r.key}><ElectionItem r={r} w={w} /></li>)}</ul>
  </details>
);

export function TwoByTwo({ w, ctx, sensitivity, nLine }: { w: ControlWindow; ctx: TableCtx; sensitivity: string; nLine: string }) {
  const rowOf = (label: string, x: ControlWindow['exposed']) => {
    const dec = x.retained.length + x.lost.length;
    return {
      cells: [label, cellOf(x.retained, w.months), cellOf(x.lost, w.months), cellOf(x.unclassified, w.months), aOfB(x.retained.length, dec)],
      out: [label, x.retained.length, x.lost.length, x.unclassified.length, aOfB(x.retained.length, dec)],
      urls: [...x.retained, ...x.lost, ...x.unclassified].flatMap((r) => r.e.srcs.map((s) => s[1])),
    };
  };
  return (
    <div>
      <TableBlock
        name="two-by-two"
        ctx={ctx}
        minWidth="30rem"
        cols={[
          { key: 'exposure', label: `Window: ${w.months} months`, th: true },
          { key: 'incumbent_retained', label: 'Incumbent retained' },
          { key: 'incumbent_lost', label: 'Incumbent lost' },
          { key: 'unclassified', label: 'Unclassified' },
          { key: 'retained_of_decided', label: 'Retained of decided', th: true },
        ]}
        rows={[
          rowOf(`Fresh scheme by the incumbent's party within ${w.months} m`, w.exposed),
          rowOf('No fresh scheme', w.notExposed),
        ]}
      />
      <p className="text-[14px] text-text-secondary">{sensitivity}</p>
      <p className="text-[14px] text-text-secondary mt-1">{nLine}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timing chart — counts, not shares, and the expectation as text
// ---------------------------------------------------------------------------

export function TimingChart({ bins, b }: { bins: Record<string, unknown[]>; b: number }) {
  const keys = ['0', '1', '2', '3', '4'];
  const max = Math.max(1, ...keys.map((k) => bins[k].length));
  const W = 360;
  const H = 150;
  const bw = W / keys.length;
  return (
    <div aria-hidden="true" className="max-w-[420px]">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full">
        {keys.map((k, i) => {
          const h = (bins[k].length / max) * (H - 16);
          return (
            <g key={k}>
              <rect x={i * bw + 6} y={H - h} width={bw - 12} height={h} fill="var(--color-text-secondary)" fillOpacity={0.55} />
              <text x={i * bw + bw / 2} y={H - h - 4} textAnchor="middle" fontSize="12" fill="var(--color-text)" fontFamily="var(--font-mono)">{String(bins[k].length)}</text>
              <text x={i * bw + bw / 2} y={H + 16} textAnchor="middle" fontSize="12" fill="var(--color-text-muted)" fontFamily="var(--font-mono)">{k === '0' ? 'under 1 yr' : `${k}–${Number(k) + 1} yrs`}</text>
            </g>
          );
        })}
        <line x1="0" x2={W} y1={H} y2={H} stroke="rgba(244,240,232,0.2)" />
      </svg>
      <p className="sr-only">{`${b} schemes binned`}</p>
    </div>
  );
}

export const binLabel = (k: string) => (k === '0' ? 'under 12 months' : `${Number(k) * 12}–${Number(k) * 12 + 11} months`);

export function StackedBlocks({ blocks }: { blocks: { head: string; accent?: boolean; lines: { label: string; value: string; items: ReactNode[] }[] }[] }) {
  return (
    <div className="space-y-4 my-4">
      {blocks.map((bl) => (
        <div key={bl.head} className={bl.accent ? 'border-l-2 border-accent pl-2' : ''}>
          <h4 className="text-[15px] text-text font-medium">{bl.head}</h4>
          {bl.lines.map((l) => (
            <div key={l.label} className="mt-1">
              <p className="text-[13px] text-text-secondary">{`${l.label}: ${l.value}`}</p>
              {l.items.length > 0 && <ListDetails summary={`which, ${l.label} (${l.items.length})`} items={l.items} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}


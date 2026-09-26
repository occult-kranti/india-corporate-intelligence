import { useState } from 'react';
import { TierChip } from '../Editorial';
import { TIERS, type GEdge } from '../../graph/schema';
import { ASOF, EDGE_BY_ID, type Lane, type LaneEvent } from '../../data/energy';
import StackTable from './StackTable';
import { FOCUS, useNarrow } from './hooks';
import { openClaimName } from './Cards';

/**
 * Who held the office on the date: one lane per institution with a dated office
 * claim, one bar per tenure, one tick per dated decision the institution made.
 *
 * Bars are outlined in the ROLE claim's tier dash and never coloured by party — a
 * party appears only as text, and only when a role claim puts the person in it
 * during the tenure. A gap in a lane is a gap in the record, not a vacancy.
 */

const LANE_H = 30;
const LABEL_W = 170;
const W = 900;
const yearOf = (d: string) => Number(d.slice(0, 4)) + (Number(d.slice(5, 7) || 1) - 1) / 12 + (Number(d.slice(8, 10) || 1) - 1) / 365;

export default function TenureLanes({
  lanes,
  events,
  range,
  selectedClaim,
  onSelectClaim,
  onSelectNode,
  words,
}: {
  lanes: Lane[];
  events: LaneEvent[];
  range: [string, string] | null;
  selectedClaim: GEdge | null;
  onSelectClaim: (id: string) => void;
  onSelectNode: (id: string) => void;
  words: string;
}) {
  const narrow = useNarrow();
  const [open, setOpen] = useState(!narrow);
  const shown = !narrow || open;
  const full: [number, number] | null = range ? [Math.floor(yearOf(range[0])), Math.ceil(yearOf(range[1]))] : null;
  const litYear = selectedClaim?.from ? yearOf(selectedClaim.from) : null;
  // On a phone the full axis shows only its sparse early years; clip around the lit
  // claim so its tick and the date rule are on screen, and say so.
  const clipped = narrow && full && litYear != null ? ([Math.max(full[0], Math.floor(litYear) - 3), Math.min(full[1], Math.floor(litYear) + 3)] as [number, number]) : null;
  const span = clipped ?? full;
  const x = (y: number) => (span ? LABEL_W + ((y - span[0]) / Math.max(1, span[1] - span[0])) * (W - LABEL_W - 16) : 0);
  const H = lanes.length * LANE_H + 28;
  const asOf = ASOF.oldest ?? '—';
  const inside = (claimFrom: string, s: { from: string; to: string | null }) => s.from <= claimFrom && claimFrom <= (s.to ?? asOf);

  const twinRows = lanes.flatMap((l) =>
    l.spans.map((s) => {
      const ds = events.filter((ev) => ev.laneId === l.id && inside(ev.date, s));
      return [
        l.label,
        `${s.label}${s.party ? ` (${s.party})` : ''}`,
        s.from,
        s.to ?? `in office as of ${asOf}`,
        <TierChip tier={s.tier} />,
        <span>
          {ds.length}
          {ds.map((d) => (
            <button
              key={d.claimId}
              type="button"
              aria-label={openClaimName(EDGE_BY_ID.get(d.claimId)!)}
              onClick={() => onSelectClaim(d.claimId)}
              className={`block font-mono text-[11px] underline underline-offset-2 text-left ${FOCUS}`}
            >
              {d.claimId}
            </button>
          ))}
        </span>,
      ];
    }),
  );
  const twin = (
    <StackTable
      columns={['institution', 'office-holder', 'from', 'to', 'role tier', 'decisions dated inside']}
      rows={twinRows}
      caption={`${twinRows.length} rows · one per recorded tenure · ${words}`}
    />
  );

  const svg = span && lanes.length > 0 && (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Tenure lanes: office-holders by institution over time, with the institution's dated decisions as ticks. The table lists every bar.">
      {Array.from({ length: span[1] - span[0] + 1 }, (_, i) => span[0] + i).map((y) => (
        <g key={y}>
          <line x1={x(y)} x2={x(y)} y1={0} y2={H - 22} stroke="rgba(244,240,232,0.06)" />
          <text x={x(y)} y={H - 8} fontSize="10" textAnchor="middle" fill="rgba(232,228,220,0.55)">
            {y}
          </text>
        </g>
      ))}
      {lanes.map((l, i) => {
        const y0 = i * LANE_H;
        return (
          <g key={l.id}>
            <text x={4} y={y0 + LANE_H / 2 + 4} fontSize="11" fill="rgba(232,228,220,0.85)">
              {l.label.length > 26 ? `${l.label.slice(0, 25)}…` : l.label}
              <title>{l.label}</title>
            </text>
            {l.spans.map((s) => {
              const a = Math.max(LABEL_W, x(yearOf(s.from)));
              const b = Math.min(W - 16, x(yearOf(s.to ?? asOf)));
              if (b < LABEL_W || a > W - 16) return null;
              return (
                <g
                  key={s.claimId}
                  data-tenure={s.claimId}
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.label}${s.party ? ` (${s.party})` : ''}, ${l.label}, ${s.from} to ${s.to ?? `in office as of ${asOf}`}, ${s.tier}`}
                  onClick={() => onSelectNode(s.personId)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      onSelectNode(s.personId);
                    }
                  }}
                  className="cursor-pointer focus:outline-2 focus:outline-accent"
                >
                  {/* Neutral fill: hue means node family on this platform, and a tenure is not a
                      family. The outline dash carries the role claim's tier. */}
                  <rect x={a} y={y0 + 6} width={Math.max(2, b - a)} height={LANE_H - 12} fill="rgba(232,228,220,0.06)" stroke="rgba(232,228,220,0.7)" strokeDasharray={TIERS[s.tier].dash || undefined} />
                  <text x={a + 3} y={y0 + LANE_H / 2 + 3} fontSize="9.5" fill="rgba(240,236,228,0.9)" pointerEvents="none">
                    {s.label}
                    {s.party ? ` (${s.party})` : ''}
                    {s.to ? '' : ' — in office'}
                  </text>
                </g>
              );
            })}
            {events
              .filter((ev) => ev.laneId === l.id)
              .map((ev) => {
                const xx = x(yearOf(ev.date));
                if (xx < LABEL_W || xx > W - 16) return null;
                const sel = selectedClaim?.id === ev.claimId;
                const h = sel ? 18 : 10;
                const e = EDGE_BY_ID.get(ev.claimId)!;
                return (
                  <g
                    key={ev.claimId}
                    data-tick={ev.claimId}
                    tabIndex={0}
                    role="button"
                    aria-label={openClaimName(e)}
                    onClick={() => onSelectClaim(ev.claimId)}
                    onKeyDown={(k) => {
                      if (k.key === 'Enter' || k.key === ' ') {
                        k.preventDefault();
                        onSelectClaim(ev.claimId);
                      }
                    }}
                    className="cursor-pointer focus:outline-2 focus:outline-accent"
                  >
                    <rect x={xx - 4} y={y0 + LANE_H / 2 - h / 2 - 2} width={8} height={h + 4} fill="transparent" />
                    <line x1={xx} x2={xx} y1={y0 + LANE_H / 2 - h / 2} y2={y0 + LANE_H / 2 + h / 2} stroke={sel ? '#e8e4dc' : 'rgba(232,228,220,0.75)'} strokeWidth={sel ? 2 : 1.2} strokeDasharray={TIERS[ev.tier].dash || undefined} />
                  </g>
                );
              })}
          </g>
        );
      })}
      {litYear != null && x(litYear) >= LABEL_W && (
        <line x1={x(litYear)} x2={x(litYear)} y1={0} y2={H - 22} stroke="#e8e4dc" strokeWidth={1} opacity={0.7} pointerEvents="none" />
      )}
    </svg>
  );

  const lanesBlock = (
    <div className="overflow-x-auto" hidden={!shown}>
      {svg || <p className="text-[14px] text-text-secondary">No dated office-holder is recorded in the researched sweeps. The date test cannot be run on any claim.</p>}
    </div>
  );

  return (
    <div>
      {narrow && twin}
      {narrow && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`btn-ghost !text-[12px] my-2 ${FOCUS}`}>
          {open ? 'Hide lanes' : 'Show lanes (scrolls sideways)'}
        </button>
      )}
      {lanesBlock}
      {shown && clipped && full && (
        <p className="font-mono text-[11px] text-text-muted mt-1">
          axis clipped to {clipped[0]}–{clipped[1]} around the lit claim; the full span is {full[0]}–{full[1]}
        </p>
      )}
      {full && <p className="font-mono text-[11px] text-text-muted mt-1">Nothing before {full[0]} is drawn because nothing was recorded, not because nothing happened.</p>}
      {!narrow && twin}
    </div>
  );
}

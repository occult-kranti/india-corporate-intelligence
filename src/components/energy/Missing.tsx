import { GapsPanel } from '../Domain';
import { TierChip } from '../Editorial';
import type { Tier } from '../../graph/schema';
import {
  ABSENT,
  ASOF_TEXT,
  DERIVED_GAPS,
  EDGE_BY_ID,
  ENERGY_GAPS,
  ENERGY_META,
  ORPHANS,
  RUN_ID,
  SOURCES,
  SUPERSEDED,
  labelOf,
  sweepLabel,
} from '../../data/energy';
import StackTable, { DownloadButton } from './StackTable';
import { Btn, SourceLines, claimLabel, dateText } from './Cards';
import { FOCUS } from './hooks';

const TIERS_OK = new Set(['documented', 'reported', 'alleged', 'analytic']);

export function missingDenominator(): string {
  const gf = ENERGY_GAPS.length;
  const gd = DERIVED_GAPS.length;
  return `${gf + gd} gaps (${gf} recorded by research, ${gd} found by the build) · ${ENERGY_META.killed.length} killed in audit · ${ENERGY_META.excluded.length} held out · ${ORPHANS.length} orphans · ${SUPERSEDED.length} superseded · ${ABSENT.length} sweeps not yet researched`;
}

/**
 * What is missing: gaps at finding size, then everything the build refused to draw.
 * Nothing here is ever removed because it is empty — an empty table says what its
 * emptiness means.
 */
export function Missing({ onOpen, cannotShow }: { onOpen: (id: string) => void; cannotShow: string }) {
  const gaps = [
    ...ENERGY_GAPS.map((g) => ({ what: g.text, why: `Recorded by the ${sweepLabel(g.domain)} sweep` })),
    ...DERIVED_GAPS,
  ];
  const audit = ENERGY_META.audit;
  const comments = (what: string) => [`run ${RUN_ID}`, `as of ${ASOF_TEXT}`, what, `What this cannot show: ${cannotShow}`];
  return (
    <div className="space-y-8">
      <GapsPanel gaps={gaps} note="Absence here is a result. A company with no claim in this register may simply not have been researched." />
      <div>
        <h3 className="heading-editorial font-bold text-lg text-text">Killed in audit</h3>
        {ENERGY_META.killed.length ? (
          <StackTable
            caption={`Killed in audit — ${ENERGY_META.killed.length} rows · not asserted by this platform, listed so the reader can see what was rejected and why`}
            columns={['id', 's → t', 'pred', 'tier as written', 'd', 'killed reason', 'sources']}
            minWidth="56rem"
            rows={ENERGY_META.killed.map((k) => [
              <span className="font-mono text-[11.5px]">{k.id}</span>,
              `${labelOf(k.s)} → ${labelOf(k.t)}`,
              k.pred,
              TIERS_OK.has(k.tier) ? <TierChip tier={k.tier as Tier} /> : k.tier,
              k.d ?? '—',
              <span className="text-text">{k.killedReason}</span>,
              <SourceLines srcs={k.srcs} />,
            ])}
            download={{
              filename: `energy-killed-${RUN_ID}.csv`,
              comments: comments('claims killed in audit'),
              columns: ['id', 's', 't', 'pred', 'tier as written', 'd', 'killed reason', 'sources'],
              rows: () => ENERGY_META.killed.map((k) => [k.id, k.s, k.t, k.pred, k.tier, k.d ?? '', k.killedReason, k.srcs.map(([l, u]) => `${l} <${u}>`).join(' | ')]),
            }}
          />
        ) : (
          <p className="text-[14px] text-text-secondary">
            No claim was killed. Either the audit found nothing or it has not run — ENERGY_META.audit is{' '}
            {audit ? `present, ${audit.verdicts.length} verdicts` : 'absent: no audit has run'}.
          </p>
        )}
      </div>
      <div>
        <h3 className="heading-editorial font-bold text-lg text-text">Held out</h3>
        {ENERGY_META.excluded.length ? (
          <StackTable
            caption={`Held out — ${ENERGY_META.excluded.length} rows`}
            columns={['id', 's → t', 'pred', 'tier', 'd', 'excluded reason', 'sources']}
            minWidth="56rem"
            rows={ENERGY_META.excluded.map((k) => [
              <span className="font-mono text-[11.5px]">{k.id}</span>,
              `${labelOf(k.s)} → ${labelOf(k.t)}`,
              k.pred,
              k.tier,
              k.d ?? '—',
              k.excludedReason,
              <SourceLines srcs={k.srcs} />,
            ])}
          />
        ) : (
          <p className="text-[14px] text-text-secondary">
            No claim was held out: none had an unresolved endpoint or duplicated another in this build.
          </p>
        )}
      </div>
      <div>
        <h3 className="heading-editorial font-bold text-lg text-text">Orphans</h3>
        {ORPHANS.length ? (
          <StackTable
            caption={`Orphans — ${ORPHANS.length} rows · claims whose endpoint the platform does not hold, so they are not drawn`}
            columns={['claim id', 's', 't', 'pred', 'why not drawn']}
            rows={ORPHANS.map((e) => [
              <span className="font-mono text-[11.5px]">{e.id}</span>,
              e.s,
              e.t,
              e.pred,
              `endpoint ${[e.s, e.t].filter((x) => labelOf(x) === x).join(', ') || e.t} not in platform`,
            ])}
          />
        ) : (
          <p className="text-[14px] text-text-secondary">No claim names an endpoint outside the platform.</p>
        )}
      </div>
      <div>
        <h3 className="heading-editorial font-bold text-lg text-text">Superseded</h3>
        {SUPERSEDED.length ? (
          <StackTable
            caption={`Superseded — ${SUPERSEDED.length} rows · retained and addressable, never drawn`}
            columns={['old claim', 'tier', 'date', 'superseded by', 'old d', 'new d']}
            minWidth="56rem"
            rows={SUPERSEDED.map((e) => {
              return [
                <Btn onClick={() => onOpen(e.id ?? '')}>{claimLabel(e)}</Btn>,
                <TierChip tier={e.tier} />,
                dateText(e),
                e.supersededBy ? <Btn onClick={() => onOpen(e.supersededBy!)}>{e.supersededBy}</Btn> : '—',
                e.d ?? '—',
                <NewD id={e.supersededBy} />,
              ];
            })}
          />
        ) : (
          <p className="text-[14px] text-text-secondary">No claim in this build has been superseded.</p>
        )}
      </div>
    </div>
  );
}

function NewD({ id }: { id?: string }) {
  const e = id ? EDGE_BY_ID.get(id) : undefined;
  return <>{e?.d ?? '—'}</>;
}

/** The foot's bibliography: every source, deduped by URL, never behind "show more". */
export function Sources() {
  const primary = SOURCES.filter((s) => s.primary).length;
  const csv = {
    filename: `energy-sources-${RUN_ID}.csv`,
    comments: [`run ${RUN_ID}`, `as of ${ASOF_TEXT}`, `${SOURCES.length} sources`, 'Primary = an official register or portal by URL pattern; everything else is secondary.'],
    columns: ['label', 'url', 'primary', 'cited in a file dated', 'cited by claims'],
    rows: () => SOURCES.map((s) => [s.label, s.url, s.primary ? 'primary' : 'secondary', s.retrieved ?? '', s.claims.join(' ')]),
  };
  return (
    <div className="[overflow-wrap:anywhere]">
      <p className="font-mono text-[11px] text-text-muted mb-2">
        {SOURCES.length} sources · {primary} primary
      </p>
      {SOURCES.length > 0 && (
        <div className="mb-3">
          <DownloadButton d={csv} />
        </div>
      )}
      <ol className="space-y-2.5">
        {SOURCES.map((s) => (
          <li key={s.url} className="text-[13px] leading-snug border-l-2 border-border-light pl-3">
            <span className="text-text">{s.label}</span>{' '}
            <span className={`font-mono text-[9.5px] uppercase tracking-wider ${s.primary ? 'text-sage' : 'text-text-muted'}`}>{s.primary ? 'primary' : 'secondary'}</span>
            <br />
            <a href={s.url} target="_blank" rel="noopener noreferrer" className={`font-mono text-[11.5px] text-text-muted underline underline-offset-2 ${FOCUS}`}>
              {s.url}
            </a>
            <span className="block font-mono text-[10px] text-text-muted mt-0.5">
              {s.retrieved ? `cited in a file dated ${s.retrieved}` : 'entity source'}
              {s.claims.length ? ` · cited by ${s.claims.length} claims: ${s.claims.join(', ')}` : ''}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

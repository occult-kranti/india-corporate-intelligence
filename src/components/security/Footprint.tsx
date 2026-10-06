import { useState } from 'react';
import type { StateCode } from '../../graph/schema';
import {
  type FootprintRow, FOOTPRINT, KINDS, KIND_COUNT, EMPTY_KINDS, kindWord, UNITS, stateName, EMPTY, NOTHING, NO_FP_ROWS, FP_DATED, PLACES_ORDER, rowTier, labelOf,
  lensPopulation, LANE_BODIES,
} from '../../data/securityView';
import { usePage, QBlock, Caption, Twin, TwinTable, Exports, captionText, Src, Denominator, NoMatch, Pager, FOCUS, SkipLink, type Row, type Col } from './ui';
import { KindChips } from './Chrome';
import { UnitMap, capOf, type UnitOpt, type MapDot } from './StatePair';
import { CityLedger, CityLedgerTwin, CompareBlock } from './BudgetBlocks';
import { CannotShow } from './Shared';

/**
 * The Footprint lens (§5.2): where force sits, never what it costs. One neutral dot per
 * installation, placed within its state because no row carries a coordinate; a state
 * with no row of the selected kinds is hatched, which is not the same as having none.
 */

const kindsWith = KINDS.filter((k) => (KIND_COUNT.get(k) ?? 0) > 0).length;
const unitsWith = new Set(FOOTPRINT.map((r) => r.st)).size;

export function FootprintLens() {
  const { f } = usePage();
  const pop = lensPopulation(f);
  return (
    <>
      <QBlock q="F1" title="Q1 — Where is it?"><NoMatch k={pop.k} n={pop.n} /><FootprintMap /></QBlock>
      <QBlock q="F2" title="Q2 — Of what kind, in which city?"><KindsAndPlaces /></QBlock>
      <QBlock q="F3" title="Q3 — Which cities have police money?">
        {EMPTY ? <p data-page-copy="" className="text-[14px]">{NOTHING}</p> : <><CityLedger lens="footprint" /><CityLedgerTwin /></>}
      </QBlock>
      <QBlock q="F4" title="Q4 — Compared with what?"><CompareBlock lens="footprint" /></QBlock>
      <CannotShow lens="footprint" q="F5" n={5} />
    </>
  );
}

/** Rows the map and the place list draw: the kind and tier filters; `st` is a selection on the map. */
const selected = (f: ReturnType<typeof usePage>['f'], r: FootprintRow) => f.kind.has(r.kind) && f.tiers.has(rowTier(r));

function FootprintMap() {
  const { f, selectState, inlinePanel, narrow } = usePage();
  const [hover, setHover] = useState<StateCode | null>(null);
  const rows = FOOTPRINT.filter((r) => selected(f, r));
  const byState = new Map<StateCode, FootprintRow[]>();
  for (const r of rows) { if (!byState.has(r.st)) byState.set(r.st, []); byState.get(r.st)!.push(r); }
  const opts: UnitOpt[] = UNITS.map((st) => {
    const rs = byState.get(st) ?? [];
    if (EMPTY) return { st, cls: 'hatch', name: `${stateName(st)}: register not yet promoted` };
    if (!rs.length) return { st, cls: 'hatch', name: `${stateName(st)}: no row of the selected kinds in this register` };
    const cities = new Set(rs.map((r) => r.city)).size;
    return { st, cls: 'plain', name: `${stateName(st)}: ${rs.length} installation${rs.length === 1 ? '' : 's'} in ${cities} cit${cities === 1 ? 'y' : 'ies'}` };
  });
  const dots: MapDot[] = [];
  const overflow: { st: StateCode; k: number }[] = [];
  for (const [st, rs] of byState) {
    const cap = capOf(st);
    const ordered = PLACES_ORDER(rs);
    ordered.slice(0, cap).forEach((r, i) => dots.push({ key: r.id, st, i, n: rs.length }));
    if (rs.length > cap) overflow.push({ st, k: rs.length - cap });
  }
  const readout = (st: StateCode | null) => {
    if (!st) return 'Point at or arrow to a state for its installations; Enter opens the list for it.';
    const rs = byState.get(st) ?? [];
    if (!rs.length) return `${stateName(st)}: no row of the selected kinds in this register`;
    const kinds = KINDS.map((k) => [k, rs.filter((r) => r.kind === k).length] as const).filter(([, n]) => n).map(([k, n]) => `${n} ${kindWord(k)}`).join(', ');
    const cities = [...new Set(rs.map((r) => r.city))];
    return `${stateName(st)}: ${rs.length} installations in ${cities.length} cities — ${kinds}; ${cities.slice(0, 4).map((c) => `${c}: ${[...new Set(rs.filter((r) => r.city === c).map((r) => kindWord(r.kind)))].join(', ')}`).join('; ')} — open the state for the list`;
  };
  const noRows = EMPTY || !FOOTPRINT.length;
  return (
    <>
      {noRows && <p data-page-copy="" className="text-[14px] text-text">{EMPTY ? NOTHING : NO_FP_ROWS}</p>}
      <KindChips f={f} />
      {!noRows && <SkipLink twin="footprint-matrix" title="Installations by state and kind" />}
      <figure className="m-0 min-w-0 max-w-[640px]" aria-describedby="sec-c11">
        <UnitMap id="sec-map-fp" label="Installations by state: 36 states and union territories, north to south" describedBy="sec-c11" opts={opts} selected={f.st}
          onPick={(st, via, el) => selectState(st, via, el)} dots={noRows ? [] : dots} overflow={noRows ? [] : overflow} onHover={setHover} narrow={narrow} />
        <p className="font-mono text-[12px] text-text-muted my-1 min-h-[2.6em]">{readout(hover)}</p>
        <figcaption data-page-copy="" className="font-mono text-[12px] text-text-muted">
          {noRows ? (EMPTY ? 'register not yet promoted — nothing below is zero' : 'no installation rows in this build') : `${rows.length} of ${FOOTPRINT.length} installations · ${kindsWith} of ${KINDS.length} kinds · ${unitsWith} of 36 units with any row · positions are states, not addresses`}
        </figcaption>
      </figure>
      {inlinePanel('map')}
      <Caption id="sec-c11" cap="C11">{`One dot per installation that an official list places in a state and a city. Dots are positioned within their state, not at their address: no row carries a coordinate. A dot is a place, not money: no installation here has a budget of its own on this page. A hatched state has no row of the selected kinds in this register, which is not the same as having none: some lists were complete, some were not reachable. Kinds the register declares but holds no row for — ${EMPTY_KINDS.map(kindWord).join(', ') || 'none'} — are not absent from India, only from this register. Most installations are older than any government in this register's office lanes; ${FP_DATED} of ${FOOTPRINT.length} rows print a date.`}</Caption>
    </>
  );
}

function KindsAndPlaces() {
  const { f, filterWords, patch, showConnections, openBody } = usePage();
  if (EMPTY) return <p data-page-copy="" className="text-[14px]">{NOTHING}</p>;
  const matrixCols: Col[] = [
    { key: 'st', label: 'State', th: true },
    ...KINDS.map((k) => ({ key: k, label: `${kindWord(k)}${KIND_COUNT.get(k) ? '' : ' — none in this register'}` })),
    { key: 'cities', label: 'cities' },
  ];
  const matrixRows: Row[] = UNITS.map((st) => {
    const rs = FOOTPRINT.filter((r) => r.st === st && f.tiers.has(rowTier(r)));
    const cities = new Set(rs.map((r) => r.city)).size;
    return {
      cells: [stateName(st), ...KINDS.map((k) => { const n = rs.filter((r) => r.kind === k).length; return n ? String(n) : 'no row'; }), cities ? String(cities) : 'no city recorded'],
      out: [st, stateName(st), ...KINDS.map((k) => rs.filter((r) => r.kind === k).length), cities],
      current: f.st === st,
    };
  });
  const places = PLACES_ORDER(FOOTPRINT.filter((r) => selected(f, r) && (!f.st || r.st === f.st)));
  const pages = Math.max(1, Math.ceil(places.length / 400));
  const page = Math.min(f.tp, pages);
  const shown = places.slice((page - 1) * 400, page * 400);
  const placeRows: Row[] = shown.map((r) => ({
    cells: [r.label, kindWord(r.kind), r.city, stateName(r.st),
      <span>
        {labelOf(r.body)}{' '}
        <button type="button" aria-label={`Show connections: ${labelOf(r.body)}, from ${r.label}`} className={`underline underline-offset-2 font-mono text-[12px] ${FOCUS}`} onClick={(e) => showConnections(r.body, e.currentTarget)}>Show connections</button>
        {LANE_BODIES.has(r.body) && <>{' '}<button type="button" aria-label={`Show its budget lines: ${labelOf(r.body)}, from ${r.label}`} className={`underline underline-offset-2 font-mono text-[12px] ${FOCUS}`} onClick={(e) => openBody(r.body, e.currentTarget)}>Show its budget lines</button></>}
      </span>,
      r.since ?? 'date not printed on the list', rowTier(r), r.note ?? 'no note', <Src srcs={r.srcs} of={r.label} inline />],
  }));
  const placeCols: Col[] = [{ key: 'l', label: 'Label', th: true }, { key: 'k', label: 'Kind' }, { key: 'c', label: 'City' }, { key: 's', label: 'State' }, { key: 'b', label: 'Run by' }, { key: 'since', label: 'Since' }, { key: 't', label: 'Tier' }, { key: 'n', label: 'Note' }, { key: 'src', label: 'Sources' }];
  return (
    <>
      <Denominator>{`${FOOTPRINT.length} installations in ${new Set(FOOTPRINT.map((r) => r.city)).size} cities · ${KINDS.length} declared kinds, ${EMPTY_KINDS.length} with no row · ${places.length} in the place list under the current kind, tier and state`}</Denominator>
      {!FOOTPRINT.length && <p data-page-copy="" className="text-[14px]">{NO_FP_ROWS}</p>}
      <Caption id="sec-c12" cap="C12">Counts are of rows in official lists the research could open. A state&apos;s count measures what was listed and reachable, not the size of its forces: the BSF, SSB, Assam Rifles and NSG sites, most DPSU plants, every jail address and most command headquarters are not in these lists (see Q5).</Caption>
      <div aria-describedby="sec-c12"><Twin twin="footprint-matrix" title="Installations by state and kind" rowCount={36} suffix=", always all 36">
        {() => (
          <>
            <Exports name="Installations by state and kind" twin="footprint-matrix" meta={{ table: 'Installations by state and kind', population: `${FOOTPRINT.length} installations, 36 map units × ${KINDS.length} declared kinds`, rows: 36 }}
              header={['st', 'state', ...KINDS.map((k) => k.replace(/-/g, '_')), 'cities']} rows={() => matrixRows.map((r) => r.out!)} />
            <TwinTable caption={captionText(36, `36 map units × ${KINDS.length} declared kinds; always all 36`, filterWords)} amounts={false} cols={matrixCols} rows={matrixRows} minWidth="70rem" />
          </>
        )}
      </Twin></div>
      <Twin twin="places" title="Every installation in the place list" rowCount={places.length} paged>
        {() => (
          <>
            <Exports name="Installations, one per row" twin="places" meta={{ table: 'Installations, one per row', population: `${FOOTPRINT.length} installations`, rows: places.length }}
              header={['id', 'label', 'kind', 'city', 'st', 'state', 'body', 'since', 'tier', 'note', 'source_urls']} rows={() => places.map((r) => [r.id, r.label, r.kind, r.city, r.st, stateName(r.st), r.body, r.since ?? '', rowTier(r), r.note ?? '', r.srcs.map(([, u]) => u).join(' ')])} />
            <Pager page={page} pages={pages} onPage={(p) => patch({ tp: p > 1 ? String(p) : null })} />
            <TwinTable caption={captionText(shown.length, `installations ${(page - 1) * 400 + 1}–${(page - 1) * 400 + shown.length} of ${places.length}, state north to south, then city, then label`, filterWords)} amounts={false} cols={placeCols} rows={placeRows} minWidth="80rem" />
          </>
        )}
      </Twin>
    </>
  );
}

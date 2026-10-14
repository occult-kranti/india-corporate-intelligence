import type { MouseEvent } from 'react';
import { useHref, useLocation } from 'react-router-dom';
import { pooledOnlyNames, splitStates, unlistedStatus, type CpppCore, type Provenance, type StatePrefix } from '../../data/cppp';
import { STATES } from '../../data/geo';
import type { Patch } from '../energy/hooks';
import { Cols, FOCUS, NODATA_STYLE, Sub, Twin, csvComments, csvName, fmt, stamp, unlistedText } from './ui';

/**
 * §3.2a — which states and UTs the state portal holds (U18). Prefixes are shown exactly
 * as emitted; the reviewed alias table in src/data/cppp.ts maps a spelling to a state
 * name by exact string only. A state no prefix matches is named, hatched, and given no
 * reason, because no reason is sourced (D9). There is no map: a tender is not a place.
 *
 * The prefixes come from a thresholded table (buyers with n ≥ 30), so a state no prefix
 * matches is "unlisted", not "absent": its buyers may all sit in the pooled row. The
 * words for each unlisted state come from `unlistedStatus`, and "not present on the
 * state portal" is printed only once the pipeline emits the per-name row counts.
 */
const OTHER_HEADING = 'spellings that match no state name, or repeat one already listed';

function StateLink({ prefix, patch }: { prefix: string; patch: Patch }) {
  const loc = useLocation();
  const q = new URLSearchParams(loc.search);
  q.set('state', prefix);
  q.set('portal', 'state');
  const href = useHref({ pathname: loc.pathname, search: `?${q.toString()}` });
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    patch({ state: prefix, portal: 'state' });
  };
  return (
    <a href={href} onClick={onClick} className={`underline underline-offset-2 hover:text-accent ${FOCUS}`}>
      {prefix}
    </a>
  );
}

export default function States({ core, p, params, patch }: { core: CpppCore; p: Provenance; params: URLSearchParams; patch: Patch }) {
  const rates = core.rates!;
  const split = splitStates(rates, STATES.map((s) => s.name));
  const note = (x: StatePrefix) =>
    x.state == null
      ? 'no state name matches this spelling'
      : x.viaAlias
        ? split.matched.includes(x)
          ? `${x.state} (reviewed alias)`
          : `${x.state}, already listed under another spelling; counts kept apart`
        : x.state;
  const row = (x: StatePrefix) => (
    <tr key={x.prefix}>
      <th scope="row">
        <StateLink prefix={x.prefix} patch={patch} />
      </th>
      <td>{note(x)}</td>
      <td className="font-mono tabular-nums">{fmt(x.buyers)}</td>
      <td className="font-mono tabular-nums">{fmt(x.awards)}</td>
    </tr>
  );
  const csvRow = (x: StatePrefix, status: string) => [x.prefix, x.state ?? '', String(x.buyers), String(x.awards), status];
  const names = STATES.map((s) => s.name);
  const unlisted = split.unlisted.map((name) => ({ name, text: unlistedText(unlistedStatus(core.quality, name, names)) }));
  const rowsTotal = split.matched.length + 1 + split.other.length + unlisted.length;
  const total = core.quality?.organisations.stateDistinctOrganisationName;
  const pooledOnly = pooledOnlyNames(core.quality, rates);
  const known = !!core.quality?.organisations.statePortalNames;
  return (
    <Sub id="cppp-states" title="States on the state portal">
      <p className="text-[14px] leading-relaxed text-text-secondary max-w-[72ch]">
        {fmt(split.matched.length)} of {fmt(STATES.length)} states and UTs have a buyer with n ≥ 30 on the state portal in this scrape;{' '}
        {fmt(unlisted.length)} do not. Buyers with fewer than 30 awards in the denominator sit in the pooled row and are not counted here
        {known
          ? '; each hatched row below says whether the state has rows in that pool or none at all.'
          : total != null && pooledOnly != null
            ? `: the pipeline counts ${fmt(total)} distinct organisation names on the state portal, and ${fmt(pooledOnly)} of them appear only in the pooled row, so up to ${fmt(Math.min(pooledOnly, unlisted.length))} of the ${fmt(unlisted.length)} hatched below may be on the portal. Which ones is not emitted.`
            : ', so a hatched state below may still be on the portal. Which ones is not emitted.'}{' '}
        A state name below filters the buyer and concentration tables.
      </p>
      <Twin
        twin="states"
        label="States on the state portal"
        minWidth="34rem"
        caption={
          <>
            The state portal is not India's states. It is the states and UTs whose bodies publish on one portal. · n = {fmt(rowsTotal)} rows ·{' '}
            {stamp(p)}
          </>
        }
        head={<Cols names={['state as emitted', 'maps to', 'buyers with n ≥ 30', 'award decisions in the denominator']} />}
        download={{
          filename: csvName('states', p),
          comments: csvComments(core, p, rates.denominator, rates.denominatorN, params),
          columns: ['state_as_emitted', 'maps_to', 'buyers_n_ge_30', 'award_decisions', 'status'],
          rows: () => [
            ...split.matched.map((x) => csvRow(x, x.viaAlias ? 'matched by reviewed alias' : 'matched exactly')),
            [OTHER_HEADING, '', '', '', 'heading'],
            ...split.other.map((x) => csvRow(x, x.state ? 'further spelling of a listed state' : 'matches no state name')),
            ...unlisted.map((u) => [u.name, u.name, '', '', u.text]),
          ],
        }}
      >
        {split.matched.map(row)}
        <tr>
          <td colSpan={4} className="!pt-4 font-mono text-[10.5px] uppercase tracking-[0.1em] !text-text-muted">
            {OTHER_HEADING}
          </td>
        </tr>
        {split.other.map(row)}
        {unlisted.map((u) => (
          <tr key={u.name} data-nodata="">
            <th scope="row" style={NODATA_STYLE}>
              {u.name}
            </th>
            <td colSpan={3} style={NODATA_STYLE}>
              {' '}
              {u.text}
            </td>
          </tr>
        ))}
      </Twin>
    </Sub>
  );
}

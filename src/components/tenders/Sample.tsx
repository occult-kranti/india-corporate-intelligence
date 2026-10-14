import type { ReactNode } from 'react';
import type { CpppCore, Provenance, SampleRow, Verdict } from '../../data/cppp';
import { Code, Cols, FINDINGS, FOCUS, MONO_NOTE, NODATA_STYLE, Sub, Twin, WRAP, WbrText, csvComments, csvName, fmt, stamp } from './ui';

/**
 * §3.7 — the live verification sample (U5). Every stored link answered the portal's
 * "Invalid Url" page, so nothing was checked and nothing was contradicted: agreement is
 * unknown, not zero, and the table says `not checkable` rather than printing a
 * percentage. The links stay real links so a reader can see the dead page themselves.
 */

const VERDICTS: Verdict[] = ['match', 'mismatch', 'missing', 'page_gone'];
const words = (v: string) => v.replace(/_/g, ' ');

/** The finding verbatim, with the link-token pattern set as code. */
function Finding({ text }: { text: string }) {
  const m = text.match(/<b64[^;]*?<b64 unix time>/);
  if (!m || m.index == null) return <>{text}</>;
  return (
    <>
      {text.slice(0, m.index)}
      <Code>{m[0]}</Code>
      {text.slice(m.index + m[0].length)}
    </>
  );
}

export default function Sample({ core, p, params }: { core: CpppCore; p: Provenance; params: URLSearchParams }) {
  const s = core.sample!;
  const n = s.rows.length;
  const allGone = s.pageGone === n;
  const fields = Object.keys(s.agreement);
  const same = s.rows.every((r) => new Set(Object.values(r.verdicts)).size === 1);
  const notAttempted = s.finding.match(/[^.]*was not attempted; no token was re-signed or re-timestamped[^.]*\./)?.[0] ?? null;
  const drawSql = ['cand', 'stratum', 'rows'].map((k) => s.provenance.sql[k]).filter(Boolean).join(';\n\n');
  const family = `the ${n} sampled award rows (seed ${s.seed})`;
  const checkable = (f: string) => s.agreement[f].page_gone !== n;
  const linkName = (r: SampleRow) => `Portal page for tender ${r.tender_id}, returned “Invalid Url” on ${r.fetch.fetchedAt.slice(0, 10)}`;
  const verdictCells = (r: SampleRow): ReactNode =>
    same ? <td>{words(Object.values(r.verdicts)[0])}</td> : fields.map((f) => <td key={f}>{words(r.verdicts[f])}</td>);
  const cols = ['tender id', 'portal', 'year', 'organisation_name', 'bidder as emitted', ...(same ? ['verdict (all fields)'] : fields.map((f) => `verdict: ${f}`)), 'portal page', 'fetch sha256_16'];

  return (
    <Sub id="cppp-sample" title="Verification sample">
      <p className={`${FINDINGS} max-w-[72ch]`}>
        {allGone
          ? 'The portal answered “Invalid Url” to every stored link; the finding below gives the reason it appears to be a validity window on the link token. Nothing was checked, and nothing was contradicted.'
          : `${fmt(s.pageGone)} of ${fmt(n)} stored links answered “Invalid Url”; the agreement table gives what the rest showed.`}
      </p>

      <Twin
        twin="agreement"
        label="Agreement with the portal, by field"
        minWidth="30rem"
        caption={
          <>
            Agreement with the portal is unknown, not zero. Per field, over the {fmt(n)} sampled rows · n = {fmt(n)} rows · {stamp(p)}
          </>
        }
        head={<Cols names={['field', ...VERDICTS]} />}
        download={{
          filename: csvName('agreement', p),
          comments: csvComments(core, p, family, n, params),
          columns: ['field', 'match', 'mismatch', 'missing', 'page_gone', 'sample_rows', 'status'],
          rows: () =>
            fields.map((f) => {
              const a = s.agreement[f];
              const ok = checkable(f);
              return [f, ok ? String(a.match) : '', ok ? String(a.mismatch) : '', ok ? String(a.missing) : '', String(a.page_gone), String(n), ok ? 'checked' : 'not checkable'];
            }),
        }}
      >
        {fields.map((f) => {
          const a = s.agreement[f];
          const ok = checkable(f);
          return (
            <tr key={f}>
              <th scope="row">
                <Code>{f}</Code>
              </th>
              {(['match', 'mismatch', 'missing'] as Verdict[]).map((v) =>
                ok ? (
                  <td key={v} className="font-mono tabular-nums">
                    {fmt(a[v])}
                  </td>
                ) : (
                  <td key={v} data-nodata="" style={NODATA_STYLE}>
                    not checkable
                  </td>
                ),
              )}
              <td className="font-mono tabular-nums">
                {fmt(a.page_gone)} of {fmt(n)}
              </td>
            </tr>
          );
        })}
      </Twin>

      <dl className="mt-4 space-y-1.5 text-[13.5px] leading-relaxed text-text-secondary max-w-[76ch]">
        {VERDICTS.map((v) => (
          <div key={v} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3">
            <dt className="font-mono text-[11px] text-text-muted pt-0.5">{v}</dt>
            <dd>{s.verdictRule[v]}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[14px] leading-relaxed text-text-secondary max-w-[76ch]">
        <Finding text={s.finding} />
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-text-secondary max-w-[76ch]">{s.redraw}</p>

      <p className="mt-4 text-[14px] leading-relaxed text-text-secondary max-w-[76ch]">
        <strong className="text-text">Not attempted, and not asked.</strong> {notAttempted ?? 'What was and was not attempted is as the finding above states it.'} The
        portal's operator and the dataset's publisher were not asked about link validity.
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-text-secondary max-w-[76ch]">
        <strong className="text-text">What would upgrade it:</strong> a fresh sample from a scrape whose links resolve, meeting the agreement threshold
        stated in the finding.
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-text-secondary max-w-[76ch]">
        <strong className="text-text">How to check a row yourself:</strong> tender_id and buyer are enough for a manual search of the portal's Results of
        Tenders page, which sits behind an image captcha; scripts/cppp/build.py re-derives every number from the named dataset.
      </p>

      <div className={`${MONO_NOTE} mt-4 space-y-1 max-w-[76ch]`}>
        <p>Sample frame: seed {s.seed}.</p>
        <p>rng: {s.rng}.</p>
        <p>
          Strata: {s.strata.map((x) => `${x.portal} ${x.year} ×${x.k}`).join(', ')}. strataShortfall:{' '}
          {s.strataShortfall.length ? JSON.stringify(s.strataShortfall) : 'none (every stratum met its quota)'}.
        </p>
        <p>
          Fetch: {s.fetchMethod}. {s.refusal}.
        </p>
      </div>
      <pre className={`mt-2 w-full font-mono text-[11.5px] text-text-secondary bg-bg-elevated rounded p-3 ${WRAP}`}>{drawSql}</pre>

      <Twin
        twin="sample"
        label="The sampled rows"
        minWidth="64rem"
        caption={
          <>
            The {fmt(n)} sampled rows, every field still reported · n = {fmt(n)} rows · in organisation_name, || separates organisation, department and
            division · {stamp(p)}
          </>
        }
        head={<Cols names={cols} />}
        download={{
          filename: csvName('sample', p),
          comments: csvComments(core, p, family, n, params),
          columns: ['tender_id', 'portal', 'year', 'organisation_name', 'bidder_as_emitted', ...fields.map((f) => `verdict_${f}`), 'detail_url', 'fetch_sha256_16', 'fetched_at'],
          rows: () =>
            s.rows.map((r) => [
              r.tender_id, r.portal, String(r.year), r.organisation_name, r.selected_bidder, ...fields.map((f) => r.verdicts[f]), r.detail_url, r.fetch.sha256_16,
              r.fetch.fetchedAt,
            ]),
        }}
      >
        {s.rows.map((r) => (
          <tr key={r.detail_url}>
            <th scope="row" className="font-mono">
              {r.tender_id}
            </th>
            <td>{r.portal}</td>
            <td className="font-mono tabular-nums">{r.year}</td>
            <td className="text-[12.5px] max-w-[22rem]">
              <WbrText text={r.organisation_name} />
            </td>
            <td className="text-[12.5px]">{r.selected_bidder}</td>
            {verdictCells(r)}
            <td style={NODATA_STYLE}>
              <a href={r.detail_url} aria-label={linkName(r)} rel="noopener noreferrer" target="_blank" className={`underline underline-offset-2 text-text-muted ${FOCUS}`}>
                portal page (page gone)
              </a>
            </td>
            <td className={`font-mono text-[11.5px] ${WRAP}`}>{r.fetch.sha256_16}</td>
          </tr>
        ))}
        {same && allGone && (
          <tr>
            <td colSpan={cols.length} className="font-mono text-[11px] !text-text-muted">
              page gone: the stored link returned the portal’s “Invalid Url” page; the field could not be checked
            </td>
          </tr>
        )}
      </Twin>
    </Sub>
  );
}

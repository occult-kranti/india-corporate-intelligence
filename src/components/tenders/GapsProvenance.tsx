import type { ReactNode } from 'react';
import { STATES } from '../../data/geo';
import { absentPrerequisites, checkableRows, pooledOnlyNames, splitStates, unlistedStatus, type CpppCore, type Provenance } from '../../data/cppp';
import { Code, Cols, FINDINGS, JumpLink, MONO_NOTE, ORIGIN_MISSING, Sub, Twin, WRAP, csvComments, csvName, fmt, sourceLine, stamp } from './ui';

/**
 * §3.9 — the gaps panel, at the size of the findings (U20): absence is a result on this
 * platform, not a footnote. Every line is derived and disappears when its cause does.
 * §3.8 — provenance: the input digests and the run, so any number can be re-derived.
 */

const NO_COMPARATOR =
  'No external comparator is shown. EU and OECD single-bidding shares are computed over above-threshold contracts with different tender-type mixes and are not comparable to this denominator; the comparison offered is the scrape against itself, by portal, type and value band.';

const PREREQ_HOLDS: Record<string, string> = {
  'provenance.dataset': "the dataset's name, URL, licence and scraper",
  'provenance.scrapedAt': 'the scrape timestamp, which would date the partial year',
  'winnerMarkers.msOnlyNamed': 'how many names shown are admitted by “M/s” alone',
  'redflags.singleBiddingByBuyerFamily': 'how many buyers were eligible for the named-buyer table',
  'rates.byPortalTenderType': 'tender-type composition per portal',
  'quality.organisations.statePortalNames': 'every state-portal name with its row count, which would say whether an unlisted state is absent or only pooled',
};

export function Gaps({ core, p }: { core: CpppCore; p: Provenance }) {
  const s = core.sample;
  const t = core.timing;
  const election = t ? (t.innocentReading.match(/Election-calendar clustering[^.]*\./)?.[0] ?? t.innocentReading) : null;
  const names = STATES.map((x) => x.name);
  const unlisted = core.rates ? splitStates(core.rates, names).unlisted : null;
  const statuses = (unlisted ?? []).map((n) => unlistedStatus(core.quality, n, names));
  const pooledOnly = core.rates ? pooledOnlyNames(core.quality, core.rates) : null;
  const prereqs = absentPrerequisites(core, p);
  const lines: { key: string; node: ReactNode }[] = [];
  if (s) {
    lines.push({
      key: 'verification',
      node: `Verification: ${fmt(checkableRows(s))} of ${fmt(s.rows.length)} sampled rows checkable against the portal; every field stays reported.`,
    });
  }
  if (election) lines.push({ key: 'election', node: election });
  lines.push({ key: 'comparator', node: NO_COMPARATOR });
  if (core.rates && core.rates.byPortalTenderType === undefined) {
    lines.push({ key: 'composition', node: "Per-portal tender-type composition is not emitted by the pipeline, so the change in mix behind each portal's line cannot be shown." });
  }
  // "Absent from the portal" is said only of names the pipeline gives no rows; without
  // statePortalNames the table behind the count is thresholded, so the line says that.
  if (unlisted && unlisted.length > 0) {
    const link = <JumpLink id="cppp-states">states on the state portal</JumpLink>;
    const absent = statuses.filter((x) => x.kind === 'absent').length;
    const pooled = statuses.filter((x) => x.kind === 'pooled').length;
    lines.push({
      key: 'states',
      node: core.quality?.organisations.statePortalNames ? (
        <>
          {fmt(absent)} states and UTs are absent from the state portal, and {fmt(pooled)} more are on it with no buyer at n ≥ 30 ({link}); absence
          there is coverage, not conduct.
        </>
      ) : (
        <>
          {fmt(unlisted.length)} states and UTs have no buyer with n ≥ 30 on the state portal ({link}). Smaller buyers are pooled
          {pooledOnly != null ? `, and ${fmt(pooledOnly)} state-portal names appear only in the pooled row` : ''}, so which of them are absent from
          the portal is not emitted; absence from that table is coverage, not conduct.
        </>
      ),
    });
  }
  lines.push({ key: 'comment', node: 'Comment: no body named in this section was asked for comment.' });
  if (!p.dataset) lines.push({ key: 'origin', node: ORIGIN_MISSING });
  for (const f of prereqs) lines.push({ key: `pre-${f}`, node: `Pipeline field not yet emitted: ${f} (${PREREQ_HOLDS[f] ?? 'see the spec'}).` });
  return (
    <Sub id="cppp-gaps" title="What this section cannot show">
      <ul className="space-y-2 list-none pl-0 max-w-[76ch]">
        {lines.map((l) => (
          <li key={l.key} data-gap className={`${FINDINGS} border-l-2 border-amber/40 pl-3`}>
            {l.node}
          </li>
        ))}
      </ul>
    </Sub>
  );
}

export function ProvenanceFooter({ core, p, params }: { core: CpppCore; p: Provenance; params: URLSearchParams }) {
  const items: [string, string][] = [
    ['raw rows', fmt(p.rows)],
    ['distinct tender ids', fmt(p.distinctTenderIds)],
    ['award decisions after dedup', fmt(p.afterDedupRows)],
    ['dedup rule', p.dedupRule],
    ['generator', p.generatedBy],
    ['computed', `computed ${p.asOf}`],
    ['outputs', core.provenance?.outputs?.join(', ') ?? 'not listed'],
  ];
  return (
    <Sub id="cppp-provenance" title="Provenance">
      <Twin
        twin="provenance"
        label="Pipeline input files"
        minWidth="30rem"
        caption={
          <>
            Input files of the pipeline run · n = {p.inputs.length} rows · {stamp(p)}
          </>
        }
        head={<Cols names={['file', 'bytes', 'sha256_16']} />}
        download={{
          filename: csvName('provenance', p),
          comments: csvComments(core, p, 'the pipeline input files', p.inputs.length, params),
          columns: ['file', 'bytes', 'sha256_16'],
          rows: () => p.inputs.map((i) => [i.file, String(i.bytes), i.sha256_16]),
        }}
      >
        {p.inputs.map((i) => (
          <tr key={i.file}>
            <th scope="row" className="font-mono">
              {i.file}
            </th>
            <td className="font-mono tabular-nums">{fmt(i.bytes)}</td>
            <td className={`font-mono ${WRAP}`}>{i.sha256_16}</td>
          </tr>
        ))}
      </Twin>
      <dl className="space-y-1 text-[13px] text-text-secondary max-w-[80ch]">
        {items.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] sm:grid-cols-[11rem_minmax(0,1fr)] gap-x-3">
            <dt className="font-mono text-[11px] text-text-muted pt-0.5">{k}</dt>
            <dd className={`font-mono text-[12px] ${WRAP}`}>{v}</dd>
          </div>
        ))}
      </dl>
      {/* A path in the repository, not a link: the commit in generatedBy predates
          scripts/cppp/, so no pinned URL resolves, and an unpinned one drifts from the
          run the digests describe. Whether a code-host link ships is the owner's call. */}
      <p className={`${MONO_NOTE} mt-3`}>
        The pipeline, its rebuild command and every table's SQL, in the source repository: <Code>scripts/cppp/README.md</Code>.
      </p>
      <p className={`${MONO_NOTE} mt-2`}>
        <span data-source-line>{sourceLine(p)}</span>
      </p>
    </Sub>
  );
}

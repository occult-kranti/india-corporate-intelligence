import { Link } from 'react-router-dom';
import { TierChip } from '../Editorial';
import { checkableRows, type CpppCore, type Provenance } from '../../data/cppp';
import { FOCUS, JumpLink, MONO_NOTE, fmt, sourceLine, useCopy } from './ui';

/**
 * §3.0 — the section head. Quality comes first (D1, D5): before any rate the reader
 * meets the tier, the counts the rates are over, what the live verification found, and
 * the caveat in body type. The strip carries counts only, never a percentage.
 */

const TIER_CLAUSE = "the portal is the primary record; this scrape's agreement with it is unknown (see verification)";

export function Strip({ core, p }: { core: CpppCore; p: Provenance }) {
  const facts = [
    `${fmt(p.afterDedupRows)} award decisions after dedup`,
    `from ${fmt(p.rows)} raw rows`,
    core.rates ? `${fmt(core.rates.denominatorN)} in the single-bidder denominator` : 'single-bidder denominator not present in this build',
    `${fmt(p.distinctTenderIds)} distinct tender ids`,
    p.scrapedAt?.value ? `scraped ${p.scrapedAt.value}` : 'scrape date not yet a field (see verification finding)',
    `computed ${p.asOf}`,
  ];
  // Sticky within the section only: it is a child of the section's body, so it
  // releases where the registers begin. The facts flow inline so that on a phone the
  // band stays a few lines deep rather than one line per fact.
  return (
    <div className="sticky top-14 lg:top-0 z-20 bg-bg border-y border-border py-1 my-1.5 font-mono text-[10.5px] leading-snug text-text-secondary">
      {facts.map((f, i) => (
        <span key={i}>
          {i > 0 && (
            <span aria-hidden="true" className="text-text-muted">
              {' · '}
            </span>
          )}
          <span data-strip-fact={i + 1}>{f}</span>
        </span>
      ))}
    </div>
  );
}

const JUMPS: [string, string][] = [
  ['cppp-quality', 'Quality'],
  ['cppp-families', 'Families'],
  ['cppp-rates', 'Rates'],
  ['cppp-states', 'States'],
  ['cppp-bands', 'Bands and types'],
  ['cppp-timing', 'Timing'],
  ['cppp-redflags', 'Red flags'],
  ['cppp-concentration', 'Concentration'],
  ['cppp-sample', 'Sample'],
  ['cppp-gaps', 'Gaps'],
  ['cppp-provenance', 'Provenance'],
];

export function HeadChip() {
  return (
    <p className="text-[12.5px] leading-snug text-text-secondary">
      <TierChip tier="reported" /> <span>{TIER_CLAUSE}</span>
    </p>
  );
}

export function Verification({ core }: { core: CpppCore }) {
  const s = core.sample;
  if (!s) {
    return (
      <p className="text-[14px] leading-normal text-text-secondary">
        Verification: sample-verification.json is not present in this build, so the scrape’s agreement with the portal is unknown.
      </p>
    );
  }
  const checkable = checkableRows(s);
  const dates = [...new Set(s.rows.map((r) => r.fetch.fetchedAt.slice(0, 10)))];
  const allGone = s.pageGone === s.rows.length;
  return (
    <p className="text-[14px] leading-normal text-text-secondary max-w-[72ch]">
      Verification:{' '}
      <JumpLink id="cppp-sample">
        {fmt(checkable)} of {fmt(s.rows.length)} sampled rows
      </JumpLink>{' '}
      could be checked against the portal on {dates.join(' and ')}{' '}
      {allGone
        ? '(every stored link returned the portal’s “Invalid Url” page)'
        : `(${fmt(s.pageGone)} stored links returned the portal’s “Invalid Url” page)`}
      . Every figure below is dataset-only.
    </p>
  );
}

export function HeadBottom({ core, p, hideSearch }: { core: CpppCore; p: Provenance; hideSearch: string }) {
  const [status, copy] = useCopy();
  const line = sourceLine(p);
  return (
    <>
      <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-muted mt-2 mb-0.5">Read this first</h3>
      <p id="cppp-caveat" className="text-lg text-text-secondary max-w-[68ch] leading-relaxed">
        {core.rates?.caveat ?? 'rates.json is not present in this build; its caveat cannot be shown, and no rate is shown without it.'}
      </p>
      <p className={`${MONO_NOTE} mt-3 max-w-[72ch]`}>
        <span data-source-line>{line}</span>{' '}
        <button type="button" onClick={() => copy(line, 'Citation copied.')} className={`btn-ghost !px-2 !py-0.5 font-mono !text-[11px] ${FOCUS}`}>
          Copy citation
        </button>{' '}
        <span role="status" aria-live="polite">
          {status}
        </span>
      </p>
      <nav aria-label="In this section" className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11.5px] text-text-secondary">
        {JUMPS.map(([id, label]) => (
          <JumpLink key={id} id={id}>
            {label}
          </JumpLink>
        ))}
        <Link to={{ search: hideSearch }} replace className={`underline underline-offset-2 text-text-muted hover:text-accent ${FOCUS}`}>
          Hide the CPPP section
        </Link>
      </nav>
    </>
  );
}

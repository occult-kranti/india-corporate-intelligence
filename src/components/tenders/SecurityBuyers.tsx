import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSecurity, type SecurityFile } from '../../data/cppp';
import { FOCUS } from '../energy/hooks';
import { d1, fmt } from './ui';

/**
 * One cross-reference line between the whole-file rates and the security slice of the
 * same scrape (Phase H, plan Task 8). It gives the slice's size, its buyer classes and the
 * works class's share of its award decisions — counts only — and hands the reader to
 * /security?lens=procurement for the rates. No single-bidder rate is printed here: the
 * slice-wide rate is a works rate (one works buyer is three quarters of the decisions), and
 * a class rate needs its family, its Wilson interval, the same-portal rate and the
 * whole-file rate beside it, which the security page prints and this line cannot.
 *
 * The figures are read from security-page.json (the slim projection of security.json, with
 * no winner lists) at render; nothing here is hand-written. While the file is loading
 * nothing is drawn, and when the pipeline has not written it the line is absent: the
 * absence of the slice is reported on /security, not here, so that the national section
 * says nothing twice.
 */
export default function SecurityBuyers() {
  const [sec, setSec] = useState<SecurityFile | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    loadSecurity().then((s) => live && setSec(s));
    return () => { live = false; };
  }, []);
  if (!sec) return null;

  const dedup = sec.quality.afterDedup;
  const classes = sec.rates.byClass.length;
  const total = sec.quality.total.dedupRows;
  const works = sec.quality.byClass.find((c) => c.class === 'works') ?? null;
  // The works class's share of the slice's award decisions, computed here from the file's own counts.
  const worksPct = works && total > 0 ? Math.round((works.dedupRows / total) * 10000) / 100 : null;
  const asOf = sec.provenance.asOf ?? 'as-of date not stated in the file';

  return (
    <p data-security-buyers className="text-[14px] leading-normal text-text-secondary max-w-[72ch] mt-6">
      <strong className="font-semibold text-text">Security buyers in this scrape.</strong>{' '}
      {fmt(dedup.rows)} award rows after dedup ({d1(dedup.shareOfFileDedupRowsPct)}% of the file) have a buyer,
      department code or title that names a security body, in {classes} buyer classes
      {worksPct != null ? <>; the works class (MES and BRO) is {d1(worksPct)}% of the slice&apos;s {fmt(total)} award decisions, computed here</> : null}.
      Defence capital acquisition is not on CPPP and is not in it. Its single-bidder rates are read by buyer class, never
      for the slice as a whole, each with its interval, the same-portal and whole-file rates and its innocent reading,
      on{' '}
      <Link to="/security?lens=procurement" className={`underline underline-offset-2 hover:text-accent ${FOCUS}`}>
        the security page
      </Link>
      . Tier: reported, dataset-only; read to {asOf}.
    </p>
  );
}

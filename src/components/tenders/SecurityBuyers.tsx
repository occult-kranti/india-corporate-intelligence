import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSecurity, type SecurityFile } from '../../data/cppp';
import { FOCUS } from '../energy/hooks';
import { d1, fmt } from './ui';

/**
 * One cross-reference line between the whole-file rates and the security slice of the
 * same scrape (Phase H, plan Task 8). It states the slice's size and its single-bidder
 * rate beside the whole file's, says in the slice's own words what is not in it, and
 * hands the reader to /security?lens=procurement, where the slice is cut by buyer class
 * with each class's innocent reading beside it.
 *
 * The figures are read from security.json at render; nothing here is hand-written. While
 * the file is loading nothing is drawn, and when the pipeline has not written it the line
 * is absent: the absence of the slice is reported on /security, not here, so that the
 * national section says nothing twice.
 */
export default function SecurityBuyers() {
  const [sec, setSec] = useState<SecurityFile | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    loadSecurity().then((s) => live && setSec(s));
    return () => { live = false; };
  }, []);
  if (!sec) return null;

  const total = sec.rates.total;
  const exw = sec.rates.excludingWorks;
  const whole = total.wholeFile;
  const dedup = sec.quality.afterDedup;
  const classes = sec.headline.length;

  return (
    <p data-security-buyers className="text-[14px] leading-normal text-text-secondary max-w-[72ch] mt-6">
      <strong className="font-semibold text-text">Security buyers in this scrape.</strong>{' '}
      {fmt(dedup.rows)} award rows after dedup ({d1(dedup.shareOfFileDedupRowsPct)}% of the file) have a buyer,
      department code or title that names a security body, in {classes} buyer classes. Single bidding runs at{' '}
      {d1(total.singleBidderPct)}% over {fmt(total.n)} awards, {d1(exw.singleBidderPct)}% without the MES and BRO
      works class that dominates the slice, beside {d1(whole.singleBidderPct)}% for the whole file. Defence
      capital acquisition is not on CPPP and is not in it. The slice by buyer class, each beside its innocent
      reading, is on{' '}
      <Link to="/security?lens=procurement" className={`underline underline-offset-2 hover:text-accent ${FOCUS}`}>
        the security page
      </Link>
      . Tier: reported, dataset-only.
    </p>
  );
}

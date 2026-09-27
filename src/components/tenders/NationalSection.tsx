import { Suspense, lazy, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CPPP_PRESENT } from '../../data/cppp';
import { FOCUS } from '../energy/hooks';

/**
 * The national section's shell: the kicker and heading render at once, in the page's
 * own chunk, so a reader who follows the head link lands focus on a heading that
 * already exists. Everything else is the body chunk, loaded on demand.
 *
 * With the pipeline outputs absent the section says so and prints nothing else — no
 * rate, no table, no zero (spec §4, AC-04).
 */

const NationalBody = lazy(() => import('./NationalBody'));

export const ABSENT_SENTENCE = 'CPPP pipeline outputs not present in this build';

export default function NationalSection({ hideSearch }: { hideSearch: string }) {
  const h2 = useRef<HTMLHeadingElement>(null);
  const loc = useLocation();
  const arrived = (loc.state as { focusCppp?: boolean } | null)?.focusCppp === true;

  // The head link hands focus to the heading (U13): a screen reader cannot perceive a
  // scroll, so the jump is announced by where focus lands.
  useEffect(() => {
    if (!arrived || !h2.current) return;
    h2.current.focus({ preventScroll: true });
    h2.current.scrollIntoView({ block: 'start' });
  }, [arrived, loc.key]);

  return (
    <section aria-labelledby="cppp" className="pt-4 pb-4 border-b-2 border-border-light">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-text-muted mb-1">National · CPPP award scrape</p>
      <h2
        id="cppp"
        ref={h2}
        tabIndex={-1}
        className="heading-editorial font-bold text-xl sm:text-2xl text-balance mb-1 scroll-mt-16 lg:scroll-mt-4 focus:outline-none"
      >
        The CPPP award scrape — a different dataset from the registers below
      </h2>
      {CPPP_PRESENT ? (
        <Suspense
          fallback={
            <p data-pending className="font-mono text-[11px] text-text-muted py-6">
              The CPPP section is loading.
            </p>
          }
        >
          <NationalBody hideSearch={hideSearch} />
        </Suspense>
      ) : (
        <div className="py-4 space-y-3">
          <p data-nodata className="text-[15px] leading-relaxed text-text-secondary max-w-[70ch]">
            {ABSENT_SENTENCE}. The section reads research/raw/cppp/, written by the offline pipeline
            (scripts/cppp/build.py); without it there is nothing to state, and nothing is estimated in its place.
          </p>
          <Link to={{ search: hideSearch }} replace className={`font-mono text-[11px] underline underline-offset-2 ${FOCUS}`}>
            Hide the CPPP section
          </Link>
        </div>
      )}
    </section>
  );
}

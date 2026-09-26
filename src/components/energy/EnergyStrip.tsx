/**
 * The sticky denominator strip for /energy.
 *
 * Its own component rather than Domain's DenominatorStrip because every fact here
 * carries its spec number (`data-strip-fact`) and its own visibility per width — the
 * phone keeps claims, answered allegations and voids; the rest fold away there, never
 * the "filtered" chip.
 */

export interface StripFact {
  id: number;
  text: string;
  /** Tailwind visibility classes; empty = always shown. */
  show?: string;
}

export default function EnergyStrip({
  facts,
  asOf,
  filtered,
}: {
  facts: StripFact[];
  asOf: string;
  filtered: { from: number; to: number } | null;
}) {
  return (
    // Inert to the pointer: it holds no control, and while it floats over the canvas it
    // must not swallow a click meant for a claim scrolled beneath it.
    <div className="sticky top-0 z-20 py-2 bg-bg/95 border-b border-border-light pointer-events-none">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[11px] text-text-secondary tabular-nums">
        {facts.map((f) => (
          <span key={f.id} data-strip-fact={f.id} className={f.show ?? ''}>
            {f.text}
          </span>
        ))}
        {/* Never hidden (spec §5.2): unfiltered, "N → N" is itself the statement that
            nothing is hidden. Amber only while a filter removes something. Below 640 the
            unfiltered chip reads "unfiltered" — the same statement in half the width — so
            the strip stays on two lines and does not push the canvas below a phone's fold. */}
        {filtered &&
          (filtered.from !== filtered.to ? (
            <span className="text-amber">
              filtered {filtered.from} → {filtered.to}
            </span>
          ) : (
            <span className="text-text-muted">
              <span className="max-sm:hidden">
                filtered {filtered.from} → {filtered.to}
              </span>
              <span className="sm:hidden">unfiltered</span>
            </span>
          ))}
        <span className="text-text-muted ml-auto">as of {asOf}</span>
      </div>
    </div>
  );
}

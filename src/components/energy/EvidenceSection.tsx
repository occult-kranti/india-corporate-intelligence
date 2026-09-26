import type { ReactNode } from 'react';
import { FOCUS } from './hooks';

/**
 * Every section below the stage. The type system requires a denominator and a
 * "What this cannot show" block, so neither can be left out, and the render order
 * is fixed: title · denominator · content · what it cannot show · show in the graph.
 *
 * The limit is set at 14px — the size of findings — and is never collapsed, on any
 * width. A limitation in 11px grey at the foot of a section is an argument, not a
 * document.
 */
export default function EvidenceSection({
  id,
  title,
  denominator,
  cannotShow,
  ask,
  children,
}: {
  id: string;
  title: string;
  denominator: ReactNode;
  cannotShow: ReactNode;
  ask?: { label: string; effect: { from: number; to: number }; onAsk: () => void };
  children: ReactNode;
}) {
  return (
    <section id={id} className="pt-12 [overflow-wrap:anywhere]">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-1">{title}</h2>
      <div data-denominator="" className="font-mono text-[11px] text-text-muted tracking-wide mb-6 leading-relaxed whitespace-pre-line">
        {denominator}
      </div>
      {children}
      <CannotShow>{cannotShow}</CannotShow>
      {ask && (
        <button type="button" onClick={ask.onAsk} className={`btn-ghost mt-4 !text-[13px] ${FOCUS}`}>
          Show in the graph: {ask.label} — <span data-effect="">{ask.effect.from} → {ask.effect.to} claims</span>
        </button>
      )}
    </section>
  );
}

export function CannotShow({ children }: { children: ReactNode }) {
  return (
    <div data-cannot-show="" className="border-l-2 border-amber/50 pl-3 mt-6 text-[14px] text-text-secondary leading-relaxed max-w-[72ch]">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber mb-1">What this cannot show</p>
      <p>{children}</p>
    </div>
  );
}

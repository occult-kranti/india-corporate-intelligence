import type { ReactNode } from 'react';
import { TIERS, type Tier } from '../graph/schema';

/** Shared editorial primitives. The long-form pages are documents, not dashboards. */

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-text-muted mb-4">{children}</p>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="heading-editorial font-bold text-3xl sm:text-4xl lg:text-[2.9rem] text-balance mb-4">{children}</h1>
  );
}

export function Standfirst({ children }: { children: ReactNode }) {
  return <p className="text-lg text-text-secondary max-w-[68ch] leading-relaxed">{children}</p>;
}

export function Byline({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] text-text-muted mt-5 tracking-wide">{children}</p>;
}

export function Section({ id, title, note, children }: { id?: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} className="pt-12">
      <h2 className="heading-editorial font-bold text-2xl border-b border-border-light pb-2.5 mb-1">{title}</h2>
      {note && <p className="font-mono text-[11px] text-text-muted tracking-wide mb-6">{note}</p>}
      {!note && <div className="mb-6" />}
      {children}
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-4 max-w-[70ch] text-[15.5px] leading-[1.72] text-text-secondary">{children}</div>;
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="text-text text-[16.5px] leading-[1.7] max-w-[70ch]">{children}</p>;
}

const VERDICT_STYLE: Record<string, string> = {
  bottomline: 'border-accent/40 bg-accent/[0.06]',
  warn: 'border-rose/40 bg-rose/[0.07]',
  note: 'border-border-light bg-bg-elevated',
  good: 'border-sage/40 bg-sage/[0.06]',
};

export function Callout({
  label,
  tone = 'note',
  children,
}: {
  label: string;
  tone?: keyof typeof VERDICT_STYLE;
  children: ReactNode;
}) {
  return (
    <div className={`border rounded-lg overflow-hidden my-6 ${VERDICT_STYLE[tone]}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] px-4 py-2 border-b border-border text-text-muted">
        {label}
      </div>
      <div className="px-4 py-4 space-y-3 text-[15px] leading-relaxed text-text-secondary max-w-[70ch]">{children}</div>
    </div>
  );
}

const TIER_CLASS: Record<Tier, string> = {
  documented: 'text-sage border-sage/50 bg-sage/10',
  reported: 'text-blue border-blue/50 bg-blue/10',
  alleged: 'text-amber border-amber/50 bg-amber/10',
  analytic: 'text-text-muted border-border-light bg-bg-elevated',
};

export function TierChip({ tier, title }: { tier: Tier; title?: boolean }) {
  return (
    <span
      title={title === false ? undefined : TIERS[tier].bar}
      className={`inline-block font-mono text-[9.5px] uppercase tracking-[0.12em] px-1.5 py-0.5 border rounded ${TIER_CLASS[tier]}`}
    >
      {TIERS[tier].label}
    </span>
  );
}

export function TierLegend() {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 my-6">
      {(Object.keys(TIERS) as Tier[]).map((t) => (
        <div key={t} className="flex gap-3 items-start border border-border rounded-lg p-3 bg-bg-elevated/60">
          <svg width="34" height="14" className="mt-1 flex-shrink-0" aria-hidden>
            <line
              x1="1"
              y1="7"
              x2="33"
              y2="7"
              stroke="currentColor"
              className={TIER_CLASS[t].split(' ')[0]}
              strokeWidth="1.6"
              strokeDasharray={TIERS[t].dash || undefined}
            />
          </svg>
          <div>
            <TierChip tier={t} title={false} />
            <p className="text-[12.5px] text-text-muted mt-1.5 leading-snug">{TIERS[t].bar}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatGrid({ items }: { items: { value: string; label: string; tone?: 'accent' | 'rose' | 'sage' | 'amber' | 'muted' }[] }) {
  const tone = { accent: 'text-accent', rose: 'text-rose', sage: 'text-sage', amber: 'text-amber', muted: 'text-text-muted' };
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 my-7">
      {items.map((s) => (
        <div key={s.label} className="border-t-2 border-border-light pt-3">
          <p className={`font-mono text-[clamp(1.5rem,4vw,2.2rem)] leading-none font-semibold ${tone[s.tone ?? 'accent']}`}>
            {s.value}
          </p>
          <p className="text-[13px] text-text-muted mt-2 leading-snug">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/** The WCAG-clean twin of every graphic. Keep it in sync with the visual. */
export function DataTable({
  columns,
  rows,
  caption,
}: {
  columns: string[];
  rows: ReactNode[][];
  caption?: string;
}) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 my-5">
      <table className="w-full border-collapse text-[14px] min-w-[34rem]">
        {caption && <caption className="text-left font-mono text-[11px] text-text-muted pb-2">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="text-left font-mono text-[10px] uppercase tracking-[0.11em] text-text-muted border-b border-border-light pb-2 pr-4 font-medium"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((cell, j) => (
                <td key={j} className="border-b border-border py-3 pr-4 text-text-secondary">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Cite({ srcs }: { srcs?: [string, string][] }) {
  if (!srcs?.length) return null;
  return (
    <p className="font-mono text-[10.5px] text-text-muted mt-2 leading-relaxed">
      {srcs.map(([label, url], i) => (
        <span key={url + i}>
          {i > 0 && ' · '}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-accent">
            {label}
          </a>
        </span>
      ))}
    </p>
  );
}

export function Footnote({ children }: { children: ReactNode }) {
  return (
    <footer className="mt-16 pt-6 border-t-2 border-border-light font-mono text-[11px] text-text-muted leading-[1.8] space-y-3 max-w-[74ch]">
      {children}
    </footer>
  );
}

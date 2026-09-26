import type { Narrative, NarrativeStatus } from '../../graph/fleet';
import { byText } from '../../data/welfareView';
import { Src, Verbatim } from './ui';

/**
 * Six fixed rungs, every one drawn — an empty rung reads "none in this file", because
 * a ladder that hides its empty rungs tells the reader the scale is shorter than it is.
 * All rungs are one colour: the rating is the file's judgement of evidence, and a hue
 * would turn it into a verdict on the people the narrative is about.
 */
export const RUNGS: NarrativeStatus[] = ['established', 'well-supported', 'contested', 'speculative', 'unsupported', 'debunked'];

export default function NarrativeLadder({ rows }: { rows: Narrative[] }) {
  return (
    <ol className="space-y-6">
      {RUNGS.map((rung) => {
        const list = rows.filter((n) => n.status === rung).sort((a, b) => byText(a.claim, b.claim));
        return (
          <li key={rung}>
            <h3 className="font-mono text-[13px] text-text-secondary border-b border-border pb-1">{`${rung} (${list.length})`}</h3>
            {!list.length && <p className="text-[14px] text-text-muted mt-2">none in this file</p>}
            <ul className="space-y-4 mt-3">
              {list.map((n, i) => (
                <li key={i} className="border border-border rounded-lg overflow-hidden">
                  <p className="px-4 py-2.5 text-[15px] text-text bg-bg-elevated"><Verbatim>{n.claim}</Verbatim></p>
                  <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                    <div className="p-4">
                      <h4 className="font-mono text-[12px] text-text-muted mb-1">Strongest case</h4>
                      <p className="text-[14px] text-text-secondary leading-relaxed">{n.strongestCase ? <Verbatim>{n.strongestCase}</Verbatim> : 'not stated'}</p>
                    </div>
                    <div className="p-4">
                      <h4 className="font-mono text-[12px] text-text-muted mb-1">Strongest counter</h4>
                      <p className="text-[14px] text-text-secondary leading-relaxed">{n.strongestCounter ? <Verbatim>{n.strongestCounter}</Verbatim> : 'not stated'}</p>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 border-t border-border">
                    <h4 className="font-mono text-[12px] text-text-muted mb-1">What would change this</h4>
                    <p className="text-[14px] text-text-secondary">{n.whatWouldChangeThis ? <Verbatim>{n.whatWouldChangeThis}</Verbatim> : 'not stated'}</p>
                    <p className="mt-2"><Src srcs={n.srcs} /></p>
                    <p className="font-mono text-[12px] text-text-muted mt-1">{`research file: ${n.domain}`}</p>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

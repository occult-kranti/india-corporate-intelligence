import type { ReadableLabelReport } from './readable-label-layout';

const digits = (maximum: number) => String(Math.max(0, maximum)).length;
function Count({ value, maximum }: { value: number | string; maximum: number }) {
  return <span className="cw-label-status-count" style={{ inlineSize: `${digits(maximum)}ch` }}>{value}</span>;
}
/** The hidden sizing copy and every ready message have identical numeric slots.
 * Pending/ready publication changes cannot change this shell's block size. */
export function ReadableLabelStatus({ report, nodeMaximum, roleMaximum }: {
  report: ReadableLabelReport | null; nodeMaximum: number; roleMaximum: number;
}) {
  const ready = report?.status === 'ready', allMaximum = nodeMaximum + roleMaximum;
  const explanation = (reserve: boolean) => {
    const items = report ? [...report.deferredNodes, ...report.deferredRoles] : [];
    const count = (value: number, maximum: number) => <Count value={reserve ? '8'.repeat(digits(maximum)) : value} maximum={maximum}/>;
    return <>{count(report?.deferredNodes.length ?? 0, nodeMaximum)} node labels and {count(report?.deferredRoles.length ?? 0, roleMaximum)} relation labels are listed in Complete reader: {count(items.filter(item => item.reason === 'outside-view').length, allMaximum)} outside this view; {count(items.filter(item => item.reason === 'crowded').length, allMaximum)} deferred to prevent overlap. Use Fit case to show all nodes, or Complete reader for every full name and source.</>;
  };
  return <div className="cw-label-status" data-case-label-status="" aria-label="Case label visibility">
    <p className="cw-label-status-reserve" aria-hidden="true">{explanation(true)}</p>
    <p className="cw-label-status-live" role="status" data-case-label-notice={ready ? '' : undefined}
      data-case-deferred-node-count={ready ? report.deferredNodes.length : undefined}
      data-case-deferred-role-count={ready ? report.deferredRoles.length : undefined}>
      {ready ? explanation(false) : 'Label layout is updating. Fit case and Complete reader remain available above.'}
    </p>
  </div>;
}

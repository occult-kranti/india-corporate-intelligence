import type { ProgramSource } from '../../data/researchProgramSchema';

export function ProgramSources({ ids, sources }: { ids: readonly string[]; sources: readonly ProgramSource[] }) {
  const selected = sources.filter(source => ids.includes(source.id));
  return <div className="rp-sources"><p className="rp-meta">{selected.length} cited records · {new Set(selected.map(source => source.sourceFamily)).size} source families. Family labels disclose dependence; they do not certify independence.</p>
    {selected.map(source => <details key={source.id} className="rp-source"><summary><span>{source.title}</span><small>{source.publisher} · {source.accessDepth}</small></summary>
      <p><a href={source.url} target="_blank" rel="noreferrer">Open original source ↗</a></p>
      {source.accessNotes && <p className="rp-meta">Read scope: {source.accessNotes}</p>}
      {source.locator && <p className="rp-meta">Source locator: {source.locator}</p>}
      {source.sha256 && <p className="rp-meta">Retained-file SHA-256 receipt: <code>{source.sha256}</code>{source.bytes !== undefined && <> · {source.bytes.toLocaleString()} bytes</>}<br />The receipt identifies retained bytes; it does not independently authenticate the publisher or a claim.</p>}
      <dl><dt>Supports</dt><dd>{source.supports}</dd><dt>Limits</dt><dd>{source.limitations}</dd><dt>Provenance</dt><dd>{source.sourceType} · family: {source.sourceFamily}<br />Published: {source.publishedAt ?? 'not specified'} · accessed: {source.accessedAt}<br /><code>{source.id}</code></dd></dl>
    </details>)}
  </div>;
}

export function TextList({ items }: { items: readonly string[] }) { return <ul>{items.map((item, i) => <li key={`${i}-${item}`}>{item}</li>)}</ul>; }

export function downloadProgramJson(name: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

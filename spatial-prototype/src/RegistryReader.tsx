import { sourceCorrection, presentationCorrection, sourceCitationCorrection, presentationTitle, presentationSummary, presentationTier } from "./sourceCorrections";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import type { PreviewData } from "./model";
import { originalRoute, safeSourceUrl } from "./navigation";
import { ReaderCollections } from "./ReaderCollections";
import { restoreReaderStart } from "./readerPagination";
const PAGE_SIZE = 40;
type View = "items" | "relationships" | "sources" | "held";
const normal = (value: string) =>
  value.normalize("NFKC").toLocaleLowerCase("en-IN");
interface Props {
  dataset?: "full" | "preview";
  scene: PreviewData;
  selected: string;
  query: string;
  namespace: string;
  onSelect: (id: string, kind: "node" | "edge") => void;
}
/** Pagination changes only the DOM page; the source-preserving registry remains complete. */
export default function RegistryReader({
  dataset = "preview",
  scene,
  selected,
  query,
  namespace,
  onSelect,
}: Props) {
  const [view, setView] = useState<View>("items");
  const sources = useMemo(
    () => new Map(scene.registry.sources.map((s) => [s.id, s])),
    [scene.registry],
  );
  const [page, setPage] = useState(0);
  const heldIds = useMemo(
    () => new Set(scene.registry.held.map((r) => r.id)),
    [scene.registry],
  );
  const rows = useMemo(() => {
    const terms = normal(query).split(/\s+/u).filter(Boolean);
    const matches = (row: { namespace: string }, text: string) =>
      (!namespace || row.namespace === namespace) &&
      terms.every((t) => normal(text).includes(t));
    return {
      items: scene.nodes,
      relationships: scene.edges,
      sources: scene.registry.sources.filter((r) =>
        matches(r, [r.id, r.title, r.publisher, r.summary, r.url].join(" ")),
      ),
      held: scene.registry.held.filter((r) =>
        matches(r, [r.id, r.kind, r.reason].join(" ")),
      ),
    };
  }, [scene, query, namespace]);
  useEffect(() => setPage(0), [view, scene, query, namespace]);
  const total = rows[view].length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const resultRange = useRef<HTMLParagraphElement>(null);
  const pageNavigation = useRef(false);
  const changePage = (next: number) => {
    pageNavigation.current = true;
    setPage(next);
  };
  useEffect(() => {
    if (!pageNavigation.current) return;
    pageNavigation.current = false;
    restoreReaderStart(resultRange.current);
  }, [current]);
  const slice = <T,>(values: T[]) =>
    values.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  return (
    <div
      className="registry-reader"
      data-reader-view={view}
      data-result-count={total}
    >
      <div className="reader-tabs" aria-label="Registry sections">
        {(["items", "relationships", "sources", "held"] as View[]).map(
          (key) => (
            <button
              key={key}
              aria-pressed={view === key}
              onClick={() => setView(key)}
            >
              {key === "items"
                ? "Entities & records"
                : key === "held"
                  ? "Held review queue"
                  : key[0].toUpperCase() + key.slice(1)}{" "}
              <span>{rows[key].length.toLocaleString()}</span>
            </button>
          ),
        )}
      </div>
      {view === "sources" && dataset === "full" && <ReaderCollections />}
      {view === "held" && (
        <p className="notice">
          These retained review entries are excluded from the factual map. Their
          proposed links are not accepted relationships. Some retained responses
          are readable as counter-context.
        </p>
      )}
      {(view === "sources" || view === "held") && (
        <p className="small-copy">
          Search and subject filters apply. Time and facet lenses apply to
          evidence items and relationships, not to this source/review catalogue.
        </p>
      )}
      <p
        ref={resultRange}
        tabIndex={-1}
        className="reader-result-count"
        aria-live="polite"
      >
        {total
          ? `${current * PAGE_SIZE + 1}–${Math.min(total, (current + 1) * PAGE_SIZE)} of ${total.toLocaleString()}`
          : "No matching entries"}
      </p>
      <div className="record-grid" id="record-list">
        {view === "items" &&
          slice(rows.items).map((node) => (
            <button
              key={node.id}
              data-record-id={node.id}
              data-held={
                !!sourceCorrection(node.id) || heldIds.has(node.id) ||
                ("status" in node.item && node.item.status === "not-drawn")
              }
              className={
                selected === node.id ? "reading-card active" : "reading-card"
              }
              onClick={() => onSelect(node.id, "node")}
            >
              <span className="eyebrow">
                {sourceCorrection(node.id) ? "SOURCE CORRECTION · READER ONLY" : heldIds.has(node.id)
                  ? "HELD · READING CONTEXT ONLY"
                  : node.kind}{" "}
                · {new Set(node.item.sourceIds).size} source references
              </span>
              <h3>{node.title}</h3>
              <p>{presentationSummary(node.item)}</p>
              {presentationCorrection(node.id) && <p className="notice">{presentationCorrection(node.id)?.interpretationNotice}</p>}
              <span>
                Inspect evidence <ArrowRight size={15} />
              </span>
            </button>
          ))}
        {view === "relationships" &&
          slice(rows.relationships).map((edge) => (
            <button
              key={edge.id}
              data-record-id={edge.id}
              data-held={!!sourceCorrection(edge.id) || heldIds.has(edge.id)}
              className={
                selected === edge.id ? "reading-card active" : "reading-card"
              }
              onClick={() => onSelect(edge.id, "edge")}
            >
              <span className="eyebrow">
                {presentationTier(edge.relationship)} · {edge.sourceCount} distinct source
                IDs
              </span>
              <h3>{presentationTitle(edge.relationship)}</h3>
              <p>{presentationSummary(edge.relationship)}</p>
              <span>
                Read directed relationship <ArrowRight size={15} />
              </span>
            </button>
          ))}
        {view === "sources" &&
          slice(rows.sources).map((source) => (
            <article
              className="reading-card source-catalogue-card"
              key={source.id}
              data-source-id={source.id}
            >
              <span className="eyebrow">
                {source.tier} · {source.namespace}
              </span>
              <h3>
                <a
                  href={safeSourceUrl(source.url) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {sourceCitationCorrection(source.id)?.sourceTitle ?? source.title} <ExternalLink size={14} />
                </a>
              </h3>
              <p>
                {source.publisher} · {source.publishedAt ?? "Date unknown"}
              </p>
              <p>{source.summary}</p>
              {sourceCitationCorrection(source.id) ? <p className="notice">{sourceCitationCorrection(source.id)?.sourceDateNotice}</p> : null}
              <details>
                <summary>Source locator and limitations</summary>
                <p>{source.locator}</p>
                <p>{source.id}</p>
                <ul>
                  {source.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        {view === "held" &&
          slice(rows.held).map((row) => (
            <article
              className="reading-card held-card"
              key={row.id}
              data-held-id={row.id}
            >
              <span className="eyebrow">
                HELD · {row.kind} · {row.namespace}
              </span>
              <h3>{row.id}</h3>
              <p>{row.reason}</p>
              {scene.registry.records.some((r) => r.id === row.id) && (
                <button onClick={() => onSelect(row.id, "node")}>
                  Read retained counter-context
                </button>
              )}
              <details className="held-citations">
                <summary>
                  Retained citations ({new Set(row.sourceIds).size})
                </summary>
                {row.sourceIds.length ? (
                  [...new Set(row.sourceIds)].map((id) => {
                    const source = sources.get(id);
                    return source ? (
                      <article key={id}>
                        <a
                          href={safeSourceUrl(source.url) ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {sourceCitationCorrection(source.id)?.sourceTitle ?? source.title} <ExternalLink size={14} />
                        </a>
                        <p>
                          {source.publisher} ·{" "}
                          {source.publishedAt ?? "Publication date unknown"}
                        </p>
                        <p>{source.locator}</p>
                        <small>{id}</small>
                        {source.limitations.map((limit, i) => (
                          <p key={i}>{limit}</p>
                        ))}
                      </article>
                    ) : (
                      <p key={id}>
                        Retained source ID {id}; no matching source object is
                        available in this snapshot.
                      </p>
                    );
                  })
                ) : (
                  <p>No direct citation is retained on this held entry.</p>
                )}
              </details>
              <a href={originalRoute(row.route)}>
                Original review context <ExternalLink size={14} />
              </a>
            </article>
          ))}
      </div>
      <nav className="reader-pagination" aria-label="Result pages">
        <button
          disabled={current === 0}
          onClick={() => changePage(current - 1)}
        >
          <ArrowLeft size={16} /> Previous page
        </button>
        <span>
          Page {current + 1} of {pages}
        </span>
        <button
          disabled={current + 1 >= pages}
          onClick={() => changePage(current + 1)}
        >
          Next page <ArrowRight size={16} />
        </button>
      </nav>
    </div>
  );
}

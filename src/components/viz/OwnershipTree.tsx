import { useMemo, useState } from 'react';

/**
 * An indented ownership tree with a depth control.
 *
 * WHY THIS REPLACES A FORCE GRAPH. A group structure is a strict hierarchy — 220
 * Adani entities across four levels, 60 Reliance entities across three. Depth is the
 * only structure such data has, and force layout is the single encoding that destroys
 * it: it optimises for edge length and node separation, both of which are meaningless
 * here, and it renders a tree as a hairball in which a step-down SPV and the group
 * flagship are visually interchangeable.
 *
 * An indented tree makes depth the primary axis, which is the actual question a reader
 * has — how far is this entity from the listed parent, and what sits between them.
 *
 * The force graph is kept for genuinely sparse cross-group relations, where topology
 * IS the content. See docs/MASTER_PLAN.md §3.
 */

export interface TreeEntity {
  id: string;
  name: string;
  /** listed / subsidiary / spv / jv / trust / unlisted. Rendered as a glyph, not a colour. */
  kind: string;
  parent: string | null;
  sector?: string;
  status?: string;
  nse?: string | null;
  cin?: string | null;
  mcapCr?: number | null;
  incorporated?: string | null;
  hqCity?: string | null;
}

interface TreeNode {
  entity: TreeEntity;
  depth: number;
  children: TreeNode[];
  /** Entities at or below this node, including itself. */
  subtreeSize: number;
}

/**
 * Kind is encoded as a monospace glyph rather than a hue, for two reasons: hue is
 * already spoken for by node family across the platform, and a glyph survives
 * greyscale and screenshotting. A joint venture is structurally different from a
 * wholly-owned SPV and the reader should not have to consult a colour key.
 */
const KIND_GLYPH: Record<string, { g: string; title: string }> = {
  listed: { g: '◆', title: 'Listed company' },
  unlisted: { g: '◇', title: 'Unlisted company' },
  subsidiary: { g: '●', title: 'Subsidiary' },
  spv: { g: '○', title: 'Special-purpose vehicle' },
  jv: { g: '◐', title: 'Joint venture — not wholly owned' },
  trust: { g: '▣', title: 'Trust' },
};

function buildForest(entities: TreeEntity[]): { roots: TreeNode[]; maxDepth: number } {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const childrenOf = new Map<string, TreeEntity[]>();
  const roots: TreeEntity[] = [];

  for (const e of entities) {
    // A parent id that is not in the dataset is treated as a root and NOT silently
    // dropped — an entity vanishing because its parent was out of scope is exactly
    // the kind of quiet loss that makes a count wrong.
    if (e.parent && byId.has(e.parent)) {
      if (!childrenOf.has(e.parent)) childrenOf.set(e.parent, []);
      childrenOf.get(e.parent)!.push(e);
    } else {
      roots.push(e);
    }
  }

  let maxDepth = 0;
  const seen = new Set<string>();
  const build = (e: TreeEntity, depth: number): TreeNode => {
    maxDepth = Math.max(maxDepth, depth);
    seen.add(e.id);
    const kids = (childrenOf.get(e.id) ?? [])
      .filter((c) => !seen.has(c.id)) // cycle guard: a holding loop must not hang the page
      .sort((a, b) => (b.mcapCr ?? 0) - (a.mcapCr ?? 0) || a.name.localeCompare(b.name))
      .map((c) => build(c, depth + 1));
    return {
      entity: e,
      depth,
      children: kids,
      subtreeSize: 1 + kids.reduce((s, k) => s + k.subtreeSize, 0),
    };
  };

  const forest = roots
    .sort((a, b) => (b.mcapCr ?? 0) - (a.mcapCr ?? 0) || a.name.localeCompare(b.name))
    .map((r) => build(r, 0));
  return { roots: forest, maxDepth };
}

function flatten(nodes: TreeNode[], maxDepth: number, collapsed: Set<string>): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    out.push(n);
    if (n.depth >= maxDepth || collapsed.has(n.entity.id)) return;
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

export default function OwnershipTree({
  entities,
  onSelect,
  selected,
}: {
  entities: TreeEntity[];
  onSelect?: (id: string) => void;
  selected?: string | null;
}) {
  const { roots, maxDepth } = useMemo(() => buildForest(entities), [entities]);
  const [depthLimit, setDepthLimit] = useState(maxDepth);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => flatten(roots, depthLimit, collapsed),
    [roots, depthLimit, collapsed],
  );

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const depthCounts = useMemo(() => {
    const c: number[] = [];
    const walk = (n: TreeNode) => {
      c[n.depth] = (c[n.depth] ?? 0) + 1;
      n.children.forEach(walk);
    };
    roots.forEach(walk);
    return c;
  }, [roots]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted">
          depth
        </span>
        {Array.from({ length: maxDepth + 1 }, (_, d) => (
          <button
            key={d}
            onClick={() => setDepthLimit(d)}
            className={`font-mono text-[11px] px-2 py-0.5 rounded border transition-colors ${
              depthLimit === d
                ? 'border-accent text-accent'
                : 'border-border text-text-muted hover:border-border-light'
            }`}
            title={`${depthCounts[d] ?? 0} entities at this level`}
          >
            {d === 0 ? 'roots' : `+${d}`}
            <span className="text-text-muted ml-1.5">{depthCounts[d] ?? 0}</span>
          </button>
        ))}
        <span className="font-mono text-[10.5px] text-text-muted ml-auto tabular-nums">
          showing {visible.length} of {entities.length}
        </span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="max-h-[560px] overflow-y-auto">
          {visible.map((n) => {
            const e = n.entity;
            const glyph = KIND_GLYPH[e.kind] ?? { g: '·', title: e.kind };
            const hasKids = n.children.length > 0;
            const isCollapsed = collapsed.has(e.id);
            const dimmed = e.status && e.status !== 'active';
            return (
              <div
                key={e.id}
                className={`flex items-baseline gap-2 px-3 py-1.5 border-b border-border/60 text-[13px] hover:bg-bg-card-hover transition-colors ${
                  selected === e.id ? 'bg-accent/[0.07]' : ''
                }`}
                style={{ paddingLeft: `${12 + n.depth * 22}px` }}
              >
                {/* The rail makes depth countable without measuring indentation. */}
                {hasKids && n.depth < depthLimit ? (
                  <button
                    onClick={() => toggle(e.id)}
                    className="font-mono text-[10px] text-text-muted w-3 shrink-0 hover:text-accent"
                    aria-label={isCollapsed ? `Expand ${e.name}` : `Collapse ${e.name}`}
                  >
                    {isCollapsed ? '▸' : '▾'}
                  </button>
                ) : (
                  <span className="w-3 shrink-0" />
                )}
                <span
                  className="font-mono text-[11px] text-text-muted shrink-0"
                  title={glyph.title}
                  aria-label={glyph.title}
                >
                  {glyph.g}
                </span>
                <button
                  onClick={() => onSelect?.(e.id)}
                  className={`text-left ${dimmed ? 'text-text-muted line-through decoration-text-muted/40' : 'text-text'} hover:text-accent`}
                >
                  {e.name}
                </button>
                {e.nse && (
                  <span className="font-mono text-[9.5px] text-accent tracking-wide shrink-0">
                    {e.nse}
                  </span>
                )}
                {isCollapsed && n.subtreeSize > 1 && (
                  <span className="font-mono text-[10px] text-text-muted shrink-0">
                    +{n.subtreeSize - 1}
                  </span>
                )}
                <span className="ml-auto flex items-baseline gap-3 shrink-0">
                  {e.sector && (
                    <span className="text-[11.5px] text-text-muted hidden md:inline max-w-[180px] truncate">
                      {e.sector}
                    </span>
                  )}
                  {e.mcapCr != null && (
                    <span className="font-mono text-[10.5px] text-text-muted tabular-nums">
                      ₹{Math.round(e.mcapCr).toLocaleString('en-IN')} cr
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="font-mono text-[10px] text-text-muted mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(KIND_GLYPH).map(([k, v]) => (
          <span key={k}>
            {v.g} {k}
          </span>
        ))}
        <span className="text-text-muted">· struck through = not active</span>
      </p>
    </div>
  );
}

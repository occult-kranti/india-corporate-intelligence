import { SOURCE_SHA256, SOURCE_BYTES, COMPONENT_NAMES, ACCOUNTING, admitBytes, readAdmitted, readComponent, pointerChild, selectRecord } from './contract.ts';
import type { Admission, Component, Json, JsonObject, Primitive, SelectionRequest } from './contract.ts';

export type LinkDecision = Readonly<{ enabled: boolean; reason: string }>;
const SOURCE_HOSTS = Object.freeze([
  'www.justice.gov', 'www.nysd.uscourts.gov', 'www.govinfo.gov', 'www.supremecourt.gov',
  'www.viport.com', 'dof.vi.gov', 'usvidoj.com', 'oversight.house.gov', 'www.dfs.ny.gov',
  'legvi.org', 'oig.justice.gov', 'www.federalregister.gov', 'public-inspection.federalregister.gov',
]);
/** Navigation policy only. Never fetches; does not assert source authenticity. */
export function assessLink(raw: string): LinkDecision {
  const deny = (reason: string) => Object.freeze({ enabled: false, reason: `Link disabled: ${reason}. Original text retained.` });
  if (!raw.startsWith('https://')) return deny('only explicit HTTPS source URLs are supported');
  if (/[\s\u0000-\u001f\u007f-\u009f\\]/u.test(raw) || /%(?:00|0a|0d)/iu.test(raw)) return deny('whitespace, control characters or backslashes are unsupported');
  if (/%(?![\da-f]{2})/iu.test(raw)) return deny('malformed percent encoding');
  let url: URL;
  try { url = new URL(raw); } catch { return deny('malformed URL'); }
  if (url.username || url.password) return deny('credentials in a URL are unsupported');
  if (url.port || !SOURCE_HOSTS.includes(url.hostname)) return deny('host or port is outside the explicit source-navigation allowlist');
  return Object.freeze({ enabled: true, reason: 'User-activated source navigation only; eligibility does not authenticate the source or its claims.' });
}
export function escapeHTML(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
/** Isolated link presentation helper, not a source-packet rendering entry point. */
export function renderLinkLiteral(raw: string): string {
  const link = assessLink(raw);
  const literal = `<code class="value" data-source-value="true">${escapeHTML(JSON.stringify(raw))}</code>`;
  return link.enabled
    ? `<a class="source-link" href="${escapeHTML(raw)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${literal}</a><span class="link-note">${escapeHTML(link.reason)}</span>`
    : `${literal}<span class="link-disabled" role="note" aria-disabled="true">${escapeHTML(link.reason)}</span>`;
}
export type FieldNode = Readonly<{
  path: string;
  anchor: string;
  label: string;
  ordinal: number;
  component: Component | 'cumulative';
  kind: 'object' | 'array' | 'null' | 'string' | 'number' | 'boolean';
  semanticRole: string;
  sourceRole: string | null;
  value?: Primitive;
  children: readonly FieldNode[];
  link?: LinkDecision;
}>;
export function anchorFor(path: string): string {
  // UTF-8 hex is injective; root uses a distinct suffix. No lossy ID sanitization.
  return path === '' ? 'field-root' : `field-${Array.from(new TextEncoder().encode(path), b => b.toString(16).padStart(2, '0')).join('')}`;
}
function componentAt(path: string): Component | 'cumulative' {
  if (path === '/baseline' || path.startsWith('/baseline/')) return 'baseline';
  const match = /^\/extensions\/([0-4])(?:\/|$)/u.exec(path);
  return match ? COMPONENT_NAMES[Number(match[1]) + 1] : 'cumulative';
}
function semanticRole(path: string, value: Json): string {
  if (path === '') return 'cumulative envelope';
  if (path === '/baseline') return 'baseline component';
  if (/^\/extensions\/[0-4]$/u.test(path)) return `${componentAt(path)} component`;
  const match = /\/(milestones|procedural_relations|retained_context|review_qualifying_observations|nodes|sources)(?:\/(\d+))?$/u.exec(path);
  if (match) {
    const names: Record<string, string> = { milestones: 'milestone', procedural_relations: 'procedural relation', retained_context: 'retained context (separate from milestones)', review_qualifying_observations: 'review observation (separate from milestones)', nodes: 'source-scoped endpoint node', sources: /^\/(?:baseline|extensions\/[0-4])\/sources/u.test(path) ? 'source catalog' : 'source reference' };
    return `${names[match[1]]} ${match[2] === undefined ? 'collection' : 'record'}`;
  }
  if (value && !Array.isArray(value) && typeof value === 'object' && typeof (value as JsonObject).role === 'string') return 'source-role-bearing object';
  return 'original source field';
}
function makeTree(value: Json, path = '', label = '(root)', ordinal = 0): FieldNode {
  const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value as FieldNode['kind'];
  const children = kind === 'array'
    ? (value as readonly Json[]).map((v, i) => makeTree(v, pointerChild(path, i), `[${i}]`, i))
    : kind === 'object'
      ? Object.entries(value as JsonObject).map(([k, v], i) => makeTree(v, pointerChild(path, k), k, i))
      : [];
  const sourceRole = kind === 'object' && typeof (value as JsonObject).role === 'string' ? (value as JsonObject).role as string : null;
  const node: FieldNode = {
    path, anchor: anchorFor(path), label, ordinal, component: componentAt(path), kind,
    semanticRole: semanticRole(path, value), sourceRole,
    ...(kind === 'object' || kind === 'array' ? {} : { value: value as Primitive }),
    children: Object.freeze(children),
    ...(label === 'url' && typeof value === 'string' ? { link: assessLink(value) } : {}),
  };
  return Object.freeze(node);
}
/** A lossless semantic field tree, never a substitute claim/date/amount schema. */
export function semanticTree(token: Admission): FieldNode { return makeTree(readAdmitted(token)); }
export function fieldMap(token: Admission): readonly FieldNode[] {
  const result: FieldNode[] = [];
  const visit = (node: FieldNode) => { result.push(node); node.children.forEach(visit); };
  visit(semanticTree(token));
  return Object.freeze(result);
}

function renderField(node: FieldNode, selectedPath?: string): string {
  const attributes = `id="${node.anchor}" data-path="${escapeHTML(node.path)}" data-kind="${node.kind}" data-ordinal="${node.ordinal}" data-component="${node.component}" data-semantic-role="${escapeHTML(node.semanticRole)}"${node.path === selectedPath ? ' data-selected="true"' : ''}`;
  const label = `<span class="label">${escapeHTML(node.label)}</span>`;
  const role = `<span class="role">${escapeHTML(node.semanticRole)}${node.sourceRole === null ? '' : `; source role: ${escapeHTML(node.sourceRole)}`}</span>`;
  const location = `<a class="path" href="#${node.anchor}">${escapeHTML(node.path || '(root)')}</a>`;
  if (node.kind === 'object' || node.kind === 'array') {
    const empty = node.children.length === 0 ? `<code data-empty="true">${node.kind === 'array' ? '[]' : '{}'}</code>` : '';
    return `<section ${attributes}><div class="field-heading">${label} <span class="type">${node.kind}; ${node.children.length} ${node.kind === 'array' ? 'items' : 'fields'}</span>${role}${location}</div>${empty}<ol class="children">${node.children.map(child => `<li>${renderField(child, selectedPath)}</li>`).join('')}</ol></section>`;
  }
  const literal = `<code class="value" data-source-value="true">${escapeHTML(JSON.stringify(node.value))}</code>`;
  const display = node.link ? renderLinkLiteral(node.value as string) : literal;
  return `<section ${attributes}><div class="field-heading">${label}<span class="type">${node.kind}</span>${role}${location}</div>${display}</section>`;
}
const STYLE = `body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#f6f2ea;color:#20251e}header,main,footer{max-width:100rem;margin:auto;padding:1.5rem}header{border-bottom:3px solid #6b745a}h1{font-size:1.8rem}nav ul{display:flex;gap:1rem;flex-wrap:wrap;padding-left:1rem}.notice{padding:1rem;background:#fff8d5;border:1px solid #877f55}.children{padding-left:1.3rem;margin:.4rem 0;list-style:none}.children>li{border-left:1px solid #9ca18e;padding:.3rem 0 .3rem .7rem}section{scroll-margin-top:1rem}.field-heading{display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap}.label{font-weight:700}.role,.type,.path,.link-note,.link-disabled{font-size:.8rem}.role{color:#4e5648}.path{overflow-wrap:anywhere}.value{display:block;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.9rem;background:#fff;padding:.5rem;margin:.25rem 0;border-radius:4px}.type{font-family:monospace}.link-note{display:block}.link-disabled{display:block;color:#762b20}a{color:#174e6b}a:focus-visible{outline:3px solid #b34c18;outline-offset:3px}[data-selected=true]{outline:4px solid #b34c18;padding:1rem;background:#fff8d5}code[data-empty]{display:block;background:#fff;padding:.5rem}.boundary{font-weight:650}.error{max-width:50rem;margin:3rem auto;padding:2rem;border:3px solid #8d2d23}footer{border-top:2px solid #6b745a}`;
function shell(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; connect-src 'none'; img-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHTML(title)}</title><style>${STYLE}</style></head><body>${body}</body></html>`;
}
function navigation(token: Admission): string {
  return COMPONENT_NAMES.map(name => {
    const packet = readComponent(token, name);
    const prefix = name === 'baseline' ? '/baseline' : `/extensions/${COMPONENT_NAMES.indexOf(name) - 1}`;
    const records = ['milestones', 'procedural_relations'] as const;
    const links = records.map(collection => `<li>${collection}: ${(packet[collection] as readonly JsonObject[]).map((row, i) => {
      const id = name === 'baseline' ? row[collection === 'milestones' ? 'milestone' : 'relation'] : row.id;
      return `<a href="#${anchorFor(`${prefix}/${collection}/${i}`)}">${escapeHTML(JSON.stringify(id))}</a>`;
    }).join(' · ')}</li>`).join('');
    const c = ACCOUNTING[name];
    return `<li><a href="#${anchorFor(prefix)}">${name}</a>: ${c.milestones} milestones; ${c.relations} procedural relations; ${c.retainedContext} retained-context records; ${c.observations} review observations<ul>${links}</ul></li>`;
  }).join('');
}
/** There is intentionally no API that renders an arbitrary field tree or raw object. */
export function renderDocument(token: Admission, selection?: SelectionRequest): string {
  const tree = semanticTree(token);
  const selected = selection !== undefined ? selectRecord(token, selection) : undefined;
  const body = `<header><h1>Reviewed cumulative packet: local semantic field preview</h1><div class="notice"><p class="boundary">LOCAL PREPARATION ONLY. Separate source-to-render review remains pending. This artifact does not establish baseline integration, native UI acceptance, application acceptance or public-posting permission.</p><p>Source metadata and permission statements below are preserved unchanged. The separately authorized preparation of this local contract does not revise historical source permissions. All five extensions retain public_posting_authorized: false.</p><p>61 milestones and 51 procedural relations, with three retained-context records and two review observations kept separate. Source catalog records and repeated references do not imply independent corroboration.</p><p>Original fields, ordering, numeric/string IDs, capacities, date roles/states, amounts/stages, provenance and limitations are visible in their original component. No date parsing, inferred deadlines, name joins, global edges, cash-flow aggregation or completed-publication inference is performed.</p><p>No sources are fetched or opened automatically. Supported external HTTPS links require user activation; other URL values are readable with a disabled explanation. Navigation eligibility is not authentication.</p><p>Exact admitted source: ${SOURCE_BYTES} bytes; SHA-256 <code>${SOURCE_SHA256}</code>.</p></div><nav aria-label="Component and original-record navigation"><ul>${navigation(token)}</ul></nav>${selected ? `<p>Selected original ${escapeHTML(selected.collection)} identifier ${escapeHTML(JSON.stringify(selected.id))} within ${selected.component}. The full packet and qualifiers remain below.</p>` : ''}</header><main>${renderField(tree, selected?.pointer)}</main><footer>End of the exhaustive source field tree. This is a private local review artifact with no publication or live-source verification claim.</footer>`;
  return shell('Cumulative packet | local field preview', body);
}
export function renderBlocked(_error: unknown): string {
  // A thrown value may itself be a revoked Proxy or have hostile getters. Do not
  // inspect, reflect on, stringify, coerce or derive text from the thrown value.
  const message = 'Admission blocked: unsupported input or render failure. No partial facts opened.';
  return shell('Admission blocked', `<main class="error" role="alert"><h1>Admission blocked</h1><p>${escapeHTML(message)}</p><p>Supply the exact reviewed cumulative bytes to the local admission boundary. No source facts are displayed.</p></main>`);
}
export async function renderBytesBoundary(bytes: Uint8Array, selection?: SelectionRequest): Promise<Readonly<{ admitted: boolean; html: string }>> {
  try { return Object.freeze({ admitted: true, html: renderDocument(await admitBytes(bytes), selection) }); }
  catch (error) { return Object.freeze({ admitted: false, html: renderBlocked(error) }); }
}

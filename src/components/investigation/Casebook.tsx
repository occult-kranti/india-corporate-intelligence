import { useRef, useState, useSyncExternalStore } from 'react';
import { BookmarkPlus, Download, FileJson, FileText, FolderOpen, Trash2, Upload } from 'lucide-react';
import { getInvestigationRegistry } from '../../data/investigation';
import { buildCasebookPacket, CASEBOOK_KEY, casebookMarkdown, casebookPinKey, emptyCasebook, mergeCasebooks, parseCasebook, portableCasebookUrl, type CasebookData, type CasebookKind, type CasebookSelection } from './casebookStore';
import './casebook.css';

interface Snapshot { book: CasebookData; notice: string }
let snapshot: Snapshot | undefined;
const listeners = new Set<() => void>();
const serverSnapshot: Snapshot = { book: emptyCasebook(), notice: '' };
function getSnapshot(): Snapshot {
  if (snapshot) return snapshot;
  try {
    const raw = localStorage.getItem(CASEBOOK_KEY);
    const parsed = raw ? parseCasebook(JSON.parse(raw)) : emptyCasebook();
    snapshot = { book: parsed ?? emptyCasebook(), notice: parsed ? '' : 'The saved casebook could not be read. Export or import a valid casebook before replacing it.' };
  } catch { snapshot = { book: emptyCasebook(), notice: 'Browser storage could not be read. Export your casebook to keep a copy.' }; }
  return snapshot;
}
function publish(book: CasebookData) {
  let notice = '';
  try { localStorage.setItem(CASEBOOK_KEY, JSON.stringify(book)); }
  catch { notice = 'Browser storage is unavailable. Your changes are kept in this tab; export a copy before closing it.'; }
  snapshot = { book, notice }; listeners.forEach(listener => listener());
}
function onStorage(event: StorageEvent) {
  if (event.key !== CASEBOOK_KEY) return;
  snapshot = undefined; getSnapshot(); listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) {
  if (!listeners.size) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', onStorage); };
}
export function useCasebook() {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
  return { ...value, count: value.book.pins.length, isPinned: (kind: CasebookKind, id: string) => value.book.pins.some(pin => pin.kind === kind && pin.id === id) };
}
export function pinCasebookItem(kind: CasebookKind, id: string): boolean {
  const { book } = getSnapshot();
  if (book.pins.some(pin => pin.kind === kind && pin.id === id)) return true;
  if (book.pins.length >= 250 || !id) return false;
  publish({ ...book, pins: [...book.pins, { kind, id, addedAt: new Date().toISOString(), note: '' }] });
  return true;
}
function updateBook(patch: Partial<Pick<CasebookData, 'title' | 'question' | 'falsifier'>>) { publish({ ...getSnapshot().book, ...patch }); }
function download(content: string, extension: string, type: string, title: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0,70) || 'investigation'}.${extension}`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface CasebookProps { selection?: CasebookSelection; viewUrl: string; onInspect?: (selection: CasebookSelection) => void }
export default function Casebook({ selection, viewUrl, onInspect }: CasebookProps) {
  const { book, notice, isPinned } = useCasebook();
  const [message, setMessage] = useState('');
  const [viewLabel, setViewLabel] = useState('');
  const importRef = useRef<HTMLInputElement>(null);
  const registry = getInvestigationRegistry();
  const resolve = (pin: CasebookSelection) => pin.kind === 'entity' ? registry.entities.find(row => row.id === pin.id) : pin.kind === 'relationship' ? registry.relationships.find(row => row.id === pin.id) : registry.records.find(row => row.id === pin.id);
  function addSelection() {
    if (!selection) return;
    setMessage(pinCasebookItem(selection.kind, selection.id) ? 'Selected item saved to this casebook.' : 'This casebook holds up to 250 pins. Export a copy or remove an item before adding another.');
  }
  function exportBook(format: 'json' | 'md') {
    const packet = buildCasebookPacket(getSnapshot().book, registry);
    download(format === 'json' ? `${JSON.stringify(packet, null, 2)}\n` : casebookMarkdown(packet), format, format === 'json' ? 'application/json' : 'text/markdown;charset=utf-8', book.title);
    setMessage(`Exported ${packet.entities.length} entities, ${packet.relationships.length} relationships, ${packet.records.length} records and ${packet.sources.length} sources.`);
  }
  async function importBook(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 16 * 1024 * 1024) throw new Error('Choose a casebook JSON file smaller than 16 MiB.');
      const parsed = JSON.parse(await file.text());
      const rawBook = parsed?.schema === 'icip.evidence-packet.v1' ? parsed.casebook : parsed;
      if (Array.isArray(rawBook?.pins) && rawBook.pins.length > 250 || Array.isArray(rawBook?.views) && rawBook.views.length > 40) throw new Error('The imported casebook exceeds the supported limit of 250 pins or 40 views. Your casebook is unchanged.');
      const incoming = parseCasebook(rawBook);
      if (!incoming) throw new Error('This file does not contain a supported ICIP casebook.');
      publish(mergeCasebooks(getSnapshot().book, incoming));
      setMessage('Imported casebook merged. Existing notes and pins were retained. Source records are resolved against this published registry.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The file could not be imported. Your casebook is unchanged.'); }
    if (importRef.current) importRef.current.value = '';
  }
  function saveView() {
    const url = portableCasebookUrl(viewUrl);
    if (!url) { setMessage('The current view could not be saved as an application link.'); return; }
    const current = getSnapshot().book;
    if (current.views.some(view => view.url === url)) { setMessage('This view is already saved.'); return; }
    if (current.views.length >= 40) { setMessage('Up to 40 views can be saved. Remove a view before adding another.'); return; }
    publish({ ...current, views: [...current.views, { id: `view-${Date.now().toString(36)}`, label: viewLabel.trim() || 'Investigation view', url, savedAt: new Date().toISOString() }] });
    setViewLabel(''); setMessage('View saved with its current filters and selections.');
  }
  return <section className="iw-casebook" aria-labelledby="iw-casebook-title">
    <header className="iw-casebook-heading"><div><p className="iw-casebook-kicker">Investigation casebook</p><h2 id="iw-casebook-title">Build a question you can test.</h2><p>Pins, analyst notes and saved views stay in this browser. Exports carry the underlying sources, limitations and linked responses.</p></div><span className="iw-casebook-count">{book.pins.length} / 250 pins</span></header>
    {notice && <p className="iw-casebook-notice" role="status">{notice}</p>}
    <div className="iw-casebook-fields">
      <label>Investigation title<input value={book.title} maxLength={180} onChange={event => updateBook({ title: event.target.value })} /></label>
      <label>Question or hypothesis<textarea value={book.question} maxLength={12000} rows={3} placeholder="What specific observation needs explaining?" onChange={event => updateBook({ question: event.target.value })} /></label>
      <label>What would close or disprove this question?<textarea value={book.falsifier} maxLength={12000} rows={3} placeholder="Name the records, comparison or counter-evidence needed." onChange={event => updateBook({ falsifier: event.target.value })} /></label>
    </div>
    <div className="iw-casebook-actions">
      <button type="button" onClick={addSelection} disabled={!selection || isPinned(selection.kind, selection.id)}><BookmarkPlus size={16} aria-hidden="true" />{selection && isPinned(selection.kind, selection.id) ? 'Selection saved' : 'Save selected item'}</button>
      <button type="button" onClick={() => exportBook('json')}><FileJson size={16} aria-hidden="true" />Export evidence JSON</button>
      <button type="button" onClick={() => exportBook('md')}><FileText size={16} aria-hidden="true" />Export reading brief</button>
      <button type="button" onClick={() => importRef.current?.click()}><Upload size={16} aria-hidden="true" />Import casebook</button>
      <input className="iw-casebook-file" type="file" accept="application/json,.json" ref={importRef} aria-label="Import casebook JSON file" onChange={event => { void importBook(event.target.files?.[0]); }} />
    </div>
    <p className="iw-casebook-message" role="status" aria-live="polite">{message}</p>
    <div className="iw-casebook-pins">
      {!book.pins.length && <div className="iw-casebook-empty"><FolderOpen size={25} aria-hidden="true" /><h3>No evidence pinned yet.</h3><p>Select a record, entity or relationship in the workspace, then save it here. Notes help test a claim; they do not change the source record.</p></div>}
      {book.pins.map(pin => {
        const item = resolve(pin); const title = item ? ('title' in item ? item.title : item.label) : pin.id;
        return <article key={casebookPinKey(pin)} className="iw-casebook-pin" data-casebook-pin={pin.id}>
          <header><div><p>{pin.kind}{item && 'tier' in item ? ` · ${item.tier} · ${item.status}` : ''}</p><h3>{title}</h3></div><button type="button" aria-label={`Remove ${title} from casebook`} onClick={() => { publish({ ...getSnapshot().book, pins: getSnapshot().book.pins.filter(row => casebookPinKey(row) !== casebookPinKey(pin)) }); setMessage('Pin removed. Other notes and evidence are retained.'); }}><Trash2 size={16} aria-hidden="true" /></button></header>
          <p>{item?.summary ?? 'This saved identifier is unavailable in the current published registry. Its note is preserved.'}</p>
          {item && <button type="button" className="iw-casebook-inspect" onClick={() => onInspect?.(pin)} disabled={!onInspect}>Inspect source record</button>}
          <label>Analyst note — user-entered<textarea rows={3} value={pin.note} maxLength={12000} onChange={event => publish({ ...getSnapshot().book, pins: getSnapshot().book.pins.map(row => casebookPinKey(row) === casebookPinKey(pin) ? { ...row, note: event.target.value } : row) })} /></label>
        </article>;
      })}
    </div>
    <section className="iw-casebook-views" aria-labelledby="iw-casebook-views-title"><h3 id="iw-casebook-views-title">Saved investigation views</h3><div><label>View label<input value={viewLabel} maxLength={180} placeholder="e.g. Karnataka · water · documented records" onChange={event => setViewLabel(event.target.value)} /></label><button type="button" onClick={saveView}><Download size={16} aria-hidden="true" />Save this view</button></div><ul>{book.views.map(view => <li key={view.url}><a href={view.url}>{view.label}</a><button type="button" aria-label={`Remove saved view ${view.label}`} onClick={() => publish({ ...getSnapshot().book, views: getSnapshot().book.views.filter(row => row.url !== view.url) })}><Trash2 size={14} aria-hidden="true" /></button></li>)}</ul></section>
  </section>;
}

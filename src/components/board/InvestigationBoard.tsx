import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, Check, Download, Grip, Layers, List, Map as MapIcon, Network, Pin, Plus, Search, Upload, X } from 'lucide-react';
import { getInvestigationRegistry, type InvestigationEntity, type InvestigationRecord, type InvestigationRelationship } from '../../data/investigation';
import Casebook, { getCasebookData, importCasebookData, pinCasebookItem, unpinCasebookItem, updateBook, updateCasebookNote, useCasebook } from '../investigation/Casebook';
import { buildCasebookPacket, parseCasebook, type CasebookSelection } from '../investigation/casebookStore';
import currentMap from '../investigation/assets/india-current36.json';
import { addBoardThread, BOARD_LAYOUT_KEY, boardPinKey, clampPoint, emptyBoardLayout, mergeBoardLayouts, parseBoardLayout, THREAD_TYPES, type BoardLayout, type BoardPoint, type ThreadType } from './boardStore';
import './board.css';

type Item = InvestigationEntity | InvestigationRecord | InvestigationRelationship;
const registry = getInvestigationRegistry();
const items = new Map<string, Item>([
  ...registry.entities.map(item => [`entity:${item.id}`, item] as const),
  ...registry.relationships.map(item => [`relationship:${item.id}`, item] as const),
  ...registry.records.map(item => [`record:${item.id}`, item] as const),
]);
const sources = new Map(registry.sources.map(source => [source.id, source]));
const searchable = [...registry.records.map(item => ({ kind: 'record' as const, id: item.id, item })), ...registry.entities.map(item => ({ kind: 'entity' as const, id: item.id, item })), ...registry.relationships.map(item => ({ kind: 'relationship' as const, id: item.id, item }))];
const titleOf = (item: Item) => 'title' in item ? item.title : item.label;
const typeLabels: Record<ThreadType, string> = { question: 'Question', compare: 'Compare', 'counter-evidence': 'Counter-evidence to check', 'follow-up': 'Follow-up' };
const tierDashes: Record<string, string> = { documented: '', reported: '6 3', 'self-reported': '4 2', alleged: '2 4', analytic: '8 3 2 3' };
function readLayout(): { layout: BoardLayout; error: string } {
  try {
    const raw = localStorage.getItem(BOARD_LAYOUT_KEY);
    const layout = raw ? parseBoardLayout(JSON.parse(raw)) : emptyBoardLayout();
    return { layout: layout ?? emptyBoardLayout(), error: layout ? '' : 'The saved board layout could not be read. Your casebook pins are retained; export a backup before editing.' };
  } catch { return { layout: emptyBoardLayout(), error: 'Board storage is unavailable. Export a backup to keep your layout.' }; }
}
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function sourceIds(item: Item) { return [...new Set([...item.sourceIds, ...item.geography.flatMap(geo => geo.sourceIds)])]; }
function sourceRoute(selection: CasebookSelection) {
  const target = new URL('/investigate', 'https://local.invalid');
  target.searchParams.set('iw_view', 'evidence');
  target.searchParams.set(selection.kind === 'record' ? 'iw_record' : selection.kind === 'entity' ? 'iw_node' : 'iw_edge', selection.id);
  return `${target.pathname}${target.search}`;
}

export default function InvestigationBoard() {
  const { book, notice, isPinned } = useCasebook();
  const [saved, setSaved] = useState(readLayout);
  const layout = saved.layout;
  const latestLayout = useRef(layout);
  latestLayout.current = layout;
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const view = params.get('view') === 'list' ? 'list' : 'board';
  const [queryDraft, setQueryDraft] = useState(query);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<CasebookSelection | null>(null);
  const [threadFrom, setThreadFrom] = useState('');
  const [threadTo, setThreadTo] = useState('');
  const [threadType, setThreadType] = useState<ThreadType>('question');
  const [threadNote, setThreadNote] = useState('');
  const [threadOpen, setThreadOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [width, setWidth] = useState(1100);
  const [depth, setDepth] = useState(false);
  const [sourceLinks, setSourceLinks] = useState(true);
  const [resultLimit, setResultLimit] = useState(30);
  const [canvasLimit, setCanvasLimit] = useState(60);
  const stageRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDialogElement>(null);
  const inspectorRef = useRef<HTMLDialogElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const pickerReturnFocus = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ key: string; x: number; y: number; start: BoardPoint; point: BoardPoint } | null>(null);

  useEffect(() => { setQueryDraft(query); setResultLimit(30); }, [query]);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(320, entries[0].contentRect.width)));
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const handler = (event: StorageEvent) => { if (event.key === BOARD_LAYOUT_KEY) { const next = readLayout(); latestLayout.current = next.layout; setSaved(next); } };
    window.addEventListener('storage', handler); return () => window.removeEventListener('storage', handler);
  }, []);
  useEffect(() => {
    const dialog = pickerRef.current;
    if (pickerOpen && dialog && !dialog.open) { dialog.showModal(); window.requestAnimationFrame(() => dialog.querySelector<HTMLInputElement>('.board-picker-search input')?.focus()); }
    else if (!pickerOpen && dialog?.open) dialog.close();
  }, [pickerOpen]);
  useEffect(() => {
    const dialog = inspectorRef.current;
    if (selected && dialog && !dialog.open) dialog.showModal();
    else if (!selected && dialog?.open) dialog.close();
  }, [selected]);
  function saveLayout(proposed: BoardLayout) {
    const keys = new Set(getCasebookData().pins.map(boardPinKey));
    const next = { ...proposed, positions: Object.fromEntries(Object.entries(proposed.positions).filter(([key]) => keys.has(key))) };
    let error = '';
    try { localStorage.setItem(BOARD_LAYOUT_KEY, JSON.stringify(next)); }
    catch { error = 'This layout is kept only in this tab. Browser storage is unavailable; export a backup before closing.'; }
    latestLayout.current = next;
    setSaved({ layout: next, error });
  }
  useEffect(() => {
    // An unreadable casebook produces an empty fallback, not confirmed removals.
    // Never let a passive render destroy the separate recoverable layout.
    if (notice) return;
    const keys = new Set(book.pins.map(boardPinKey));
    if (Object.keys(latestLayout.current.positions).some(key => !keys.has(key))) saveLayout(latestLayout.current);
  }, [book.pins, notice]);
  const filtered = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return searchable.filter(row => terms.every(term => `${titleOf(row.item)} ${row.item.summary} ${row.id} ${row.item.domains.join(' ')}`.toLocaleLowerCase().includes(term)));
  }, [query]);
  const columns = Math.max(1, Math.floor((width - 32) / 300));
  const defaultPoint = (index: number): BoardPoint => ({ x: 24 + (index % columns) * ((width - 48) / columns), y: 42 + Math.floor(index / columns) * 360 });
  const points = new Map(book.pins.map((pin, index) => [boardPinKey(pin), clampPoint(layout.positions[boardPinKey(pin)] ?? defaultPoint(index), width)]));
  const visiblePins = book.pins.slice(0, canvasLimit);
  const visibleKeys = new Set((view === 'list' ? book.pins : visiblePins).map(boardPinKey));
  const visibleThreads = layout.threads.filter(thread => visibleKeys.has(thread.from) && visibleKeys.has(thread.to));
  const sourcedEdges = sourceLinks ? registry.relationships.filter(edge => visibleKeys.has(`entity:${edge.from}`) && visibleKeys.has(`entity:${edge.to}`)) : [];
  const height = Math.max(620, ...visiblePins.map(pin => (points.get(boardPinKey(pin))?.y ?? 0) + 360));
  const selectedItem = selected ? items.get(boardPinKey(selected)) : undefined;
  const selectedResponses = selectedItem && 'responseIds' in selectedItem ? selectedItem.responseIds.map(id => registry.records.find(record => record.id === id)).filter((record): record is InvestigationRecord => Boolean(record)) : [];
  const selectedPin = selected && book.pins.find(pin => boardPinKey(pin) === boardPinKey(selected));

  function openInspector(pin: CasebookSelection, target: HTMLElement) { returnFocusRef.current = target; setSelected(pin); }
  function closeInspector() { setSelected(null); window.requestAnimationFrame(() => returnFocusRef.current?.focus()); }
  function openPicker() { pickerReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : addButtonRef.current; setPickerOpen(true); }
  function closePicker() { setPickerOpen(false); window.requestAnimationFrame(() => pickerReturnFocus.current?.focus()); }
  function pin(selection: CasebookSelection) {
    const success = pinCasebookItem(selection.kind, selection.id);
    setMessage(success ? 'Record pinned. Its sources and qualifiers stay attached.' : 'This casebook holds up to 250 pins. Export a copy before removing items.');
  }
  function movePin(key: string, point: BoardPoint, persist = true) {
    const next = { ...layout, positions: { ...layout.positions, [key]: clampPoint(point, width) } };
    if (persist) saveLayout(next); else { latestLayout.current = next; setSaved(current => ({ ...current, layout: next })); }
  }
  function startDrag(event: PointerEvent<HTMLButtonElement>, key: string) {
    if (event.button !== 0) return;
    const point = points.get(key)!;
    dragRef.current = { key, x: event.clientX, y: event.clientY, start: point, point };
    event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
  }
  function drag(event: PointerEvent<HTMLButtonElement>) {
    const active = dragRef.current; if (!active) return;
    active.point = clampPoint({ x: active.start.x + event.clientX - active.x, y: active.start.y + event.clientY - active.y }, width);
    movePin(active.key, active.point, false);
  }
  function stopDrag() { const active = dragRef.current; if (active) { movePin(active.key, active.point); dragRef.current = null; } }
  function keyboardMove(event: KeyboardEvent<HTMLButtonElement>, key: string) {
    const amount = event.shiftKey ? 96 : 24;
    const direction = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] }[event.key];
    if (!direction) return;
    event.preventDefault(); const p = points.get(key)!; movePin(key, { x: p.x + direction[0], y: p.y + direction[1] });
  }
  function addThread() {
    if (![threadFrom, threadTo].every(key => book.pins.some(pin => boardPinKey(pin) === key))) { setMessage('Choose two records already pinned to your board.'); return; }
    try {
      saveLayout(addBoardThread(layout, { id: `thread-${Date.now().toString(36)}-${layout.threads.length}`, from: threadFrom, to: threadTo, type: threadType, note: threadNote.trim() }));
      setThreadNote(''); setThreadOpen(false); setMessage('Analyst thread added. It is a research annotation, not a sourced relationship.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The thread could not be added.'); }
  }
  async function restore(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 16 * 1024 * 1024) throw new Error('Choose a board JSON backup smaller than 16 MiB.');
      const raw = JSON.parse(await file.text());
      const rawBook = raw?.casebook ?? raw;
      if ((Array.isArray(rawBook?.pins) && rawBook.pins.length > 250) || (Array.isArray(rawBook?.views) && rawBook.views.length > 40)) throw new Error('The backup exceeds 250 pins or 40 saved views. Nothing was imported.');
      const incomingBook = parseCasebook(rawBook);
      if (!incomingBook) throw new Error('This file does not contain a supported casebook.');
      const incomingLayout = raw.boardLayout ? parseBoardLayout(raw.boardLayout) : emptyBoardLayout();
      if (!incomingLayout) throw new Error('The board layout is invalid. Nothing was imported.');
      if (raw.boardLayout && (raw.boardLayout.threads.length !== incomingLayout.threads.length || Object.keys(raw.boardLayout.positions).length !== Object.keys(incomingLayout.positions).length)) throw new Error('The backup contains invalid or duplicate layout entries. Nothing was imported.');
      const currentKeys = new Set(getCasebookData().pins.map(boardPinKey));
      const incomingKeys = new Set(incomingBook.pins.map(boardPinKey));
      const currentLayout = { ...latestLayout.current, positions: Object.fromEntries(Object.entries(latestLayout.current.positions).filter(([key]) => currentKeys.has(key))) };
      const cleanIncoming = { ...incomingLayout, positions: Object.fromEntries(Object.entries(incomingLayout.positions).filter(([key]) => incomingKeys.has(key))) };
      const mergedLayout = mergeBoardLayouts(currentLayout, cleanIncoming);
      importCasebookData(incomingBook);
      saveLayout(mergedLayout); setMessage('Backup merged. Existing pins, notes, question and positions were kept.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'This backup could not be imported.'); }
    if (fileRef.current) fileRef.current.value = '';
  }
  function patchParam(key: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next); }
  function line(from: string, to: string) {
    const a = points.get(from), b = points.get(to); if (!a || !b) return '';
    const x1 = a.x + 134, y1 = a.y + 10, x2 = b.x + 134, y2 = b.y + 10;
    return `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.max(y1, y2) + 85} ${x2} ${y2}`;
  }

  return <section className="case-board-page" data-tour="board" aria-labelledby="board-title">
    <div className="board-heading">
      <div><p className="board-kicker"><span /> YOUR RESEARCH DESK <span className="board-snapshot">SNAPSHOT {registry.updatedAt}</span></p><h1 id="board-title">Follow the record.<br /><em>Build your case.</em></h1><p className="board-intro">A place for evidence, open questions and the details that change a story.</p></div>
      <div className="board-heading-actions"><Link to="/investigate"><MapIcon size={17} /> Explore the atlas <ArrowUpRight size={14} /></Link><a href="./global-workbench/finance.html">Public assets &amp; finance <ArrowUpRight size={14} /></a><button className="board-primary" ref={addButtonRef} onClick={openPicker} data-tour="board-search"><Plus size={17} /> Pin a record</button></div>
    </div>
    <div className="board-workflow" aria-label="Research workflow"><span className="is-current"><b>01</b> Find a record</span><ArrowRight size={14} /><span><b>02</b> Inspect its sources</span><ArrowRight size={14} /><span><b>03</b> Test a connection</span><ArrowRight size={14} /><span><b>04</b> Keep a clear account</span></div>
    <div className="board-case-heading"><div><label htmlFor="board-case-name">CASEBOOK</label><input id="board-case-name" value={book.title} maxLength={180} onChange={event => updateBook({ title: event.target.value })} /></div><span><Pin size={14} /> {book.pins.length} pins <i /> {layout.threads.length} analyst threads</span><button onClick={() => setNotebookOpen(!notebookOpen)} aria-expanded={notebookOpen}><BookOpen size={16} /> Notes &amp; exports</button></div>
    {notebookOpen && <div className="board-notebook"><Casebook viewUrl={`#/board${params.size ? `?${params}` : ''}`} onInspect={selection => { returnFocusRef.current = document.activeElement as HTMLElement; setSelected(selection); }} /></div>}
    <div className="board-toolbar" data-tour="board-tools"><div role="group" aria-label="Board view"><button aria-pressed={view === 'board'} onClick={() => patchParam('view', '')}><Layers size={15} /> Board</button><button aria-pressed={view === 'list'} onClick={() => patchParam('view', 'list')}><List size={15} /> List</button></div><div><button onClick={() => setThreadOpen(!threadOpen)} aria-expanded={threadOpen} disabled={book.pins.length < 2}><Network size={15} /> Connect pins</button><button onClick={() => { saveLayout({ ...layout, positions: {} }); setMessage('Pins arranged in reading order. Threads and notes were kept.'); }}>Arrange</button><button onClick={() => setDepth(!depth)} aria-pressed={depth}><Layers size={15} /> Depth</button><button onClick={() => { download({ ...buildCasebookPacket(book, registry), boardLayout: layout }, 'investigation-board.json'); setMessage('Exported pins, sources, notes and board layout.'); }}><Download size={15} /><span>Export</span></button><button onClick={() => fileRef.current?.click()}><Upload size={15} /><span>Restore</span></button><input ref={fileRef} className="sr-only" aria-label="Import a board backup" type="file" accept="application/json,.json" onChange={event => void restore(event.target.files?.[0])} /></div></div>
    {threadOpen && <form className="board-thread-form" onSubmit={event => { event.preventDefault(); addThread(); }}><div className="board-thread-explainer"><h2>A thread is a question.</h2><p>Your annotation is kept separate from the sourced relationship graph.</p></div><label>From<select value={threadFrom} onChange={event => setThreadFrom(event.target.value)} required><option value="">Choose a pin</option>{book.pins.map(pin => <option key={boardPinKey(pin)} value={boardPinKey(pin)}>{items.has(boardPinKey(pin)) ? titleOf(items.get(boardPinKey(pin))!) : pin.id}</option>)}</select></label><label>To<select value={threadTo} onChange={event => setThreadTo(event.target.value)} required><option value="">Choose another pin</option>{book.pins.map(pin => <option key={boardPinKey(pin)} value={boardPinKey(pin)}>{items.has(boardPinKey(pin)) ? titleOf(items.get(boardPinKey(pin))!) : pin.id}</option>)}</select></label><label>Purpose<select value={threadType} onChange={event => setThreadType(event.target.value as ThreadType)}>{THREAD_TYPES.map(type => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label><label className="board-thread-note">What would you check?<input value={threadNote} maxLength={2000} onChange={event => setThreadNote(event.target.value)} placeholder="Name the evidence needed to test this…" /></label><button className="board-primary" type="submit">Add thread</button><button type="button" onClick={() => setThreadOpen(false)}>Cancel</button></form>}
    {(message || notice || saved.error) && <p className="board-status" role="status">{message}{notice && ` ${notice}`}{saved.error && ` ${saved.error}`}</p>}
    <div className="board-stage-wrap"><div className={`board-stage${depth ? ' has-depth' : ''}${view === 'list' ? ' is-list' : ''}`} ref={stageRef} style={{ minHeight: view === 'board' ? height : undefined }}>
      <svg className="board-map-underlay" viewBox={currentMap.viewBox.join(' ')} aria-hidden="true">{currentMap.states.map(state => <path key={state.code} d={state.path} />)}</svg>
      <div className="board-map-caption" aria-hidden="true">INDIA / RESEARCH SURFACE<br />Pin positions are your arrangement, not locations.</div>
      {!book.pins.length ? <div className="board-empty"><div className="board-empty-pin"><Pin size={25} /></div><span className="board-empty-index">CASE FILE / 001</span><h2>Every investigation<br />starts with a record.</h2><p>Pin a filing, a funding record or a named relationship. Keep its source close. Add a thread only when you have a question to test.</p><button className="board-primary" onClick={openPicker}><Plus size={16} /> Find your first record</button><div><Link to="/investigate?iw_view=evidence">Browse the source register</Link><a href="./global-workbench/finance.html">Try the finance evidence exercise <ArrowUpRight size={12} /></a></div></div> : <>
        {view === 'board' && <svg className="board-threads" width={width} height={height} aria-hidden="true">{sourcedEdges.map(edge => <path key={edge.id} className="board-sourced-edge" d={line(`entity:${edge.from}`, `entity:${edge.to}`)} strokeDasharray={tierDashes[edge.tier]} />)}{visibleThreads.map(thread => <g key={thread.id}><path className="board-thread-shadow" d={line(thread.from, thread.to)} /><path className={`board-wool-thread thread-${thread.type}`} d={line(thread.from, thread.to)} /></g>)}</svg>}
        <div className="board-pins" role="list" aria-label="Pinned evidence">{(view === 'list' ? book.pins : visiblePins).map((pin, index) => {
          const key = boardPinKey(pin), item = items.get(key), p = points.get(key)!;
          return <article role="listitem" className="board-pin" key={key} data-kind={pin.kind} style={view === 'board' ? { left: p.x, top: p.y, '--pin-angle': `${[0.6, -0.7, 0.4, -0.3][index % 4]}deg` } as CSSProperties : undefined}>
            <div className="board-pin-top"><button className="board-pin-grip" aria-label={`Move ${item ? titleOf(item) : pin.id}. Drag or use arrow keys; Shift moves farther.`} onPointerDown={event => startDrag(event, key)} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onKeyDown={event => keyboardMove(event, key)}><Grip size={15} /><span className="board-thumbtack" /></button><span>{String(index + 1).padStart(2, '0')} / {pin.kind}</span><button onClick={event => openInspector(pin, event.currentTarget)} aria-label={`Inspect ${item ? titleOf(item) : pin.id}`}><ArrowUpRight size={16} /></button></div>
            <button className="board-pin-content" onClick={event => openInspector(pin, event.currentTarget)}><h3>{item ? titleOf(item) : 'Record unavailable in this snapshot'}</h3><p>{item?.summary ?? pin.id}</p></button>
            <div className="board-pin-meta">{item && 'tier' in item ? <span className="board-tier" data-tier={item.tier}><svg width="20" height="8" aria-hidden="true"><line x1="0" x2="20" y1="4" y2="4" stroke="currentColor" strokeWidth="1.7" strokeDasharray={tierDashes[item.tier]} /></svg>{item.tier}</span> : <span>Recorded identity</span>}<span>{item ? sourceIds(item).length : 0} sources</span></div>
            {item && 'statusAsOf' in item && <p className="board-pin-date">As of {item.statusAsOf || 'date not established'}</p>}{pin.note && <div className="board-note-indicator"><BookOpen size={12} /> Analyst note attached</div>}
          </article>;
        })}</div>
      </>}
    </div></div>
    {view === 'board' && book.pins.length > canvasLimit && <div className="board-more"><p>Showing {canvasLimit} of {book.pins.length} pins on the canvas. List view contains every pin.</p><button onClick={() => setCanvasLimit(value => value + 60)}>Show 60 more</button></div>}
    <div className="board-legend"><span><i className="wool-sample" /> Analyst thread: a question to test</span><label><input type="checkbox" checked={sourceLinks} onChange={event => setSourceLinks(event.target.checked)} /> Sourced links between pinned identities</label><span>Depth and proximity carry no evidential meaning.</span></div>
    {(layout.threads.length > 0 || sourcedEdges.length > 0) && <section className="board-connection-ledger" aria-label="Connection ledger"><h2>Read each connection.</h2>{layout.threads.map(thread => <div key={thread.id}><span className="board-connection-kind">Analyst · {typeLabels[thread.type]}</span><p>{items.has(thread.from) ? titleOf(items.get(thread.from)!) : thread.from} <ArrowRight size={12} /> {items.has(thread.to) ? titleOf(items.get(thread.to)!) : thread.to}</p><p>{thread.note || 'No supporting note entered.'}</p><button onClick={() => saveLayout({ ...layout, threads: layout.threads.filter(row => row.id !== thread.id) })}>Remove thread</button></div>)}{sourcedEdges.map(edge => <div key={edge.id}><span className="board-connection-kind">Sourced · {edge.tier}</span><p>{edge.label}</p><p>{edge.status} · {edge.statusAsOf || 'Date unknown'}</p><button onClick={event => openInspector({ kind: 'relationship', id: edge.id }, event.currentTarget)}>Inspect sources</button></div>)}</section>}
    <div className="board-next"><div><h2>Keep the question honest.</h2><p>What evidence would change your mind? Write it down before following the next thread.</p></div><label htmlFor="board-falsifier" className="sr-only">Evidence that would close this question</label><textarea id="board-falsifier" value={book.falsifier} maxLength={12000} onChange={event => updateBook({ falsifier: event.target.value })} placeholder="This question would be resolved if…" /></div>
    <footer className="board-footer"><span>Stored in this browser. Export a backup for a portable copy.</span><a href={currentMap.provenance.sourceUrl} target="_blank" rel="noreferrer">Map geometry &amp; boundary provenance <ArrowUpRight size={11} /></a></footer>

    <dialog ref={pickerRef} className="board-dialog board-record-picker" aria-labelledby="board-picker-title" onCancel={event => { event.preventDefault(); closePicker(); }} onClick={event => { if (event.target === event.currentTarget) closePicker(); }} onClose={() => setPickerOpen(false)}><header><div><p>THE SOURCE REGISTER</p><h2 id="board-picker-title">Find a record to pin.</h2></div><button aria-label="Close record search" onClick={closePicker}><X size={20} /></button></header><form className="board-picker-search" onSubmit={event => { event.preventDefault(); patchParam('q', queryDraft); }}><Search size={18} /><input autoFocus aria-label="Search records, identities and relationships" placeholder="Search a name, institution or question…" value={queryDraft} onChange={event => setQueryDraft(event.target.value)} /><button type="submit">Search</button></form><p className="board-picker-count">{filtered.length.toLocaleString()} matching records, identities and relationships · showing {Math.min(filtered.length, resultLimit)} · snapshot {registry.updatedAt}</p><div className="board-picker-results">{filtered.slice(0, resultLimit).map(row => <article key={boardPinKey(row)}><span>{row.kind} {'tier' in row.item ? ` / ${row.item.tier}` : ''}</span><h3>{titleOf(row.item)}</h3><p>{row.item.summary}</p><div><span>{sourceIds(row.item).length} sources</span><button disabled={isPinned(row.kind, row.id)} onClick={() => pin(row)}>{isPinned(row.kind, row.id) ? <><Check size={14} /> Pinned</> : <><Pin size={14} /> Pin record</>}</button></div></article>)}{!filtered.length && <p>No records match. Try a shorter name or an institution. A missing result does not establish that no activity occurred.</p>}{filtered.length > resultLimit && <button className="board-more-results" onClick={() => setResultLimit(value => value + 30)}>Show 30 more</button>}</div><footer><p>Pinning keeps the original source, date, evidence tier and limitations.</p><button className="board-primary" onClick={closePicker}>Return to board <ArrowRight size={14} /></button></footer></dialog>
    <dialog ref={inspectorRef} className="board-dialog board-inspector" aria-labelledby="board-inspector-title" data-tour="board-sources" onCancel={event => { event.preventDefault(); closeInspector(); }} onClick={event => { if (event.target === event.currentTarget) closeInspector(); }} onClose={() => setSelected(null)}><header><div><p>INSPECT THE RECORD</p><h2 id="board-inspector-title">{selectedItem ? titleOf(selectedItem) : 'Record unavailable'}</h2></div><button autoFocus aria-label="Close record inspector" onClick={closeInspector}><X size={20} /></button></header>{selected && <div className="board-inspector-body">{selectedItem ? <>
      <p className="board-inspector-summary">{selectedItem.summary}</p>{'tier' in selectedItem && <dl className="board-facts"><div><dt>Evidence tier</dt><dd>{selectedItem.tier}</dd></div><div><dt>Recorded status</dt><dd>{selectedItem.status}</dd></div><div><dt>Status as of</dt><dd>{selectedItem.statusAsOf || 'Not established'}</dd></div><div><dt>Date basis</dt><dd>{selectedItem.dateBasis}</dd></div></dl>}
      {'amounts' in selectedItem && selectedItem.amounts.length > 0 && <><h3>Amounts at their recorded stage</h3>{selectedItem.amounts.map((amount, index) => <p key={index}>{amount.currency} {amount.value.toLocaleString()} {amount.unit} · {amount.stage} · {amount.period}</p>)}</>}
      {'response' in selectedItem && <><h3>Response or procedural context</h3><p>{selectedItem.response || 'No response is recorded in this entry. This is not evidence of silence.'}</p></>}
      {selectedResponses.length > 0 && <><h3>Linked responses and counter-evidence</h3>{selectedResponses.map(record => <article key={record.id}><h4>{record.title}</h4><p>{record.summary}</p><p>{record.status} · {record.statusAsOf || 'Date not established'}</p>{record.sourceIds.map(id => { const source = sources.get(id); return source ? <a key={id} className="board-response-source" href={source.url} target="_blank" rel="noreferrer">{source.title} <ArrowUpRight size={12} /></a> : <p key={id}>Source unavailable: {id}</p>; })}</article>)}</>}
      {'alternativeExplanations' in selectedItem && selectedItem.alternativeExplanations.length > 0 && <><h3>Competing explanations</h3><ul>{selectedItem.alternativeExplanations.map(text => <li key={text}>{text}</li>)}</ul></>}
      <h3>Scope and limitations</h3><ul>{selectedItem.limitations.map(text => <li key={text}>{text}</li>)}</ul>{selectedItem.geography.map((geo, index) => <p key={index}><strong>{geo.basis}</strong> · {geo.note}</p>)}
      <h3>Source ledger</h3>{!sourceIds(selectedItem).length && <p>This entry has no direct source attached in this snapshot. Read its evidence tier and limitations before relying on it.</p>}<div className="board-source-list">{sourceIds(selectedItem).map(id => { const source = sources.get(id); return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer"><strong>{source.title} <ArrowUpRight size={12} /></strong><span>{source.publisher} · {source.publishedAt || 'Publication date unknown'} · {source.tier}</span><small>{source.locator}</small>{source.limitations.map(limit => <small key={limit}>{limit}</small>)}</a> : <p key={id}>Source unavailable in this snapshot: {id}</p>; })}</div><Link className="board-open-workspace" to={sourceRoute(selected)} onClick={closeInspector}>Open full evidence workspace <ArrowUpRight size={14} /></Link>
    </> : <p>This saved identifier is no longer available in the published registry. Its analyst note has been preserved.</p>}{selectedPin && <><label className="board-analyst-note">Your analyst note<textarea value={selectedPin.note} maxLength={12000} onChange={event => updateCasebookNote(selected.kind, selected.id, event.target.value)} placeholder="What does this establish? What is still missing?" /></label><div className="board-move-controls"><span>Move pin</span>{[[ArrowLeft, -24, 0, 'left'], [ArrowRight, 24, 0, 'right'], [ArrowUp, 0, -24, 'up'], [ArrowDown, 0, 24, 'down']].map(([Icon, x, y, label]) => { const MoveIcon = Icon as typeof ArrowLeft; return <button key={String(label)} aria-label={`Move pin ${label}`} onClick={() => { const key = boardPinKey(selected), p = points.get(key)!; movePin(key, { x: p.x + Number(x), y: p.y + Number(y) }); }}><MoveIcon size={16} /></button>; })}</div><button className="board-remove-pin" onClick={() => { unpinCasebookItem(selected.kind, selected.id); const positions = { ...layout.positions }; delete positions[boardPinKey(selected)]; saveLayout({ ...layout, positions }); closeInspector(); setMessage('Pin removed from the casebook. The source record is unchanged.'); }}>Remove this pin</button></>}</div>}</dialog>
  </section>;
}

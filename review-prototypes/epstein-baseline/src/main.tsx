import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import type { Timeline } from './contract';
import './reader.css';
const Reader = lazy(()=>import('./reader'));
class ReaderBoundary extends Component<{children:ReactNode;onClose:()=>void},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<main className="gate"><section className="paper"><h1>The reader could not open</h1><p role="alert">The interface did not load completely. Reload to retry; no partial source view is accepted.</p><button onClick={()=>window.location.reload()}>Reload reader</button><button onClick={this.props.onClose}>Close baseline</button></section></main>:this.props.children;}
}
function Gate() {
  const [packet,setPacket] = useState<Timeline|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const request = useRef<AbortController|null>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  function close() { request.current?.abort(); request.current=null; setPacket(null); setLoading(false); setError(''); queueMicrotask(()=>openButton.current?.focus()); }
  async function open() {
    request.current?.abort(); const controller = new AbortController(); request.current=controller; setLoading(true); setError('');
    try { const {loadTimeline} = await import('./contract'); const next = await loadTimeline(controller.signal); if (request.current === controller && !controller.signal.aborted) { setPacket(next); setLoading(false); } }
    catch(error) { if (request.current === controller && !controller.signal.aborted) { setError(error instanceof Error ? error.message : 'The baseline could not open.'); setLoading(false); } }
  }
  return packet ? <ReaderBoundary onClose={close}><Suspense fallback={<main className="gate"><p role="status">Opening the verified reader…</p><button onClick={close}>Cancel</button></main>}><Reader packet={packet} onClose={close}/></Suspense></ReaderBoundary> : <main className="gate"><section className="paper">
    <p className="eyebrow">FIELDWORK · PRIVATE RENDER REVIEW</p><h1>Selected official procedural and release timeline</h1>
    <p>21 reviewed milestones and 12 narrow procedural relations. A bounded official-source selection, not a complete file inventory.</p>
    <p>This local candidate preserves the delivered source wording. It has not been admitted to the public atlas.</p>
    <button ref={openButton} onClick={open} disabled={loading}>{loading?'Verifying reviewed baseline…':'Open reviewed baseline'}</button>
    {loading?<button className="quiet" onClick={close}>Cancel</button>:null}{error?<p role="alert">{error}</p>:null}
  </section></main>;
}
createRoot(document.getElementById('root')!).render(<Gate/>);

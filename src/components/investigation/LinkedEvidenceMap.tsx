import { useEffect, useMemo, useRef, useState } from 'react';
import { InvestigationMap, type InvestigationMapProps } from './InvestigationMap';
import { AtlasEvidencePopover } from './AtlasEvidencePopover';
import { MapEvidenceHubPanel } from './MapEvidenceHubPanel';
import { MapConnectionOverlay } from './MapConnectionOverlay';
import type { InvestigationFilters, InvestigationRegistry } from '../../data/investigation';
import type { AtlasSelection } from '../../data/atlasInvestigation';
import { buildMapEvidenceScene, type MapEvidenceSelection } from '../../data/mapEvidence';
import './linked-evidence-map.css';

export type LinkedMapSelection = MapEvidenceSelection | AtlasSelection;
interface Props extends Omit<InvestigationMapProps, 'evidenceScene' | 'evidenceSelection' | 'onEvidenceSelect'> {
  registry: InvestigationRegistry;
  sceneRegistry?: InvestigationRegistry;
  filters: InvestigationFilters;
  selection?: LinkedMapSelection | null;
  onSelectionChange?: (selection: LinkedMapSelection | null) => void;
  focusSelection?: AtlasSelection | null;
  depth?: number;
}

/** A shared flat-map reader. Map clicks inspect evidence without silently changing filters. */
export function LinkedEvidenceMap({ registry, sceneRegistry = registry, filters, selection: controlled, onSelectionChange, focusSelection, depth = 1, ...mapProps }: Props) {
  const [local, setLocal] = useState<LinkedMapSelection | null>(null);
  const [returnPlace,setReturnPlace] = useState<MapEvidenceSelection | null>(null);
  const [unplacedQuery,setUnplacedQuery] = useState(''), [unplacedPage,setUnplacedPage] = useState(1);
  const selection = controlled === undefined ? local : controlled;
  const returnFocus = useRef<HTMLDivElement>(null);
  const filterKey = JSON.stringify(filters);
  useEffect(() => { setLocal(null);setReturnPlace(null);setUnplacedPage(1); }, [filterKey]);
  const select = (value: LinkedMapSelection | null) => {
    if(!value||value.kind==='state'||value.kind==='site')setReturnPlace(null);
    else if(selection?.kind==='state'||selection?.kind==='site')setReturnPlace({kind:selection.kind,id:selection.id});
    setLocal(value); onSelectionChange?.(value);
  };
  const active = selection ?? focusSelection;
  const entityId = active?.kind === 'entity' ? active.id
    : active?.kind === 'relationship' ? registry.relationships.find(row => row.id === active.id)?.from
    : active?.kind === 'record' ? registry.records.find(row => row.id === active.id)?.entityIds[0] : undefined;
  const placementId = selection?.kind === 'state' || selection?.kind === 'site' ? selection.id : undefined;
  const scene = useMemo(() => buildMapEvidenceScene(sceneRegistry, filters, { selectedEntityId: entityId, selectedPlacementId: placementId, depth }), [sceneRegistry, filterKey, entityId, placementId, depth]);
  const mapSelection: MapEvidenceSelection | null = selection?.kind === 'record' ? (entityId ? { kind: 'entity', id: entityId } : null) : selection ? {kind:selection.kind as MapEvidenceSelection['kind'],id:selection.id} : null;
  const readerSelection = selection && selection.kind !== 'state' && selection.kind !== 'site' ? selection as AtlasSelection : null;
  const unplacedRows = useMemo(() => {
    const ids = new Set(scene.populations.unplaced.recordIds), terms = unplacedQuery.toLowerCase().trim().split(/\s+/u).filter(Boolean);
    return registry.records.filter(row => ids.has(row.id) && terms.every(term => `${row.title} ${row.summary} ${row.id}`.toLowerCase().includes(term)));
  }, [registry,scene,unplacedQuery]);
  const unplacedPages = Math.max(1,Math.ceil(unplacedRows.length/8)), currentUnplacedPage = Math.min(unplacedPage,unplacedPages);
  return <div className="linked-evidence-map" ref={returnFocus} tabIndex={-1}>
    <InvestigationMap {...mapProps} mapOverlay={<MapConnectionOverlay registry={registry} scene={scene} selection={mapSelection ?? (entityId ? {kind:'entity',id:entityId} : null)} onSelect={select} />} evidenceScene={scene} evidenceSelection={mapSelection} onEvidenceSelect={select} onEntitySelect={id => select({ kind: 'entity', id })} />
    {selection && (selection.kind === 'state' || selection.kind === 'site') && <MapEvidenceHubPanel registry={registry} scene={scene} selection={{kind:selection.kind as 'state'|'site',id:selection.id}} onClose={() => select(null)} onSelectionChange={select} onEntitySelect={id => select({kind:'entity',id})} onRecordSelect={id => select({kind:'record',id})} returnFocusRef={returnFocus} />}
    <AtlasEvidencePopover registry={registry} selection={readerSelection} onBackToPlace={returnPlace?()=>select(returnPlace):undefined} placeLabel={returnPlace?.kind==='state'?registry.states.find(row=>`state:${row.code}`===returnPlace.id)?.name:scene.sites.find(row=>row.id===returnPlace?.id)?.label} onSelectionChange={select} onClose={() => select(null)} returnFocusRef={returnFocus} />
    <details className="map-evidence-index">
      <summary>Map evidence index <span>{scene.stateHubs.length} state hubs · {scene.sites.length} verified public sites</span></summary>
      <p>State hubs group documentary associations. They are not precise addresses or proof of wrongdoing. Select a hub to inspect its records and connected identities.</p>
      <div className="map-evidence-hubs">{scene.stateHubs.map(hub => <button type="button" key={hub.id} data-map-hub={hub.id} onClick={() => select({kind:'state',id:hub.id})}><strong>{hub.label}</strong><span>{hub.counts.records.toLocaleString()} records · {hub.counts.entities.toLocaleString()} identities</span></button>)}</div>
      <div className="map-evidence-unplaced">{Object.entries(scene.populations).map(([key, population]) => <p key={key}><strong>{key === 'unplaced' ? 'No established location' : `${key} context`}</strong> {population.counts.records.toLocaleString()} records · {population.counts.entities.toLocaleString()} identities. {key === 'unplaced' ? 'Retained in the evidence lists without invented pins.' : 'Overlapping context; not additional incidents.'}</p>)}</div>
      <details className="map-unplaced-records"><summary>Browse {scene.populations.unplaced.counts.records.toLocaleString()} records with no established location</summary><label>Search unplaced records<input type="search" value={unplacedQuery} onChange={event=>{setUnplacedQuery(event.target.value);setUnplacedPage(1);}} placeholder="Record title or summary"/></label><p>{unplacedRows.length.toLocaleString()} matching records; no point locations assigned.</p><ol>{unplacedRows.slice((currentUnplacedPage-1)*8,currentUnplacedPage*8).map(row=><li key={row.id}><button type="button" onClick={()=>select({kind:'record',id:row.id})}>{row.title}<span>{row.tier} · {row.status}</span></button></li>)}</ol>{!unplacedRows.length&&<p>No unplaced records match this search.</p>}<nav aria-label="Unplaced evidence pages"><button type="button" disabled={currentUnplacedPage===1} onClick={()=>setUnplacedPage(currentUnplacedPage-1)}>Previous</button><span>{currentUnplacedPage} / {unplacedPages}</span><button type="button" disabled={currentUnplacedPage===unplacedPages} onClick={()=>setUnplacedPage(currentUnplacedPage+1)}>Next</button></nav></details>
    </details>
  </div>;
}

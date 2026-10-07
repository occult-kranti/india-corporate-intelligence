import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Building2, Crosshair, Search, X } from 'lucide-react';
import type { Map as LibreMap, GeoJSONSource, StyleSpecification } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import type { SpatialAtlasProps, SpatialSite } from './SpatialAtlas';
import boundaryUrl from './assets/india-current36-wgs84.json?url';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import boundaries from './assets/india-current36-bounds.json';
import 'maplibre-gl/dist/maplibre-gl.css';
import './PlacesAtlas.css';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const EMPTY_SITES: SpatialSite[] = [];
const EMPTY_CODES: string[] = [];
const RAMP = ['#274745', '#35615a', '#468273', '#70a38d', '#acd0b4'];
const INDIA_BOUNDS: [[number, number], [number, number]] = [[66, 6], [99, 37.5]];
const searchCache = new Map<string, PlaceResult[]>();
let lastSearchAt = 0;
interface PlaceResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: string[];
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  category?: string;
  type?: string;
}
interface ContextBuilding { lng: number; lat: number; height?: number }
function validResult(value: unknown): value is PlaceResult {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PlaceResult>;
  return typeof item.display_name === 'string' && Number.isFinite(Number(item.lon)) && Number.isFinite(Number(item.lat)) && Number(item.lon) >= -180 && Number(item.lon) <= 180 && Number(item.lat) >= -85 && Number(item.lat) <= 85 && ['node', 'way', 'relation'].includes(item.osm_type ?? '') && Number.isFinite(item.osm_id);
}

export function PlacesAtlas({ coverage, selectedState, onStateSelect, geographyMode, sites = EMPTY_SITES, timeLabel = 'All retained dates', highlightedStateCodes = EMPTY_CODES, onSiteSelect, onEntitySelect, onUnavailable }: SpatialAtlasProps) {
  const uid = useId().replace(/:/gu, '');
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const callbacks = useRef({ onStateSelect, onUnavailable, onSiteSelect });
  callbacks.current = { onStateSelect, onUnavailable, onSiteSelect };
  const selectedStateRef = useRef(selectedState); selectedStateRef.current = selectedState;
  const [ready, setReady] = useState(false);
  const [tilesReady, setTilesReady] = useState(false);
  const [mapNotice, setMapNotice] = useState('Loading OpenStreetMap place data…');
  const [showLabels, setShowLabels] = useState(true);
  const [showBuildings, setShowBuildings] = useState(true);
  const [showStates, setShowStates] = useState(true);
  const [showSites, setShowSites] = useState(true);
  const [zoom, setZoom] = useState(4);
  const [pitch, setPitch] = useState(0);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchNotice, setSearchNotice] = useState('');
  const [searchedPlace, setSearchedPlace] = useState<PlaceResult | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [contextBuilding, setContextBuilding] = useState<ContextBuilding | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const validSites = useMemo(() => sites.filter(site => Number.isFinite(site.lon) && Number.isFinite(site.lat) && site.lon >= 65 && site.lon <= 100 && site.lat >= 5 && site.lat <= 38 && site.sourceIds.length > 0), [sites]);
  const latestSites = useRef(validSites); latestSites.current = validSites;
  const selectedSite = validSites.find(site => site.id === selectedSiteId);
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = () => reducedMotion() ? 0 : 450;
  const stateData = useMemo(() => {
    const counts = coverage.map(row => geographyMode === 'associations' ? row.associationRecords : geographyMode === 'all' ? row.records : row.coverageRecords).filter(n => n > 0).sort((a, b) => a - b);
    const thresholds = [1, 2, 3, 4].map(n => counts[Math.min(counts.length - 1, Math.floor(counts.length * n / 5))] ?? 0);
    const rows = new Map(coverage.map(row => [row.stateCode, row]));
    return boundaries.map(feature => {
      const row = rows.get(feature.code);
      const count = row ? geographyMode === 'associations' ? row.associationRecords : geographyMode === 'all' ? row.records : row.coverageRecords : 0;
      return { code: feature.code, count, color: count ? RAMP[thresholds.filter(n => count > n).length] : '#a8b4ae', selected: feature.code === selectedState, highlighted: highlightedStateCodes.includes(feature.code) };
    });
  }, [coverage, geographyMode, selectedState, highlightedStateCodes]);
  const latestStateData = useRef(stateData); latestStateData.current = stateData;
  const siteData = useMemo(() => ({ type: 'FeatureCollection', features: validSites.map(site => ({ type: 'Feature', id: site.id, geometry: { type: 'Point', coordinates: [site.lon, site.lat] }, properties: { id: site.id, label: site.label } })) }) as FeatureCollection, [validSites]);
  const latestSiteData = useRef(siteData); latestSiteData.current = siteData;
  const focusState = (code: string | null) => {
    const map = mapRef.current; if (!map) return;
    const feature = boundaries.find(item => item.code === code);
    if (!feature) { map.fitBounds(INDIA_BOUNDS, { padding: 35, duration: duration(), pitch: 0, maxZoom: 5 }); return; }
    const [west, south, east, north] = feature.bbox;
    map.fitBounds([[west, south], [east, north]], { padding: 55, duration: duration(), maxZoom: 11 });
  };
  const selectSite = (site: SpatialSite) => {
    setSelectedSiteId(site.id); setContextBuilding(null); setSearchedPlace(null);
    mapRef.current?.easeTo({ center: [site.lon, site.lat], zoom: 15.5, pitch: 50, duration: duration() });
    callbacks.current.onSiteSelect?.(site);
  };
  const selectSiteRef = useRef(selectSite); selectSiteRef.current = selectSite;

  useEffect(() => {
    let disposed = false;
    let map: LibreMap | undefined;
    let tileSuccess = false;
    let fallbackTimer = 0;
    const abort = new AbortController();
    const timeout = window.setTimeout(() => abort.abort(), 12000);
    void (async () => {
      try {
        const [libre, response] = await Promise.all([import('maplibre-gl'), fetch(STYLE_URL, { signal: abort.signal })]);
        if (!response.ok) throw new Error(`Map style returned HTTP ${response.status}`);
        const style = await response.json() as StyleSpecification;
        window.clearTimeout(timeout);
        if (disposed || !host.current) return;
        // The supplied style already uses OSM building footprints and OpenMapTiles
        // render heights. These heights can be inferred defaults, not surveys.
        libre.setWorkerUrl(maplibreWorkerUrl);
        libre.setWorkerCount(2);
        map = new libre.Map({ container: host.current, style, center: [80, 22], zoom: 4, maxZoom: 19, minZoom: 1, maxPitch: 65, attributionControl: false, renderWorldCopies: false, canvasContextAttributes: { antialias: true }, fadeDuration: reducedMotion() ? 0 : 200 });
        mapRef.current = map;
        map.addControl(new libre.NavigationControl({ visualizePitch: true }), 'top-right');
        map.addControl(new libre.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left');
        map.addControl(new libre.AttributionControl({ compact: false }), 'bottom-right');
        map.getCanvas().setAttribute('aria-label', 'Places map: cities, villages, streets and public geographic context. Arrow keys pan; plus and minus zoom.');
        map.fitBounds(INDIA_BOUNDS, { padding: 30, duration: 0, maxZoom: 5 });
        fallbackTimer = window.setTimeout(() => {
          if (!disposed && !tileSuccess) callbacks.current.onUnavailable('Street-map tiles could not be reached. The offline 2D map preserves the investigation and its 36 state boundaries.');
        }, 25000);
        map.on('load', () => {
          if (!map || disposed) return;
          const firstLabel = map.getStyle().layers.find(layer => layer.type === 'symbol')?.id;
          map.addSource('icip-states', { type: 'geojson', data: boundaryUrl, promoteId: 'code' });
          map.addLayer({ id: 'icip-state-fill', type: 'fill', source: 'icip-states', paint: { 'fill-color': ['coalesce', ['feature-state', 'color'], '#a8b4ae'], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.18, 7, 0.07, 11, 0] } }, firstLabel);
          map.addLayer({ id: 'icip-state-outline', type: 'line', source: 'icip-states', paint: { 'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#8b5511', ['boolean', ['feature-state', 'highlighted'], false], '#9d6e2c', '#35665d'], 'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.8, ['boolean', ['feature-state', 'highlighted'], false], 2, 0.85], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.85, 13, 0.28] } }, firstLabel);
          map.addSource('icip-sites', { type: 'geojson', data: latestSiteData.current });
          map.addLayer({ id: 'icip-sites-halo', type: 'circle', source: 'icip-sites', paint: { 'circle-radius': 9, 'circle-color': '#17343e', 'circle-stroke-color': '#fff6d8', 'circle-stroke-width': 2 } });
          map.addLayer({ id: 'icip-sites-dot', type: 'circle', source: 'icip-sites', paint: { 'circle-radius': 4, 'circle-color': '#e7bd76' } });
          map.addSource('icip-search', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addLayer({ id: 'icip-search-point', type: 'circle', source: 'icip-search', paint: { 'circle-radius': 7, 'circle-color': '#5c57a6', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
          latestStateData.current.forEach(state => map!.setFeatureState({ source: 'icip-states', id: state.code }, state));
          setReady(true);
        });
        map.on('idle', () => {
          if (!map || disposed || tileSuccess || !map.isStyleLoaded()) return;
          if (map.queryRenderedFeatures().some(feature => feature.source === 'openmaptiles')) {
            tileSuccess = true; window.clearTimeout(fallbackTimer); setTilesReady(true); setMapNotice('OpenStreetMap place context · zoom for streets and buildings');
          }
        });
        map.on('error', event => {
          if (disposed) return;
          const sourceError = event as unknown as { sourceId?: string };
          if (sourceError.sourceId === 'openmaptiles' || !tileSuccess) setMapNotice('Some map tiles are unavailable. The 2D map and research records remain available.');
        });
        map.on('moveend', () => { if (map && !disposed) { setZoom(map.getZoom()); setPitch(map.getPitch()); } });
        map.on('mousemove', event => {
          if (!map || !map.getLayer('icip-sites-halo')) return;
          const site = map.queryRenderedFeatures(event.point, { layers: ['icip-sites-halo'] }).length > 0;
          map.getCanvas().style.cursor = site || map.getZoom() < 8 ? 'pointer' : '';
        });
        map.on('click', event => {
          if (!map || !map.getLayer('icip-state-fill')) return;
          const siteFeature = map.queryRenderedFeatures(event.point, { layers: ['icip-sites-halo'] })[0];
          if (siteFeature) { const site = latestSites.current.find(item => item.id === siteFeature.properties.id); if (site) selectSiteRef.current(site); return; }
          if (map.getZoom() < 8) {
            const state = map.queryRenderedFeatures(event.point, { layers: ['icip-state-fill'] })[0]?.properties.code as string | undefined;
            if (state) callbacks.current.onStateSelect(selectedStateRef.current === state ? null : state);
          } else {
            const buildingLayers = ['building', 'building-3d'].filter(id => map!.getLayer(id));
            const building = buildingLayers.length ? map.queryRenderedFeatures(event.point, { layers: buildingLayers })[0] : undefined;
            if (building) { const height = Number(building.properties.render_height); setContextBuilding({ lng: event.lngLat.lng, lat: event.lngLat.lat, ...(Number.isFinite(height) ? { height } : {}) }); setSelectedSiteId(null); }
          }
        });
        map.getCanvas().addEventListener('webglcontextlost', () => { if (!disposed) callbacks.current.onUnavailable('Street-map graphics were interrupted. The offline 2D map remains available.'); });
      } catch (error) {
        window.clearTimeout(timeout);
        if (!disposed) callbacks.current.onUnavailable(`The street-map service is unavailable. The offline 2D map remains available.${import.meta.env.DEV ? ` (${error instanceof Error ? error.message : 'map initialization failed'})` : ''}`);
      }
    })();
    return () => { disposed = true; abort.abort(); window.clearTimeout(timeout); window.clearTimeout(fallbackTimer); map?.remove(); mapRef.current = null; searchAbort.current?.abort(); };
  }, []);

  useEffect(() => { const map = mapRef.current; if (ready && map) stateData.forEach(state => map.setFeatureState({ source: 'icip-states', id: state.code }, state)); }, [stateData, ready]);
  useEffect(() => { if (ready) (mapRef.current?.getSource('icip-sites') as GeoJSONSource | undefined)?.setData(siteData); }, [siteData, ready]);
  useEffect(() => {
    const map = mapRef.current; if (!ready || !map) return;
    for (const layer of map.getStyle().layers) {
      if (layer.type === 'symbol') map.setLayoutProperty(layer.id, 'visibility', showLabels ? 'visible' : 'none');
    }
    if (map.getLayer('building-3d')) map.setLayoutProperty('building-3d', 'visibility', showBuildings ? 'visible' : 'none');
    for (const id of ['icip-state-fill', 'icip-state-outline']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showStates ? 'visible' : 'none');
    for (const id of ['icip-sites-halo', 'icip-sites-dot']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', showSites ? 'visible' : 'none');
  }, [showLabels, showBuildings, showStates, showSites, ready]);

  const search = async (event: FormEvent) => {
    event.preventDefault(); const term = query.trim(); if (searching || term.length < 3) { setSearchNotice('Enter at least three characters, then submit your search.'); return; }
    const cached = searchCache.get(term.toLocaleLowerCase());
    if (cached) { setResults(cached); setSearchNotice(cached.length ? `${cached.length} matching places · cached OpenStreetMap results` : 'No matching place. Try a district, state or country.'); return; }
    if (Date.now() - lastSearchAt < 1200) { setSearchNotice('Please wait a moment before submitting another place search.'); return; }
    lastSearchAt = Date.now(); setSearching(true); setSearchNotice('Searching OpenStreetMap places…'); setResults([]);
    searchAbort.current?.abort(); const controller = new AbortController(); searchAbort.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const params = new URLSearchParams({ q: term, format: 'jsonv2', limit: '5', addressdetails: '0' });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: unknown = await response.json(); const matches = Array.isArray(data) ? data.filter(validResult).slice(0, 5) : [];
      searchCache.set(term.toLocaleLowerCase(), matches); if (searchCache.size > 20) searchCache.delete(searchCache.keys().next().value!);
      setResults(matches); setSearchNotice(matches.length ? `${matches.length} matching places · choose a result` : 'No matching place. Try a district, state or country.');
    } catch { if (searchAbort.current === controller) setSearchNotice('Place search is unavailable. You can pan and zoom the map or select a retained state or public site.'); }
    finally { window.clearTimeout(timeout); if (searchAbort.current === controller) setSearching(false); }
  };
  const choosePlace = (place: PlaceResult) => {
    setSearchedPlace(place); setResults([]); setSelectedSiteId(null); setContextBuilding(null);
    const map = mapRef.current; if (!map) return;
    const longitude = Number(place.lon); const latitude = Number(place.lat);
    const box = place.boundingbox?.map(Number);
    if (box?.length === 4 && box.every(Number.isFinite) && box[0] >= -85 && box[1] <= 85 && box[0] <= box[1] && box[2] >= -180 && box[3] <= 180 && box[2] <= box[3]) map.fitBounds([[box[2], box[0]], [box[3], box[1]]], { padding: 55, maxZoom: 16, pitch: 0, duration: duration() });
    else map.easeTo({ center: [longitude, latitude], zoom: 13, pitch: 0, duration: duration() });
    (map.getSource('icip-search') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [longitude, latitude] } }] });
    setSearchNotice('Place context selected. This search result does not add an investigation record.');
  };

  return <div className="places-atlas" data-places-ready={ready} data-places-tiles-ready={tilesReady} data-places-zoom={zoom.toFixed(2)} data-places-pitch={pitch.toFixed(1)}>
    <form id={`${uid}-search-form`} className={`places-atlas-search${searchOpen ? ' is-open' : ''}`} onSubmit={search}><label htmlFor={`${uid}-search`}>Find a city, village or place</label><div><Search size={16} aria-hidden="true" /><input id={`${uid}-search`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="City, village, street or country" autoComplete="off" /><button type="submit" disabled={searching}>{searching ? 'Searching…' : 'Find place'}</button></div><p className={`places-search-status${searchNotice ? ' has-message' : ''}`} role="status">{searchNotice || 'Worldwide place search · submit to search OpenStreetMap'}</p></form>
    {results.length > 0 && <ul className="places-atlas-results" aria-label="Place search results">{results.map(place => <li key={`${place.osm_type}:${place.osm_id}`}><button type="button" onClick={() => choosePlace(place)}><strong>{place.display_name}</strong><span>{place.category ?? 'place'} · {place.type ?? place.osm_type} · map context</span></button></li>)}</ul>}
    <div className="places-atlas-toolbar"><span>{timeLabel}</span><div><button type="button" className="places-search-toggle" aria-expanded={searchOpen} aria-controls={`${uid}-search-form`} onClick={() => { setSearchOpen(value => !value); if (!searchOpen) requestAnimationFrame(() => document.getElementById(`${uid}-search`)?.focus()); else setResults([]); }}><Search size={13} />{searchOpen ? 'Close search' : 'Find place'}</button><button type="button" onClick={() => focusState(selectedState)} aria-label={selectedState ? 'Fit selected state on places map' : 'Reset places map to India'}><Crosshair size={14} />{selectedState ? 'Fit state' : 'India'}</button><button type="button" onClick={() => mapRef.current?.easeTo({ pitch: pitch > 20 ? 0 : 55, duration: duration() })} aria-pressed={pitch > 20}>{pitch > 20 ? 'Top down' : 'Tilt map'}</button><button type="button" onClick={() => mapRef.current?.easeTo({ center: [20, 20], zoom: 1.5, pitch: 0, duration: duration() })}>World</button></div></div>
    <div ref={host} className="places-atlas-stage" aria-label="Street-level places map" />
    <div className="places-atlas-state" role="status"><span>{mapNotice}</span><span>Zoom {zoom.toFixed(1)} · {zoom < 14 ? 'Buildings appear at street scale' : 'OSM building coverage varies'}</span></div>
    <div className="places-atlas-layers" aria-label="Place map layers"><label><input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.target.checked)} /> Place names</label><label><input type="checkbox" checked={showBuildings} onChange={event => setShowBuildings(event.target.checked)} /> 3D buildings</label><label><input type="checkbox" checked={showStates} onChange={event => setShowStates(event.target.checked)} /> Research states</label><label><input type="checkbox" checked={showSites} onChange={event => setShowSites(event.target.checked)} /> Sourced sites ({validSites.length})</label></div>
    <p className="places-atlas-height-note">Buildings use mapped OSM footprints. Heights may be inferred or provider defaults; they do not represent funding or verified ownership.</p>
    {validSites.length > 0 && <label className="places-atlas-site-picker" htmlFor={`${uid}-site`}>Find a sourced public site<select id={`${uid}-site`} value={selectedSite?.id ?? ''} onChange={event => { const site = validSites.find(item => item.id === event.target.value); if (site) selectSite(site); else setSelectedSiteId(null); }}><option value="">Select a research location</option>{validSites.map(site => <option key={site.id} value={site.id}>{site.label} · {site.stateCode}</option>)}</select></label>}
    {selectedSite && <section className="places-atlas-detail" aria-label="Selected site details"><button type="button" className="places-atlas-close" aria-label="Close site details" onClick={() => setSelectedSiteId(null)}><X size={15} /></button><p className="places-atlas-kicker"><Building2 size={13} /> Research site · {selectedSite.precision} coordinate precision</p><h3>{selectedSite.label}</h3><p>{selectedSite.coordinateNote}</p><p className="places-atlas-coordinates">{selectedSite.lat.toFixed(4)}° N, {selectedSite.lon.toFixed(4)}° E</p>{selectedSite.sourceUrl && <a href={selectedSite.sourceUrl} target="_blank" rel="noopener noreferrer">{selectedSite.sourceLabel ?? 'Coordinate source'} <ArrowUpRight size={13} /></a>}<p>Site marker and building footprints are separate data. Nearby OSM buildings do not establish ownership or a relationship to this investigation.</p>{onEntitySelect && selectedSite.entityIds.map(id => <button type="button" key={id} onClick={() => onEntitySelect(id)}>Inspect linked identity <ArrowUpRight size={13} /></button>)}</section>}
    {searchedPlace && <section className="places-atlas-detail" aria-label="Selected place context"><button type="button" className="places-atlas-close" aria-label="Clear selected place" onClick={() => { setSearchedPlace(null); (mapRef.current?.getSource('icip-search') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] }); }}><X size={15} /></button><p className="places-atlas-kicker">OpenStreetMap search · {searchedPlace.type ?? 'place'}</p><h3>{searchedPlace.display_name}</h3><p>Search coordinates are a representative mapped point or area. They are not a verified institution entrance, a person’s location, or a funding destination.</p><a href={`https://www.openstreetmap.org/${searchedPlace.osm_type}/${searchedPlace.osm_id}`} target="_blank" rel="noopener noreferrer">Inspect mapped feature <ArrowUpRight size={13} /></a></section>}
    {contextBuilding && <section className="places-atlas-detail" aria-label="Mapped building context"><button type="button" className="places-atlas-close" aria-label="Close building context" onClick={() => setContextBuilding(null)}><X size={15} /></button><p className="places-atlas-kicker">Basemap context · OpenStreetMap footprint</p><h3>Mapped building</h3><p>{contextBuilding.height !== undefined ? `Rendered height: ${contextBuilding.height.toFixed(1)} m. ` : ''}The tile’s rendered height may be inferred from levels or a provider default. It is not a surveyed height and is not evidence about ownership, occupants or funding.</p><a href={`https://www.openstreetmap.org/#map=18/${contextBuilding.lat.toFixed(5)}/${contextBuilding.lng.toFixed(5)}`} target="_blank" rel="noopener noreferrer">Inspect area in OpenStreetMap <ArrowUpRight size={13} /></a></section>}
    <details className="places-atlas-legend"><summary>Map sources, controls &amp; precision</summary><p>Pan by dragging or arrow keys; scroll, pinch or use +/− to zoom. Shift-drag or Tilt map changes the camera. At national scale, click a state to filter research; use Fit state to zoom to it. Cities, villages, roads and buildings appear as their mapped detail becomes available.</p><p>Street context: <a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> / <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>, using <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors · ODbL</a>. Place search: <a href="https://nominatim.openstreetmap.org/" target="_blank" rel="noopener noreferrer">Nominatim</a>. Coverage and names are community maintained; omissions are possible. This is an open map, not Google imagery.</p><p>Building footprints are mapped OSM shapes where available. Rendered heights can be measured, inferred or provider defaults; individual height provenance is not exposed by these tiles. No research funding value controls building height. Public research site markers have their own source and precision.</p><p>Research state boundaries use the retained LGD snapshot in WGS84, simplified at 0.001°. Boundaries may differ from the basemap, including disputed areas. They are not parcel or cadastral boundaries. Time filters affect research evidence, not the present-day basemap. Country-context financial records are not plotted at invented points.</p></details>
  </div>;
}
export default PlacesAtlas;

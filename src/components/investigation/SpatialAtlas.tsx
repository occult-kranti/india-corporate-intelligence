import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Building2, Crosshair, Minus, Plus, RotateCcw, X } from 'lucide-react';
import type { InvestigationStateCoverage } from '../../data/investigation';
import geometry from './assets/india-current36.json';
import './SpatialAtlas.css';
import { projectAtlasCoordinate } from './spatialProjection';
export { projectAtlasCoordinate } from './spatialProjection';

export interface SpatialSite {
  id: string;
  label: string;
  entityIds: string[];
  recordIds: string[];
  lon: number;
  lat: number;
  precision: 'building' | 'campus' | 'locality';
  sourceIds: string[];
  stateCode: string;
  kind: 'institution' | 'office' | 'project';
  coordinateNote: string;
  sourceLabel?: string;
  sourceUrl?: string;
}
export interface SpatialArc {
  id: string;
  fromSiteId: string;
  toSiteId: string;
  label: string;
  sourceUrl?: string;
  kind: 'relationship' | 'funding';
}
export interface SpatialAtlasProps {
  coverage: InvestigationStateCoverage[];
  selectedState: string | null;
  onStateSelect: (code: string | null) => void;
  geographyMode: 'coverage' | 'associations' | 'all';
  sites?: SpatialSite[];
  arcs?: SpatialArc[];
  timeLabel?: string;
  highlightedStateCodes?: string[];
  onSiteSelect?: (site: SpatialSite) => void;
  onEntitySelect?: (id: string) => void;
  onUnavailable: (reason: string) => void;
}
type CameraAction = 'in' | 'out' | 'north' | 'south' | 'east' | 'west' | 'tilt' | 'reset' | 'focus';
interface Engine {
  update: (coverage: InvestigationStateCoverage[], mode: SpatialAtlasProps['geographyMode'], selected: string | null, sites: SpatialSite[], arcs: SpatialArc[], sitesVisible?: boolean, highlightedCodes?: string[]) => void;
  camera: (action: CameraAction, state?: string | null, site?: SpatialSite) => void;
  destroy: () => void;
}
const EMPTY_SITES: SpatialSite[] = [];
const EMPTY_ARCS: SpatialArc[] = [];
const EMPTY_CODES: string[] = [];
const RAMP = ['#19404a', '#245761', '#32747a', '#569b96', '#97c8b4'];
const countFor = (row: InvestigationStateCoverage, mode: SpatialAtlasProps['geographyMode']) => mode === 'associations' ? row.associationRecords : mode === 'all' ? row.records : row.coverageRecords;


export function SpatialAtlas({ coverage, selectedState, onStateSelect, geographyMode, sites = EMPTY_SITES, arcs = EMPTY_ARCS, timeLabel = 'All recorded dates', highlightedStateCodes = EMPTY_CODES, onSiteSelect, onEntitySelect, onUnavailable }: SpatialAtlasProps) {
  const uid = useId().replace(/:/gu, '');
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const callbacks = useRef({ onStateSelect, onUnavailable });
  callbacks.current = { onStateSelect, onUnavailable };
  const latest = useRef({ coverage, geographyMode, selectedState, sites, arcs });
  latest.current = { coverage, geographyMode, selectedState, sites, arcs };
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedArcId, setSelectedArcId] = useState<string | null>(null);
  const [showSites, setShowSites] = useState(true);
  const [showArcs, setShowArcs] = useState(true);
  const validSites = useMemo(() => sites.filter(site => Number.isFinite(site.lon) && Number.isFinite(site.lat) && site.lon >= 65 && site.lon <= 100 && site.lat >= 5 && site.lat <= 38 && site.sourceIds.length > 0 && geometry.states.some(state => state.code === site.stateCode)), [sites]);
  const siteIds = useMemo(() => new Set(validSites.map(site => site.id)), [validSites]);
  const validArcs = useMemo(() => arcs.filter(arc => siteIds.has(arc.fromSiteId) && siteIds.has(arc.toSiteId)), [arcs, siteIds]);
  latest.current = { coverage, geographyMode, selectedState, sites: validSites, arcs: showArcs ? validArcs : EMPTY_ARCS };
  const selectedSite = validSites.find(site => site.id === selectedSiteId);
  const selectedArc = validArcs.find(arc => arc.id === selectedArcId);
  const activeState = geometry.states.find(state => state.code === (hovered ?? selectedState));
  const activeRow = coverage.find(row => row.stateCode === activeState?.code);
  const selectSite = (site: SpatialSite) => { setSelectedSiteId(site.id); setSelectedArcId(null); engine.current?.camera('focus', null, site); onSiteSelect?.(site); };

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const target = host.current;
    if (!target) return;
    void (async () => {
      try {
        const [THREE, { OrbitControls }, { SVGLoader }] = await Promise.all([import('three'), import('three/addons/controls/OrbitControls.js'), import('three/addons/loaders/SVGLoader.js')]);
        if (cancelled) return;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        cleanup = () => { renderer.dispose(); renderer.domElement.remove(); };
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.setClearColor('#071c24', 1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        target.prepend(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false;
        controls.enableRotate = true;
        controls.minDistance = 80;
        controls.maxDistance = 1900;
        controls.minPolarAngle = 0.08;
        controls.maxPolarAngle = Math.PI * 0.44;
        controls.minAzimuthAngle = 0; controls.maxAzimuthAngle = 0;
        controls.screenSpacePanning = false;
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
        controls.touches.ONE = THREE.TOUCH.PAN;
        controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
        scene.add(new THREE.HemisphereLight('#e8f9f0', '#12303b', 1.8));
        const light = new THREE.DirectionalLight('#ffefcd', 1.4); light.position.set(-260, 600, 240); scene.add(light);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(2300, 2300), new THREE.MeshBasicMaterial({ color: '#071c24' }));
        floor.rotation.x = -Math.PI / 2; floor.position.y = -3; scene.add(floor);
        const grid = new THREE.GridHelper(1600, 32, '#22444d', '#112f39'); grid.position.y = -2; scene.add(grid);
        const stateMeshes = new Map<string, InstanceType<typeof THREE.Mesh>>();
        const stateOutlines = new Map<string, InstanceType<typeof THREE.LineSegments>>();
        const heights = new Map<string, number>();
        const loader = new SVGLoader();
        const hitTargets: InstanceType<typeof THREE.Object3D>[] = [];
        for (const state of geometry.states) {
          const parsed = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="${state.path}"/></svg>`);
          const shapes = parsed.paths.flatMap(path => SVGLoader.createShapes(path));
          const extruded = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, steps: 1, curveSegments: 1 });
          extruded.scale(1, -1, 1); extruded.translate(-320, 360, 0); extruded.rotateX(-Math.PI / 2);
          // Reflecting SVG's downward y axis reverses winding. Restore triangle
          // order so front faces, lighting and pointer raycasts agree.
          for (const attribute of Object.values(extruded.attributes)) {
            const array = attribute.array;
            for (let vertex = 0; vertex < attribute.count; vertex += 3) {
              for (let axis = 0; axis < attribute.itemSize; axis++) {
                const a = (vertex + 1) * attribute.itemSize + axis; const b = (vertex + 2) * attribute.itemSize + axis;
                const value = array[a]; array[a] = array[b]; array[b] = value;
              }
            }
            attribute.needsUpdate = true;
          }
          extruded.computeVertexNormals();
          const mesh = new THREE.Mesh(extruded, [new THREE.MeshStandardMaterial({ color: RAMP[0], roughness: 0.9, metalness: 0.03 }), new THREE.MeshStandardMaterial({ color: '#143640', roughness: 1 })]);
          mesh.userData.stateCode = state.code; scene.add(mesh); stateMeshes.set(state.code, mesh); hitTargets.push(mesh);
          // A contour on every retained polygon preserves islands and tiny UTs.
          const contourPoints: number[] = [];
          for (const path of parsed.paths) for (const subpath of path.subPaths) {
            const points = subpath.getPoints(1);
            for (let i = 0; i < points.length - 1; i++) contourPoints.push(points[i].x - 320, 1.04, points[i].y - 360, points[i + 1].x - 320, 1.04, points[i + 1].y - 360);
          }
          const contour = new THREE.BufferGeometry(); contour.setAttribute('position', new THREE.Float32BufferAttribute(contourPoints, 3));
          const edge = new THREE.LineSegments(contour, new THREE.LineBasicMaterial({ color: '#739f9e', transparent: true, opacity: 0.42 }));
          scene.add(edge); stateOutlines.set(state.code, edge);
        }
        const sitesGroup = new THREE.Group(); const arcsGroup = new THREE.Group(); scene.add(sitesGroup, arcsGroup);
        let currentSites: SpatialSite[] = [];
        let frame = 0;
        let destroyed = false;
        let defaultView = true;
        let fitDefaultView = () => {};
        const draw = () => {
          frame = 0;
          if (destroyed) return;
          renderer.render(scene, camera);
          const rect = target.getBoundingClientRect();
          labels.current?.querySelectorAll<HTMLElement>('[data-atlas-label]').forEach(label => {
            const code = label.dataset.stateCode;
            const state = code ? geometry.states.find(item => item.code === code) : undefined;
            const site = label.dataset.siteId ? currentSites.find(item => item.id === label.dataset.siteId) : undefined;
            if (!state && !site) return;
            const [x, z] = site ? projectAtlasCoordinate(site.lon, site.lat) : [state!.x, state!.y];
            const point = new THREE.Vector3(x - 320, (heights.get(site?.stateCode ?? state!.code) ?? 2) + (site ? 16 : 2), z - 360).project(camera);
            const px = (point.x + 1) / 2 * rect.width; const py = (1 - point.y) / 2 * rect.height;
            label.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;
            label.style.visibility = point.z < 1 && px > 0 && px < rect.width && py > 12 && py < rect.height - 12 ? 'visible' : 'hidden';
          });
        };
        const render = () => { if (!frame && !destroyed) frame = requestAnimationFrame(draw); };
        controls.addEventListener('change', render);
        const resize = () => { const rect = target.getBoundingClientRect(); if (!rect.width || !rect.height) return; renderer.setSize(rect.width, rect.height); camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); if (defaultView) fitDefaultView(); render(); };
        const observer = new ResizeObserver(resize); observer.observe(target);
        const disposeGroup = (group: InstanceType<typeof THREE.Group>) => { for (const object of [...group.children]) { group.remove(object); object.traverse(child => { const item = child as InstanceType<typeof THREE.Mesh>; item.geometry?.dispose(); if (item.material) (Array.isArray(item.material) ? item.material : [item.material]).forEach(material => material.dispose()); }); } };
        const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
        let down = { x: 0, y: 0 };
        const pick = (event: PointerEvent) => { const rect = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2); raycaster.setFromCamera(pointer, camera); return raycaster.intersectObjects(hitTargets, false)[0]?.object.userData.stateCode as string | undefined; };
        const pointerDown = (event: PointerEvent) => { down = { x: event.clientX, y: event.clientY }; };
        const pointerUp = (event: PointerEvent) => { if (event.button !== 0 || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) return; const code = pick(event); if (code) callbacks.current.onStateSelect(latest.current.selectedState === code ? null : code); };
        const pointerMove = (event: PointerEvent) => { if (!event.buttons) { const code = pick(event); setHovered(code ?? null); renderer.domElement.style.cursor = code ? 'pointer' : 'grab'; } };
        const pointerLeave = () => setHovered(null);
        const contextLost = (event: Event) => { event.preventDefault(); callbacks.current.onUnavailable('The 3D graphics context was interrupted. The geographic 2D map remains available.'); };
        renderer.domElement.addEventListener('pointerdown', pointerDown);
        renderer.domElement.addEventListener('pointerup', pointerUp);
        renderer.domElement.addEventListener('pointermove', pointerMove);
        renderer.domElement.addEventListener('pointerleave', pointerLeave);
        renderer.domElement.addEventListener('webglcontextlost', contextLost);
        const api: Engine = {
          update(rows, mode, selected, siteRows, arcRows, sitesVisible = true, highlightedCodes = EMPTY_CODES) {
            const values = rows.map(row => countFor(row, mode)).filter(value => value > 0).sort((a, b) => a - b);
            const max = values[values.length - 1] ?? 1;
            const thresholds = [1, 2, 3, 4].map(n => values[Math.min(values.length - 1, Math.floor(values.length * n / 5))] ?? 0);
            for (const state of geometry.states) {
              const row = rows.find(item => item.stateCode === state.code); const value = row ? countFor(row, mode) : 0;
              const height = value ? 3 + 37 * Math.sqrt(value / max) : 2; heights.set(state.code, height);
              const mesh = stateMeshes.get(state.code)!; mesh.scale.y = height;
              const materials = mesh.material as InstanceType<typeof THREE.MeshStandardMaterial>[];
              materials[0].color.set(state.code === selected ? '#b2dcca' : value ? RAMP[thresholds.filter(t => value > t).length] : '#152f39');
              materials[1].color.set(state.code === selected ? '#6c9d8d' : '#143640');
              const edge = stateOutlines.get(state.code)!; edge.scale.y = height;
              const material = edge.material as InstanceType<typeof THREE.LineBasicMaterial>;
              material.color.set(state.code === selected ? '#fff0cc' : highlightedCodes.includes(state.code) ? '#e7bd76' : '#8ac4bf'); material.opacity = state.code === selected || highlightedCodes.includes(state.code) ? 1 : 0.4;
            }
            currentSites = siteRows;
            disposeGroup(sitesGroup); disposeGroup(arcsGroup);
            for (const site of sitesVisible ? siteRows : EMPTY_SITES) {
              const [x, z] = projectAtlasCoordinate(site.lon, site.lat); const y = heights.get(site.stateCode) ?? 2;
              const material = new THREE.MeshStandardMaterial({ color: '#e7bd76', roughness: 0.7 });
              const building = new THREE.Mesh(new THREE.BoxGeometry(5, 9, 5), material); building.position.set(x - 320, y + 4.5, z - 360); sitesGroup.add(building);
              const roof = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 7), material.clone()); roof.position.set(x - 320, y + 9.5, z - 360); sitesGroup.add(roof);
              const halo = new THREE.Mesh(new THREE.RingGeometry(6, 7, 24), new THREE.MeshBasicMaterial({ color: '#e7bd76', transparent: true, opacity: 0.75, side: THREE.DoubleSide })); halo.rotation.x = -Math.PI / 2; halo.position.set(x - 320, y + 0.6, z - 360); sitesGroup.add(halo);
            }
            for (const arc of arcRows) {
              const from = siteRows.find(site => site.id === arc.fromSiteId); const to = siteRows.find(site => site.id === arc.toSiteId); if (!from || !to) continue;
              const [fx, fz] = projectAtlasCoordinate(from.lon, from.lat); const [tx, tz] = projectAtlasCoordinate(to.lon, to.lat);
              const a = new THREE.Vector3(fx - 320, (heights.get(from.stateCode) ?? 2) + 12, fz - 360);
              const b = new THREE.Vector3(tx - 320, (heights.get(to.stateCode) ?? 2) + 12, tz - 360);
              const midpoint = a.clone().lerp(b, 0.5); midpoint.y += Math.min(100, Math.max(25, a.distanceTo(b) * 0.22));
              const curve = new THREE.QuadraticBezierCurve3(a, midpoint, b);
              const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), new THREE.LineDashedMaterial({ color: arc.kind === 'funding' ? '#e7bd76' : '#a7d7d0', dashSize: 5, gapSize: arc.kind === 'funding' ? 0 : 3, transparent: true, opacity: 0.8 })); line.computeLineDistances(); arcsGroup.add(line);
            }
            render();
          },
          camera(action, state, site) {
            defaultView = action === 'reset';
            const direction = camera.position.clone().sub(controls.target);
            if (action === 'reset') { const distance = Math.max(1050, 560 / (2 * Math.tan(Math.PI / 9) * camera.aspect) * 1.12); controls.target.set(0, 0, 60); camera.position.copy(controls.target).add(new THREE.Vector3(0, 0.82, 0.57).normalize().multiplyScalar(distance)); }
            else if (action === 'in' || action === 'out') { direction.multiplyScalar(action === 'in' ? 0.78 : 1.28); direction.clampLength(controls.minDistance, controls.maxDistance); camera.position.copy(controls.target).add(direction); }
            else if (action === 'tilt') { const spherical = new THREE.Spherical().setFromVector3(direction); spherical.phi = spherical.phi > 0.7 ? 0.25 : 0.98; camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); }
            else if (action === 'focus') {
              const region = geometry.states.find(item => item.code === state);
              if (site || region) { const [x, z] = site ? projectAtlasCoordinate(site.lon, site.lat) : [region!.x, region!.y]; controls.target.set(x - 320, 0, z - 360); const distance = site ? 130 : Math.max(200, (region!.clearance || 10) * 11); camera.position.copy(controls.target).add(direction.normalize().multiplyScalar(distance)); }
            } else { const distance = direction.length() * 0.085; const offset = new THREE.Vector3(action === 'east' ? distance : action === 'west' ? -distance : 0, 0, action === 'south' ? distance : action === 'north' ? -distance : 0); controls.target.add(offset); camera.position.add(offset); }
            controls.update(); render();
          },
          destroy() {
            destroyed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
            renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('pointermove', pointerMove); renderer.domElement.removeEventListener('pointerleave', pointerLeave); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
            scene.traverse(object => { const item = object as InstanceType<typeof THREE.Mesh>; item.geometry?.dispose(); if (item.material) (Array.isArray(item.material) ? item.material : [item.material]).forEach(material => material.dispose()); });
            renderer.dispose(); renderer.domElement.remove();
          },
        };
        cleanup = api.destroy; engine.current = api; fitDefaultView = () => api.camera('reset'); resize(); api.camera('reset');
        const current = latest.current; api.update(current.coverage, current.geographyMode, current.selectedState, current.sites, current.arcs);
        setReady(true);
      } catch (error) {
        cleanup?.();
        if (!cancelled) callbacks.current.onUnavailable(`3D graphics are unavailable on this device. The geographic 2D map remains available.${import.meta.env.DEV ? ` (${error instanceof Error ? error.message : 'initialization failed'})` : ''}`);
      }
    })();
    return () => { cancelled = true; cleanup?.(); engine.current = null; };
  }, []);

  useEffect(() => { engine.current?.update(coverage, geographyMode, selectedState, validSites, showArcs ? validArcs : EMPTY_ARCS, showSites, highlightedStateCodes); }, [coverage, geographyMode, selectedState, validSites, validArcs, showSites, showArcs, highlightedStateCodes, ready]);
  const cameraAction = (action: CameraAction) => engine.current?.camera(action, selectedState);
  return <div className="spatial-atlas" data-atlas-ready={ready}>
    <div className="spatial-atlas-toolbar"><span><i aria-hidden="true" />3D geographic evidence</span><span className="spatial-atlas-time">{timeLabel}</span></div>
    <div className="spatial-atlas-canvas" ref={host} tabIndex={0} role="group" aria-label="Interactive 3D India map" aria-describedby={`${uid}-instructions`} onKeyDown={event => {
      const actions: Record<string, CameraAction> = { '+': 'in', '=': 'in', '-': 'out', ArrowUp: 'north', ArrowDown: 'south', ArrowLeft: 'west', ArrowRight: 'east', t: 'tilt', Home: 'reset' };
      if (event.target !== event.currentTarget) return;
      if (actions[event.key]) { event.preventDefault(); cameraAction(actions[event.key]); }
      if (event.key === 'Escape') { setSelectedSiteId(null); setSelectedArcId(null); }
    }}>
      {!ready && <p className="spatial-atlas-loading" role="status">Preparing geographic geometry…</p>}
      <div ref={labels} className="spatial-atlas-labels">
        {geometry.states.map(state => <span key={state.code} data-atlas-label data-state-code={state.code} className={`spatial-state-label${selectedState === state.code ? ' is-selected' : ''}`} aria-hidden="true">{state.code}</span>)}
        {showSites && validSites.map(site => <button type="button" key={site.id} data-atlas-label data-site-id={site.id} className={`spatial-site-marker${selectedSite?.id === site.id ? ' is-selected' : ''}`} onClick={() => selectSite(site)} aria-label={`${site.label}, ${site.precision} precision. Inspect site`} title={site.label}><Building2 size={14} aria-hidden="true" /><span>{site.label}</span></button>)}
      </div>
      <div className="spatial-atlas-compass" aria-hidden="true"><span>N</span><ArrowUp size={21} /><small>LGD · INDIA</small></div>
      <div className="spatial-atlas-camera" aria-label="Map camera controls">
        <button type="button" onClick={() => cameraAction('in')} aria-label="Zoom in"><Plus size={17} /></button><button type="button" onClick={() => cameraAction('out')} aria-label="Zoom out"><Minus size={17} /></button>
        <button type="button" onClick={() => cameraAction('tilt')} aria-label="Change camera tilt">Tilt</button><button type="button" onClick={() => cameraAction('reset')} aria-label="Reset map camera"><RotateCcw size={16} /></button>
        <button type="button" disabled={!selectedState} onClick={() => cameraAction('focus')} aria-label="Zoom to selected state"><Crosshair size={16} /></button>
      </div>
      <div className="spatial-atlas-pan" aria-label="Pan map"><button type="button" onClick={() => cameraAction('west')} aria-label="Pan west"><ArrowLeft size={14} /></button><button type="button" onClick={() => cameraAction('north')} aria-label="Pan north"><ArrowUp size={14} /></button><button type="button" onClick={() => cameraAction('south')} aria-label="Pan south"><ArrowDown size={14} /></button><button type="button" onClick={() => cameraAction('east')} aria-label="Pan east"><ArrowRight size={14} /></button></div>
      <div className="spatial-atlas-readout" role="status"><strong>{activeState?.name ?? 'India · 36 states & union territories'}</strong><span>{activeRow ? `${countFor(activeRow, geographyMode).toLocaleString()} matching records · ${activeRow.entities.toLocaleString()} linked entities` : 'Select a state to trace its recorded connections'}</span></div>
    </div>
    <p className="spatial-atlas-instructions" id={`${uid}-instructions`}>Drag to pan · scroll or pinch to zoom · right-drag or use Tilt to change angle. Keyboard: arrows pan, +/− zoom, T tilts, Home resets. Select a state above for an equivalent geographic control.</p>
    <div className="spatial-atlas-layers"><label><input type="checkbox" checked={showSites} onChange={event => setShowSites(event.target.checked)} /> Sourced sites <b>{validSites.length}</b></label><label><input type="checkbox" checked={showArcs} onChange={event => setShowArcs(event.target.checked)} /> Recorded links <b>{validArcs.length}</b></label></div>
    {validSites.length > 0 && <label className="spatial-atlas-site-picker" htmlFor={`${uid}-site`}><span>Find a public site</span><select id={`${uid}-site`} value={selectedSite?.id ?? ''} onChange={event => { const site = validSites.find(item => item.id === event.target.value); if (site) selectSite(site); else setSelectedSiteId(null); }}><option value="">Select a sourced location</option>{validSites.map(site => <option key={site.id} value={site.id}>{site.label} · {site.stateCode}</option>)}</select></label>}
    {selectedSite && <section className="spatial-atlas-popover" aria-label="Selected site details"><button type="button" className="spatial-atlas-close" aria-label="Close site details" onClick={() => setSelectedSiteId(null)}><X size={15} /></button><p className="spatial-atlas-kicker">{selectedSite.kind} · {selectedSite.precision} coordinate precision</p><h3>{selectedSite.label}</h3><p className="spatial-atlas-coordinates">{selectedSite.lat.toFixed(4)}° N, {selectedSite.lon.toFixed(4)}° E · {selectedSite.stateCode}</p><p>{selectedSite.coordinateNote}</p><p className="spatial-atlas-site-caveat">Schematic building symbol. Footprint and height are not surveyed. This location does not locate any person or establish where programme spending occurred.</p>{selectedSite.sourceUrl ? <a href={selectedSite.sourceUrl} target="_blank" rel="noopener noreferrer">{selectedSite.sourceLabel ?? 'Coordinate source'} ↗</a> : <p>Source references: {selectedSite.sourceIds.join(', ')}</p>}{onEntitySelect && selectedSite.entityIds.map(id => <button type="button" key={id} onClick={() => onEntitySelect(id)}>Inspect linked identity <span className="spatial-atlas-entity-id">{id}</span><ArrowRight size={14} /></button>)}</section>}
    {validArcs.length > 0 && <details className="spatial-atlas-links"><summary>Inspect {validArcs.length} mapped relationship{validArcs.length === 1 ? '' : 's'}</summary><ul>{validArcs.map(arc => <li key={arc.id}><button type="button" aria-pressed={selectedArc?.id === arc.id} onClick={() => { setSelectedArcId(arc.id); setSelectedSiteId(null); }}>{arc.label}</button>{selectedArc?.id === arc.id && <p>{arc.kind === 'funding' ? 'Recorded funding relationship' : 'Recorded relationship'} · endpoints are sourced sites. Arc height and width do not encode amount or strength. {arc.sourceUrl && <a href={arc.sourceUrl} target="_blank" rel="noopener noreferrer">Open source ↗</a>}</p>}</li>)}</ul></details>}
    <dl className="spatial-atlas-legend"><div><dt><i className="spatial-key-height" /> State height</dt><dd>Relative matching record count (square-root scale), rescaled to this view. Not elevation, money or misconduct. Reference grid is schematic.</dd></div><div><dt><Building2 size={14} /> Site symbols</dt><dd>Source-backed public locations; equal schematic building heights. People without sourced public-site associations remain in the graph.</dd></div><div><dt><i className="spatial-key-arc" /> Arcs & time</dt><dd>Arcs connect recorded relationships, not physical routes. Time filters recorded evidence; it does not reconstruct historical borders or imply activity on every date.</dd></div></dl>
  </div>;
}
export default SpatialAtlas;

import * as THREE from "three";
import type { CaseGraphicsHost } from "./profile-host/graphics-contract";
import { suspendGeography, captureGeography, type GeographicSnapshot } from "./profile-host/geographicLease";
let graphicsIdentity = 0;
import {
  Map as GeoMap,
  MercatorCoordinate,
  LngLatBounds,
  setWorkerUrl,
  type MapMouseEvent,
  type CustomLayerInterface,
  type GeoJSONSource,
  type CustomRenderMethodInput,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { PreviewData, SceneNode } from "./model";
import { type GeoAnchor } from "./geography";
import { loadMapBoundaries } from "./cartographyAssets";
import type { GeographicCollection } from "./geography";
import {
  planSemanticDisplay,
  WORLD_STACK_ZOOM_THRESHOLD,
  type SemanticDisplayGroup,
} from "./semanticZoom";
import type {
  CameraCommand,
  JourneyState,
  LabelPosition,
  SceneMetric,
  DisplaySummary,
} from "./scene-types";
import { feltMapStyle } from "./geoStyle";
import { WORLD_CAMERA_BOUNDS } from "./mapBounds";
import { easedProgress } from "./cameraMath";
import {
  makeScreenThreadGeometry,
  constrainThreadMaterial,
  threadProjectionScale,
  threadRadiusPixels,
  THREAD_OPACITY,
} from "./threadGeometry";
import { projectThreadSegments, threadSegmentDistance, THREAD_SEGMENTS, type ThreadPoint } from "./threadProjection";
setWorkerUrl(workerUrl);
export const CATEGORY_COLORS: Record<string, string> = {
  funding: "#d3a752",
  procurement: "#c6785c",
  legal: "#83b5b1",
  organisations: "#c7c7a7",
  people: "#d3a752",
  review: "#ab95b8",
  policy: "#91b69e",
};
export interface WorldCallbacks {
  onSelect: (id: string, kind: "node" | "edge") => void;
  onLabels: (labels: LabelPosition[]) => void;
  onJourney: (state: JourneyState) => void;
  onMetric: (metric: SceneMetric) => void;
  onFailure: (reason: string) => void;
  onMapStatus?: (status: string) => void;
  onInteraction?: () => void;
  onDisplay?: (summary: DisplaySummary) => void;
  onGraphics?: (graphics: CaseGraphicsHost | null) => void;
}
interface Pose {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
}
interface Journey {
  edgeId: string | null;
  from: Pose;
  to: Pose;
  elapsed: number;
  duration: number;
  paused: boolean;
  curve?: THREE.CatmullRomCurve3;
  startAnchor?: GeoAnchor;
  endAnchor?: GeoAnchor;
}
const HOME: Pose = { center: [27, 18], zoom: 1.5, pitch: 18, bearing: 0 };
function colorCanvas(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  draw(ctx);
  return c;
}
function feltPixels(base: string) {
  let n = 19;
  const random = () =>
    ((n = Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296;
  const canvas = colorCanvas(128, 128, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 7000; i++) {
      ctx.strokeStyle =
        random() > 0.5 ? "rgba(174,201,142,.10)" : "rgba(5,29,18,.16)";
      ctx.lineWidth = 0.4;
      const x = random() * 128,
        y = random() * 128;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + random() * 3 - 1.5, y + random() * 3 - 1.5);
      ctx.stroke();
    }
  });
  return canvas.getContext("2d")!.getImageData(0, 0, 128, 128);
}
function paperTexture(
  node: SceneNode,
  count: number,
  anchor: GeoAnchor,
  display?: SemanticDisplayGroup,
) {
  const isStack = display?.kind === "country-stack";
  const canvas = colorCanvas(768, 448, (ctx) => {
    ctx.fillStyle = "#e9dfbf";
    ctx.fillRect(0, 0, 768, 448);
    ctx.fillStyle = "#657257";
    ctx.font = "19px monospace";
    ctx.fillText(
      isStack
        ? `COUNTRY STACK · ${display.areaCount} DOCUMENTED AREAS`
        : `${anchor.precision.toUpperCase()} CONTEXT · ${count} RECORD${count === 1 ? "" : "S"}`,
      35,
      53,
    );
    ctx.fillStyle = "#293f2d";
    ctx.font = "bold 35px Georgia";
    const words = (
      isStack
        ? `${display.countryLabel}: ${display.memberCount} retained items`
        : node.title
    ).split(/\s+/);
    let row = "",
      line = 0;
    for (const word of words) {
      const next = (row + " " + word).trim();
      if (ctx.measureText(next).width > 690 && row) {
        ctx.fillText(row, 35, 118 + line * 43);
        row = word;
        if (++line >= 3) break;
      } else row = next;
    }
    if (line < 3) ctx.fillText(row, 35, 118 + line * 43);
    ctx.fillStyle = "#737c60";
    ctx.font = "19px Georgia";
    ctx.fillText(
      isStack
        ? "Expand to original areas and evidence."
        : "Read the original source and its limits.",
      35,
      320,
    );
    ctx.strokeStyle = "#b7b297";
    ctx.beginPath();
    ctx.moveTo(35, 356);
    ctx.lineTo(733, 356);
    ctx.stroke();
    ctx.font = "18px monospace";
    ctx.fillText(
      isStack
        ? "DISPLAY GROUP ONLY · NOT AN ENTITY"
        : `${node.item.sourceIds.length} SOURCE REFERENCES · NOT AN ADDRESS`,
      35,
      397,
    );
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function disposeGroup(group: THREE.Group) {
  group.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      o.geometry.dispose();
      for (const material of Array.isArray(o.material)
        ? o.material
        : [o.material]) {
        (material as THREE.MeshBasicMaterial).map?.dispose();
        material.dispose();
      }
    }
  });
  group.clear();
}
function coordinate(anchor: GeoAnchor) {
  const c = MercatorCoordinate.fromLngLat([anchor.lng, anchor.lat]);
  return new THREE.Vector3(c.x, c.y, c.z);
}
function geographicCurve(a: GeoAnchor, b: GeoAnchor) {
  const start = coordinate(a),
    end = coordinate(b);
  const distance = start.distanceTo(end);
  const middle = start.clone().lerp(end, 0.5);
  middle.z = Math.min(0.025, distance * 0.18);
  if (distance < 1e-8) {
    middle.x += 0.003;
    middle.z = 0.002;
  }
  return new THREE.CatmullRomCurve3([
    start,
    start.clone().lerp(middle, 0.6),
    middle,
    middle.clone().lerp(end, 0.4),
    end,
  ]);
}
export class EvidenceWorld {
  private map: GeoMap;
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private renderer: THREE.WebGLRenderer | null = null;
  private group = new THREE.Group();
  private curveGroup = new THREE.Group();
  private data: PreviewData;
  private anchors = new Map<string, GeoAnchor>();
  private nodeObjects = new Map<string, THREE.Group>();
  private curves = new Map<string, THREE.CatmullRomCurve3>();
  private selected = "";
  private areaBoundaries: GeographicCollection | null = null;
  private displayGroups = new Map<string, SemanticDisplayGroup>();
  private displayPlan: ReturnType<typeof planSemanticDisplay> | null = null;
  private maxThreadRadius = 0;
  private ready = false;
  private reduced = false;
  private cities = true;
  private disposed = false;
  private graphicsFatal = false;
  private workspaceActive = false;
  private releaseGeography: (() => void) | null = null;
  private workspaceSnapshot: GeographicSnapshot | null = null;
  private beforeGraphicsDispose = new Set<() => void>();
  private readonly graphicsIdentity = ++graphicsIdentity;
  private journey: Journey | null = null;
  private history: Pose[] = [];
  private raf = 0;
  private lastTick = 0;
  private lastLabels = 0;
  private lastMetric = 0;
  private frames = 0;
  private lowSamples = 0;
  private quality: "high" | "balanced" = "high";
  private observer: ResizeObserver;
  private tileErrorCount = 0;
  private lastTravelFrame = 0;
  private lastJourneyEmit = 0;
  private pendingCommand: CameraCommand | null = null;
  private threadRadiusUniform = { value: 1 };
  private threadLiftUniform = { value: 1 };
  constructor(
    private container: HTMLElement,
    data: PreviewData,
    private cb: WorldCallbacks,
  ) {
    this.data = data;
    this.scene.add(this.group, this.curveGroup);
    this.scene.add(new THREE.AmbientLight("#f3ecd1", 2.5));
    const key = new THREE.DirectionalLight("#ffdfaa", 3);
    key.position.set(-0.3, -0.5, 1);
    this.scene.add(key);
    this.map = new GeoMap({
      container,
      style: feltMapStyle(),
      ...HOME,
      maxZoom: 19,
      minZoom: 0.6,
      maxPitch: 70,
      renderWorldCopies: false,
      maxBounds: WORLD_CAMERA_BOUNDS,
      canvasContextAttributes: { antialias: true, preserveDrawingBuffer: true },
      attributionControl: { compact: true },
      pixelRatio: Math.min(window.devicePixelRatio, 1.5),
      fadeDuration: 0,
    });
    this.map
      .getCanvas()
      .setAttribute(
        "aria-label",
        "Continuous felt world map. Drag to pan, right-drag to tilt and rotate, and scroll to zoom.",
      );
    this.map.getCanvas().setAttribute("role", "img");
    this.map.on("load", this.onLoad);
    this.map.on("error", this.onError);
    this.map.on("move", this.onMove);
    this.map.on("moveend", () => this.updateLabels(true));
    this.map.on("idle", () => {
      if (this.ready) {
        this.container.dataset.buildingFeatures = String(
          this.map.queryRenderedFeatures({ layers: ["buildings-3d"] }).length,
        );
        this.container.dataset.countryBaseFeatures = String(
          this.map.queryRenderedFeatures({ layers: ["country-base"] }).length,
        );
        this.container.dataset.tilesLoaded = String(this.map.areTilesLoaded());
      }
    });
    this.map.on("dragstart", this.onInteract);
    this.map.on("zoomstart", this.onInteract);
    this.map.on("rotatestart", this.onInteract);
    this.map.on("pitchstart", this.onInteract);
    this.map.on("click", this.onClick);
    this.map
      .getCanvas()
      .addEventListener("webglcontextlost", this.onContextLoss);
    this.observer = new ResizeObserver(() => this.map.resize());
    this.observer.observe(container);
    this.raf = requestAnimationFrame(this.tick);
  }
  private onLoad = () => {
    if (this.disposed) return;
    this.map.addImage("felt-land", feltPixels("#246342"));
    this.map.addImage("felt-water", feltPixels("#123e2d"));
    this.map.setPaintProperty(
      "felt-ground",
      "background-pattern",
      "felt-water",
    );
    this.map.setPaintProperty("country-base", "fill-pattern", "felt-land");
    this.map.setPaintProperty("water", "fill-pattern", "felt-water");
    this.map.addSource("evidence-locations", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    this.map.addSource("evidence-areas", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    this.map.addLayer({
      id: "evidence-area-fill",
      type: "fill",
      source: "evidence-areas",
      maxzoom: 9,
      paint: { "fill-color": "#b8b46b", "fill-opacity": 0.1 },
    });
    this.map.addLayer({
      id: "evidence-area-outline",
      type: "line",
      source: "evidence-areas",
      maxzoom: 9,
      paint: {
        "line-color": "#d2bb77",
        "line-opacity": 0.75,
        "line-width": 1.4,
        "line-dasharray": [2, 2],
      },
    });
    this.map.addLayer({
      id: "pin-pick-targets",
      type: "circle",
      source: "evidence-locations",
      paint: {
        "circle-radius": 12,
        "circle-color": "#c9aa64",
        "circle-opacity": 0,
      },
    });
    const layer: CustomLayerInterface = {
      id: "physical-evidence",
      type: "custom",
      renderingMode: "3d",
      onAdd: (_map, gl) => {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.map.getCanvas(),
          context: gl,
          antialias: true,
        });
        this.renderer.autoClear = false;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.3;
      },
      render: (_gl, args) => this.render(args),
    };
    this.map.addLayer(layer);
    this.ready = true;
    this.cb.onGraphics?.({
      map: this.map, renderer: this.renderer!, identity: this.graphicsIdentity,
      isUsable: () => !this.disposed && !this.graphicsFatal && this.ready,
      captureGeography: () => structuredClone(this.workspaceSnapshot ?? captureGeography(this.map)),
      adoptGeography: (snapshot) => { this.workspaceSnapshot = structuredClone(snapshot); },
      setWorkspaceActive: (active) => this.setWorkspaceActive(active),
      stopGeographicJourney: () => this.stopGeographicJourney(),
      failSharedRenderer: (reason) => this.failSharedRenderer(reason),
      beforeDispose: (cleanup) => { this.beforeGraphicsDispose.add(cleanup); return () => this.beforeGraphicsDispose.delete(cleanup); },
    });
    void loadMapBoundaries()
      .then((boundaries) => {
        if (this.disposed) return;
        this.areaBoundaries = boundaries;
        this.updateAreaBoundaries();
      })
      .catch(() =>
        this.cb.onMapStatus?.(
          "Some local area outlines could not load. Retained records and source-qualified area markers remain available.",
        ),
      );
    this.setData(this.data);
    this.setCities(this.cities);
    if (this.pendingCommand) {
      const pending = this.pendingCommand;
      this.pendingCommand = null;
      this.command(pending);
    }
    this.map.triggerRepaint();
  };
  private onError = (event: { error: { message: string } }) => {
    this.tileErrorCount++;
    this.cb.onMapStatus?.(
      `Some street or building tiles could not load (${this.tileErrorCount}). The public-domain country base and retained records remain available.`,
    );
    this.container.dataset.tileStatus = "unavailable";
    this.container.dataset.tileError = event.error.message;
    if (/WebGL|context|GPU/i.test(event.error.message))
      this.failSharedRenderer(
        "WebGL could not start. Retained records are available in reading mode.",
      );
  };
  private onContextLoss = (event: Event) => {
    event.preventDefault();
    this.failSharedRenderer(
      "The graphics context was lost. All records remain available in reading mode.",
    );
  };
  private onMove = () => {
    const mode =
      this.map.getZoom() < WORLD_STACK_ZOOM_THRESHOLD ? "world" : "areas";
    if (this.ready && this.displayPlan?.mode !== mode) this.rebuildDisplay();
    this.updateLabels();
  };
  private onInteract = (event: { originalEvent?: Event }) => {
    if (this.workspaceActive || this.graphicsFatal) return;
    if (event.originalEvent) this.cb.onInteraction?.();
    if (event.originalEvent && this.journey) {
      this.journey.paused = true;
      this.map.stop();
      this.emitJourney();
    }
  };
  private onClick = (event: MapMouseEvent) => {
    if (!this.ready || this.workspaceActive || this.graphicsFatal) return;
    let nearest: { id: string; distance: number; stack: boolean } | null = null;
    for (const display of this.displayGroups.values()) {
      const { anchor, records } = display;
      const id =
        records.find((n) => n.id === this.selected)?.id ?? records[0].id;
      const p = this.map.project([anchor.lng, anchor.lat]);
      const distance = Math.hypot(event.point.x - p.x, event.point.y - p.y);
      if (distance < 24 && (!nearest || distance < nearest.distance))
        nearest = {
          id: display.kind === "country-stack" ? display.key : id,
          distance,
          stack: display.kind === "country-stack",
        };
    }
    if (nearest) {
      if (nearest.stack) {
        this.expandStack(nearest.id);
        return;
      }
      this.cb.onSelect(nearest.id, "node");
      return;
    }
    let threadHit: { id: string; distance: number } | null = null;
    // The retained display map is selected-first; a tied crossing keeps that exact ID.
    for (const [id, curve] of this.curves) {
      const points = curve.getSpacedPoints(THREAD_SEGMENTS).map(p => [p.x, p.y, p.z] as ThreadPoint);
      const segments = projectThreadSegments(points, this.camera.projectionMatrix.elements,
        this.container.clientWidth, this.container.clientHeight, this.threadLiftUniform.value);
      for (const segment of segments) {
        const distance = threadSegmentDistance(event.point.x, event.point.y, segment);
        if (distance < 9 && (!threadHit || distance < threadHit.distance)) threadHit = { id, distance };
      }
    }
    if (threadHit) this.cb.onSelect(threadHit.id, "edge");
  };
  private pose(): Pose {
    const c = this.map.getCenter();
    return {
      center: [c.lng, c.lat],
      zoom: this.map.getZoom(),
      pitch: this.map.getPitch(),
      bearing: this.map.getBearing(),
    };
  }
  private remember() {
    this.history.push(this.pose());
    if (this.history.length > 20) this.history.shift();
  }
  setData(data: PreviewData) {
    this.data = data;
    this.stop();
    if (!this.ready) return;
    this.rebuildDisplay();
  }
  private rebuildDisplay() {
    const display = planSemanticDisplay(
      this.data,
      this.selected,
      this.map.getZoom(),
    );
    this.displayPlan = display;
    this.anchors = display.anchors;
    this.displayGroups = display.groups;
    disposeGroup(this.group);
    this.nodeObjects.clear();
    for (const item of display.groups.values()) {
      const records = item.records;
      const node =
        records.find(
          (n) => n.id === this.selected || item.selectedIds.includes(n.id),
        ) ?? records[0];
      const a = item.anchor;
      const p = coordinate(a);
      const group = new THREE.Group();
      group.position.copy(p);
      group.userData.ids = records.map((r) => r.id);
      group.userData.display = item;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 11, 6),
        new THREE.MeshStandardMaterial({
          color: "#a4aa94",
          metalness: 0.8,
          roughness: 0.4,
        }),
      );
      stem.rotation.x = Math.PI / 2;
      stem.position.z = 5;
      group.add(stem);
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(3.4, 12, 8),
        new THREE.MeshStandardMaterial({
          color: node.kind === "record" ? "#b7644d" : "#d0ad62",
          metalness: 0.65,
          roughness: 0.4,
        }),
      );
      pin.position.z = 11;
      group.add(pin);
      const card = new THREE.Mesh(
        new THREE.PlaneGeometry(58, 34),
        new THREE.MeshStandardMaterial({
          map: paperTexture(node, records.length, a, item),
          roughness: 0.96,
          side: THREE.DoubleSide,
        }),
      );
      card.rotation.z = -0.08;
      card.position.set(17, 24, 3);
      group.add(card);
      this.group.add(group);
      for (const record of records) this.nodeObjects.set(record.id, group);
    }
    this.rebuildThreads();
    const source = this.map.getSource("evidence-locations") as GeoJSONSource;
    source.setData({
      type: "FeatureCollection",
      features: [...display.groups.values()].map((item) => {
        const { records, anchor: a } = item;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [a.lng, a.lat] },
          properties: {
            id: item.key,
            displayKind: item.kind,
            count: records.length,
            precision: a.precision,
          },
        };
      }),
    });
    this.updateAreaBoundaries();
    this.container.dataset.placedPins = String(this.anchors.size);
    this.container.dataset.unplacedPins = String(
      this.data.nodes.length - this.anchors.size,
    );
    this.map.triggerRepaint();
    this.updateLabels(true);
  }
  private updateAreaBoundaries() {
    if (!this.ready || !this.areaBoundaries) return;
    const ids = new Set(
      [...this.displayGroups.values()].map(
        (group) => group.anchor.geometryFeatureId,
      ),
    );
    const features = this.areaBoundaries.features.filter((feature) =>
      ids.has(String(feature.id)),
    );
    (this.map.getSource("evidence-areas") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: features as never[],
    });
  }
  private rebuildThreads() {
    const display = this.displayPlan;
    if (!display) return;
    disposeGroup(this.curveGroup);
    this.curves.clear();
    for (const edge of display.rendered) {
      const a = this.anchors.get(edge.from),
        b = this.anchors.get(edge.to);
      if (!a || !b || Math.hypot(a.lng - b.lng, a.lat - b.lat) < 1e-8) continue;
      const curve = geographicCurve(a, b);
      this.curves.set(edge.id, curve);

      const material = new THREE.MeshStandardMaterial({
        color: CATEGORY_COLORS[edge.relationship.layers[0]] ?? "#bcbea0",
        roughness: 1,
        transparent: true,
        opacity: 0.9,
      });
      constrainThreadMaterial(
        material,
        this.threadRadiusUniform,
        this.threadLiftUniform,
      );
      const mesh = new THREE.Mesh(
        makeScreenThreadGeometry(curve, edge.sourceCount),
        material,
      );
      mesh.userData.edgeId = edge.id;
      this.curveGroup.add(mesh);
    }
    this.maxThreadRadius = Math.max(
      0,
      ...display.rendered.map((e) => threadRadiusPixels(e.sourceCount)),
    );
    this.container.dataset.eligibleThreads = String(display.candidates.length);
    this.container.dataset.renderedThreads = String(display.rendered.length);
    this.container.dataset.areaGroups = String(display.areaGroupCount);
    this.container.dataset.semanticMode = display.mode;
    this.container.dataset.displayGroups = String(display.groups.size);
    this.container.dataset.countryStacks = String(display.countryStacks.size);
    this.container.dataset.selectedEndpointGroups = String(
      [...display.groups.values()].filter((g) => g.kind === "selected-area")
        .length,
    );
    this.container.dataset.renderedEdgeIds = JSON.stringify(
      display.rendered.map((e) => e.id),
    );
    this.cb.onDisplay?.({
      mode: display.mode,
      visibleGroups: display.groups.size,
      countryStacks: display.countryStacks.size,
      areaGroups: display.areaGroupCount,
      candidates: display.candidates.length,
      renderedThreads: display.rendered.length,
    });
  }
  setSelected(id: string) {
    const changed = this.selected !== id;
    this.selected = id;
    if (this.ready && changed) this.rebuildDisplay();
    for (const group of this.group.children) {
      const pin = group.children[1] as THREE.Mesh;
      const material = pin.material as THREE.MeshStandardMaterial;
      const active = group.userData.ids.includes(id);
      material.emissive.set(active ? "#675528" : "#000000");
      material.emissiveIntensity = active ? 0.7 : 0;
    }
    this.map.triggerRepaint();
    this.updateLabels(true);
  }
  private expandStack(key: string) {
    const stack = this.displayGroups.get(key);
    if (!stack || stack.kind !== "country-stack") return;
    this.cb.onInteraction?.();
    this.go({
      center: [stack.anchor.lng, stack.anchor.lat],
      zoom: Math.max(
        WORLD_STACK_ZOOM_THRESHOLD + 0.5,
        Math.min(4, stack.anchor.focusZoom),
      ),
      pitch: 18,
      bearing: 0,
    });
  }
  setReducedMotion(value: boolean) {
    this.reduced = value;
    if (value && this.journey) {
      this.map.jumpTo(this.journey.to);
      this.stop();
    }
  }
  setCities(value: boolean) {
    this.cities = value;
    if (this.ready && this.map.getLayer("buildings-3d"))
      this.map.setLayoutProperty(
        "buildings-3d",
        "visibility",
        value ? "visible" : "none",
      );
  }
  private go(to: Pose, duration = 1800) {
    this.remember();
    this.stop();
    if (this.reduced) {
      this.map.jumpTo(to);
      return;
    }
    this.journey = {
      edgeId: null,
      from: this.pose(),
      to,
      elapsed: 0,
      duration,
      paused: false,
    };
    this.emitJourney();
  }
  private focus(anchor: GeoAnchor): Pose {
    return {
      center: [anchor.lng, anchor.lat],
      zoom: anchor.focusZoom,
      pitch:
        anchor.precision === "site" || anchor.precision === "city" ? 58 : 25,
      bearing: 0,
    };
  }
  command(command: CameraCommand) {
    if (this.workspaceActive || this.graphicsFatal || this.disposed) return;
    if (!this.ready) {
      this.pendingCommand = command;
      return;
    }
    const anchor = command.id ? this.anchors.get(command.id) : null;
    const pose = this.pose();
    switch (command.type) {
      case "home":
        this.go(HOME);
        break;
      case "fit": {
        const locations = [...this.anchors.values()];
        if (!locations.length) break;
        const bounds = new LngLatBounds();
        for (const a of locations) bounds.extend([a.lng, a.lat]);
        const fit = this.map.cameraForBounds(bounds, {
          padding: 140,
          maxZoom: 5,
        });
        if (fit)
          this.go({
            center: [
              (fit.center as { lng: number }).lng ??
                (fit.center as [number, number])[0],
              (fit.center as { lat: number }).lat ??
                (fit.center as [number, number])[1],
            ],
            zoom: fit.zoom ?? 3,
            pitch: 18,
            bearing: 0,
          });
        break;
      }
      case "expand-stack":
        if (command.id) this.expandStack(command.id);
        break;
      case "focus":
        if (anchor) this.go(this.focus(anchor));
        break;
      case "city": {
        const cities: Record<string, [number, number]> = {
          delhi: [77.2075, 28.617],
          mumbai: [72.8345, 18.9405],
          london: [-0.12575, 51.499],
        };
        const coordinate = command.id ? cities[command.id] : undefined;
        if (coordinate)
          this.go(
            { center: coordinate, zoom: 16.3, pitch: 58, bearing: -22 },
            6500,
          );
        break;
      }
      case "follow": {
        const edge = this.data.edges.find((e) => e.id === command.id);
        const from = edge ? this.anchors.get(edge.from) : null,
          to = edge ? this.anchors.get(edge.to) : null;
        if (!edge || !from || !to) break;
        if (Math.hypot(from.lng - to.lng, from.lat - to.lat) < 1e-8) {
          this.go(this.focus(to));
          break;
        }
        this.remember();
        const target = this.focus(to);
        if (this.reduced) {
          this.map.jumpTo(target);
          this.stop();
          break;
        }
        this.journey = {
          edgeId: edge.id,
          from: pose,
          to: target,
          elapsed: 0,
          duration: 11000,
          paused: false,
          curve: this.curves.get(edge.id) ?? geographicCurve(from, to),
          startAnchor: from,
          endAnchor: to,
        };
        this.emitJourney();
        break;
      }
      case "pause":
        if (this.journey) this.journey.paused = true;
        this.emitJourney();
        break;
      case "resume":
        if (this.journey) this.journey.paused = false;
        this.emitJourney();
        break;
      case "stop":
        this.stop();
        break;
      case "back": {
        const old = this.history.pop();
        if (old) {
          this.go(old);
          this.history.pop();
        }
        break;
      }
      case "top":
        this.go({ ...pose, pitch: 0, bearing: 0 });
        break;
      case "zoom-in":
        this.go({ ...pose, zoom: Math.min(19, pose.zoom + 1) }, 600);
        break;
      case "zoom-out":
        this.go({ ...pose, zoom: Math.max(0.6, pose.zoom - 1) }, 600);
        break;
      case "orbit-left":
        this.go(
          {
            ...pose,
            bearing: pose.bearing - 25,
            pitch: Math.max(pose.pitch, 35),
          },
          600,
        );
        break;
      case "orbit-right":
        this.go(
          {
            ...pose,
            bearing: pose.bearing + 25,
            pitch: Math.max(pose.pitch, 35),
          },
          600,
        );
        break;
    }
  }
  private stop() {
    this.journey = null;
    this.map.stop();
    this.emitJourney();
  }
  private emitJourney() {
    const j = this.journey;
    this.cb.onJourney({
      phase: j ? (j.paused ? "paused" : "moving") : "idle",
      progress: j ? j.elapsed / j.duration : 0,
      edgeId: j?.edgeId ?? null,
    });
  }
  private updateLabels(force = false) {
    if (this.workspaceActive || this.graphicsFatal || this.disposed) { this.cb.onLabels([]); return; }
    const now = performance.now();
    if (!force && now - this.lastLabels < 100) return;
    this.lastLabels = now;
    const width = this.container.clientWidth,
      height = this.container.clientHeight;
    const occupied: { x: number; y: number }[] = [];
    const labels: LabelPosition[] = [];
    const list = [...this.displayGroups.values()].sort(
      (a, b) =>
        Number(b.kind === "country-stack") -
          Number(a.kind === "country-stack") ||
        Number(b.kind === "selected-area") - Number(a.kind === "selected-area"),
    );
    for (const display of list) {
      const node =
        display.records.find(
          (n) => n.id === this.selected || display.selectedIds.includes(n.id),
        ) ?? display.records[0];
      const anchor = display.anchor;
      const p = this.map.project([anchor.lng, anchor.lat]);
      const within = p.x > 8 && p.x < width - 8 && p.y > 8 && p.y < height - 8;
      const collision = occupied.some(
        (q) => Math.abs(p.x - q.x) < 200 && Math.abs(p.y - q.y) < 45,
      );
      const visible = within && !collision && occupied.length < 12;
      if (visible) occupied.push({ x: p.x, y: p.y });
      const stack = display.kind === "country-stack";
      labels.push({
        id: stack ? display.key : node.id,
        title: stack
          ? `${display.countryLabel} stack · ${display.memberCount} items · ${display.areaCount} areas · Expand`
          : `${display.kind === "selected-area" ? "Selected endpoint · " : ""}${anchor.label} · ${display.memberCount} items`,
        x: p.x,
        y: p.y - 19,
        visible,
        kind: stack ? "stack" : node.kind,
        distance: 0,
      });
    }
    const edge = this.data.edges.find((e) => e.id === this.selected),
      curve = edge ? this.curves.get(edge.id) : null;
    if (edge && curve) {
      const point = curve.getPoint(0.5),
        ll = new MercatorCoordinate(point.x, point.y).toLngLat(),
        p = this.map.project(ll);
      labels.unshift({
        id: edge.id,
        title: `${edge.sourceCount} distinct source IDs · ${edge.relationship.label}`,
        x: p.x,
        y: p.y,
        visible: p.x > 0 && p.x < width && p.y > 0 && p.y < height,
        kind: "edge",
        distance: 0,
      });
    }
    this.cb.onLabels(labels);
  }
  private publishGeographicPose(phase: "workspace-acquisition" | "geographic-render") {
    const center = this.map.getCenter();
    this.container.dataset.geographicPose = JSON.stringify({ phase, pose: {
      center: [center.lng, center.lat], zoom: this.map.getZoom(),
      pitch: this.map.getPitch(), bearing: this.map.getBearing(),
    } });
  }
  private render(args: CustomRenderMethodInput) {
    if (!this.renderer || this.disposed || this.graphicsFatal || this.workspaceActive) return;
    this.camera.projectionMatrix.fromArray(
      args.defaultProjectionData.mainMatrix,
    );
    this.camera.projectionMatrixInverse
      .copy(this.camera.projectionMatrix)
      .invert();
    const unit = 1 / (512 * 2 ** this.map.getZoom());
    const occupiedCards: { x: number; y: number }[] = [];
    const orderedGroups = [...this.group.children].sort(
      (a, b) =>
        Number(b.userData.ids.includes(this.selected)) -
        Number(a.userData.ids.includes(this.selected)),
    );
    for (const group of orderedGroups) {
      group.scale.setScalar(unit);
      const display = group.userData.display as SemanticDisplayGroup;
      const point = this.map.project([display.anchor.lng, display.anchor.lat]);
      const collision = occupiedCards.some(
        (q) => Math.abs(point.x - q.x) < 85 && Math.abs(point.y - q.y) < 50,
      );
      const card = group.children[2];
      card.visible =
        this.map.getZoom() < 8 &&
        display.kind !== "selected-area" &&
        !collision;
      if (card.visible) occupiedCards.push({ x: point.x, y: point.y });
    }
    const projection = threadProjectionScale(this.map.getZoom());
    this.threadRadiusUniform.value = projection.radius;
    this.threadLiftUniform.value = projection.lift;
    for (const mesh of this.curveGroup.children) {
      (mesh as THREE.Mesh).visible = true;
      const material = (mesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
      material.opacity = THREAD_OPACITY;
    }
    // Every geographic boundary resets Three's logical state AND its default-target viewport.
    // The case offscreen pass may have changed both, including after MapLibre resizes.
    try {
      this.renderer.resetState();
      this.renderer.setRenderTarget(null);
      const gl = this.renderer.getContext(), ratio = this.renderer.getPixelRatio();
      this.renderer.setViewport(0, 0, gl.drawingBufferWidth / ratio, gl.drawingBufferHeight / ratio);
      this.renderer.setScissorTest(false);
      if (this.graphicsFatal) return;
      this.renderer.render(this.scene, this.camera);
      this.renderer.resetState();
    } catch (error) { this.failSharedRenderer(String(error)); return; }
    this.frames++;
    this.container.dataset.renderer = "maplibre-three-mercator";
    this.container.dataset.drawCalls = String(this.renderer.info.render.calls);
    this.container.dataset.zoom = this.map.getZoom().toFixed(2);
    this.container.dataset.pitch = this.map.getPitch().toFixed(1);
    this.container.dataset.threadRadiusPixels = String(this.maxThreadRadius);
    this.container.dataset.visibleThreads = String(
      this.curveGroup.children.filter((mesh) => mesh.visible).length,
    );
    this.container.dataset.centerLng = this.map.getCenter().lng.toFixed(6);
    this.container.dataset.centerLat = this.map.getCenter().lat.toFixed(6);
    this.publishGeographicPose("geographic-render");
    const now = performance.now();
    if (now - this.lastMetric > 2000) {
      const seconds = this.lastMetric ? (now - this.lastMetric) / 1000 : 2;
      const fps = Math.round(this.frames / seconds);
      if (
        this.journey &&
        !this.journey.paused &&
        fps < 35 &&
        this.quality === "high"
      ) {
        if (++this.lowSamples >= 2) {
          this.quality = "balanced";
          this.map.setPixelRatio(1);
        }
      } else this.lowSamples = 0;
      this.cb.onMetric({
        fps,
        calls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        quality: this.quality,
        frameBudget: this.quality === "high" ? 16.7 : 33.3,
      });
      this.frames = 0;
      this.lastMetric = now;
    }
  }
  private tick = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    const delta = this.lastTick ? Math.min(100, now - this.lastTick) : 0;
    this.lastTick = now;
    if (document.hidden || !this.ready || this.workspaceActive || this.graphicsFatal) return;
    const j = this.journey;
    if (!j || j.paused) return;
    j.elapsed = Math.min(j.duration, j.elapsed + delta);
    if (this.quality === "balanced" && now - this.lastTravelFrame < 33.3)
      return;
    this.lastTravelFrame = now;
    const t = j.elapsed / j.duration,
      s = easedProgress(t);
    let target: Pose;
    if (j.curve && j.startAnchor && j.endAnchor) {
      const globe = Math.min(1, t / 0.72),
        point = j.curve.getPoint(easedProgress(globe));
      const ll = new MercatorCoordinate(point.x, point.y).toLngLat();
      const start = easedProgress(Math.min(1, t / 0.15));
      const arrive = easedProgress(Math.max(0, (t - 0.72) / 0.28));
      target = {
        center:
          t < 0.15
            ? [
                j.from.center[0] +
                  (j.startAnchor.lng - j.from.center[0]) * start,
                j.from.center[1] +
                  (j.startAnchor.lat - j.from.center[1]) * start,
              ]
            : [ll.lng, ll.lat],
        zoom:
          t < 0.15
            ? j.from.zoom + (2.5 - j.from.zoom) * start
            : 2.5 + (j.to.zoom - 2.5) * arrive,
        pitch: 18 + (j.to.pitch - 18) * arrive,
        bearing: j.to.bearing * arrive,
      };
    } else {
      target = {
        center: [
          j.from.center[0] + (j.to.center[0] - j.from.center[0]) * s,
          j.from.center[1] + (j.to.center[1] - j.from.center[1]) * s,
        ],
        zoom: j.from.zoom + (j.to.zoom - j.from.zoom) * s,
        pitch: j.from.pitch + (j.to.pitch - j.from.pitch) * s,
        bearing: j.from.bearing + (j.to.bearing - j.from.bearing) * s,
      };
    }
    this.map.jumpTo(target);
    if (now - this.lastJourneyEmit >= 100) {
      this.emitJourney();
      this.lastJourneyEmit = now;
    }
    if (t === 1) {
      this.journey = null;
      this.cb.onJourney({ phase: "idle", progress: 1, edgeId: j.edgeId });
    }
  };
  stopGeographicJourney() {
    this.pendingCommand = null;
    this.stop();
  }
  setWorkspaceActive(active: boolean) {
    if (this.disposed || this.workspaceActive === active) return;
    this.workspaceActive = active;
    this.container.dataset.geographicWorkspaceActive = String(active);
    this.stopGeographicJourney();
    try {
      if (active) {
        this.workspaceSnapshot ??= captureGeography(this.map);
        // A travel tick may have advanced the map since the last geographic draw.
        // Observe live acquisition state independently of the restoration target.
        this.publishGeographicPose("workspace-acquisition");
        this.releaseGeography = suspendGeography(this.map, () => this.workspaceSnapshot!);
      } else { const release = this.releaseGeography; this.releaseGeography = null; release?.(); this.workspaceSnapshot = null; }
    } catch (error) { this.failSharedRenderer(String(error)); }
    this.updateLabels(true);
    this.map.triggerRepaint();
  }
  private failSharedRenderer(reason: string) {
    if (this.disposed || this.graphicsFatal) return;
    this.graphicsFatal = true; // synchronous: no later geographic Three render in this frame
    this.container.dataset.graphicsFatal = "true";
    this.stopGeographicJourney();
    this.cb.onLabels([]);
    queueMicrotask(() => { if (!this.disposed) this.cb.onFailure(reason); });
  }
  dispose() {
    if (this.disposed) return;
    // The case adapter/layer must detach while the map and renderer still exist.
    for (const cleanup of [...this.beforeGraphicsDispose]) try { cleanup(); } catch { this.graphicsFatal = true; }
    this.beforeGraphicsDispose.clear();
    this.releaseGeography = null; // a dying renderer/map does not restore input or focus
    this.cb.onGraphics?.(null);
    this.disposed = true;
    this.journey = null;
    this.cb.onJourney({ phase: "idle", progress: 0, edgeId: null });
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.map
      .getCanvas()
      .removeEventListener("webglcontextlost", this.onContextLoss);
    disposeGroup(this.group);
    disposeGroup(this.curveGroup);
    this.renderer?.dispose();
    this.map.remove();
  }
}

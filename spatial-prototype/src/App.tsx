import { buildCasebookPacket } from "./casebookWithCorrections";
import { sourceCorrection, presentationCorrection, sourceCitationCorrection, presentationTitle, presentationSummary, presentationTier } from "./sourceCorrections";
import {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Compass,
  ExternalLink,
  Focus,
  Globe2,
  HelpCircle,
  Home,
  Layers3,
  MapPin,
  Minus,
  Pause,
  Pin,
  Play,
  Plus,
  Search,
  Square,
  Volume2,
  VolumeX,
  X,
  Download,
  RotateCcw,
  RotateCw,
  Move3D,
  CalendarDays,
  Building2,
} from "lucide-react";
const SpatialWorld = lazy(() => import("./SpatialWorld"));
const CaseWorkspace = lazy(() => import("./profile-host/CaseWorkspace"));
import type { CaseGraphicsHost } from "./profile-host/graphics-contract";
import type { GeographicSnapshot } from "./profile-host/geographicLease";
import RegistryReader from "./RegistryReader";
import MapBoundary from "./MapBoundary";
import { originalRoute, safeSourceUrl } from "./navigation";
import { planGeographicDisplay } from "./displayBudget";
import {
  buildPreview,
  buildEvidenceScene,
  factualScene,
  isHeldItem,
  filterScene,
  registry as previewRegistry,
  type SceneEdge,
} from "./model";
import {
  CASEBOOK_KEY,
  emptyCasebook,
  parseCasebook,
  type CasebookData,
  type CasebookSelection,
} from "./casebookStore";
import type { InvestigationLayer, InvestigationRegistry } from "./domain";
import type {
  CameraCommand,
  JourneyState,
  SceneMetric,
  DisplaySummary,
} from "./scene-types";
import {
  getNodeAnchor,
  getUnplacedReason,
  getGeographicScene,
  GEOGRAPHIC_CAVEAT,
} from "./geography";
import { useNarration } from "./useNarration";
import { buildNarrationTranscript } from "./narrationTranscript";
import cityMetadata from "./assets/city-metadata.json";
import { GuidedTutorial } from "./guidance/GuidedTutorial";
import atlasGuide from "./guidance/atlas-guide.json";
const readable = (word: string) => word.replace(/-/g, " ");
const itemTitle = presentationTitle;
function readBook() {
  try {
    const raw = localStorage.getItem(CASEBOOK_KEY);
    const value = raw ? parseCasebook(JSON.parse(raw)) : emptyCasebook();
    return {
      book: value ?? emptyCasebook(),
      error: value
        ? ""
        : "Your saved casebook could not be read. It has not been changed.",
    };
  } catch {
    return {
      book: emptyCasebook(),
      error:
        "Browser storage is unavailable. Changes will stay in this tab; export your casebook before closing.",
    };
  }
}
function makeDownload(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App({
  registry = previewRegistry,
  dataset = "preview",
}: {
  registry?: InvestigationRegistry;
  dataset?: "full" | "preview";
}) {
  const preview = useMemo(
    () => (dataset === "full" ? buildEvidenceScene(registry, { requireAllTargets: true }) : buildPreview()),
    [registry, dataset],
  );
  const nodes = useMemo(
    () => new Map(preview.nodes.map((n) => [n.id, n])),
    [preview],
  );
  const edges = useMemo(
    () => new Map(preview.edges.map((e) => [e.id, e])),
    [preview],
  );
  const sources = useMemo(
    () => new Map(registry.sources.map((s) => [s.id, s])),
    [registry],
  );
  const [namespace, setNamespace] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const availableAreas = useMemo(
    () =>
      [
        ...new Map(
          factualScene(preview).nodes.flatMap((n) => {
            const a = getNodeAnchor(n);
            return a ? [[a.areaCode, a] as const] : [];
          }),
        ).values(),
      ].sort((a, b) => a.label.localeCompare(b.label)),
    [preview],
  );
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [exploring, setExploring] = useState(false);
  const [activeLayers, setActiveLayers] = useState<InvestigationLayer[]>([]);
  const [year, setYear] = useState(preview.yearRange[1]);
  const [undated, setUndated] = useState(true);
  const [reading, setReading] = useState(
    () => new URLSearchParams(location.search).get("mode") === "reading",
  );
  const [caseOpen, setCaseOpen] = useState(false);
  const [caseLoadError, setCaseLoadError] = useState("");
  const [graphics, setGraphics] = useState<CaseGraphicsHost | null>(null);
  const [graphicsGeneration, setGraphicsGeneration] = useState(0);
  const caseOpener = useRef<HTMLButtonElement>(null);
  const caseGeography = useRef<GeographicSnapshot | null>(null);
  const acceptGraphics = useCallback((binding: CaseGraphicsHost | null) => {
    if (binding && caseOpen && caseGeography.current) binding.adoptGeography(caseGeography.current);
    setGraphics(binding);
  }, [caseOpen]);
  const closeCases = useCallback(() => { setCaseOpen(false); requestAnimationFrame(() => caseOpener.current?.focus()); }, []);
  const caseNoteKeys = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "Escape") { event.preventDefault(); closeCases(); }
    else if (event.key === "Tab") {
      const items = [...event.currentTarget.querySelectorAll<HTMLElement>("button,summary")];
      const index = items.indexOf(document.activeElement as HTMLElement);
      event.preventDefault(); items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
    }
  };
  useEffect(() => { graphics?.setWorkspaceActive(caseOpen); }, [graphics, caseOpen]);
  const [cities, setCities] = useState(true);
  const [cityInfo, setCityInfo] = useState(false);
  const [failure, setFailure] = useState("");
  const [mapStatus, setMapStatus] = useState("");
  const [selected, setSelected] = useState(preview.nodes[0]?.id ?? "");
  const [inspector, setInspector] = useState<string | null>(null);
  const [inspectorLocked, setInspectorLocked] = useState(false);
  const [command, setCommand] = useState<CameraCommand | null>(null);
  const [journey, setJourney] = useState<JourneyState>({
    phase: "idle",
    progress: 0,
    edgeId: null,
  });
  const [metric, setMetric] = useState<SceneMetric | null>(null);
  const [displaySummary, setDisplaySummary] = useState<DisplaySummary | null>(
    null,
  );
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [saved, setSaved] = useState(readBook);
  const [message, setMessage] = useState("");
  const lastFocus = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const narration = useNarration();
  const filteredScene = useMemo(
    () =>
      filterScene(preview, {
        query: deferredQuery,
        namespace,
        layers: activeLayers,
        fromYear: preview.yearRange[0],
        toYear: year,
        includeUndated: undated,
      }),
    [preview, deferredQuery, namespace, activeLayers, year, undated],
  );
  const scene = useMemo(() => {
    if (!areaFilter) return filteredScene;
    const nodes = filteredScene.nodes.filter((n) =>
      areaFilter === "unplaced"
        ? !getNodeAnchor(n)
        : getNodeAnchor(n)?.areaCode === areaFilter,
    );
    const ids = new Set(nodes.map((n) => n.id));
    return {
      ...filteredScene,
      nodes,
      edges: filteredScene.edges.filter(
        (e) => ids.has(e.from) && ids.has(e.to),
      ),
    };
  }, [filteredScene, areaFilter]);
  const enterReading = useCallback(() => {
    setCommand(null);
    setJourney({ phase: "idle", progress: 0, edgeId: null });
    setReading(true);
  }, []);
  const send = useCallback((type: CameraCommand["type"], id?: string) => {
    if (caseOpen) return;
    if (type !== "stop") setExploring(true);
    setCommand({ type, id, stamp: performance.now() });
  }, [caseOpen]);
  const open = useCallback(
    (id: string, _kind: "node" | "edge") => {
      lastFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setSelected(id);
      if (!inspectorLocked) setInspector(id);
    },
    [inspectorLocked, send],
  );
  const inspectionNode = inspector ? nodes.get(inspector) : undefined;
  const inspectionEdge = inspector ? edges.get(inspector) : undefined;
  const item = inspectionNode?.item ?? inspectionEdge?.relationship;
  const selection: CasebookSelection | null = inspectionNode
    ? { kind: inspectionNode.kind, id: inspectionNode.id }
    : inspectionEdge
      ? { kind: "relationship", id: inspectionEdge.id }
      : null;
  const pinned = selection
    ? saved.book.pins.find(
        (p) => p.kind === selection.kind && p.id === selection.id,
      )
    : undefined;
  const mapScene = useMemo(() => {
    const accepted = filterScene(factualScene(preview), {
      query: deferredQuery,
      namespace,
      layers: activeLayers,
      fromYear: preview.yearRange[0],
      toYear: year,
      includeUndated: undated,
    });
    if (!areaFilter) return accepted;
    const nodes = accepted.nodes.filter((n) =>
      areaFilter === "unplaced"
        ? !getNodeAnchor(n)
        : getNodeAnchor(n)?.areaCode === areaFilter,
    );
    const ids = new Set(nodes.map((n) => n.id));
    return {
      ...accepted,
      nodes,
      edges: accepted.edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
    };
  }, [
    preview,
    deferredQuery,
    namespace,
    activeLayers,
    year,
    undated,
    areaFilter,
  ]);
  const display = useMemo(
    () => planGeographicDisplay(mapScene, selected),
    [mapScene, selected],
  );
  const geographicScene = useMemo(
    () => getGeographicScene(mapScene),
    [mapScene],
  );
  const mapNodeIds = useMemo(
    () => new Set(mapScene.nodes.map((n) => n.id)),
    [mapScene],
  );
  const mapEdgeIds = useMemo(
    () => new Set(mapScene.edges.map((e) => e.id)),
    [mapScene],
  );
  const canFollow = (edge?: SceneEdge) =>
    !!edge &&
    mapEdgeIds.has(edge.id) &&
    !failure &&
    mapNodeIds.has(edge.from) &&
    mapNodeIds.has(edge.to) &&
    !!getNodeAnchor(nodes.get(edge.from)!) &&
    !!getNodeAnchor(nodes.get(edge.to)!);
  const inspectionHeld = !!item && isHeldItem(registry, item.id);
  const inspectionCorrection = item ? presentationCorrection(item.id) : null;
  const correctedRecordCount = scene.nodes.filter(node => !!sourceCorrection(node.id)).length;
  const readerOnlyCount = scene.nodes.filter(
    (node) =>
      isHeldItem(registry, node.id) ||
      ("status" in node.item && node.item.status === "not-drawn"),
  ).length;
  const inspectionAnchor =
    inspectionNode && !inspectionHeld ? getNodeAnchor(inspectionNode) : null;
  const currentEdges = selected
    ? scene.edges.filter((e) => e.from === selected || e.to === selected)
    : [];
  const selectedEdge = edges.get(selected);
  const travelEdge = selectedEdge ?? currentEdges[0];
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setReduced(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Tutorial keys must never stop/start camera travel or narration.
      if (caseOpen || helpOpen || event.defaultPrevented) return;
      const editable =
        event.target instanceof HTMLElement &&
        Boolean(event.target.closest("input,textarea,select"));
      if (event.key === "Escape") {
        send("stop");
        narration.stop();
        if (helpOpen) setHelpOpen(false);
        else if (inspector && !inspectorLocked) {
          setInspector(null);
          lastFocus.current?.focus();
        }
      }
      if (editable || helpOpen) return;
      if (event.key === "Home") {
        event.preventDefault();
        send("home");
      }
      if (
        event.key === " " &&
        journey.phase !== "idle" &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        event.preventDefault();
        send(journey.phase === "moving" ? "pause" : "resume");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    send,
    caseOpen,
    helpOpen,
    inspector,
    inspectorLocked,
    journey.phase,
    narration.stop,
  ]);
  useEffect(() => {
    const refresh = (e: StorageEvent) => {
      if (e.key === CASEBOOK_KEY) setSaved(readBook());
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  function saveBook(book: CasebookData) {
    let error = "";
    try {
      localStorage.setItem(CASEBOOK_KEY, JSON.stringify(book));
    } catch {
      error =
        "Could not save to browser storage. Export your casebook before closing.";
    }
    setSaved({ book, error });
  }
  function pin() {
    if (!selection || pinned) return;
    if (saved.book.pins.length >= 250) {
      setMessage(
        "This casebook already has 250 pins. Export before removing any.",
      );
      return;
    }
    saveBook({
      ...saved.book,
      pins: [
        ...saved.book.pins,
        { ...selection, addedAt: new Date().toISOString(), note: "" },
      ],
    });
    setMessage("Pinned with its sources and qualifiers.");
  }
  function note(value: string) {
    if (!selection) return;
    saveBook({
      ...saved.book,
      pins: saved.book.pins.map((p) =>
        p.kind === selection.kind && p.id === selection.id
          ? { ...p, note: value.slice(0, 12000) }
          : p,
      ),
    });
  }
  function follow(edge: SceneEdge) {
    setSelected(edge.id);
    if (!inspectorLocked) setInspector(edge.id);
    if (canFollow(edge)) {
      setReading(false);
      send("follow", edge.id);
    }
  }
  function transcript() {
    if (!item) return "";
    return buildNarrationTranscript(item, inspectionHeld);
  }
  const closePanel = () => {
    setInspector(null);
    setInspectorLocked(false);
    lastFocus.current?.focus();
  };
  return (
    <>
    <main
      {...(caseOpen ? { inert: "" } : {})}
      aria-hidden={caseOpen || undefined}
      data-dataset={dataset}
      data-loaded-entities={registry.entities.length}
      data-loaded-records={registry.records.length}
      data-loaded-relationships={registry.relationships.length}
      data-loaded-sources={registry.sources.length}
      data-held-count={registry.held.length}
      data-filtered-items={scene.nodes.length}
      data-factual-items={mapScene.nodes.length}
      data-unplaced-items={geographicScene.unplacedNodes.length}
      className={`evidence-app ${reading || failure ? "reading-active" : ""} ${item ? "reader-open" : ""} ${exploring ? "is-exploring" : ""} ${failure ? "graphics-unavailable" : ""}`}
    >
      <a className="skip-link" href="#record-list">
        Skip to records
      </a>
      {!reading && !failure && (
        <MapBoundary
          key={graphicsGeneration}
          onFailure={(reason) => {
            setFailure(reason);
            enterReading();
          }}
        >
          <Suspense
            fallback={
              <p className="map-loading glass" role="status">
                Preparing the felt map… Reading remains available.
              </p>
            }
          >
            <SpatialWorld
              workspaceActive={caseOpen}
              onGraphics={acceptGraphics}
              data={mapScene}
              selected={selected}
              command={command}
              reducedMotion={reduced}
              cities={cities}
              onSelect={open}
              onJourney={setJourney}
              onMetric={setMetric}
              onDisplay={setDisplaySummary}
              onMapStatus={setMapStatus}
              onInteraction={() => setExploring(true)}
              onFailure={(reason) => {
                setFailure(reason);
                enterReading();
              }}
            />
          </Suspense>
        </MapBoundary>
      )}
      <div className="room-vignette" aria-hidden="true" />
      <header className="masthead glass">
        <div className="brand-mark">
          <Globe2 size={29} strokeWidth={1} />
        </div>
        <div>
          <span className="eyebrow">FIELDWORK / PUBLIC RECORD</span>
          <h1>The felt atlas</h1>
          <p>
            {dataset === "full"
              ? "Complete original registry · India app retained snapshot"
              : "Selected preview subset · 48 items"}
          </p>
          <nav className="atlas-workspace-links" aria-label="Connected workspaces">
            <a className="original-app-link" href="../#/investigate">
              Original investigation pages ↗
            </a>
            <a className="original-app-link" href="../research-activity/">
              Research activity ↗
            </a>
            <button className="original-app-link selected-cases-launcher" ref={caseOpener} type="button" onClick={() => {
              caseGeography.current = graphics?.captureGeography() ?? null;
              narration.stop(); setHelpOpen(false); setCommand(null); graphics?.stopGeographicJourney();
              setJourney({ phase: "idle", progress: 0, edgeId: null }); setCaseOpen(true);
            }}>Selected case files</button>
          </nav>
        </div>
        <span className="prototype-badge">
          {dataset === "full" ? "REVIEW" : "PREVIEW"}
        </span>
      </header>
      <div className="top-tools">
        <label className="search glass">
          <Search size={17} />
          <input
            aria-label="Search retained records"
            placeholder="Find a record or source…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={14} />
            </button>
          )}
        </label>
        <button
          className="icon-button glass help-button"
          onClick={() => {
            lastFocus.current = document.activeElement as HTMLElement;
            setHelpOpen(true);
          }}
          data-guide-launcher="atlas"
          aria-label="Help exploring the evidence room"
        >
          <HelpCircle size={19} />
        </button>
      </div>
      <button
        className="city-toggle glass"
        aria-pressed={cities}
        onClick={() => {
          setCities(!cities);
          setCityInfo(true);
        }}
      >
        <Building2 size={16} />
        3D buildings {cities ? "on" : "off"}
      </button>
      <section className="room-caption">
        <span className="eyebrow">FOLLOW THE RECORD</span>
        <h2>
          Every thread has
          <br />a source.
        </h2>
        <p>
          Move through the evidence.
          <br />
          Keep the uncertainty in view.
        </p>
        <button
          className="quiet-action"
          onClick={() => {
            const edge =
              mapScene.edges.find((e) => {
                const a = nodes.get(e.from),
                  b = nodes.get(e.to);
                const ga = a ? getNodeAnchor(a) : null,
                  gb = b ? getNodeAnchor(b) : null;
                return ga && gb && ga.areaCode !== gb.areaCode;
              }) ?? mapScene.edges[0];
            if (edge) follow(edge);
          }}
        >
          <Play size={13} fill="currentColor" /> Start a source trail{" "}
          <ArrowRight size={15} />
        </button>
      </section>
      <aside className="scene-overview glass">
        <div>
          <span className="status-dot" />
          {dataset === "full"
            ? "FULL ORIGINAL REGISTRY LOADED"
            : "SOURCE-BOUND PREVIEW"}
        </div>
        <p>
          {scene.nodes.length.toLocaleString()} searchable items in this lens.
          <br />
          {geographicScene.nodes.length.toLocaleString()} area-anchored ·{" "}
          {geographicScene.unplacedNodes.length.toLocaleString()} unplaced ·{" "}
          {readerOnlyCount.toLocaleString()} records are reader-only: retained held/not-drawn context{correctedRecordCount ? ` plus ${correctedRecordCount} source-correction records` : ""}.
          <br />
          Separate review queue: {registry.held.length} held entries, including
          retained counter-context records. No held entries draw factual marks.
        </p>
        <small>
          {registry.entities.length.toLocaleString()} entities ·{" "}
          {registry.records.length.toLocaleString()} records ·{" "}
          {registry.relationships.length.toLocaleString()} links ·{" "}
          {registry.sources.length.toLocaleString()} sources
          <br />
          Snapshot {registry.updatedAt}
        </small>
        <small>
          {displaySummary?.mode === "world"
            ? `${displaySummary.countryStacks} country stacks · expand or zoom for ${displaySummary.areaGroups} original areas`
            : `${display.groups.size} original area groups`}
          <br />
          {displaySummary?.renderedThreads ?? 0} of {display.candidates.length}{" "}
          original cross-area threads shown. All links remain in the reader.
          {displaySummary?.mode === "world" && (
            <>
              <br />
              Stacks are display groups, not entities. Selected endpoint pins
              are detail overlays.
            </>
          )}
        </small>
        <button className="overview-read" onClick={enterReading}>
          Search and read the registry
        </button>
        {geographicScene.unplacedNodes.length > 0 && !reading && (
          <details className="unplaced-tray">
            <summary>
              {geographicScene.unplacedNodes.length} items without a single
              verified area
            </summary>
            {geographicScene.unplacedNodes.slice(0, 30).map((n) => (
              <button key={n.id} onClick={() => open(n.id, "node")}>
                {n.title}
              </button>
            ))}
            <button
              onClick={() => {
                setAreaFilter("unplaced");
                enterReading();
              }}
            >
              Read and search all unplaced items
            </button>
          </details>
        )}
      </aside>
      {(reading || failure) && (
        <section
          className="reading-surface"
          aria-label="Accessible record reading mode"
        >
          <div className="reading-title">
            <BookOpen />
            <div>
              <h2>Read the retained records</h2>
              <p>The same evidence, without spatial navigation.</p>
            </div>
          </div>
          {failure && (
            <div className="notice">
              <p role="alert">
                3D is unavailable. All retained records are available below.
              </p>
              <details>
                <summary>Technical details</summary>
                <p>{failure}</p>
              </details>
            </div>
          )}
          {areaFilter && (
            <p className="active-area">
              Area lens:{" "}
              {availableAreas.find((a) => a.areaCode === areaFilter)?.label ??
                "Unplaced"}{" "}
              <button onClick={() => setAreaFilter("")}>Clear area lens</button>
            </p>
          )}
          <RegistryReader
            dataset={dataset}
            scene={scene}
            selected={selected}
            query={deferredQuery}
            namespace={namespace}
            onSelect={open}
          />
        </section>
      )}
      {!reading && !failure && (
        <section
          className="accessible-node-list"
          id="record-list"
          aria-label="Keyboard record navigation"
        >
          <button onClick={enterReading}>
            Open searchable keyboard reader for all{" "}
            {scene.nodes.length.toLocaleString()} filtered items
          </button>
          {scene.nodes.slice(0, 40).map((n) => (
            <button key={n.id} onClick={() => open(n.id, "node")}>
              {n.title}
            </button>
          ))}
        </section>
      )}

      {scene.nodes.length === 0 && !reading && !failure && (
        <div className="empty-state glass">
          <h2>No records in this lens</h2>
          <p>Try widening the time window or clearing a layer.</p>
          <button
            onClick={() => {
              setQuery("");
              setActiveLayers([]);
              setNamespace("");
              setAreaFilter("");
              setYear(preview.yearRange[1]);
              setUndated(true);
            }}
          >
            Reset lenses
          </button>
        </div>
      )}
      <aside className="legend glass" aria-label="Thread legend">
        <p className="eyebrow">READ THE THREADS</p>
        <div>
          <i className="thread-swatch gold" />
          <span>Color · relationship category</span>
        </div>
        <div>
          <i className="thread-swatch thick" />
          <span>Width · distinct source count, capped at 5</span>
        </div>
        <div>
          <i className="thread-swatch dashed" />
          <span>Status · retained in the source reader</span>
        </div>
        <p className="legend-note">
          Source count is not a guilt score. World view shows up to 24 original
          threads; area view shows up to 60. These are displayed subsets, not
          the whole network. Every retained relationship remains in the reader.
        </p>
        <details>
          <summary>Map & placement limits</summary>
          <p>{GEOGRAPHIC_CAVEAT}</p>
          <p>
            Country/state markers identify only the documented area. They never
            stand for a headquarters or building address. Unknown or multi-area
            records remain in the reading tray.
          </p>
        </details>
      </aside>
      <aside className="camera-tools glass" aria-label="Camera controls">
        <button onClick={() => send("home")} aria-label="Home camera">
          <Home size={19} />
          <span>Home</span>
        </button>
        <button onClick={() => send("fit")} aria-label="Fit visible network">
          <Focus size={18} />
        </button>
        <button
          onClick={() => send("back")}
          aria-label="Previous camera position"
        >
          <ArrowLeft size={18} />
        </button>
        <button onClick={() => send("top")} aria-label="Top-down orientation">
          <Compass size={18} />
        </button>
        <div className="camera-row">
          <button aria-label="Rotate left" onClick={() => send("orbit-left")}>
            <RotateCcw size={16} />
          </button>
          <button aria-label="Rotate right" onClick={() => send("orbit-right")}>
            <RotateCw size={16} />
          </button>
        </div>
        <div className="camera-row">
          <button onClick={() => send("zoom-out")} aria-label="Zoom out">
            <Minus size={16} />
          </button>
          <button onClick={() => send("zoom-in")} aria-label="Zoom in">
            <Plus size={16} />
          </button>
        </div>
      </aside>
      <nav className="bottom-dock glass" aria-label="Evidence room tools">
        <button
          className={!reading ? "active" : ""}
          onClick={() => {
            if (!failure) setReading(false);
          }}
          disabled={Boolean(failure)}
        >
          <Move3D size={18} />
          <span>Explore</span>
        </button>
        <button
          onClick={() => travelEdge && follow(travelEdge)}
          disabled={!canFollow(travelEdge)}
        >
          <Play size={16} />
          <span>Follow thread</span>
        </button>
        <span className="dock-divider" />
        <button
          className={filtersOpen ? "active" : ""}
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
        >
          <CalendarDays size={18} />
          <span>4D · Time</span>
        </button>
        <button
          className={filtersOpen ? "active" : ""}
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
        >
          <Layers3 size={18} />
          <span>5D · Layers</span>
        </button>
        <span className="dock-divider" />
        <button
          className={audioOpen ? "active" : ""}
          onClick={() => setAudioOpen(!audioOpen)}
          aria-expanded={audioOpen}
        >
          {narration.state === "off" ? (
            <VolumeX size={18} />
          ) : (
            <Volume2 size={18} />
          )}
          <span>
            Narration {narration.state === "off" ? "off" : narration.state}
          </span>
        </button>
        <button
          className={reading ? "active" : ""}
          onClick={() => {
            send("stop");
            if (!reading || failure) enterReading();
            else setReading(false);
          }}
        >
          <BookOpen size={18} />
          <span>Reading</span>
        </button>
      </nav>
      {mapStatus && (
        <div className="map-status glass" role="status">
          {mapStatus}
        </div>
      )}
      <div className="bottom-note">
        <span>Drag to pan · scroll to zoom · right-drag to tilt / rotate</span>
        <span>
          {metric?.quality === "balanced"
            ? "30 fps budget · balanced detail"
            : "60 fps target · adaptive detail"}
          {metric ? ` · ${metric.calls} overlay draws` : ""}
        </span>
      </div>
      {cities && (
        <div className="city-attribution">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            © OpenStreetMap contributors · ODbL
          </a>
          <button onClick={() => setCityInfo(!cityInfo)}>
            Worldwide footprints · height basis
          </button>
        </div>
      )}
      {cityInfo && (
        <section className="city-info glass">
          <div className="panel-heading">
            <h2>Real footprints. Simplified buildings.</h2>
            <button
              onClick={() => setCityInfo(false)}
              aria-label="Close city information"
            >
              <X size={16} />
            </button>
          </div>
          <p>
            Worldwide OpenStreetMap building footprints load as you zoom.
            Coverage and detail vary by location; this does not mean every
            building or height is known.
          </p>
          <p>
            Provider rendering heights may come from tags, storeys or defaults.
            They are not verified measurements. Buildings rise at city scale on
            the same continuous map; no building image is generated.
          </p>
          <p>
            Buildings are geographic context only. No pin or relationship is
            inferred from a building’s location.
          </p>
          <ul>
            {cityMetadata.cities.map((city) => (
              <li key={city.id}>
                <a
                  href={city.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {city.name} · {city.focus}
                </a>
              </li>
            ))}
          </ul>
          <div className="city-destinations">
            {cityMetadata.cities.map((city) => (
              <button
                key={city.id}
                onClick={() => {
                  setCities(true);
                  send("city", city.id);
                  setCityInfo(false);
                }}
              >
                <Compass size={14} /> Fly to {city.name}
              </button>
            ))}
          </div>
          <p>
            These destinations explore geographic context. They do not place an
            evidence entity at a civic building.
          </p>
          <p>
            <a
              href="https://openfreemap.org/quick_start/"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenFreeMap worldwide map source
            </a>{" "}
            ·{" "}
            <a
              href="https://openfreemap.org/tos/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Service terms
            </a>{" "}
            ·{" "}
            <a
              href="https://www.openmaptiles.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              © OpenMapTiles
            </a>
          </p>
          <p>
            <a href="./data/city-buildings.json" download>
              Download the 25-polygon validation sample
            </a>{" "}
            ·{" "}
            <a
              href="./data/CITY-LICENSE-NOTICE.txt"
              target="_blank"
              rel="noopener noreferrer"
            >
              Attribution notice
            </a>
          </p>
          <a
            href="https://opendatacommons.org/licenses/odbl/1-0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Database License
          </a>
        </section>
      )}
      {filtersOpen && (
        <section
          className="lens-panel glass"
          aria-label="Time and facet filters"
        >
          <div className="panel-heading">
            <h2>Read across time and context</h2>
            <button
              aria-label="Close lenses"
              onClick={() => setFiltersOpen(false)}
            >
              <X size={17} />
            </button>
          </div>
          <p>4D = time. 5D = facet layers. Interface metaphors.</p>
          <label className="subject-control">
            Subject corpus
            <select
              aria-label="Subject corpus"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
            >
              <option value="">All retained subjects</option>
              {[...new Set(registry.coverage.map((c) => c.namespace))].map(
                (n) => (
                  <option key={n} value={n}>
                    {readable(n)}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="subject-control">
            Documented area
            <select
              aria-label="Documented area"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
            >
              <option value="">All documented areas</option>
              <option value="unplaced">Unplaced / ambiguous geography</option>
              {availableAreas.map((a) => (
                <option key={a.areaCode} value={a.areaCode}>
                  {a.label} · {a.precision}
                </option>
              ))}
            </select>
          </label>
          <label className="year-control">
            <span>
              Evidence window{" "}
              <strong>
                {preview.yearRange[0]}–{year}
              </strong>
            </span>
            <input
              type="range"
              min={preview.yearRange[0]}
              max={preview.yearRange[1]}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={undated}
              onChange={(e) => setUndated(e.target.checked)}
            />{" "}
            Keep records with unknown dates visible
          </label>
          <div className="layer-chips">
            {preview.layers.map((layer) => (
              <button
                key={layer.value}
                aria-pressed={activeLayers.includes(layer.value)}
                onClick={() =>
                  setActiveLayers(
                    activeLayers.includes(layer.value)
                      ? activeLayers.filter((l) => l !== layer.value)
                      : [...activeLayers, layer.value],
                  )
                }
              >
                {layer.label}
              </button>
            ))}
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={reduced}
              onChange={(e) => setReduced(e.target.checked)}
            />{" "}
            Reduced motion: jump to destinations
          </label>
        </section>
      )}
      {audioOpen && (
        <section
          className="audio-panel glass"
          aria-label="Manual narration controls"
        >
          <div className="panel-heading">
            <h2>Narration, on your terms</h2>
            <button
              onClick={() => setAudioOpen(false)}
              aria-label="Close narration controls"
            >
              <X size={17} />
            </button>
          </div>
          <p>
            Only browser voices marked as local are enabled. Nothing plays
            automatically.
          </p>
          {!narration.voices.length ? (
            <p className="notice">
              No local voice is available in this browser. The transcript
              remains available in the reading panel.
            </p>
          ) : (
            <>
              <label>
                Local voice
                <select
                  value={narration.voiceId}
                  onChange={(e) => narration.setVoiceId(e.target.value)}
                >
                  <option value="">Default local voice</option>
                  {narration.voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} · {v.lang}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Speed
                <select
                  value={narration.rate}
                  onChange={(e) => narration.setRate(Number(e.target.value))}
                >
                  <option value="0.85">Slower · 0.85×</option>
                  <option value="1">Normal · 1×</option>
                  <option value="1.15">Faster · 1.15×</option>
                </select>
              </label>
            </>
          )}
          <div className="button-row">
            <button
              disabled={!item || !narration.voices.length}
              onClick={() => narration.speak(transcript())}
            >
              <Volume2 size={15} />
              Read this record
            </button>
            <button
              disabled={narration.state === "off"}
              onClick={narration.pause}
              aria-label={narration.state === "paused" ? "Resume narration" : "Pause narration"}
            >
              {narration.state === "paused" ? (
                <Play size={15} />
              ) : (
                <Pause size={15} />
              )}
            </button>
            <button
              disabled={narration.state === "off"}
              onClick={narration.stop}
              aria-label="Stop narration"
            >
              <Square size={15} />
            </button>
          </div>
          <details>
            <summary>Current transcript</summary>
            <p>
              {narration.transcript ||
                transcript() ||
                "Select a record to see its transcript."}
            </p>
          </details>
        </section>
      )}
      {journey.phase !== "idle" && (
        <section className="journey-bar glass" aria-label="Camera journey">
          <span className="eyebrow">
            {journey.phase === "paused"
              ? "TRAVEL PAUSED"
              : "FOLLOWING THE SOURCE TRAIL"}
          </span>
          <progress max="1" value={journey.progress} />
          <button
            onClick={() =>
              send(journey.phase === "moving" ? "pause" : "resume")
            }
          >
            {journey.phase === "moving" ? (
              <Pause size={15} />
            ) : (
              <Play size={15} />
            )}{" "}
            {journey.phase === "moving" ? "Pause" : "Resume"}
          </button>
          <button onClick={() => send("stop")}>
            <Square size={14} />
            Stop
          </button>
        </section>
      )}
      {item && (
        <aside
          ref={panelRef}
          className="evidence-inspector"
          aria-label="Evidence reading panel"
        >
          <div className="inspector-top">
            <span>
              <MapPin size={13} />{" "}
              {inspectionHeld && inspectionCorrection
                ? "SUPERSEDED CLAIM / SOURCE REVIEW"
                : inspectionEdge ? "SOURCED RELATIONSHIP" : "PINNED PUBLIC RECORD"}
            </span>
            <div>
              <button
                className={inspectorLocked ? "active" : ""}
                aria-pressed={inspectorLocked}
                aria-label={
                  inspectorLocked
                    ? "Unpin reading panel"
                    : "Pin reading panel while travelling"
                }
                onClick={() => setInspectorLocked(!inspectorLocked)}
              >
                <Pin size={17} />
              </button>
              <button onClick={closePanel} aria-label="Close reading panel">
                <X size={19} />
              </button>
            </div>
          </div>
          <div className="inspector-content">
            <span className="eyebrow">
              RETAINED SNAPSHOT / {registry.updatedAt}
            </span>
            <h2>{itemTitle(item)}</h2>
            <div className="evidence-tags">
              <span>
                {readable(presentationTier(item))}
              </span>
              <span>{new Set(item.sourceIds).size} distinct source IDs</span>
            </div>
            {inspectionHeld && (
              <p className="notice" data-held-warning="true">
                Held for review. Retained as reading/counter-context only;
                excluded from the factual map and its threads.
              </p>
            )}
            {inspectionCorrection && <section className="notice" data-source-correction={inspectionCorrection.id} aria-label="Source-scope correction">
              <h3>Source-scope correction · {inspectionCorrection.reviewedAt}</h3>
              <p>{inspectionCorrection.reason}</p>
              <p>{inspectionCorrection.interpretationNotice}</p>
              <ul>{inspectionCorrection.findings.map(finding => <li key={finding}>{finding}</li>)}</ul>
              <p>{inspectionCorrection.relatedClaimStatus}</p>
            </section>}
            <p className="lead-summary">{presentationSummary(item)}</p>
            <a className="original-item-link" href={originalRoute(item.route)}>
              Open this item’s original page <ExternalLink size={14} />
            </a>
            {inspectionNode && (
              <section className="context-box">
                <h3>Geographic precision</h3>
                <p>
                  {inspectionAnchor
                    ? `${inspectionAnchor.label}: ${inspectionAnchor.precision} context only. Display marker represents the documented area, not a verified address. ${inspectionAnchor.basis}`
                    : getUnplacedReason(inspectionNode)}
                </p>
                {inspectionAnchor && (
                  <p>
                    Representative coordinate: {inspectionAnchor.lat.toFixed(3)}
                    , {inspectionAnchor.lng.toFixed(3)}. Focus stops at area
                    scale; manual city exploration is separate.
                  </p>
                )}
              </section>
            )}
            {inspectionEdge && !inspectionHeld && !mapEdgeIds.has(inspectionEdge.id) && (
              <p className="small-copy">
                This relationship remains readable outside the current map lens.
                Adjust the filters to follow it.
              </p>
            )}
            {inspectionNode &&
              !inspectionHeld &&
              !mapNodeIds.has(inspectionNode.id) && (
                <p className="small-copy">
                  This record is outside the current map lens. Adjust the
                  filters to locate it.
                </p>
              )}
            {inspectionEdge && (!inspectionCorrection || inspectionCorrection.graphEligible) && (
              <div className="relationship-route">
                <span>{nodes.get(inspectionEdge.from)?.title}</span>
                <ArrowRight size={16} />
                <span>{nodes.get(inspectionEdge.to)?.title}</span>
                <button
                  disabled={!canFollow(inspectionEdge)}
                  onClick={() => follow(inspectionEdge)}
                >
                  <Play size={14} />
                  Follow this thread
                </button>
              </div>
            )}
            {"tier" in item && (
              <dl className="metadata-grid">
                <div>
                  <dt>{inspectionCorrection && !inspectionCorrection.graphEligible ? "Superseded original status" : "Recorded status"}</dt>
                  <dd>{readable(item.status)}{inspectionCorrection && !inspectionCorrection.graphEligible ? " · now source-correction hold" : ""}</dd>
                </div>
                <div>
                  <dt>Status as of</dt>
                  <dd>{item.statusAsOf ?? "Not established"}</dd>
                </div>
                <div>
                  <dt>Source window</dt>
                  <dd>
                    {item.fromDate ?? "Unknown"} →{" "}
                    {item.toDate ?? "Open / unknown"}
                  </dd>
                </div>
              </dl>
            )}
            {"dateBasis" in item && (
              <p className="small-copy">{item.dateBasis}</p>
            )}
            {"amounts" in item && item.amounts.length > 0 && inspectionCorrection && !inspectionCorrection.graphEligible && (
              <p className="notice" data-held-amounts="true">The retained amount is excluded from factual numeric use. The unchanged original value is available only in the audit object and raw JSON export.</p>
            )}
            {"amounts" in item && item.amounts.length > 0 && (!inspectionCorrection || inspectionCorrection.graphEligible) && (
              <section>
                <h3>Amounts, with their accounting stage</h3>
                {item.amounts.map((a, i) => (
                  <p key={i}>
                    {a.currency} {a.value.toLocaleString()} {a.unit} · {a.stage}{" "}
                    · {a.period}
                  </p>
                ))}
              </section>
            )}
            {"response" in item && item.response && (
              <section className="context-box">
                <h3>Response / procedural context</h3>
                <p>{item.response}</p>
              </section>
            )}
            {"responseIds" in item && item.responseIds.length > 0 && (
              <section className="context-box">
                <h3>Linked responses and counter-context</h3>
                {item.responseIds.map((id) => {
                  const response =
                    nodes.get(id)?.item ?? edges.get(id)?.relationship;
                  return response ? (
                    <article key={id}>
                      <h3>{itemTitle(response)}</h3>
                      <p>{presentationSummary(response)}</p>
                      {"response" in response && response.response && (
                        <p>{response.response}</p>
                      )}
                      <button
                        className="thread-button"
                        onClick={() => {
                          setInspector(id);
                          setSelected(id);
                        }}
                      >
                        Read this response with its sources{" "}
                        <ArrowRight size={14} />
                      </button>
                    </article>
                  ) : (
                    <p key={id}>
                      Response {id} is retained in the casebook export.
                    </p>
                  );
                })}
              </section>
            )}
            {"alternativeExplanations" in item &&
              item.alternativeExplanations.length > 0 && (
                <section>
                  <h3>Other explanations to consider</h3>
                  <ul>
                    {item.alternativeExplanations.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </section>
              )}
            {"identityBasis" in item && (
              <section className="context-box">
                <h3>Recorded identity basis</h3>
                <p>{item.identityBasis}</p>
                <p>
                  {item.resolved
                    ? "Resolved in the original corpus"
                    : "Identity remains unresolved"}
                </p>
              </section>
            )}
            {"falsifier" in item && item.falsifier && (
              <section className="context-box">
                <h3>What would change this assessment</h3>
                <p>{item.falsifier}</p>
              </section>
            )}
            {(("recordIds" in item && item.recordIds.length > 0) ||
              ("entityIds" in item && item.entityIds.length > 0) ||
              ("relationshipIds" in item &&
                item.relationshipIds.length > 0)) && (
              <section>
                <h3>Linked retained evidence</h3>
                {[
                  ...new Set([
                    ...("recordIds" in item ? item.recordIds : []),
                    ...("entityIds" in item ? item.entityIds : []),
                    ...("relationshipIds" in item ? item.relationshipIds : []),
                  ]),
                ].map((id) => {
                  const linked =
                    nodes.get(id)?.item ?? edges.get(id)?.relationship;
                  return linked ? (
                    <button
                      className="thread-button"
                      key={id}
                      onClick={() => {
                        setInspector(id);
                        setSelected(id);
                      }}
                    >
                      {itemTitle(linked)} <ArrowRight size={14} />
                    </button>
                  ) : (
                    <p key={id}>Retained reference: {id}</p>
                  );
                })}
              </section>
            )}
            {item.limitations.length > 0 && (
              <section className="context-box">
                <h3>What this does not establish</h3>
                <ul>
                  {item.limitations.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <h3>Source trail</h3>
              {[
                ...new Set([
                  ...item.sourceIds,
                  ...item.geography.flatMap((g) => g.sourceIds),
                ]),
              ].map((id) => {
                const source = sources.get(id);
                return source ? (
                  <article className="source-card" key={id}>
                    <a
                      href={safeSourceUrl(source.url) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {sourceCitationCorrection(source.id)?.sourceTitle ?? source.title}
                      <ExternalLink size={13} />
                    </a>
                    <p>
                      {source.publisher} ·{" "}
                      {source.publishedAt ?? "Publication date unknown"}
                    </p>
                    <small>{source.locator}</small>
                    {sourceCitationCorrection(source.id) ? <p className="notice">{sourceCitationCorrection(source.id)?.sourceDateNotice}</p> : null}
                    {source.limitations.length > 0 && (
                      <details>
                        <summary>Source limitations</summary>
                        <ul>
                          {source.limitations.map((l) => (
                            <li key={l}>{l}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </article>
                ) : (
                  <p key={id}>
                    Source {id} is unavailable in this retained snapshot.
                  </p>
                );
              })}
            </section>
            <details className="geography">
              <summary>
                Geography and attribution <ChevronDown size={14} />
              </summary>
              {item.geography.map((g, i) => (
                <p key={i}>
                  {g.scope} · {g.basis}: {g.note}
                </p>
              ))}
            </details>
            {inspectionNode && (
              <section>
                <h3>Records at the same documented area</h3>
                {inspectionAnchor && (
                  <button
                    onClick={() => {
                      setAreaFilter(inspectionAnchor.areaCode);
                      enterReading();
                    }}
                  >
                    Browse all records in {inspectionAnchor.label}
                  </button>
                )}
                {preview.nodes
                  .filter(
                    (n) =>
                      n.id !== inspectionNode.id &&
                      inspectionAnchor &&
                      !isHeldItem(registry, n.id) &&
                      getNodeAnchor(n)?.areaCode === inspectionAnchor.areaCode,
                  )
                  .slice(0, 20)
                  .map((n) => (
                    <button
                      className="thread-button"
                      key={n.id}
                      onClick={() => {
                        setInspector(n.id);
                        setSelected(n.id);
                      }}
                    >
                      {n.title}
                      <ArrowRight size={14} />
                    </button>
                  ))}
                <p className="small-copy">
                  Up to 20 nearby context records are shown. Area proximity is
                  not a relationship; use the complete searchable reader for the
                  rest.
                </p>
                <h3 style={{ marginTop: 20 }}>Connected source threads</h3>
                {preview.edges
                  .filter(
                    (e) =>
                      e.from === inspectionNode.id ||
                      e.to === inspectionNode.id,
                  )
                  .map((edge) => (
                    <button
                      className="thread-button"
                      key={edge.id}
                      onClick={() => {
                        setSelected(edge.id);
                        if (!inspectorLocked) setInspector(edge.id);
                      }}
                    >
                      <span>
                        {presentationTitle(edge.relationship)}
                        <small>
                          {edge.sourceCount} distinct source IDs ·{" "}
                          {presentationTier(edge.relationship)}
                        </small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
              </section>
            )}
            <details className="retained-metadata">
              <summary>{inspectionCorrection ? (inspectionCorrection.graphEligible ? "Original object · specified prose superseded by source qualification" : "Superseded raw object · audit only, not accepted evidence") : "Complete retained object"}</summary>
              <pre>{JSON.stringify(item, null, 2)}</pre>
            </details>
            <section className="casebook-box">
              <h3>Your casebook</h3>
              <button
                disabled={
                  Boolean(pinned) || saved.error.includes("could not be read")
                }
                onClick={pin}
              >
                <Pin size={15} />
                {pinned ? "Saved in casebook" : "Save this evidence"}
              </button>
              {pinned && (
                <label>
                  Analyst note (your annotation)
                  <textarea
                    value={pinned.note}
                    onChange={(e) => note(e.target.value)}
                    placeholder="What should you check next?"
                    maxLength={12000}
                  />
                </label>
              )}
              <button
                className="text-button"
                onClick={() =>
                  makeDownload(
                    buildCasebookPacket(saved.book, registry, { requireAllTargets: dataset === "full" }),
                    "fieldwork-casebook.json",
                  )
                }
              >
                <Download size={14} /> Export casebook with evidence
              </button>
              {saved.error && <p role="alert">{saved.error}</p>}
            </section>
            <p className="interpretation-limit">
              A graph path does not establish influence, causation or
              misconduct. Physical proximity is a reading aid.
            </p>
          </div>
          <footer className="inspector-footer">
            <button
              onClick={() => {
                setAudioOpen(true);
              }}
            >
              <Volume2 size={16} />
              Read aloud
            </button>
            {inspectionNode && (
              <button
                disabled={
                  Boolean(failure) ||
                  !inspectionAnchor ||
                  !mapNodeIds.has(inspectionNode.id)
                }
                onClick={() => {
                  setReading(false);
                  send("focus", inspectionNode.id);
                }}
              >
                <Focus size={16} />
                Find on felt
              </button>
            )}
          </footer>
        </aside>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {message}
        {journey.phase === "paused" ? " Camera travel paused." : ""}
      </div>
      <GuidedTutorial guide={atlasGuide} open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
    {caseOpen && <>
      {caseLoadError ? <section className="case-load-note" onKeyDown={caseNoteKeys} role="dialog" aria-modal="true" aria-label="Case files unavailable"><p>The selected case files could not load. The atlas remains available.</p><button type="button" autoFocus onClick={closeCases}>Close case files</button><details><summary>Technical detail</summary>{caseLoadError}</details></section> :
      <MapBoundary onFailure={setCaseLoadError}>
        <Suspense fallback={<section className="case-load-note" onKeyDown={caseNoteKeys} role="dialog" aria-modal="true" aria-label="Loading selected case files"><p role="status">Preparing selected case files…</p><button type="button" autoFocus onClick={closeCases}>Cancel</button></section>}>
          <CaseWorkspace graphics={graphics} reducedMotion={reduced} onClose={closeCases} onRecreateGraphics={() => {
            setGraphics(null); setFailure(""); setReading(false); setCommand(null); setGraphicsGeneration(value => value + 1);
          }}/>
        </Suspense>
      </MapBoundary>}
    </>}
    </>
  );
}

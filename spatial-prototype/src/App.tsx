import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import SpatialWorld from "./SpatialWorld";
import {
  buildPreview,
  filterScene,
  registry,
  type EvidenceItem,
  type SceneEdge,
} from "./model";
import {
  CASEBOOK_KEY,
  emptyCasebook,
  parseCasebook,
  buildCasebookPacket,
  type CasebookData,
  type CasebookSelection,
} from "./casebookStore";
import type { InvestigationLayer } from "./domain";
import type { CameraCommand, JourneyState, SceneMetric } from "./scene-types";
import {
  getNodeAnchor,
  getUnplacedReason,
  getGeographicScene,
  GEOGRAPHIC_CAVEAT,
} from "./geography";
import { useNarration } from "./useNarration";
import cityMetadata from "./assets/city-metadata.json";
import { readProgress, updateProgress } from "./tutorial/model";
const preview = buildPreview();
const nodes = new Map(preview.nodes.map((n) => [n.id, n]));
const edges = new Map(preview.edges.map((e) => [e.id, e]));
const sources = new Map(registry.sources.map((s) => [s.id, s]));
const readable = (word: string) => word.replace(/-/g, " ");
const itemTitle = (item: EvidenceItem) =>
  "title" in item ? item.title : item.label;
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
const HELP = [
  {
    title: "Enter the evidence room",
    text: "Drag the felt map to pan. Scroll to zoom. Right-drag to tilt and rotate. Home restores your orientation; Reading mode has the same source-backed records without the 3D scene.",
  },
  {
    title: "Read a pin before following it",
    text: "Select a paper card. Its source IDs, evidence status, date basis, responses and limitations stay together in the reading panel. Pin the panel to keep it readable while you travel.",
  },
  {
    title: "Follow a sourced thread",
    text: "Choose a relationship and press Follow thread. The camera travels between the exact recorded endpoints. Pause, Escape and any manual camera gesture stop or pause travel. A path never establishes guilt or causation.",
  },
  {
    title: "Time and layers are lenses",
    text: "4D is the time filter; 5D is the facet layer. These are interface metaphors, not additional physical dimensions. Unknown dates remain visible unless you deliberately exclude them.",
  },
  {
    title: "Keep control of sound and motion",
    text: "Narration starts only when you press Read this record. Only browser voices marked as local are used. No local voice means text only. Reduced motion replaces fly-throughs with immediate destinations.",
  },
];
export default function App() {
  const [query, setQuery] = useState("");
  const [activeLayers, setActiveLayers] = useState<InvestigationLayer[]>([]);
  const [year, setYear] = useState(preview.yearRange[1]);
  const [undated, setUndated] = useState(true);
  const [reading, setReading] = useState(false);
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
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpStep, setHelpStep] = useState(() => {
    try {
      return (
        readProgress(localStorage.getItem("fieldwork-spatial-tutorial:v1"), {
          "spatial-room": 5,
        }).tours["spatial-room"]?.step ?? 0
      );
    } catch {
      return 0;
    }
  });
  const [audioOpen, setAudioOpen] = useState(false);
  const [saved, setSaved] = useState(readBook);
  const [message, setMessage] = useState("");
  const helpRef = useRef<HTMLDialogElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const narration = useNarration();
  const scene = useMemo(
    () =>
      filterScene(preview, {
        query,
        layers: activeLayers,
        fromYear: preview.yearRange[0],
        toYear: year,
        includeUndated: undated,
      }),
    [query, activeLayers, year, undated],
  );
  const send = useCallback(
    (type: CameraCommand["type"], id?: string) =>
      setCommand({ type, id, stamp: performance.now() }),
    [],
  );
  const open = useCallback(
    (id: string, kind: "node" | "edge") => {
      lastFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setSelected(id);
      if (!inspectorLocked) setInspector(id);
      if (kind === "node") send("focus", id);
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
  const geographicScene = useMemo(() => getGeographicScene(scene), [scene]);
  const inspectionAnchor = inspectionNode
    ? getNodeAnchor(inspectionNode)
    : null;
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
    helpOpen,
    inspector,
    inspectorLocked,
    journey.phase,
    narration.stop,
  ]);
  useEffect(() => {
    try {
      const key = "fieldwork-spatial-tutorial:v1";
      const old = readProgress(localStorage.getItem(key), {
        "spatial-room": HELP.length,
      });
      if (helpOpen || old.tours["spatial-room"])
        localStorage.setItem(
          key,
          JSON.stringify(
            updateProgress(
              old,
              "spatial-room",
              helpStep,
              helpOpen
                ? "active"
                : helpStep === HELP.length - 1
                  ? "completed"
                  : "paused",
              HELP.length,
            ),
          ),
        );
    } catch {
      /* Help remains usable when browser storage is blocked. */
    }
  }, [helpOpen, helpStep]);
  useEffect(() => {
    const dialog = helpRef.current;
    if (helpOpen && !dialog?.open) dialog?.showModal();
    else if (!helpOpen && dialog?.open) dialog.close();
  }, [helpOpen]);
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
    send("follow", edge.id);
  }
  function transcript() {
    if (!item) return "";
    return `${itemTitle(item)}. ${item.summary}. ${"tier" in item ? `Evidence status: ${item.tier}. Date basis: ${item.dateBasis}. ` : ""}${item.sourceIds.length} retained source references. ${"response" in item && item.response ? `Recorded response: ${item.response}. ` : ""}Limitations: ${item.limitations.join(" ")} A graph path does not establish influence, causation or misconduct.`;
  }
  const closePanel = () => {
    setInspector(null);
    setInspectorLocked(false);
    lastFocus.current?.focus();
  };
  return (
    <main
      className={`evidence-app ${reading || failure ? "reading-active" : ""}`}
    >
      <a className="skip-link" href="#record-list">
        Skip to records
      </a>
      {!reading && !failure && (
        <SpatialWorld
          data={scene}
          selected={selected}
          command={command}
          reducedMotion={reduced}
          cities={cities}
          onSelect={open}
          onJourney={setJourney}
          onMetric={setMetric}
          onMapStatus={setMapStatus}
          onFailure={(reason) => {
            setFailure(reason);
            setReading(true);
          }}
        />
      )}
      <div className="room-vignette" aria-hidden="true" />
      <header className="masthead glass">
        <div className="brand-mark">
          <Globe2 size={29} strokeWidth={1} />
        </div>
        <div>
          <span className="eyebrow">FIELDWORK / PUBLIC RECORD</span>
          <h1>The felt atlas</h1>
          <p>Spatial preview · retained source snapshot</p>
        </div>
        <span className="prototype-badge">STUDY 01</span>
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
              scene.edges.find((e) => {
                const a = nodes.get(e.from),
                  b = nodes.get(e.to);
                const ga = a ? getNodeAnchor(a) : null,
                  gb = b ? getNodeAnchor(b) : null;
                return ga && gb && ga.areaCode !== gb.areaCode;
              }) ?? scene.edges[0];
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
          SOURCE-BOUND PREVIEW
        </div>
        <p>
          {geographicScene.nodes.length} area-anchored records ·{" "}
          {geographicScene.unplacedNodes.length} in reading tray
        </p>
        <small>Snapshot {registry.updatedAt} · curated public corpus</small>
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
            <p role="alert" className="notice">
              3D is unavailable: {failure}
            </p>
          )}
          <div className="record-grid" id="record-list">
            {scene.nodes.map((node) => (
              <button
                key={node.id}
                className={
                  selected === node.id ? "reading-card active" : "reading-card"
                }
                onClick={() => open(node.id, "node")}
              >
                <span className="eyebrow">
                  {node.kind} · {node.item.sourceIds.length} source references
                </span>
                <h3>{node.title}</h3>
                <p>{node.item.summary}</p>
                <span>
                  Inspect evidence <ArrowRight size={15} />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      {!reading && !failure && (
        <section
          className="accessible-node-list"
          id="record-list"
          aria-label="Keyboard record navigation"
        >
          {scene.nodes.map((n) => (
            <button key={n.id} onClick={() => open(n.id, "node")}>
              {n.title}
            </button>
          ))}
        </section>
      )}
      {geographicScene.unplacedNodes.length > 0 && !reading && (
        <details className="unplaced-tray glass">
          <summary>
            {geographicScene.unplacedNodes.length} records without a single
            verified area
          </summary>
          {geographicScene.unplacedNodes.map((n) => (
            <button key={n.id} onClick={() => open(n.id, "node")}>
              {n.title}
            </button>
          ))}
        </details>
      )}
      {scene.nodes.length === 0 && (
        <div className="empty-state glass">
          <h2>No records in this lens</h2>
          <p>Try widening the time window or clearing a layer.</p>
          <button
            onClick={() => {
              setQuery("");
              setActiveLayers([]);
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
          <span>Pattern · retained evidence status</span>
        </div>
        <p className="legend-note">
          Source count describes support. It is not a guilt score.
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
          disabled={!travelEdge}
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
            setReading(!reading || Boolean(failure));
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
              {inspectionEdge ? "SOURCED RELATIONSHIP" : "PINNED PUBLIC RECORD"}
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
                {"tier" in item ? readable(item.tier) : "Source-bound identity"}
              </span>
              <span>{new Set(item.sourceIds).size} distinct source IDs</span>
            </div>
            <p className="lead-summary">{item.summary}</p>
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
            {inspectionEdge && (
              <div className="relationship-route">
                <span>{nodes.get(inspectionEdge.from)?.title}</span>
                <ArrowRight size={16} />
                <span>{nodes.get(inspectionEdge.to)?.title}</span>
                <button onClick={() => follow(inspectionEdge)}>
                  <Play size={14} />
                  Follow this thread
                </button>
              </div>
            )}
            {"tier" in item && (
              <dl className="metadata-grid">
                <div>
                  <dt>Recorded status</dt>
                  <dd>{readable(item.status)}</dd>
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
            {"amounts" in item && item.amounts.length > 0 && (
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
                  const response = registry.records.find((r) => r.id === id);
                  return response ? (
                    <article key={id}>
                      <h3>{response.title}</h3>
                      <p>{response.summary}</p>
                      {response.response && <p>{response.response}</p>}
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
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {source.title}
                      <ExternalLink size={13} />
                    </a>
                    <p>
                      {source.publisher} ·{" "}
                      {source.publishedAt ?? "Publication date unknown"}
                    </p>
                    <small>{source.locator}</small>
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
                  <p key={id}>Source {id} is not available in this preview.</p>
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
                {preview.nodes
                  .filter(
                    (n) =>
                      n.id !== inspectionNode.id &&
                      inspectionAnchor &&
                      getNodeAnchor(n)?.areaCode === inspectionAnchor.areaCode,
                  )
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
                        {edge.relationship.label}
                        <small>
                          {edge.sourceCount} distinct source IDs ·{" "}
                          {edge.relationship.tier}
                        </small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
              </section>
            )}
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
                    buildCasebookPacket(saved.book, registry),
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
              <button onClick={() => send("focus", inspectionNode.id)}>
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
      <dialog
        ref={helpRef}
        className="help-dialog"
        onCancel={() => setHelpOpen(false)}
        onClose={() => {
          setHelpOpen(false);
          lastFocus.current?.focus();
        }}
      >
        <button
          className="dialog-close"
          onClick={() => setHelpOpen(false)}
          aria-label="Close help"
        >
          <X size={20} />
        </button>
        <span className="eyebrow">
          A FIELD GUIDE / {helpStep + 1} OF {HELP.length}
        </span>
        <h2>{HELP[helpStep].title}</h2>
        <p>{HELP[helpStep].text}</p>
        <div className="help-progress">
          {HELP.map((step, i) => (
            <button
              key={step.title}
              aria-label={`Step ${i + 1}: ${step.title}`}
              aria-current={i === helpStep ? "step" : undefined}
              onClick={() => setHelpStep(i)}
            />
          ))}
        </div>
        <div className="button-row">
          <button
            disabled={helpStep === 0}
            onClick={() => setHelpStep(helpStep - 1)}
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <button
            className="primary"
            onClick={() =>
              helpStep === HELP.length - 1
                ? setHelpOpen(false)
                : setHelpStep(helpStep + 1)
            }
          >
            {helpStep === HELP.length - 1 ? "Explore the room" : "Next"}
            <ArrowRight size={15} />
          </button>
        </div>
      </dialog>
    </main>
  );
}

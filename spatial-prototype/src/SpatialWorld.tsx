import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { EvidenceWorld } from "./scene";
import type { PreviewData } from "./model";
import type { CaseGraphicsHost } from "./profile-host/graphics-contract";
import type {
  CameraCommand,
  JourneyState,
  LabelPosition,
  SceneMetric,
  DisplaySummary,
} from "./scene-types";
interface Props {
  data: PreviewData;
  workspaceActive: boolean;
  onGraphics: (graphics: CaseGraphicsHost | null) => void;
  selected: string;
  command: CameraCommand | null;
  reducedMotion: boolean;
  cities: boolean;
  onSelect: (id: string, kind: "node" | "edge") => void;
  onJourney: (state: JourneyState) => void;
  onMetric: (metric: SceneMetric) => void;
  onFailure: (reason: string) => void;
  onMapStatus: (status: string) => void;
  onInteraction: () => void;
  onDisplay: (summary: DisplaySummary) => void;
}
export default function SpatialWorld(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<EvidenceWorld | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [labels, setLabels] = useState<LabelPosition[]>([]);
  useEffect(() => {
    if (!host.current) return;
    try {
      world.current = new EvidenceWorld(host.current, latest.current.data, {
        onSelect: (...args) => { if (!latest.current.workspaceActive) latest.current.onSelect(...args); },
        onGraphics: (binding) => latest.current.onGraphics(binding),
        onLabels: setLabels,
        onJourney: (s) => latest.current.onJourney(s),
        onMetric: (s) => latest.current.onMetric(s),
        onFailure: (s) => latest.current.onFailure(s),
        onMapStatus: (s) => latest.current.onMapStatus(s),
        onInteraction: () => latest.current.onInteraction(),
        onDisplay: (summary) => latest.current.onDisplay(summary),
      });
      world.current.setReducedMotion(latest.current.reducedMotion);
      world.current.setWorkspaceActive(latest.current.workspaceActive);
    } catch (error) {
      latest.current.onFailure(
        error instanceof Error ? error.message : "WebGL could not start.",
      );
    }
    return () => {
      world.current?.dispose();
      world.current = null;
    };
  }, []);
  useEffect(() => { world.current?.setWorkspaceActive(props.workspaceActive); }, [props.workspaceActive]);
  useEffect(() => {
    world.current?.setData(props.data);
  }, [props.data]);
  useEffect(() => {
    world.current?.setSelected(props.selected);
  }, [props.selected]);
  useEffect(() => {
    if (props.command) world.current?.command(props.command);
  }, [props.command]);
  useEffect(() => {
    world.current?.setReducedMotion(props.reducedMotion);
  }, [props.reducedMotion]);
  useEffect(() => {
    void world.current?.setCities(props.cities);
  }, [props.cities]);
  return (
    <div className="spatial-stage">
      <div ref={host} className="webgl-host" />
      <div className="world-labels" aria-label="Geographic map labels">
        {labels
          .filter((l) => l.visible && !props.workspaceActive)
          .map((l) => (
            <button
              key={l.id}
              tabIndex={l.kind === "stack" ? 0 : -1}
              data-label-kind={l.kind}
              className={
                props.selected === l.id ? "world-label selected" : "world-label"
              }
              style={{ left: l.x, top: l.y }}
              onClick={() => {
                if (l.kind === "stack")
                  world.current?.command({
                    type: "expand-stack",
                    id: l.id,
                    stamp: performance.now(),
                  });
                else props.onSelect(l.id, l.kind === "edge" ? "edge" : "node");
              }}
            >
              <span className="label-dot" />
              {l.title}
            </button>
          ))}
      </div>
    </div>
  );
}

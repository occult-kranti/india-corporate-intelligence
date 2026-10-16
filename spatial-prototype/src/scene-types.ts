export type CameraCommand = {
  type:
    | "home"
    | "fit"
    | "back"
    | "focus"
    | "expand-stack"
    | "follow"
    | "city"
    | "pause"
    | "resume"
    | "stop"
    | "zoom-in"
    | "zoom-out"
    | "top"
    | "orbit-left"
    | "orbit-right";
  id?: string;
  stamp: number;
};
export type JourneyState = {
  phase: "idle" | "moving" | "paused";
  progress: number;
  edgeId: string | null;
};
export type SceneMetric = {
  fps: number;
  calls: number;
  triangles: number;
  quality: "high" | "balanced";
  frameBudget: number;
};
export type LabelPosition = {
  id: string;
  title: string;
  x: number;
  y: number;
  visible: boolean;
  kind: "entity" | "record" | "edge" | "stack";
  distance: number;
};
export type DisplaySummary = {
  mode: "world" | "areas";
  visibleGroups: number;
  countryStacks: number;
  areaGroups: number;
  candidates: number;
  renderedThreads: number;
};

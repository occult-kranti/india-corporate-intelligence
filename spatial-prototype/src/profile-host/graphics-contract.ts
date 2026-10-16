/** Type-only bridge to the incumbent geographic renderer. No graphics import at runtime. */
import type { Map as GeoMap } from 'maplibre-gl';
import type { WebGLRenderer } from 'three';
import type { GeographicSnapshot } from './geographicLease';
import type { CaseController } from '../case-scene/controller';
import type { CaseSceneState, SceneAction } from '../case-scene/state';
import type { CaseFrame, CaseRenderMetrics } from '../case-scene/CaseSceneLayer';
export interface CaseGraphicsHost {
  readonly map: GeoMap;
  readonly renderer: WebGLRenderer;
  readonly identity: number;
  isUsable(): boolean;
  captureGeography(): GeographicSnapshot;
  adoptGeography(snapshot: GeographicSnapshot): void;
  setWorkspaceActive(active: boolean): void;
  stopGeographicJourney(): void;
  /** Must synchronously forbid any later geographic Three draw before deferred teardown. */
  failSharedRenderer(reason: string): void;
  /** Runs before map/renderer disposal. Return removes this hook. */
  beforeDispose(cleanup: () => void): () => void;
}
export interface CaseSessionOptions {
  graphics: CaseGraphicsHost;
  controller: CaseController;
  surface: HTMLElement;
  opener: HTMLElement | null;
  onState: (state: CaseSceneState) => void;
  onFrame: (frame: CaseFrame) => void;
  onMetrics: (metrics: CaseRenderMetrics) => void;
  onAmbiguousEdges: (ids: string[]) => void;
  onFailure: (reason: string) => void;
  onClose: () => void;
  closeSourceDialog: () => boolean;
}
export interface CaseSession {
  dispatch(action: SceneAction): void;
  setInteractionMode(enabled: boolean): void;
  setQuality(quality: 1 | 0.65): void;
  requestRepaint(): void;
  dispose(): void;
}

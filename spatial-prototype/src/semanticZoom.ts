import areaData from "./assets/geography/evidence-area-anchors.json";
import { GEOGRAPHY_SOURCES, type GeoAnchor } from "./geography";
import {
  MAX_THREAD_MESHES,
  planGeographicDisplay,
  type AreaGroup,
} from "./displayBudget";
import {
  factualScene,
  type PreviewData,
  type SceneEdge,
  type SceneNode,
} from "./model";

export const WORLD_STACK_ZOOM_THRESHOLD = 3.2;
export const COUNTRY_STACK_ZOOM = WORLD_STACK_ZOOM_THRESHOLD;
export const MAX_WORLD_THREAD_MESHES = 24;
export type SemanticDisplayMode = "world" | "areas";
export type SemanticGroupKind = "country-stack" | "area" | "selected-area";

/** A presentation group only. Its key is never an evidence/relationship ID. */
export interface SemanticDisplayGroup {
  key: string;
  kind: SemanticGroupKind;
  anchor: GeoAnchor;
  records: SceneNode[];
  areaCodes: string[];
  memberCount: number;
  areaCount: number;
  countryCode: string | null;
  countryLabel: string;
  /** Exact selected original IDs, including both endpoints of a selected edge. */
  selectedIds: string[];
}
export interface CountryStack extends SemanticDisplayGroup {
  kind: "country-stack";
  countryCode: string;
}
export interface SemanticDisplayCounts {
  placedMembers: number;
  unplacedMembers: number;
  areaGroups: number;
  countryStacks: number;
  displayedGroups: number;
  selectedAreaDetails: number;
  candidateEdges: number;
  eligibleEdges: number;
  renderedEdges: number;
  suppressedSameCountryEdges: number;
  omittedEligibleEdges: number;
}
export interface SemanticDisplayPlan {
  mode: SemanticDisplayMode;
  anchors: Map<string, GeoAnchor>;
  /** All original area groups, including those summarized at world scale. */
  areaGroups: Map<string, AreaGroup>;
  areaGroupCount: number;
  /** Country summaries exist in both modes but are drawn only at world scale. */
  countryStacks: Map<string, CountryStack>;
  groups: Map<string, SemanticDisplayGroup>;
  /** Every original source-supported cross-area candidate, before display caps. */
  candidates: SceneEdge[];
  /** World filtering may hide unselected same-country candidates. */
  eligible: SceneEdge[];
  rendered: SceneEdge[];
  counts: SemanticDisplayCounts;
  /** Unique placed members; selected details must not be added to stack totals. */
  threadSummary: string;
}

type GeographicDisplayPlan = ReturnType<typeof planGeographicDisplay>;
type AreaMetadata = (typeof areaData)[number];
const countryAreas = new Map(
  areaData
    .filter((area) => area.precision === "country")
    .map((area) => [area.code, area]),
);
const countryForArea = new Map<string, string>();
for (const area of areaData) {
  if (area.precision === "country") countryForArea.set(area.code, area.code);
  // This is a bounded parent-area lookup for the retained India administrative
  // asset, not a prefix/name heuristic for unknown or future geographic data.
  if (
    area.precision === "state" &&
    area.geometrySourceId === "lgd-bharatmaps-india-states" &&
    area.code === `IN-${area.geometryFeatureId}` &&
    countryAreas.has("IN")
  )
    countryForArea.set(area.code, "IN");
}

/** Country representatives are copied from verified cartographic metadata.
 * An empty sourceIds list is deliberate: this UI summary is not a newly asserted
 * evidence location and does not merge the citations of its member records.
 */
function countryStackAnchor(area: AreaMetadata): GeoAnchor {
  const source = GEOGRAPHY_SOURCES.find(
    (entry) => entry.id === area.geometrySourceId,
  );
  const url =
    source && "url" in source
      ? source.url
      : source && "sourceUrl" in source
        ? source.sourceUrl
        : "";
  return {
    lng: area.lng,
    lat: area.lat,
    precision: "country",
    basis: `UI-only country stack; ${area.centerMethod} cartographic representative. Original evidence anchors and precision are unchanged.`,
    label: `${area.name} · UI-only country stack; expand to original documented areas`,
    sourceIds: [],
    uncertaintyKm: area.uncertaintyKm,
    bounds: [...area.bounds] as [number, number, number, number],
    areaCode: area.code,
    geometrySourceId: area.geometrySourceId,
    geometryFeatureId: area.geometryFeatureId,
    geometrySourceUrl: url ?? "",
    focusZoom: 4,
    maxEvidenceZoom: 4,
    representativeOnly: true,
  };
}

function describeArea(
  areaCode: string,
  group: AreaGroup,
  selectedIds: Set<string>,
  kind: "area" | "selected-area" = "area",
  anchors?: Map<string, GeoAnchor>,
): SemanticDisplayGroup {
  const countryCode = countryForArea.get(areaCode) ?? null;
  const selected = group.records
    .filter((node) => selectedIds.has(node.id))
    .map((node) => node.id);
  return {
    key: kind === "selected-area" ? `selected-area:${areaCode}` : areaCode,
    kind,
    // A selected detail uses the actual selected endpoint's retained anchor,
    // including its own source citations, rather than an unrelated group member.
    anchor:
      selected.length && anchors ? anchors.get(selected[0])! : group.anchor,
    records: group.records,
    areaCodes: [areaCode],
    memberCount: group.records.length,
    areaCount: 1,
    countryCode,
    countryLabel: countryCode
      ? (countryAreas.get(countryCode)?.name ?? countryCode)
      : "",
    selectedIds: selected,
  };
}

/** A supplied plan may cache anchor objects, but may not restore held or stale
 * node/edge objects. Callers must supply a plan for the same input scene. */
function compatiblePlan(
  plan: GeographicDisplayPlan,
  data: PreviewData,
): boolean {
  const nodes = new Map(data.nodes.map((node) => [node.id, node]));
  const edges = new Set(data.edges);
  return (
    [...plan.anchors.keys()].every((id) => nodes.has(id)) &&
    [...plan.groups.values()].every((group) =>
      group.records.every((node) => nodes.get(node.id) === node),
    ) &&
    plan.candidates.every((edge) => edges.has(edge))
  );
}

/** Bounded semantic zoom, without mutating source data or relocating evidence.
 * Country stacks are UI-only summaries. Original selected endpoint area details
 * are overlaid at world scale and remain included in their stack's exact count;
 * the two presentations must never be added together as distinct evidence.
 * Edges always retain their original object, direction, ID, endpoints and sources.
 */
export function planSemanticDisplay(
  data: PreviewData,
  selected = "",
  zoom = 1.5,
  existingPlan?: GeographicDisplayPlan,
): SemanticDisplayPlan {
  const factual = factualScene(data);
  const base =
    existingPlan && compatiblePlan(existingPlan, factual)
      ? existingPlan
      : planGeographicDisplay(factual, selected);
  const mode: SemanticDisplayMode =
    Number.isFinite(zoom) && zoom >= COUNTRY_STACK_ZOOM ? "areas" : "world";
  const selectedIds = new Set<string>();
  const selectedEdge = factual.edges.find((edge) => edge.id === selected);
  if (selectedEdge) {
    if (base.anchors.has(selectedEdge.from)) selectedIds.add(selectedEdge.from);
    if (base.anchors.has(selectedEdge.to)) selectedIds.add(selectedEdge.to);
  } else if (base.anchors.has(selected)) selectedIds.add(selected);

  const countryStacks = new Map<string, CountryStack>();
  const unstacked = new Map<string, SemanticDisplayGroup>();
  for (const [areaCode, group] of base.groups) {
    const code = countryForArea.get(areaCode);
    const area = code ? countryAreas.get(code) : undefined;
    if (!code || !area) {
      unstacked.set(areaCode, describeArea(areaCode, group, selectedIds));
      continue;
    }
    let stack = countryStacks.get(code);
    if (!stack) {
      stack = {
        key: `country-stack:${code}`,
        kind: "country-stack",
        anchor: countryStackAnchor(area),
        records: [],
        areaCodes: [],
        memberCount: 0,
        areaCount: 0,
        countryCode: code,
        countryLabel: area.name,
        selectedIds: [],
      };
      countryStacks.set(code, stack);
    }
    stack.records.push(...group.records);
    stack.areaCodes.push(areaCode);
    stack.memberCount += group.records.length;
    stack.areaCount++;
    for (const node of group.records)
      if (selectedIds.has(node.id)) stack.selectedIds.push(node.id);
  }

  const groups = new Map<string, SemanticDisplayGroup>();
  if (mode === "areas") {
    for (const [code, group] of base.groups)
      groups.set(code, describeArea(code, group, selectedIds));
  } else {
    for (const stack of countryStacks.values()) groups.set(stack.key, stack);
    for (const [key, group] of unstacked) groups.set(key, group);
    const selectedAreas = new Set(
      [...selectedIds].map((id) => base.anchors.get(id)!.areaCode),
    );
    for (const code of selectedAreas) {
      const area = base.groups.get(code);
      if (!area) continue;
      const detail = describeArea(
        code,
        area,
        selectedIds,
        "selected-area",
        base.anchors,
      );
      groups.delete(code);
      groups.set(detail.key, detail);
    }
  }

  const countryForNode = (id: string) =>
    countryForArea.get(base.anchors.get(id)!.areaCode);
  const eligible =
    mode === "areas"
      ? base.candidates
      : base.candidates.filter((edge) => {
          if (edge.id === selected) return true;
          const from = countryForNode(edge.from),
            to = countryForNode(edge.to);
          return !from || !to || from !== to;
        });
  const budget = mode === "world" ? MAX_WORLD_THREAD_MESHES : MAX_THREAD_MESHES;
  const rendered: SceneEdge[] = [];
  const seen = new Set<string>();
  const add = (edge: SceneEdge) => {
    const from = base.anchors.get(edge.from)!,
      to = base.anchors.get(edge.to)!;
    const fromKey =
      mode === "world"
        ? (countryForNode(edge.from) ?? from.areaCode)
        : from.areaCode;
    const toKey =
      mode === "world" ? (countryForNode(edge.to) ?? to.areaCode) : to.areaCode;
    const key = JSON.stringify([fromKey, toKey, edge.relationship.layers[0]]);
    if (rendered.length >= budget || seen.has(key)) return;
    seen.add(key);
    rendered.push(edge);
  };
  const active = eligible.find((edge) => edge.id === selected);
  if (active) add(active);
  for (const edge of eligible) add(edge);

  const counts: SemanticDisplayCounts = {
    placedMembers: base.anchors.size,
    unplacedMembers: factual.nodes.length - base.anchors.size,
    areaGroups: base.groups.size,
    countryStacks: countryStacks.size,
    displayedGroups: groups.size,
    selectedAreaDetails: [...groups.values()].filter(
      (group) => group.kind === "selected-area",
    ).length,
    candidateEdges: base.candidates.length,
    eligibleEdges: eligible.length,
    renderedEdges: rendered.length,
    suppressedSameCountryEdges: base.candidates.length - eligible.length,
    omittedEligibleEdges: eligible.length - rendered.length,
  };
  return {
    mode,
    anchors: base.anchors,
    areaGroups: base.groups,
    areaGroupCount: base.groups.size,
    countryStacks,
    groups,
    candidates: base.candidates,
    eligible,
    rendered,
    counts,
    threadSummary: `${rendered.length} displayed of ${base.candidates.length} cross-area relationships. Displayed subset only; all original evidence remains available in the reader.`,
  };
}

export const WORLD_CASE_IDS=Object.freeze([
  "anchor:anchor-scotus-washington-city",
  "anchor:anchor-nydfs-new-york-state",
  "anchor:anchor-usvi-doj-territory",
  "world:105-unmapped",
  "world:map-zoom-100-500",
  "world:pan-left",
  "world:pan-up",
  "world:pan-down",
  "world:pan-right",
  "controller:D1-filter-date-reset",
  "controller:D2-anchor-entry-source",
  "controller:D2-direct-source",
  "controller:D2-rebuilt-relation",
  "controller:D3-clamped-entry",
  "controller:D3-clamped-relation",
  "controller:D3-genuine-wheel",
  "world:keyboard-navigation",
  "world:history-back-forward",
  "world:interrupted-rail-modal",
  "fixture:concurrent-controller-load"
]);
export const WORLD_CASES=Object.freeze(WORLD_CASE_IDS.map(id=>Object.freeze({id,type:id.startsWith("fixture:")?"isolated-controller-fixture":"world-board-interaction",status:"not-run"})));

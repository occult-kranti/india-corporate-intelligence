import type { StyleSpecification } from 'maplibre-gl';

/** Preserve sourced street/footprint data while removing provider 3D styling. */
export function flatPlacesStyle(style: StyleSpecification): StyleSpecification {
  const { terrain: _terrain, sky: _sky, ...flat } = style;
  return {
    ...flat,
    projection: { type: 'mercator' },
    layers: style.layers.filter(layer => layer.type !== 'fill-extrusion').map(layer => {
      // Liberty otherwise hides flat footprints at z14 to show extrusions.
      if (layer.type === 'fill' && layer['source-layer'] === 'building') {
        const { maxzoom: _maxzoom, ...footprints } = layer;
        return footprints;
      }
      return layer;
    }),
  };
}

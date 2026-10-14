/**
 * Legacy dossier gates share the application with the map-first workspace.
 * Select the real dossier surface without changing its filters or in-page anchor.
 * This helper only constructs navigation; it does not hide or replace any UI.
 */
export function dossierRoute(route) {
  const anchorIndex = route.indexOf('#');
  const anchor = anchorIndex < 0 ? '' : route.slice(anchorIndex);
  const beforeAnchor = anchorIndex < 0 ? route : route.slice(0, anchorIndex);
  const queryIndex = beforeAnchor.indexOf('?');
  const pathname = queryIndex < 0 ? beforeAnchor : beforeAnchor.slice(0, queryIndex);
  const query = queryIndex < 0 ? '' : beforeAnchor.slice(queryIndex + 1);
  const params = new URLSearchParams(query);
  if (params.has('iw_view')) {
    params.set('iw_view', 'dossier');
    return `${pathname}?${params}${anchor}`;
  }
  // Keep the existing query's encoding/order intact for exact URL-round-trip gates.
  return `${pathname}?${query ? `${query}&` : ''}iw_view=dossier${anchor}`;
}

export const dossierUrl = (base, route) => `${base}/#${dossierRoute(route)}`;
export const dossier = page => page.locator('.iw-dossier-content');

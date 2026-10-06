import { useEffect } from 'react';

/** Restore search drafts even when a rapid Back skips an intermediate React render. */
export function useHistorySearchDrafts(
  setQuery: (value: string) => void,
  setPlace?: (value: string) => void,
  queryKey = 'q',
  placeKey = 'place',
) {
  useEffect(() => {
    const restore = () => {
      const { searchParams } = new URL(window.location.hash.slice(1), window.location.origin);
      setQuery(searchParams.get(queryKey)?.trim() ?? '');
      setPlace?.(searchParams.get(placeKey)?.trim() ?? '');
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [setQuery, setPlace, queryKey, placeKey]);
}

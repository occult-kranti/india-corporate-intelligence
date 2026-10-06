/** Keep the shared investigation context when a dossier replaces its own filters. */
export function preserveWorkspaceParams(next: URLSearchParams, current: URLSearchParams): URLSearchParams {
  const result = new URLSearchParams(next);
  for (const [key, value] of current) {
    if (key.startsWith('iw_') && !result.has(key)) result.set(key, value);
  }
  return result;
}

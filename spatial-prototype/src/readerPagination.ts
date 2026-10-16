/** Explicit page navigation starts at the new result range. Search changes do
 * not call this helper, so typing never steals focus from the search input. */
export function restoreReaderStart(resultRange: HTMLElement | null): void {
  if (!resultRange) return;
  resultRange.focus({ preventScroll: true });
  resultRange.closest<HTMLElement>(".reading-surface")?.scrollTo({
    top: 0,
    behavior: "auto",
  });
}

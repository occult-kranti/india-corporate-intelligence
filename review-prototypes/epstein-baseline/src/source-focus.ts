type TabEvent = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'preventDefault'>;
/** Native modality owns the page. Wrap only dialog endpoints so sequential Tab
 * does not leave document focus for browser chrome; interior moves stay native. */
export function containSourceTab(dialog: HTMLDialogElement, event: TabEvent): void {
  if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey || !dialog.open || !dialog.matches(':modal')) return;
  const controls = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]:not([tabindex="-1"])')]
    .filter(item => !item.closest('[hidden],[inert]') && item.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1], active = dialog.ownerDocument.activeElement;
  if (!first) return;
  if (event.shiftKey && (active === first || !dialog.contains(active))) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && (active === last || !dialog.contains(active))) { event.preventDefault(); first.focus(); }
}

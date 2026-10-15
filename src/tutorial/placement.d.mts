export interface TutorialRect { left: number; top: number; right: number; bottom: number }
export interface TutorialViewport { left?: number; top?: number; width: number; height: number }
export interface TutorialPlacement { left: number; top: number; width: number; maxHeight: number; side: 'right' | 'left' | 'top' | 'bottom' | 'center' | 'label' | 'fallback' }
export function getTutorialPlacement(anchor: TutorialRect | null, popup: { width: number; height: number }, viewport: TutorialViewport, options?: { gap?: number; padding?: number; minHeight?: number }): TutorialPlacement;
export function watchTutorialPosition(dialog: HTMLDialogElement, resolveTarget: () => HTMLElement | null, getPlacement: typeof getTutorialPlacement): { update: () => void; stop: () => void };

import projectionText from './projection.json?raw';
import admissionText from './reader-admission.json?raw';
import type { InvestigationRegistry } from '../domain';
import { buildSectorReaderOverlay, SECTOR_REVIEW_VALUE } from './adapter';
/** The sole data import. Requested only by a fresh Open after full-baseline verification. */
export function loadSectorReader(base: InvestigationRegistry) {
  return buildSectorReaderOverlay(base, projectionText, admissionText, SECTOR_REVIEW_VALUE);
}

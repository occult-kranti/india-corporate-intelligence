import additionsText from './proposed-additions.json?raw';
import provenanceText from './source-provenance.json?raw';
import type { InvestigationRegistry } from '../domain';
import { buildHistoricalReviewOverlay, HISTORICAL_REVIEW_VALUE } from './adapter';

/** This chunk is requested only after the review flag, query, and user opt-in. */
export function loadHistoricalReview(base: InvestigationRegistry) {
  return buildHistoricalReviewOverlay(base, additionsText, provenanceText, HISTORICAL_REVIEW_VALUE);
}

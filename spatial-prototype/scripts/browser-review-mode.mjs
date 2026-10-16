/** The admitted reader build must never skip its positive browser coverage. */
export function expectedHistoricalReview(value) {
  if (value === undefined || value === 'true') return true;
  throw new Error('Next-release reader review requires SPATIAL_EXPECT_HISTORICAL_REVIEW=true or absent; disabled-mode review is obsolete.');
}

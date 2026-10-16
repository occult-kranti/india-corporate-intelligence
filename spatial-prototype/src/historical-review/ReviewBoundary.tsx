import { Component } from 'react';
import type { ReactNode } from 'react';
import { withoutHistoricalReview } from './adapter';
/** Review-chunk failure never replaces the separately mounted original atlas. */
export default class HistoricalReviewBoundary extends Component<{ children: ReactNode; href: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <aside role="alert">
      <p>Historical review could not open. The unchanged base atlas remains available.</p>
      <a href={withoutHistoricalReview(this.props.href)}>Return to the base-only URL</a>
    </aside>;
    return this.props.children;
  }
}

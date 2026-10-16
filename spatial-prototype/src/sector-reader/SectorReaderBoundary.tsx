import { Component } from 'react';
import type { ReactNode } from 'react';
import { withoutSectorReview } from './adapter';
/** Chunk/render errors cannot replace the independently mounted base atlas. */
export default class SectorReaderBoundary extends Component<{ children: ReactNode; href: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <aside role="alert"><p>Sector reader could not open. The unchanged base atlas remains available.</p>
      <button type="button" onClick={() => this.setState({ failed: false })}>Retry sector reader entry</button>{' '}
      <a href={withoutSectorReview(this.props.href)}>Return to base-only URL</a></aside>;
    return this.props.children;
  }
}

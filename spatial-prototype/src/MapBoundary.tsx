import { Component, type ReactNode } from "react";
/** Graphics chunk/React failures must never evict the independently loaded reader. */
export default class MapBoundary extends Component<
  { children: ReactNode; onFailure: (reason: string) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onFailure(
      error.message || "The geographic view could not be loaded.",
    );
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

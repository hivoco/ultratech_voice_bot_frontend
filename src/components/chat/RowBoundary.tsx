"use client";

import { Component, type ReactNode } from "react";

/**
 * Per-message error boundary: if one message can't render (unexpected data from the backend or the
 * call), only that row is replaced by a small note and the rest of the conversation keeps working.
 * Without it, React unmounts the whole chat and shows the app error page.
 */
export class RowBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[ultratech] message failed to render:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p role="note" className="w-fit max-w-[94%] rounded-2xl border border-line-2 bg-paper px-3.5 py-2 text-[13px] text-muted">
        This message couldn&apos;t be shown.
      </p>
    );
  }
}

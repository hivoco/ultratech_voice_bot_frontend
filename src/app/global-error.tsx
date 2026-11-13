"use client";

import { useEffect } from "react";

/**
 * Last-resort fallback when the root layout itself fails. It replaces the whole document, so it
 * can't use globals.css: plain inline styles in the app's colours.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[ultratech] root error:", error);
  }, [error]);

  const button = {
    border: "1px solid #e3dcc8",
    borderRadius: 999,
    padding: "10px 20px",
    font: "600 15px system-ui, sans-serif",
    color: "#1c1a14",
    cursor: "pointer",
  } as const;
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f7f0dc", color: "#1c1a14", font: "15px/1.45 system-ui, sans-serif" }}>
        <title>UltraTech Engineer</title>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div>
            <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Something went wrong</h1>
            <p style={{ margin: "0 0 20px", color: "#45433e" }}>Please try again, or reload the page.</p>
            <button type="button" onClick={() => retry()} style={{ ...button, background: "#ffd400", borderColor: "#ffd400", marginRight: 10 }}>
              Try again
            </button>
            <button type="button" onClick={() => window.location.reload()} style={{ ...button, background: "#fff" }}>
              Reload page
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

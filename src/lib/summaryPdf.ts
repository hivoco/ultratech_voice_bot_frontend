// Conversation summary → PDF.
// The backend renders the real PDF and returns an S3 link once S3 is configured. Until then (local
// dev), the browser prints a styled summary page, where "Save as PDF" gives the file. The browser's
// print engine shapes Hindi (Devanagari) correctly, which JS PDF libraries don't.

import type { ConversationSummary, TranscriptTurn } from "./api";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function summaryHtml(data: ConversationSummary, transcript: TranscriptTurn[], name?: string): string {
  const hi = data.lang === "hi";
  const date = new Date().toLocaleString(hi ? "hi-IN" : "en-IN", { dateStyle: "long", timeStyle: "short" });
  const rows = transcript
    .map(
      (t) =>
        `<div class="turn"><p class="who">${esc(name || "You")}</p><p>${esc(t.caller)}</p>` +
        `<p class="who">UltraTech Engineer</p><p>${esc(t.bot)}</p></div>`,
    )
    .join("");
  return `<!doctype html><html lang="${hi ? "hi" : "en"}"><head><meta charset="utf-8">
<title>UltraTech conversation summary</title>
<style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1c1a14; background: #fff;
    font: 11.5pt/1.55 "Noto Sans", "Noto Sans Devanagari", "Kohinoor Devanagari", system-ui, sans-serif; }
  header { border-bottom: 3px solid #ffd400; padding-bottom: 10px; margin-bottom: 18px; }
  h1 { font-size: 18pt; margin: 0 0 4px; }
  h2 { font-size: 13pt; margin: 22px 0 8px; }
  .meta { color: #6b6457; font-size: 9.5pt; margin: 0; }
  .summary { white-space: pre-wrap; background: #fff8cc; border-radius: 8px; padding: 12px 14px; margin: 0; }
  .turn { break-inside: avoid; border-top: 1px solid #e6e1d6; padding: 8px 0; }
  .turn p { margin: 0 0 6px; white-space: pre-wrap; }
  .who { font-weight: 700; font-size: 9.5pt; color: #6b6457; margin-bottom: 2px !important; }
</style></head><body>
<header><h1>UltraTech Home-Building Expert</h1>
<p class="meta">Conversation summary${name ? ` · ${esc(name)}` : ""} · ${esc(date)} · ${data.turns} questions</p></header>
<h2>Summary</h2><p class="summary">${esc(data.summary.trim() || "No summary available.")}</p>
<h2>Full conversation</h2>${rows}
</body></html>`;
}

/** Open the browser print dialog for the summary (Save as PDF), from a hidden iframe. */
export function printSummary(data: ConversationSummary, transcript: TranscriptTurn[], name?: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  frame.srcdoc = summaryHtml(data, transcript, name);
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return frame.remove();
    win.addEventListener("afterprint", () => setTimeout(() => frame.remove(), 500));
    win.focus();
    win.print();
  };
  document.body.appendChild(frame);
}

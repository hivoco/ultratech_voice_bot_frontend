"""Render the conversation summary PDF from summary_template.html.

    pip install jinja2 playwright && playwright install chromium

Fonts: the design uses Mukta (Hindi + Latin in one family, OFL). Put these four files from
github.com/google/fonts/tree/main/ofl/mukta in FONTS_DIR:
    Mukta-Regular.ttf  Mukta-Medium.ttf  Mukta-SemiBold.ttf  Mukta-Bold.ttf

In the backend (async FastAPI), keep one browser open and reuse it:

    pdf_bytes = await render_pdf(payload, summary, browser)

CLI check:  python render_pdf.py sample.json out.pdf
"""

from __future__ import annotations

import base64
import datetime as dt
import os
import pathlib
import re

from jinja2 import Environment, FileSystemLoader, select_autoescape

HERE = pathlib.Path(__file__).resolve().parent
FONTS_DIR = pathlib.Path(os.getenv("PDF_FONTS_DIR", HERE / "fonts"))  # e.g. backend data/fonts
AVATAR = pathlib.Path(os.getenv("PDF_AVATAR", HERE / "avatar.png"))  # the engineer image from the design
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))

_env = Environment(loader=FileSystemLoader(HERE), autoescape=select_autoescape(["html"]))

# ---- transcript pagination ------------------------------------------------------------------
# Cards are split across pages using their real rendered heights (measured in Chromium first),
# so any mix of Hindi / English text fills each page like the design (~6 turns) without overflow.
CARD_GAP = 11  # .turns gap in summary_template.html

_END = re.compile(r"[।.?!…\"')\]]\s*$")


def transcript_turns(turns: list[dict]) -> list[dict]:
    """Every non-empty turn, numbered. `interrupted` comes from the log if present; otherwise a
    long answer that stops mid-sentence (no end punctuation) counts as cut off by barge-in."""
    out = []
    for t in turns:
        caller = (t.get("caller") or "").strip()
        bot = (t.get("bot") or "").strip()
        if not caller and not bot:
            continue
        cut = t.get("interrupted")
        if cut is None:
            cut = bool(bot) and len(bot) > 40 and not _END.search(bot)
        out.append({"n": len(out) + 1, "caller": caller, "bot": bot, "interrupted": bool(cut)})
    return out


def paginate(heights: list[float], available: float) -> list[list[int]]:
    """Group card indexes into pages so each page's cards (plus gaps) fit `available` px."""
    pages: list[list[int]] = []
    page: list[int] = []
    used = 0.0
    for i, h in enumerate(heights):
        need = h + (CARD_GAP if page else 0)
        if page and used + need > available:
            pages.append(page)
            page, used, need = [], 0.0, h
        page.append(i)
        used += need
    if page:
        pages.append(page)
    return pages


# ---- context ---------------------------------------------------------------------------------
def date_label(iso: str | None) -> str:
    try:
        when = dt.datetime.fromisoformat(iso) if iso else dt.datetime.now(dt.timezone.utc)
    except ValueError:
        return iso or ""
    when = when.astimezone(IST)
    return when.strftime("%-d %b %Y, %-I:%M %p")  # 11 Nov 2026, 8:59 PM


def _data_uri(path: pathlib.Path, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"


# "→" drawn as SVG (Mukta has no arrow glyph).
ARROW_SVG = (
    '<svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="#6f6a5f" stroke-width="1.2" '
    'stroke-linecap="round" stroke-linejoin="round"><path d="M1 4h10M8 1l3 3-3 3"/></svg>'
)

_FONT_CSS: str | None = None


def font_css() -> str:
    """@font-face rules with the fonts embedded, so rendering needs no network or file access."""
    global _FONT_CSS
    if _FONT_CSS is None:
        rules = []
        for weight, name in ((400, "Regular"), (500, "Medium"), (600, "SemiBold"), (700, "Bold")):
            uri = _data_uri(FONTS_DIR / f"Mukta-{name}.ttf", "font/ttf")
            rules.append(f'@font-face{{font-family:"Mukta";src:url({uri}) format("truetype");font-weight:{weight};}}')
        _FONT_CSS = "\n".join(rules)
    return _FONT_CSS


def build_context(payload: dict, summary: dict, chunks: list[list[int]] | None = None) -> dict:
    """payload = the stored call payload (room, session_id, lang, ts, transcript[{caller, bot}]);
    summary = summarize_structured(...) output; chunks = card indexes per transcript page
    (None = every turn on one page, used for measuring)."""
    turns = transcript_turns(payload.get("transcript") or [])
    if chunks is None:
        chunks = [list(range(len(turns)))] if turns else []
    pages: list[dict] = [{"kind": "plan"}]
    for idx in chunks:
        chunk = [turns[i] for i in idx]
        pages.append({"kind": "transcript", "turns": chunk, "first": chunk[0]["n"], "last": chunk[-1]["n"]})
    lang = payload.get("lang") or "hi"
    return {
        "s": summary,
        "meta": {
            "session_id": payload.get("session_id") or payload.get("room") or "",
            "date_label": date_label(payload.get("ts")),
            "lang": lang,
            "turns": len(turns),
        },
        "pages": pages,
        "total": len(pages),
        "cut_label": "(बीच में रोका गया)" if lang == "hi" else "(interrupted)",
        "arrow_svg": ARROW_SVG,
        "font_css": font_css(),
        "avatar": _data_uri(AVATAR, "image/png") if AVATAR.exists() else "",
    }


def render_html(payload: dict, summary: dict, chunks: list[list[int]] | None = None) -> str:
    return _env.get_template("summary_template.html").render(**build_context(payload, summary, chunks))


# Card heights + the space between the first card's top and the footer, on a transcript page.
_MEASURE_JS = """() => {
  const page = document.querySelectorAll('.page')[1];
  if (!page) return null;
  const cards = [...page.querySelectorAll('.turn')].map(c => c.getBoundingClientRect().height);
  const top = page.querySelector('.turns').getBoundingClientRect().top;
  const foot = page.querySelector('.foot').getBoundingClientRect().top;
  return { cards, available: foot - top - 24 };
}"""

# True if any page's content runs into its footer (safety net; should never trigger).
_OVERFLOW_JS = """() => [...document.querySelectorAll('.page')].some(p => {
  const foot = p.querySelector('.foot').getBoundingClientRect().top - 8;
  return [...p.querySelectorAll('.turn, .why, .cols')].some(el => el.getBoundingClientRect().bottom > foot);
})"""


async def render_pdf(payload: dict, summary: dict, browser) -> bytes:
    """`browser` = a launched Playwright Chromium (reuse one for the whole process)."""
    page = await browser.new_page(viewport={"width": 794, "height": 1123})
    try:
        # Pass 1: lay every turn out on one transcript page and measure the real card heights.
        await page.set_content(render_html(payload, summary), wait_until="load")
        await page.evaluate("document.fonts.ready")
        m = await page.evaluate(_MEASURE_JS)
        chunks = paginate(m["cards"], m["available"]) if m else []
        # Pass 2: the real document.
        await page.set_content(render_html(payload, summary, chunks), wait_until="load")
        await page.evaluate("document.fonts.ready")
        if await page.evaluate(_OVERFLOW_JS):
            raise RuntimeError("summary PDF layout overflow: page content runs into the footer")
        return await page.pdf(format="A4", print_background=True, prefer_css_page_size=True)
    finally:
        await page.close()


if __name__ == "__main__":
    import asyncio
    import json
    import sys

    from playwright.async_api import async_playwright

    async def main(src: str, dst: str) -> None:
        sample = json.loads(pathlib.Path(src).read_text(encoding="utf-8"))
        async with async_playwright() as p:
            # PDF_CHROME_CHANNEL=chrome uses an installed Google Chrome instead of Playwright's Chromium.
            browser = await p.chromium.launch(channel=os.getenv("PDF_CHROME_CHANNEL") or None)
            pathlib.Path(dst).write_bytes(await render_pdf(sample["payload"], sample["summary"], browser))
            await browser.close()
        print("wrote", dst)

    asyncio.run(main(sys.argv[1], sys.argv[2]))

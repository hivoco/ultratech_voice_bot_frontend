"""Structured conversation summary for the PDF (UltraTech Home-Building Expert).

One Sarvam call turns the conversation into the JSON the PDF template needs:

    {
      "headline": str,                       # big title on page 1
      "highlight": str,                      # green ✓ line ("" hides it)
      "action_groups": [                     # the 3 columns
        {"title": str, "points": [str, ...]}
      ],
      "why": {                               # "Expert ki salah" box (null hides it)
        "title": str,
        "text": str,
        "diagram": {"from": [str], "label": str, "to": [str]} | null
      }
    }

Usage in core/summary.py (replaces summarize_turns' free-text call):

    from summary_prompt import summarize_structured
    s = summarize_structured(turns, lang,
                             lambda system, user: llm_sarvam.generate(
                                 user, grounding="", history=None, system=system, max_tokens=900))
"""

from __future__ import annotations

import json
import re
from typing import Callable

# Length limits = what fits the A4 design. The prompt asks for them; clamp() enforces them.
LIMITS = {
    "headline": 80,       # 2 lines at 34 px; the prompt asks for ~55
    "highlight": 70,
    "group_title": 22,
    "point": 90,
    "why_title": 40,
    "why_text": 300,
    "diagram_word": 14,
    "diagram_label": 32,
}
MAX_GROUPS = 3
MAX_POINTS = 3
MAX_DIAGRAM_WORDS = 3

_LANG_RULE = {
    "hi": (
        "Write every value in Hindi (Devanagari script). Keep construction, technical and brand "
        "words in Roman script exactly as people say them: drawings, approved, engineer, site, "
        "stage, concrete, slab, beam, plaster, tile, reinforcement, Wire, cement, UltraTech. "
        "Address the caller as \"आप\"."
    ),
    "en": (
        "Write every value in simple Indian English that a home builder understands, even if the "
        "conversation itself is in Hindi or Hinglish (translate it). Address the caller as \"you\"."
    ),
}

_SYSTEM = """You summarize a conversation between a home builder (the caller) and the UltraTech \
Home-Building Expert. The summary is printed as page 1 of a PDF the caller keeps, so it must be \
short, practical and easy to act on.

Return ONLY one JSON object, with no markdown, no code fences and no text before or after it:

{
  "headline": "...",
  "highlight": "...",
  "action_groups": [
    {"title": "...", "points": ["...", "..."]},
    {"title": "...", "points": ["...", "..."]},
    {"title": "...", "points": ["...", "..."]}
  ],
  "why": {
    "title": "...",
    "text": "...",
    "diagram": {"from": ["...", "..."], "label": "...", "to": ["...", "..."]}
  }
}

Field rules:
- headline: the single most important advice from the conversation, phrased as what to do. \
At most 8 words (about 55 characters).
- highlight: one encouraging sentence about something the caller has ALREADY done or has \
(for example, they bought the plot or have a contractor). At most 70 characters. Use "" if the \
conversation gives nothing to acknowledge.
- action_groups: exactly 3 groups, ordered by when to act. Default titles are "Do now", \
"Keep on site", "Before every stage"; change a title only if the conversation clearly needs a \
different one. Titles are 1 to 4 words. Each group has 1 to 3 points. Each point is one concrete \
action addressed to the caller, at most 90 characters. Every point must be different: never \
repeat the same advice in two groups.
- why: the main reason behind the advice. title is 3 to 5 words; text at most 300 characters.
- why.diagram: only when the reason is "X covers or hides Y" (for example concrete, plaster or \
tile hiding reinforcement, pipes and wires). "from" and "to" hold 1 to 3 single words each; \
"label" is 2 to 4 words (for example "के नीचे छिप जाते हैं" or "hide"). Otherwise set \
"diagram" to null.

Content rules:
- Use only what was actually said in the conversation. Do not add facts, numbers, products, \
prices or durations that the expert did not say.
- The transcript comes from speech recognition: ignore greetings, filler words, repeated turns, \
cut-off sentences and small talk.
- Plain text inside every string: no markdown, no asterisks, no emojis, no line breaks.
- {lang_rule}
"""


def system_prompt(lang: str) -> str:
    return _SYSTEM.replace("{lang_rule}", _LANG_RULE["hi" if lang == "hi" else "en"])


def clean_turns(turns: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """Input for the summary only (the PDF transcript keeps every turn): drop empty turns and
    turns whose answer repeats the previous answer word for word."""
    out: list[tuple[str, str]] = []
    for caller, bot in turns:
        caller, bot = (caller or "").strip(), (bot or "").strip()
        if not caller and not bot:
            continue
        if out and bot and bot == out[-1][1]:
            continue
        out.append((caller, bot))
    return out


def user_prompt(turns: list[tuple[str, str]]) -> str:
    lines = []
    for caller, bot in turns:
        if caller:
            lines.append(f"Caller: {caller}")
        if bot:
            lines.append(f"Expert: {bot}")
    return "Conversation:\n" + "\n".join(lines)


def _cut(text: object, limit: int) -> str:
    """Plain, single-line text trimmed to `limit` characters at a word boundary."""
    s = re.sub(r"[*#`_]+", "", str(text or ""))
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) <= limit:
        return s
    s = s[: limit - 1].rsplit(" ", 1)[0].rstrip(",;:-– ")
    return s + "…"


def _words(items: object) -> list[str]:
    if not isinstance(items, list):
        return []
    words = [_cut(w, LIMITS["diagram_word"]) for w in items]
    return [w for w in words if w][:MAX_DIAGRAM_WORDS]


def clamp(data: dict) -> dict:
    """Coerce model output to the exact shape and limits the template expects."""
    groups, seen = [], set()
    for g in data.get("action_groups") or []:
        if not isinstance(g, dict):
            continue
        points = [_cut(p, LIMITS["point"]) for p in (g.get("points") or []) if isinstance(p, str)]
        points = [p for p in points if p and p not in seen][:MAX_POINTS]
        seen.update(points)  # the same advice never shows twice
        title = _cut(g.get("title"), LIMITS["group_title"])
        if title and points:
            groups.append({"title": title, "points": points})
    groups = groups[:MAX_GROUPS]

    why = data.get("why") if isinstance(data.get("why"), dict) else None
    why_out = None
    if why and _cut(why.get("text"), LIMITS["why_text"]):
        d = why.get("diagram") if isinstance(why.get("diagram"), dict) else None
        diagram = None
        if d and _words(d.get("from")) and _words(d.get("to")):
            diagram = {
                "from": _words(d.get("from")),
                "label": _cut(d.get("label"), LIMITS["diagram_label"]),
                "to": _words(d.get("to")),
            }
        why_out = {
            "title": _cut(why.get("title"), LIMITS["why_title"]),
            "text": _cut(why.get("text"), LIMITS["why_text"]),
            "diagram": diagram,
        }

    return {
        "headline": _cut(data.get("headline"), LIMITS["headline"]),
        "highlight": _cut(data.get("highlight"), LIMITS["highlight"]),
        "action_groups": groups,
        "why": why_out,
    }


def parse(raw: str) -> dict | None:
    """Pull the JSON object out of the model reply (tolerates code fences or extra text)."""
    if not raw:
        return None
    text = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        data = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def fallback(turns: list[tuple[str, str]], lang: str) -> dict:
    """Used when the model reply can't be parsed twice: a valid, minimal page 1."""
    first_q = next((c for c, _ in turns if c), "")
    title = "आपकी बातचीत का सारांश" if lang == "hi" else "Summary of your conversation"
    return clamp({"headline": first_q or title, "highlight": "", "action_groups": [], "why": None})


def summarize_structured(
    turns: list[tuple[str, str]],
    lang: str,
    generate: Callable[[str, str], str],
) -> dict:
    """Run the prompt (one call, one retry on bad JSON) and return clamped, template-ready data.
    `generate(system, user)` returns the model's text reply."""
    lang = "hi" if lang == "hi" else "en"
    convo = clean_turns(turns)
    if not convo:
        return fallback(turns, lang)
    system, user = system_prompt(lang), user_prompt(convo)
    for attempt in range(2):
        prompt = user if attempt == 0 else user + "\n\nReturn ONLY the JSON object."
        data = parse(generate(system, prompt))
        if data:
            out = clamp(data)
            if out["headline"]:
                return out
    return fallback(convo, lang)

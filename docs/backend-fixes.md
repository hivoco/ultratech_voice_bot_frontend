# Backend fixes needed (from frontend testing)

_Date: 2026-11-13 · Backend checked: `origin/main` @ `6c4da6e` (latest) · Deployed: https://ultratech.thefirstimpression.ai_

Sections: P0 security/cost (1–4) · P1 wrong output (5–9) · P2 cleanup (10–12) · P1 new feature: reply layouts (13) · checklist at the end.

Found while wiring the frontend to the APIs in `FRONTEND_INTEGRATION.md` and running live chats
and calls against the deployed backend (English, Hindi and Hinglish). Each item has what happens,
where it comes from, and what we need. Ordered by priority.

**Please test every fix end-to-end in all 3 languages (en / hi / hinglish), in both chat and a
voice call, before telling us it's done.** A quick script that posts to `/turn` for each language
and prints `text` + `key_points` would have caught items 1–3.

---

## P0: security and cost

### 1. Paid endpoints are open to anyone
`/session`, `/turn`, `/turn/stream`, `/turn/audio` and `/turn/image` in `main.py` have no
`Depends(require_login)`. Anyone who finds the URL can run Sarvam LLM/TTS and Jev calls on our bill.

**Fix:** add `_user: str = Depends(require_login)` to all of them (the frontend already sends
Basic auth on every call, so nothing breaks on our side).

### 2. `/admin/test-alert` is public and leaks the alert email
`main.py:243`: no auth. Any POST sends an alert email and returns the `ALERT_TO`/`SMTP_USER`
address in the response.

**Fix:** put it behind auth (or remove it from prod).

### 3. Default password is in the code
`main.py:27`: `DEMO_PASS = os.getenv("DEMO_PASS", "build@2026")`, and the live server still
accepts that default.

**Fix:** set a new `DEMO_PASS` in the server env, and make startup fail if it's missing (no
default). Tell us the new one; it goes in the frontend's server env only.

### 4. Voice worker has no `agent_name` (any worker takes prod calls)
`agent/worker.py:618`: `WorkerOptions(entrypoint_fnc=..., prewarm_fnc=...)` with no
`agent_name`, so LiveKit auto-dispatches every room to *any* worker on the project. A dev running
the worker locally with the same LiveKit keys will silently take real users' calls.

**Fix:** set `agent_name="ultratech-expert"` (or similar) and dispatch explicitly from
`/voice/token` (`RoomConfiguration(agents=[RoomAgentDispatch(agent_name=...)])` on the token).

---

## P1: wrong output users see

### 5. Send real follow-up questions: `suggested_questions` (non-repeating, not a summary)
The app shows tappable follow-ups under *"At this stage, people often ask"*; a tap sends that exact
text as the user's next message. Today the backend only has `key_points`, which
`core/keypoints.py` extracts **from the reply just given** (its prompt even says *"No questions"*).
So they are a summary, not questions, and tapping one makes the bot repeat itself. They also
**repeat across turns**: the same point comes back on answer after answer.

Live examples (Foundation stage, 10-turn chats):

| lang | what came back | problem |
|---|---|---|
| en | "Cover fresh concrete with tarpaulin", "Follow post-pour curing checklist" | statements; tap → bot repeats the same answer |
| en | "Inform expert of future floor count" on turn 1, again on turn 10 | repeats across turns |
| hi | "तुरंत slab को टार्पालिन से ढकें"; "qualified expert से site check करवाएं" on 3 different turns | statements; repeats |
| hinglish | "qualified expert se soil test karwayein" on turns 2, 7 and 9 | repeats; not something a user asks |
| all | off-topic refusal ("Who will win the cricket world cup?") → "Helps with home-building questions" | junk |

**Fix:** add `suggested_questions: string[]` to `/turn`, `/turn/image` and the `/turn/stream`
`done` event. Rules:
- 2 (max 3) **questions the user would ask next**, written as the user speaking ("How do I cure
  columns?"), ending with `?`. Not a summary of the reply, not instructions.
- **Not already answered** in this reply or earlier in the session, and **never repeated**: keep the
  session's previously suggested questions (and the user's own questions) and exclude them and
  near-duplicates. If nothing new fits, send fewer, or `[]`.
- In the user's language and script: Devanagari for `hi`, Roman for `hinglish` (capitalised), max
  ~8 words.
- Grounded in the KB topics for the session's stage (things the bot can actually answer).
- `[]` on refusals, greetings, errors and when a `ui` question card (item 13) is sent.
- No "get a qualified expert to check it" style items.

Keep `key_points` as it is (the PDF can use it). The frontend already reads `suggested_questions`
and prefers it over `key_points` as soon as it's non-empty.

_Stopgap in the app until then:_ `key_points` show under "Tap to know more" and a tap sends "Tell me
more about this: …", so the bot elaborates instead of repeating.

### 6. Hindi / Hinglish answers speak in first person ("I will cover it")
Live replies: *"ताज़ा कंक्रीट को तुरंत टार्पालिन… से ढक दूँगा और … checklist का पालन करूँगा"*,
Hinglish *"…se dhak dunga aur … palan karunga"*. The bot is telling the user what **it** will do.
It should be an instruction to the user: *ढक दीजिए / पालन कीजिए*, *dhak dijiye / palan kijiye*.
English is fine ("cover it right away").

**Fix:** in `agent/prompt.py` / `brain.system_for`, add a rule and an example: advice is always
addressed to the user in आप-form imperative (*कीजिए / करवाइए*), never first person. Likely also in
the gold answers if they were written in first person; please check.

### 7. Hinglish output starts lowercase
`key_points` (and sometimes replies) in Hinglish start lowercase: "turant tarpaulin…", "qualified
expert se…", "concrete ko…". Probably from `core/translit.transliterate_turn`.

**Fix:** capitalise the first letter of each reply sentence and each key point after
transliteration. (The app now capitalises on display as a stopgap, but the PDF summary and any
other client still get lowercase.)

### 8. Hinglish missing in summary PDFs and voice captions
- `/session/summary` for a Hinglish chat is inconsistent: one run came back clean Roman, the next
  mixed scripts ("Aapke UltraTech consultation ka सारांश: … मुख्य बातें: - Aapki site ki मिट्टी
  काली है…"). The response `lang` is always `"hi"`, never `"hinglish"`.
- Voice: Hinglish is sent as `hi` (per your doc), so captions come back in Devanagari. If Hinglish
  users should see Roman captions, the worker needs a `hinglish` lang and transliteration on the
  caption text (speech can stay Hindi).

**Fix:** the app now sends `ui_lang: "en" | "hi" | "hinglish"` on `/session/summary` and
`/voice/token` (next to the existing `lang`, which stays `en`/`hi`). Add `ui_lang: str | None =
None` to `SummaryIn` / `VoiceTokenIn`; when it's `"hinglish"`, write the summary/PDF in Roman
(transliterate like `/turn` does), return `lang: "hinglish"`, and (optional) send Roman captions in
calls.

### 9. Escalation ("contact the site engineer") card has nothing to contact
When a reply is `serious`, the app shows the Figma site-engineer card. The backend sends only
`serious` + `image_condition` (chat) or `{"type":"escalation","condition":...}` (call,
`agent/worker.py:592`): **no name, phone, email, WhatsApp, booking link or booking endpoint.**
Until now the card showed a dead *Book a site visit* button. The app now hides every button it
has no data for and shows only a "pause work and get it inspected" note, so it's honest but
still not actionable.

**Fix:** decide with the client what the hand-off is (helpline? regional engineer? booking form?),
then send a `contact` object. All fields are optional; the app shows a button only for the ones
present and valid:

```json
"contact": {
  "name": "UltraTech Expert desk",               // card title (else "A site engineer should check this")
  "role": "Site engineer · your area",           // subtitle
  "phone": "+91 1800 210 3311",                  // Call button (tel:), digits/spaces/dashes/+ only, 6–20 chars
  "whatsapp": "+91 98765 43210",                 // WhatsApp button (wa.me), with country code
  "email": "homebuilder.care@ultratech.example", // Email button (mailto:)
  "booking_url": "https://…",                    // "Book a site visit" button, must be https
  "call_slot": "Calls back within 2 hours"       // info row
}
```

Send it in three places:
- `/turn` and `/turn/image` responses: next to `serious: true` (the app shows the card for typed
  turns too, not only photos).
- Voice: in the `escalation` data message: `{"type":"escalation","condition":"cracks","contact":{…}}`.
- Optionally the `expert` topic (`{name, role, phone, …}`), same fields.

Also send `condition` as a short code (`cracks`, `dampness`, …); the app turns `_` into spaces.
If the client wants leads captured in-app instead of a link, add
`POST /visit/book {session_id | room, name, phone, pincode, stage, condition}` and tell us. We'll
build the form.

---

## P2: missing features and cleanup

### 10. Stage not passed to voice calls
`VoiceTokenIn` (`main.py:153`) has no `stage`, so the voice Expert doesn't know the stage the user
picked (chat does, via `/session`).

**Fix:** the app already sends `stage` on `/voice/token` (one of Plot | Plan | Foundation |
Structure | Plaster | Finishing; ignored by today's backend). Add `stage: str | None` to
`VoiceTokenIn`, put it in the participant metadata next to `lang`, and have the worker pass it to
`brain.build_context`.

### 11. Voice worker stalled in "thinking" (13 Nov)
During one test call the worker received the question and never answered (stuck in thinking for
more than 20 s, no error to the client). The frontend now shows a "taking longer than usual" hint
after 20 s, but the stall itself needs a look: please add a timeout around the LLM/TTS calls in the
worker and log when one fires.

### 12. Delete test files from S3
Our live tests left PDFs in bucket `videoforinteractivedemons`: keys starting `claude-pdf-check-`
and `conv-` from 12–13 Nov. Please delete them (we don't have delete access).

---

## P1 (new feature): reply layouts, the `ui` field

Design has 4 kinds of AI reply. The frontend now renders all 4 (tested with mock data); the backend
needs to produce them. Everything below is **optional and additive**: a reply without `ui` still
renders as today.

### 13. Add `ui` to `/turn` and `/turn/image` responses

| kind | when to use | `ui` |
|---|---|---|
| Plain answer (+ follow-ups) | most replies | omit `ui`; send `text` + `suggested_questions` (item 5) |
| Single choice (MCQ) | the bot needs one answer before it can help ("Which cement are you using?") | `type: "choice"` |
| Multi-step questions | the bot needs 2–5 answers to triage ("crack: what / where / growing?"), shown one at a time with a 1 / 3 progress bar | `type: "quiz"` |
| Facts: metrics + checklist | answers with numbers and steps ("curing days: OPC 7, PPC 10; how to check on site") | `type: "facts"` |

`text` is always the short lead line above the card ("Let's understand it first — …"). Keep it,
since voice and the PDF use it.

**Single choice**
```json
{
  "text": "Which cement are you using right now?",
  "ui": {
    "type": "choice",
    "id": "cement_type",
    "question": "Pick one",
    "options": ["OPC 53", "PPC", "PSC", "Not sure"],
    "photo_prompt": "Or send a photo of the cement bag"
  }
}
```

**Multi-step questions** (each question single-choice, or multi-select with `"multiple": true`)
```json
{
  "text": "Let's understand it first — many cracks are minor, but some need attention. Just tell me 3 quick things.",
  "ui": {
    "type": "quiz",
    "id": "crack_triage",
    "photo_prompt": "Send a photo of the crack — it'll be much clearer",
    "questions": [
      { "id": "look",  "question": "What does the crack look like?",
        "options": ["Thin like a hair (hairline)", "Straight and wide — a coin fits in", "Diagonal, from a window or door corner"] },
      { "id": "where", "question": "Where is it?", "multiple": true,
        "options": ["Only on plaster", "Beam or column", "Wall", "Slab / roof"] },
      { "id": "grow",  "question": "Is it growing?",
        "options": ["No, same for months", "Yes, getting bigger", "Not sure"] }
    ]
  }
}
```

**Facts**
```json
{
  "text": "You're asking at just the right time — concrete gets its real strength from curing.",
  "ui": {
    "type": "facts",
    "metrics": [
      { "label": "OPC cement",    "value": "At least 7 days" },
      { "label": "PPC / blended", "value": "At least 10 days" }
    ],
    "sections": [
      { "title": "How to check on site",
        "items": ["Don't let the surface dry — water it 2–3 times a day",
                  "Keep water pooled on the slab, wet gunny bags on columns",
                  "Shield it from strong sun and wind for the first 24 hours"] }
    ]
  },
  "suggested_questions": ["How do I cure columns?", "Can I use a curing compound?"]
}
```

**Limits** (the app drops or cuts anything beyond these, and ignores the whole `ui` if it's invalid):

| field | limit |
|---|---|
| `id` (ui and question) | `[A-Za-z0-9_-]`, max 40 chars, unique within the reply |
| `question` | max 140 chars, aim for < 60 |
| `options` | 2–6 per question, max 90 chars each (aim < 45), no duplicates |
| `questions` (quiz) | 1–5 |
| `photo_prompt` | max 120 chars; the app shows it only where photos are enabled |
| `metrics` | max 6; `label` and `value` max 40 chars each; keep `value` short ("At least 7 days") |
| `sections` | max 3; `title` max 60; `items` max 6, each max 160 chars |
| whole `ui` | max 16 KB |

All visible strings follow the user's language/script, the same as `text`. Numbers in `metrics`
must come from the KB (same no-invented-numbers rule as the answers).

**How answers come back.** When the user finishes a choice or quiz, the app sends a normal `/turn`
with:
- `text`: a readable version, so it works even if you ignore `answers`. For choice it's the
  option itself ("PPC"). For a quiz it's one line per question: `"What does the crack look like? —
  Thin like a hair (hairline)\nWhere is it? — Beam or column, Wall\nIs it growing? — Yes,
  getting bigger"`.
- `answers` (new, optional to use):
  ```json
  "answers": { "ui_id": "crack_triage", "items": [
    { "id": "look",  "question": "What does the crack look like?", "answer": ["Thin like a hair (hairline)"] },
    { "id": "where", "question": "Where is it?", "answer": ["Beam or column", "Wall"] },
    { "id": "grow",  "question": "Is it growing?", "answer": ["Yes, getting bigger"] } ] }
  ```
  Please accept it on `TextTurnIn` (`answers: dict | None = None`) so it can't 422, and use it for
  the triage logic (e.g. "growing + beam/column" → `serious: true` + `contact`, item 9).

**Rules for the LLM / pipeline:**
- Use `choice`/`quiz` only when an answer actually changes the advice; don't quiz every turn.
- After a quiz answer, reply with the result (often `facts`, or `serious` + `contact`); don't ask
  the same questions again.
- No `suggested_questions` with a `choice`/`quiz` (the card is the next step).
- Voice: the worker should speak only `text` and ask quiz questions one by one in speech; the
  layouts are chat-only.
- The PDF summary should include the facts (metrics + checklist) as plain lines.

**Language/stage pickers** at the start are handled in the app (no backend call). If you later
want the bot to ask them itself, use `choice`.

---

## What the frontend already sends / reads (so your fixes work without a frontend release)

| Item | Frontend today |
|---|---|
| 5 `suggested_questions` | read from `/turn` and `/turn/image`; preferred over `key_points` when non-empty |
| 8 Hinglish PDF | sends `ui_lang` on `/session/summary` and `/voice/token` |
| 9 `contact` | read from `/turn`, `/turn/image`, voice `escalation` and `expert` topics |
| 10 voice `stage` | sends `stage` on `/voice/token` |
| 13 `ui` + `answers` | renders `choice` / `quiz` / `facts`; sends `answers` on `/turn` |
| 3 new `DEMO_PASS` | config only: we update `BACKEND_BASIC_PASS` in the frontend's server env |

Unknown fields are ignored by your Pydantic models today, so nothing breaks before you ship. Field
names and shapes must match this file exactly (the app validates and silently drops anything
else). If you change a name, tell us.

Needs frontend work only if you choose it: an in-app booking form (`POST /visit/book`, item 9)
instead of a `booking_url` link.

---

## Live test on 917b663 (14 Nov, English, 3 chats, 25 turns)

Works: auth, follow-up questions (2–3 per answer, none on greetings, thanks or off-topic),
off-topic refusal, memory ("you said black cotton soil"), short closings, summaries + PDF,
~2 s per turn, no errors.

14. **A typed serious problem gets no expert card.** "There is a diagonal crack in my column,
    about 3 mm wide, and it is growing" → the reply says stop work and get it inspected, but
    `serious: false`. `serious` is only ever set on photo turns (`/turn/image`). Set it on
    `/turn` too (Jev already classifies the risk trigger; "structural cracks" is in
    `CONSULT_TRIGGERS`) and add `contact` (item 9).
15. **Follow-up questions the bot then refuses to answer.** The suggestions offer numbers and
    specifics that the reply prompt won't give, so a tap ends in "as advised by a qualified
    expert" and the same answer again:
    - "What is the ideal water curing duration?" → same deflection as the turn before
      (plaster chat, turns 1 and 2 almost identical).
    - "How long should the wet sack stay moist?", "What is the standard span length for
      props?", "What depth should the foundation be?", "Can you suggest a qualified lab?",
      "How much load can this column safely carry?".
    Only suggest questions the KB can actually answer (pass the KB items / allowed topics to
    `core/suggest.py`, or drop suggestions the answer prompt would deflect). Also no invented
    specifics ("prop spacing for a 12-inch slab") and no questions aimed at the user ("Do you
    suggest a specific lab?").
16. **Too much "qualified expert".** 16 of 25 answers defer to "a qualified expert", even for
    basics the KB has (plaster curing days). The few-shot in `prompt.py` gives OPC/PPC numbers,
    but chat answers don't. Answer from the KB when it has the fact; defer only for
    site-specific judgement.
17. **Near-duplicate suggestions across turns.** "What depth should the foundation be?" then
    "What is the typical foundation depth?" next turn: the repeat check is exact-match only.
18. **"ok" gets a full reply + 3 suggestions.** Fine as a non-closing, but "Is there anything
    else you would like to check" plus suggestions is a lot for "ok".

## Checklist

Status checked against backend `917b663` (2026-11-14). Still open: 3 (the default password is
still in `main.py`), 4, 8 voice captions, 9, 12 (can't verify from the repo), 13.

- [x] 1 Auth on `/session`, `/turn*`, `/turn/image`
- [x] 2 Lock `/admin/test-alert`
- [ ] 3 New `DEMO_PASS`, no default in code
- [ ] 4 `agent_name` + explicit dispatch
- [x] 5 `suggested_questions`: real next questions, never repeated in a session, none on refusals
- [x] 6 No first-person advice in hi/hinglish
- [x] 7 Capitalise Hinglish
- [x] 8 Hinglish summary PDF: Roman only, `lang:"hinglish"` (voice captions still Devanagari: open)
- [ ] 9 `contact` on serious replies (chat + voice `escalation`), or a booking endpoint
- [x] 10 `stage` on `/voice/token`
- [x] 11 Worker timeout on stalls
- [ ] 12 Clean test PDFs from S3
- [ ] 13 `ui` layouts (`choice`, `quiz`, `facts`) + accept `answers` on `/turn`
- [ ] 14 `serious` (+ `contact`) on typed `/turn` for structural problems
- [ ] 15 Suggest only questions the bot will answer
- [ ] 16 Fewer "qualified expert" deflections when the KB has the fact
- [ ] 17 Fuzzy repeat check for suggestions
- [ ] Tested in en / hi / hinglish, chat + voice

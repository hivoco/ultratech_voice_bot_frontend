import { proxyJson } from "@/lib/backend";
import { guardPost, USER_ID_RE } from "@/lib/guard";
import { STAGES } from "@/lib/types";

// POST /api/voice/token  {user_uuid, lang, stage?, ui_lang?} -> {url, token, room}
// `stage` and `ui_lang` (en | hi | hinglish) are for docs/backend-fixes.md items 8 and 10; the
// current backend ignores unknown fields, so sending them early is safe.
// Each token starts a paid agent session, so this route is the most tightly limited.
export async function POST(request: Request) {
  const body = await guardPost(request, "voice-token", 6);
  if (body instanceof Response) return body;
  const { user_uuid, lang } = body;
  if (typeof user_uuid !== "string" || !USER_ID_RE.test(user_uuid)) {
    return Response.json({ detail: "Invalid user_uuid" }, { status: 400 });
  }
  const stage = typeof body.stage === "string" && (STAGES as string[]).includes(body.stage) ? body.stage : undefined;
  const uiLang = body.ui_lang === "en" || body.ui_lang === "hi" || body.ui_lang === "hinglish" ? body.ui_lang : undefined;
  return proxyJson("/voice/token", {
    user_uuid,
    lang: lang === "en" ? "en" : "hi",
    ...(stage ? { stage } : {}),
    ...(uiLang ? { ui_lang: uiLang } : {}),
  });
}

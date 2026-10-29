import { proxyJson } from "@/lib/backend";
import { guardPost, USER_ID_RE } from "@/lib/guard";

// POST /api/voice/token  {user_uuid, lang} -> {url, token, room}
// Each token starts a paid agent session, so this route is the most tightly limited.
export async function POST(request: Request) {
  const body = await guardPost(request, "voice-token", 6);
  if (body instanceof Response) return body;
  const { user_uuid, lang } = body;
  if (typeof user_uuid !== "string" || !USER_ID_RE.test(user_uuid)) {
    return Response.json({ detail: "Invalid user_uuid" }, { status: 400 });
  }
  return proxyJson("/voice/token", { user_uuid, lang: lang === "en" ? "en" : "hi" });
}

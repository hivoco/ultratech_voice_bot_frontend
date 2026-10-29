import { proxyJson } from "@/lib/backend";

// POST /api/voice/token  {user_uuid, lang} -> {url, token, room}
export async function POST(request: Request) {
  const { user_uuid, lang } = (await request.json()) as { user_uuid?: string; lang?: string };
  if (!user_uuid) return Response.json({ detail: "user_uuid is required" }, { status: 400 });
  return proxyJson("/voice/token", { user_uuid, lang: lang === "en" ? "en" : "hi" });
}

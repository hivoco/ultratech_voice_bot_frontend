import { proxyJson } from "@/lib/backend";
import { guardPost, USER_ID_RE } from "@/lib/guard";

// POST /api/session  {user_uuid} -> {session_id}   (text-chat path)
export async function POST(request: Request) {
  const body = await guardPost(request, "session", 10);
  if (body instanceof Response) return body;
  const { user_uuid } = body;
  if (typeof user_uuid !== "string" || !USER_ID_RE.test(user_uuid)) {
    return Response.json({ detail: "Invalid user_uuid" }, { status: 400 });
  }
  return proxyJson("/session", { user_uuid });
}

import { proxyJson } from "@/lib/backend";

// POST /api/session  {user_uuid} -> {session_id}   (text-chat path)
export async function POST(request: Request) {
  const { user_uuid } = (await request.json()) as { user_uuid?: string };
  if (!user_uuid) return Response.json({ detail: "user_uuid is required" }, { status: 400 });
  return proxyJson("/session", { user_uuid });
}

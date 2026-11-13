import { proxyJson } from "@/lib/backend";
import { guardPost, USER_ID_RE } from "@/lib/guard";
import { STAGES, type Stage } from "@/lib/types";

// POST /api/session  {user_uuid, stage?} -> {session_id}   (text-chat path)
// `stage` (one of the six picker values) makes the Expert stage-aware from turn 1; anything else is dropped.
export async function POST(request: Request) {
  const body = await guardPost(request, "session", 10);
  if (body instanceof Response) return body;
  const { user_uuid, stage } = body;
  if (typeof user_uuid !== "string" || !USER_ID_RE.test(user_uuid)) {
    return Response.json({ detail: "Invalid user_uuid" }, { status: 400 });
  }
  const validStage = STAGES.includes(stage as Stage) ? stage : undefined;
  return proxyJson("/session", validStage ? { user_uuid, stage: validStage } : { user_uuid });
}

import { connection } from "next/server";
import { proxyJson } from "@/lib/backend";

// GET /api/health -> backend /health (drives the "Online" dot in the header)
export async function GET() {
  await connection();
  return proxyJson("/health");
}

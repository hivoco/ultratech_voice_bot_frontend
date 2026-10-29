import "server-only";

// Server-side bridge to the FastAPI backend. The browser only ever talks to our own
// /api/* routes, so the backend's Basic-auth credentials never reach the client bundle.

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8090").replace(/\/$/, "");
const BASIC_USER = process.env.BACKEND_BASIC_USER ?? "";
const BASIC_PASS = process.env.BACKEND_BASIC_PASS ?? "";

const AUTH_HEADER: Record<string, string> = BASIC_USER
  ? { Authorization: `Basic ${Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString("base64")}` }
  : {};

if (process.env.NODE_ENV === "production" && BASIC_USER) {
  const { protocol, hostname } = new URL(BACKEND_URL);
  if (protocol !== "https:" && !["127.0.0.1", "localhost", "::1"].includes(hostname)) {
    console.warn(`[backend] BACKEND_URL is plain http on ${hostname}: Basic-auth credentials travel unencrypted.`);
  }
}

export async function backendFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { ...AUTH_HEADER, ...(init.headers as Record<string, string>) },
    cache: "no-store",
  });
}

/** Relay a backend response to the browser, or a 502 if the backend is unreachable. */
export async function proxyJson(path: string, body?: unknown): Promise<Response> {
  try {
    const upstream = await backendFetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return Response.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}

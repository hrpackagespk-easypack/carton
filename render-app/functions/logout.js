import { clearCookie, getCookie, verifyToken } from "../src/auth.js";

export async function onRequest({ request, env }) {
  try {
    const t = await verifyToken(env, getCookie(request, "sess"));
    if (t && t.u && t.s && env.USERS) {
      const key = "user:" + t.u;
      const rec = await env.USERS.get(key, "json");
      if (rec && Array.isArray(rec.sessions)) {
        rec.sessions = rec.sessions.filter((s) => s.sid !== t.s); // frees this device's place
        await env.USERS.put(key, JSON.stringify(rec));
      }
    }
  } catch {
    // ignore, still log out below
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Cache-Control": "no-store",
      "Set-Cookie": clearCookie("sess")
    }
  });
}

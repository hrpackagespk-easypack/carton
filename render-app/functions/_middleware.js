import { clearCookie, getCookie, json, userStatus, verifyToken } from "../src/auth.js";

// These stay open without login. Everything else (the calculator page and /api/calc) needs a valid login.
const PUBLIC = new Set([
  "/login",
  "/logout",
  "/admin",
  "/api/login",
  "/api/admin",
  "/health",
  "/manifest.json",
  "/packsol-logo.svg",
  "/icon-192.png",
  "/icon-512.png"
]);

// Small logout button shown on the calculator page.
const LOGOUT_BUTTON =
  '<a href="/logout" onclick="return confirm(\'لاگ آؤٹ کریں؟\')" ' +
  'style="position:fixed;bottom:10px;left:10px;z-index:99999;background:#333;color:#fff;' +
  'padding:6px 12px;border-radius:16px;font:13px Tahoma,sans-serif;text-decoration:none;opacity:.85">' +
  "لاگ آؤٹ</a>";

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (PUBLIC.has(path)) return next();

  // If login is not set up properly, stay closed rather than open.
  if (!env.USERS || !env.SESSION_SECRET) {
    return json(500, { error: "NOT_CONFIGURED" });
  }

  const token = await verifyToken(env, getCookie(request, "sess"));
  let reason = "";
  let ok = false;
  if (token && token.u) {
    const st = await userStatus(env, token.u, token.v, token.s);
    ok = st.ok;
    reason = st.reason || "";
  }

  if (!ok) {
    if (path.startsWith("/api/")) {
      return json(401, { error: "LOGIN_REQUIRED", reason }, { "Set-Cookie": clearCookie("sess") });
    }
    const dest =
      "/login" + (reason === "expired" || reason === "disabled" || reason === "kicked" ? "?e=" + reason : "");
    return new Response(null, {
      status: 302,
      headers: {
        Location: dest,
        "Cache-Control": "no-store",
        "Set-Cookie": clearCookie("sess")
      }
    });
  }

  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set("Cache-Control", "private, no-store");
  out.headers.set("X-Content-Type-Options", "nosniff");

  const type = out.headers.get("Content-Type") || "";
  if (type.includes("text/html") && typeof HTMLRewriter !== "undefined") {
    return new HTMLRewriter()
      .on("body", {
        element(el) {
          el.append(LOGOUT_BUTTON, { html: true });
        }
      })
      .transform(out);
  }
  return out;
}

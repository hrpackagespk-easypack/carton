import {
  DAY_MS,
  addFail,
  checkAdminPassword,
  clearCookie,
  clearFails,
  configured,
  hashPassword,
  isAdmin,
  json,
  setCookie,
  signToken,
  tooManyFails
} from "../../src/auth.js";

const NAME_RE = /^[a-z0-9._-]{3,30}$/;

function cleanName(v) {
  return String(v || "").trim().toLowerCase();
}

function publicRow(name, rec) {
  return {
    username: name,
    expires: rec.expires,
    disabled: !!rec.disabled,
    created: rec.created || 0
  };
}

export async function onRequestPost({ request, env }) {
  if (!configured(env)) return json(500, { error: "NOT_CONFIGURED" });
  if (!String(request.headers.get("Content-Type") || "").includes("application/json")) {
    return json(415, { error: "JSON_REQUIRED" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "BAD_REQUEST" });
  }
  const action = String((body && body.action) || "");

  // Admin sign-in
  if (action === "login") {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const failKey = "admin|" + ip;
    if (await tooManyFails(env, failKey)) return json(429, { error: "TOO_MANY" });
    const ok = await checkAdminPassword(env, String(body.password || ""));
    if (!ok) {
      await addFail(env, failKey);
      return json(401, { error: "WRONG" });
    }
    await clearFails(env, failKey);
    const token = await signToken(env, { adm: true, exp: Date.now() + 12 * 3600 * 1000 });
    return json(200, { ok: true }, { "Set-Cookie": setCookie("adm", token, 12 * 3600, "Strict") });
  }

  if (action === "logout") {
    return json(200, { ok: true }, { "Set-Cookie": clearCookie("adm") });
  }

  if (!(await isAdmin(request, env))) return json(401, { error: "ADMIN_REQUIRED" });

  if (action === "list") {
    const listed = await env.USERS.list({ prefix: "user:" });
    const rows = await Promise.all(
      listed.keys.map(async (k) => {
        const rec = await env.USERS.get(k.name, "json");
        return rec ? publicRow(k.name.slice(5), rec) : null;
      })
    );
    const users = rows.filter(Boolean).sort((a, b) => a.username.localeCompare(b.username));
    return json(200, { users, now: Date.now() });
  }

  if (action === "create") {
    const name = cleanName(body.username);
    const pass = String(body.password || "");
    const days = Math.floor(Number(body.days));
    if (!NAME_RE.test(name)) return json(400, { error: "BAD_USERNAME" });
    if (pass.length < 6 || pass.length > 100) return json(400, { error: "BAD_PASSWORD" });
    if (!(days >= 1 && days <= 366)) return json(400, { error: "BAD_DAYS" });
    if (await env.USERS.get("user:" + name)) return json(409, { error: "EXISTS" });
    const { salt, hash } = await hashPassword(pass);
    const rec = { salt, hash, expires: Date.now() + days * DAY_MS, disabled: false, ver: 0, created: Date.now() };
    await env.USERS.put("user:" + name, JSON.stringify(rec));
    return json(200, { ok: true, user: publicRow(name, rec) });
  }

  const name = cleanName(body.username);
  const key = "user:" + name;
  const rec = NAME_RE.test(name) ? await env.USERS.get(key, "json") : null;
  if (!rec) return json(404, { error: "NOT_FOUND" });

  if (action === "extend") {
    const days = Math.floor(Number(body.days));
    if (!(days >= 1 && days <= 366)) return json(400, { error: "BAD_DAYS" });
    rec.expires = Math.max(Date.now(), rec.expires) + days * DAY_MS;
    await env.USERS.put(key, JSON.stringify(rec));
    return json(200, { ok: true, user: publicRow(name, rec) });
  }

  if (action === "disable") {
    rec.disabled = !!body.disabled;
    await env.USERS.put(key, JSON.stringify(rec));
    return json(200, { ok: true, user: publicRow(name, rec) });
  }

  if (action === "reset") {
    const pass = String(body.password || "");
    if (pass.length < 6 || pass.length > 100) return json(400, { error: "BAD_PASSWORD" });
    const { salt, hash } = await hashPassword(pass);
    rec.salt = salt;
    rec.hash = hash;
    rec.ver = (rec.ver || 0) + 1; // logs out old sessions
    await env.USERS.put(key, JSON.stringify(rec));
    return json(200, { ok: true, user: publicRow(name, rec) });
  }

  if (action === "delete") {
    await env.USERS.delete(key);
    return json(200, { ok: true });
  }

  return json(400, { error: "UNKNOWN_ACTION" });
}

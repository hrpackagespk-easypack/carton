import {
  DAY_MS,
  SESSION_DAYS,
  addFail,
  clearFails,
  configured,
  deviceLimit,
  getCookie,
  hashPassword,
  json,
  liveSessions,
  newSid,
  safeEqual,
  setCookie,
  signToken,
  tooManyFails,
  verifyToken
} from "../../src/auth.js";

export async function onRequestPost({ request, env }) {
  if (!configured(env)) return json(500, { error: "NOT_CONFIGURED" });

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "BAD_REQUEST" });
  }

  const username = String((body && body.username) || "").trim().toLowerCase();
  const password = String((body && body.password) || "");
  if (!username || !password || username.length > 40 || password.length > 200) {
    return json(400, { error: "BAD_REQUEST" });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const failKey = ip + "|" + username;
  if (await tooManyFails(env, failKey)) return json(429, { error: "TOO_MANY" });

  const rec = await env.USERS.get("user:" + username, "json");
  let good = false;
  if (rec) {
    const { hash } = await hashPassword(password, rec.salt);
    good = safeEqual(hash, rec.hash);
  } else {
    await hashPassword(password); // keeps timing similar for unknown names
  }

  if (!good) {
    await addFail(env, failKey);
    return json(401, { error: "WRONG" });
  }
  if (rec.disabled) return json(403, { error: "disabled" });
  if (Date.now() > rec.expires) return json(403, { error: "expired" });

  await clearFails(env, failKey);

  // A device that already holds a place (same browser logging in again) keeps its place.
  const now = Date.now();
  const limit = deviceLimit(rec);
  const live = liveSessions(rec, now);
  const old = await verifyToken(env, getCookie(request, "sess"));
  let sid = old && old.u === username && live.some((s) => s.sid === old.s) ? old.s : null;

  if (!sid) {
    // New device: only allowed if a place is free. The existing devices are never kicked out.
    if (live.length >= limit) return json(403, { error: "DEVICE_LIMIT", limit });
    sid = newSid();
    live.push({ sid, at: now });
  } else {
    for (const s of live) if (s.sid === sid) s.at = now;
  }

  rec.sessions = live;
  rec.lastLogin = now;
  await env.USERS.put("user:" + username, JSON.stringify(rec));

  const token = await signToken(env, {
    u: username,
    v: rec.ver || 0,
    s: sid,
    exp: now + SESSION_DAYS * DAY_MS
  });
  return json(200, { ok: true }, { "Set-Cookie": setCookie("sess", token, SESSION_DAYS * 86400) });
}

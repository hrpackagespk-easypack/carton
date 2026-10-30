// Shared login helpers for Cloudflare Pages Functions.
// Needs: KV binding "USERS", secrets "SESSION_SECRET" and "ADMIN_PASSWORD".

const enc = new TextEncoder();

export const SESSION_DAYS = 14;
export const DAY_MS = 86400000;

export function json(status, value, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}

export function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer"
    }
  });
}

function toB64u(bytes) {
  const arr = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64u(str) {
  let s = String(str).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function safeEqual(a, b) {
  const x = typeof a === "string" ? enc.encode(a) : a;
  const y = typeof b === "string" ? enc.encode(b) : b;
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function hmacBytes(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function signToken(env, payload) {
  const body = toB64u(enc.encode(JSON.stringify(payload)));
  const sig = toB64u(await hmacBytes(env.SESSION_SECRET, body));
  return body + "." + sig;
}

export async function verifyToken(env, token) {
  try {
    if (!token || !env.SESSION_SECRET) return null;
    const dot = token.indexOf(".");
    if (dot < 1) return null;
    const body = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = toB64u(await hmacBytes(env.SESSION_SECRET, body));
    if (!safeEqual(sig, expected)) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64u(body)));
    if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
}

export function setCookie(name, value, maxAgeSec, sameSite = "Lax") {
  return name + "=" + value + "; Path=/; HttpOnly; Secure; SameSite=" + sameSite + "; Max-Age=" + maxAgeSec;
}

export function clearCookie(name) {
  return name + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export async function hashPassword(password, saltB64u) {
  const salt = saltB64u ? fromB64u(saltB64u) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
    key,
    256
  );
  return { salt: toB64u(salt), hash: toB64u(bits) };
}

export function newSid() {
  return toB64u(crypto.getRandomValues(new Uint8Array(12)));
}

export const DEFAULT_DEVICES = 2;

export function deviceLimit(rec) {
  const n = Math.floor(Number(rec && rec.maxDevices));
  return n >= 1 && n <= 5 ? n : DEFAULT_DEVICES;
}

// Logins still holding a place (a place frees on logout, or after the session lifetime).
export function liveSessions(rec, now = Date.now()) {
  return (rec.sessions || []).filter((s) => now - s.at < SESSION_DAYS * DAY_MS);
}

// Is this user allowed in right now? Checked on every request.
// "sid" identifies this device's login.
export async function userStatus(env, username, ver, sid) {
  const rec = await env.USERS.get("user:" + username, "json");
  if (!rec) return { ok: false, reason: "gone" };
  if ((rec.ver || 0) !== (ver || 0)) return { ok: false, reason: "relogin" };
  if (rec.disabled) return { ok: false, reason: "disabled" };
  if (Date.now() > rec.expires) return { ok: false, reason: "expired" };
  if (!sid || !(rec.sessions || []).some((s) => s.sid === sid)) return { ok: false, reason: "kicked" };
  return { ok: true, rec };
}

export async function checkAdminPassword(env, input) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return false;
  const a = await hmacBytes(env.SESSION_SECRET, "adm:" + input);
  const b = await hmacBytes(env.SESSION_SECRET, "adm:" + env.ADMIN_PASSWORD);
  return safeEqual(a, b);
}

export async function isAdmin(request, env) {
  const t = await verifyToken(env, getCookie(request, "adm"));
  return !!(t && t.adm === true);
}

// Failed-attempt limiter: 5 wrong tries then 15 minute wait.
export async function tooManyFails(env, key) {
  return Number((await env.USERS.get("fail:" + key)) || 0) >= 5;
}
export async function addFail(env, key) {
  const n = Number((await env.USERS.get("fail:" + key)) || 0) + 1;
  await env.USERS.put("fail:" + key, String(n), { expirationTtl: 900 });
}
export async function clearFails(env, key) {
  await env.USERS.delete("fail:" + key);
}

export function configured(env) {
  return !!(env.USERS && env.SESSION_SECRET && env.ADMIN_PASSWORD);
}

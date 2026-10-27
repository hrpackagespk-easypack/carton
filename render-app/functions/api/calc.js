import { calculate } from "../../src/calculate.js";

const MAX_BODY_BYTES = 128 * 1024;
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: JSON_HEADERS
  });
}

export async function onRequest({ request }) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return jsonResponse({ error: "JSON_REQUIRED" }, 415);
  }

  const announcedLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(announcedLength) && announcedLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "REQUEST_TOO_LARGE" }, 413);
  }

  let bytes;
  try {
    bytes = await request.arrayBuffer();
  } catch {
    return jsonResponse({ error: "BAD_JSON" }, 400);
  }
  if (bytes.byteLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "REQUEST_TOO_LARGE" }, 413);
  }

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return jsonResponse({ error: "BAD_JSON" }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ error: "BAD_REQUEST" }, 400);
  }

  try {
    return jsonResponse(calculate(payload));
  } catch {
    return jsonResponse({ error: "CALCULATION_FAILED" }, 500);
  }
}

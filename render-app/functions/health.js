const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

export function onRequest({ request }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: HEADERS
    });
  }

  return new Response(request.method === "HEAD" ? null : JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: HEADERS
  });
}

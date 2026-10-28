import { clearCookie } from "../src/auth.js";

export async function onRequest() {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Cache-Control": "no-store",
      "Set-Cookie": clearCookie("sess")
    }
  });
}

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { calculate } from "./src/calculate.js";

const projectDir = fileURLToPath(new URL(".", import.meta.url));
const publicDir = resolve(projectDir, "public");
const port = Number(process.env.PORT) || 3000;
const maxBodyBytes = 128 * 1024;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      const error = new Error("Request body too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON");
    error.statusCode = 400;
    throw error;
  }
}

async function handle(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = url.pathname;

  if (pathname === "/health") {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
    }
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    return res.end(req.method === "HEAD" ? undefined : JSON.stringify({ status: "ok" }));
  }

  if (pathname === "/api/calc") {
    if (req.method !== "POST") {
      return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
    }
    if (!String(req.headers["content-type"] || "").includes("application/json")) {
      return sendJson(res, 415, { error: "JSON_REQUIRED" });
    }
    try {
      const payload = await readJson(req);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return sendJson(res, 400, { error: "BAD_REQUEST" });
      }
      return sendJson(res, 200, calculate(payload));
    } catch (error) {
      if (error.statusCode) {
        return sendJson(res, error.statusCode, {
          error: error.statusCode === 413 ? "REQUEST_TOO_LARGE" : "BAD_JSON"
        });
      }
      return sendJson(res, 500, { error: "CALCULATION_FAILED" });
    }
  }

  if (pathname.startsWith("/api/")) {
    return sendJson(res, 404, { error: "NOT_FOUND" });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return sendJson(res, 400, { error: "BAD_PATH" });
  }
  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = resolve(publicDir, `.${requestedPath}`);
  const relativePath = relative(publicDir, filePath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    return sendJson(res, 404, { error: "NOT_FOUND" });
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY"
    });
    return res.end(req.method === "HEAD" ? undefined : file);
  } catch {
    return sendJson(res, 404, { error: "NOT_FOUND" });
  }
}

const server = createServer((req, res) => {
  handle(req, res).catch(() => {
    if (!res.headersSent) sendJson(res, 500, { error: "SERVER_ERROR" });
    else res.destroy();
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Carton calculator listening on port ${port}`);
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));

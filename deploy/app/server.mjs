// Minimal Bun/Node HTTP entry that:
//   1) serves static client assets from dist/client/ (or dist/ fallback)
//   2) hands everything else to the TanStack Start server bundle (SSR)
//
// The Cloudflare Vite plugin output expects env.ASSETS to serve static files.
// Outside Cloudflare we have to do that ourselves — otherwise /assets/*.js
// returns 404 and the page renders blank.

import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

// ----- Locate SSR bundle ---------------------------------------------------
const serverCandidates = [
  "./dist/server/server.js",
  "./dist/server/index.js",
  "./dist/_worker.js/index.js",
  "./dist/_worker.js",
];

let handlerModule;
for (const p of serverCandidates) {
  if (existsSync(p)) {
    handlerModule = await import(p);
    console.log(`[virtualweb] loaded server entry: ${p}`);
    break;
  }
}
if (!handlerModule) {
  console.error("[virtualweb] could not find server bundle in dist/");
  process.exit(1);
}

const handler = handlerModule.default ?? handlerModule;
const fetchFn = typeof handler === "function" ? handler : handler.fetch;
if (typeof fetchFn !== "function") {
  console.error("[virtualweb] server entry does not export a fetch handler");
  process.exit(1);
}

// ----- Locate static client dir -------------------------------------------
const clientCandidates = [
  "./dist/client",
  "./dist/public",
  "./dist",
];
let clientDir;
for (const p of clientCandidates) {
  if (existsSync(p) && statSync(p).isDirectory()) {
    clientDir = resolve(p);
    console.log(`[virtualweb] serving static assets from: ${clientDir}`);
    break;
  }
}

const MIME = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

async function tryStatic(pathname) {
  if (!clientDir) return null;
  // Block path traversal
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(clientDir, safe);
  if (!filePath.startsWith(clientDir)) return null;
  if (!existsSync(filePath)) return null;
  const st = statSync(filePath);
  if (!st.isFile()) return null;
  const body = await readFile(filePath);
  const type = MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
  const cache = pathname.startsWith("/assets/")
    ? "public, max-age=31536000, immutable"
    : "public, max-age=3600";
  return new Response(body, {
    status: 200,
    headers: { "content-type": type, "cache-control": cache },
  });
}

async function dispatch(request) {
  const url = new URL(request.url);
  // Only intercept obvious static paths so SSR keeps owning page routes
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/robots.txt" ||
    url.pathname === "/sitemap.xml" ||
    /\.[a-zA-Z0-9]+$/.test(url.pathname)
  ) {
    const staticRes = await tryStatic(url.pathname);
    if (staticRes) return staticRes;
  }
  return fetchFn(request, process.env, {});
}

// ----- Boot server ---------------------------------------------------------
const port = Number(process.env.PORT ?? 3000);

if (typeof Bun !== "undefined") {
  Bun.serve({ port, fetch: dispatch });
  console.log(`[virtualweb] listening on http://0.0.0.0:${port} (bun)`);
} else {
  const server = createServer(async (nodeReq, nodeRes) => {
    const url = `http://${nodeReq.headers.host}${nodeReq.url}`;
    const init = {
      method: nodeReq.method,
      headers: nodeReq.headers,
      body:
        nodeReq.method === "GET" || nodeReq.method === "HEAD"
          ? undefined
          : await new Promise((res) => {
              const chunks = [];
              nodeReq.on("data", (c) => chunks.push(c));
              nodeReq.on("end", () => res(Buffer.concat(chunks)));
            }),
    };
    try {
      const webRes = await dispatch(new Request(url, init));
      nodeRes.statusCode = webRes.status;
      webRes.headers.forEach((v, k) => nodeRes.setHeader(k, v));
      nodeRes.end(Buffer.from(await webRes.arrayBuffer()));
    } catch (err) {
      console.error(err);
      nodeRes.statusCode = 500;
      nodeRes.end("Internal Server Error");
    }
  });
  server.listen(port, () => {
    console.log(`[virtualweb] listening on http://0.0.0.0:${port} (node)`);
  });
}

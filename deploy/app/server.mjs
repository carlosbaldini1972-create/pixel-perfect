// Minimal Node/Bun HTTP entry that hands requests to the TanStack Start
// server bundle. Uses Bun.serve when available, falls back to Node http.
//
// The Vite build (configured by @lovable.dev/vite-tanstack-config + the
// Cloudflare plugin) emits a Worker-style { fetch(request) } module at
// dist/_worker.js / dist/server/index.js. We import it dynamically and
// adapt to the host.

import { existsSync } from "node:fs";
import { createServer } from "node:http";

// Try the standard TanStack Start server entry locations.
const candidates = [
  "./dist/server/server.js",
  "./dist/server/index.js",
  "./dist/_worker.js/index.js",
  "./dist/_worker.js",
];

let handlerModule;
for (const p of candidates) {
  if (existsSync(p)) {
    handlerModule = await import(p);
    console.log(`[virtualweb] loaded server entry: ${p}`);
    break;
  }
}
if (!handlerModule) {
  console.error("[virtualweb] could not find server bundle in dist/. Build output:");
  console.error(candidates.join("\n"));
  process.exit(1);
}

const handler = handlerModule.default ?? handlerModule;
const fetchFn = typeof handler === "function" ? handler : handler.fetch;
if (typeof fetchFn !== "function") {
  console.error("[virtualweb] server entry does not export a fetch handler");
  process.exit(1);
}

const port = Number(process.env.PORT ?? 3000);

// Prefer Bun's native server (matches Workers fetch signature 1:1)
if (typeof Bun !== "undefined") {
  Bun.serve({
    port,
    fetch: (req) => fetchFn(req, process.env, {}),
  });
  console.log(`[virtualweb] listening on http://0.0.0.0:${port} (bun)`);
} else {
  // Node fallback: adapt node req/res ↔ Web Request/Response
  const server = createServer(async (nodeReq, nodeRes) => {
    const url = `http://${nodeReq.headers.host}${nodeReq.url}`;
    const init = {
      method: nodeReq.method,
      headers: nodeReq.headers,
      body:
        nodeReq.method === "GET" || nodeReq.method === "HEAD"
          ? undefined
          : await new Promise((resolve) => {
              const chunks = [];
              nodeReq.on("data", (c) => chunks.push(c));
              nodeReq.on("end", () => resolve(Buffer.concat(chunks)));
            }),
    };
    try {
      const webRes = await fetchFn(new Request(url, init), process.env, {});
      nodeRes.statusCode = webRes.status;
      webRes.headers.forEach((v, k) => nodeRes.setHeader(k, v));
      const buf = Buffer.from(await webRes.arrayBuffer());
      nodeRes.end(buf);
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

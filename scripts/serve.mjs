import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, isAbsolute, relative, resolve } from "node:path";

const root = fileURLToPath(new URL("../docs/", import.meta.url));
const prefix = "/Skilnex-releases/";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer from 1 to 65535");
}

// Bind only to loopback and serve only the Pages artifact, never the repository.
createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (pathname === "/") {
    response.writeHead(302, { Location: prefix }).end();
    return;
  }
  if (!pathname.startsWith(prefix)) {
    response.writeHead(404).end();
    return;
  }
  const file = resolve(
    root,
    pathname.slice(prefix.length) +
      (pathname.endsWith("/") ? "index.html" : ""),
  );
  const location = relative(root, file);
  if (
    location.startsWith("..") ||
    isAbsolute(location) ||
    !types[extname(file)]
  ) {
    response.writeHead(404).end();
    return;
  }
  try {
    let body = await readFile(file);
    const headers = {
      "Content-Type": types[extname(file)],
      "Content-Length": body.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    let status = 200;
    if (extname(file) === ".mp4") {
      headers["Accept-Ranges"] = "bytes";
      // RFC 9110: ignore unsupported/malformed ranges and If-Range (no validators).
      const range =
        request.method === "GET" && request.headers["if-range"] === undefined
          ? /^bytes=(\d*)-(\d*)$/i.exec(request.headers.range ?? "")
          : null;
      if (range && (range[1] || range[2])) {
        const size = BigInt(body.length);
        const first = range[1] ? BigInt(range[1]) : null;
        const last = range[2] ? BigInt(range[2]) : null;
        if (first === null || last === null || first <= last) {
          const start = first ?? (last < size ? size - last : 0n);
          const end =
            first !== null && last !== null && last < size ? last : size - 1n;
          if (start >= size || start > end) {
            response
              .writeHead(416, {
                ...headers,
                "Content-Range": `bytes */${size}`,
                "Content-Length": 0,
              })
              .end();
            return;
          }
          headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
          body = body.subarray(Number(start), Number(end + 1n));
          headers["Content-Length"] = body.length;
          status = 206;
        }
      }
    }
    response.writeHead(status, headers);
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Preview: http://127.0.0.1:${port}${prefix}`);
});

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
};

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
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file)],
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4173, "127.0.0.1", () => {
  console.log(`Preview: http://127.0.0.1:4173${prefix}`);
});

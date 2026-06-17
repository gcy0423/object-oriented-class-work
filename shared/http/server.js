import { createReadStream, promises as fs } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { sendJson, sendText } from "./response.js";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".ico", "image/x-icon"]
]);

function isSafeStaticPath(root, candidate) {
  const normalizedRoot = normalize(root);
  const normalizedCandidate = normalize(candidate);
  return normalizedCandidate === normalizedRoot
    || normalizedCandidate.startsWith(`${normalizedRoot}\\`)
    || normalizedCandidate.startsWith(`${normalizedRoot}/`);
}

async function streamFile(res, filePath) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) {
    return false;
  }
  res.writeHead(200, {
    "content-type": mimeTypes.get(extname(filePath)) || "application/octet-stream",
    "cache-control": "no-cache"
  });
  createReadStream(filePath).pipe(res);
  return true;
}

async function serveStatic(req, res, staticRoot, pathname) {
  if (!staticRoot || (req.method !== "GET" && req.method !== "HEAD")) {
    return false;
  }

  const cleanPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const target = join(staticRoot, cleanPath);
  if (!isSafeStaticPath(staticRoot, target)) {
    sendText(res, "Forbidden", 403);
    return true;
  }

  try {
    return await streamFile(res, target);
  } catch {
    const hasExtension = extname(cleanPath) !== "";
    if (hasExtension) {
      return false;
    }

    try {
      return await streamFile(res, join(staticRoot, "index.html"));
    } catch {
      return false;
    }
  }
}

function isApiPath(pathname) {
  return pathname === "/health"
    || pathname.startsWith("/api/")
    || pathname.startsWith("/internal/");
}

export function createServiceServer({ router, config, logger = console, staticRoot = null }) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const handledByRouter = await router.handle(req, res, { config, logger });
    if (handledByRouter) {
      return;
    }

    const handledStatic = await serveStatic(req, res, staticRoot, url.pathname);
    if (handledStatic) {
      return;
    }

    if (isApiPath(url.pathname)) {
      sendJson(res, { ok: false, code: "NOT_FOUND", message: "接口不存在。" }, 404);
      return;
    }

    sendText(res, "Not found", 404);
  });
}

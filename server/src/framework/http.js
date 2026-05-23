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
  return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}\\`) || normalizedCandidate.startsWith(`${normalizedRoot}/`);
}

async function serveStatic(req, res, clientRoot) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const cleanPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const target = join(clientRoot, cleanPath);
  if (!isSafeStaticPath(clientRoot, target)) {
    sendText(res, "Forbidden", 403);
    return true;
  }
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) {
      return false;
    }
    res.writeHead(200, {
      "content-type": mimeTypes.get(extname(target)) || "application/octet-stream",
      "cache-control": "no-cache"
    });
    createReadStream(target).pipe(res);
    return true;
  } catch {
    return false;
  }
}

export function createHttpServer({ router, kernel, config, logger = console }) {
  return createServer(async (req, res) => {
    if (req.url.startsWith("/api/") || req.url.startsWith("/events")) {
      const handled = await router.handle(req, res, { kernel, config, logger });
      if (!handled && !res.writableEnded) {
        sendJson(res, { ok: false, code: "NOT_FOUND", message: "接口不存在。" }, 404);
      }
      return;
    }
    const handled = await serveStatic(req, res, config.clientRoot);
    if (!handled && !res.writableEnded) {
      sendText(res, "Not found", 404);
    }
  });
}

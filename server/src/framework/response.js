import { StringDecoder } from "node:string_decoder";
import { ValidationError } from "./errors.js";

export function sendJson(res, payload, status = 200, headers = {}) {
  const body = Buffer.from(JSON.stringify(payload, null, 2));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": body.length,
    "cache-control": "no-store",
    ...headers
  });
  res.end(body);
}

export function sendText(res, text, status = 200, headers = {}) {
  const body = Buffer.from(text);
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "content-length": body.length,
    ...headers
  });
  res.end(body);
}

export function ok(data = {}, meta = undefined) {
  return meta ? { ok: true, data, meta } : { ok: true, data };
}

export async function readJson(req, limitBytes = 1024 * 1024) {
  const decoder = new StringDecoder("utf8");
  let size = 0;
  let body = "";
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) {
      throw new ValidationError("请求体过大。");
    }
    body += decoder.write(chunk);
  }
  body += decoder.end();
  if (!body.trim()) {
    return {};
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new ValidationError("请求体不是合法 JSON。");
  }
}

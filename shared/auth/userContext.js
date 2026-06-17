import { AuthError, ForbiddenError } from "../http/errors.js";

export const USER_CONTEXT_HEADERS = {
  id: "x-edumind-user-id",
  role: "x-edumind-user-role",
  name: "x-edumind-user-name"
};

export const INTERNAL_KEY_HEADER = "x-edumind-internal-key";

function readHeader(req, name) {
  return req.headers?.[name] ?? req.headers?.[name.toLowerCase()] ?? null;
}

function decodeHeaderValue(value) {
  if (typeof value !== "string") {
    return value;
  }

  if (!value.includes("%")) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function encodeUserContextHeader(value) {
  return typeof value === "string" ? encodeURIComponent(value) : "";
}

export function readUserContext(req) {
  const id = readHeader(req, USER_CONTEXT_HEADERS.id);
  if (!id) {
    return null;
  }
  return {
    id,
    role: readHeader(req, USER_CONTEXT_HEADERS.role) || "",
    name: decodeHeaderValue(readHeader(req, USER_CONTEXT_HEADERS.name) || "")
  };
}

export function requireUserContext(req) {
  const user = readUserContext(req);
  if (!user) {
    throw new AuthError("缺少用户上下文。");
  }
  return user;
}

export function requireInternal(req, expectedKey) {
  const actual = readHeader(req, INTERNAL_KEY_HEADER);
  if (!expectedKey || actual !== expectedKey) {
    throw new ForbiddenError("内部服务调用校验失败。");
  }
}

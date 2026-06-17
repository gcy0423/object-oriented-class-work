import { toHttpError } from "./errors.js";
import { sendJson } from "./response.js";

function splitPath(pathname) {
  return pathname.split("/").filter(Boolean);
}

function matchRoute(pattern, pathname) {
  const expected = splitPath(pattern);
  const actual = splitPath(pathname);

  if (expected.length !== actual.length) {
    return null;
  }

  const params = {};
  for (let index = 0; index < expected.length; index += 1) {
    const token = expected[index];
    if (token.startsWith(":")) {
      params[token.slice(1)] = decodeURIComponent(actual[index]);
      continue;
    }
    if (token !== actual[index]) {
      return null;
    }
  }

  return params;
}

export class Router {
  constructor() {
    this.routes = [];
  }

  get(path, handler) {
    this.add("GET", path, handler);
  }

  post(path, handler) {
    this.add("POST", path, handler);
  }

  patch(path, handler) {
    this.add("PATCH", path, handler);
  }

  delete(path, handler) {
    this.add("DELETE", path, handler);
  }

  add(method, path, handler) {
    this.routes.push({ method, path, handler });
  }

  find(method, pathname) {
    for (const route of this.routes) {
      if (route.method !== method) {
        continue;
      }
      const params = matchRoute(route.path, pathname);
      if (params) {
        return { ...route, params };
      }
    }
    return null;
  }

  async handle(req, res, context) {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const route = this.find(req.method, url.pathname);

    if (!route) {
      return false;
    }

    try {
      req.params = route.params;
      req.query = Object.fromEntries(url.searchParams.entries());
      const result = await route.handler(req, res, context);
      if (!res.writableEnded && result !== undefined) {
        sendJson(res, result);
      }
    } catch (error) {
      const { status, body } = toHttpError(error);
      if (!res.writableEnded) {
        sendJson(res, body, status);
      }
      if (status >= 500) {
        context.logger.error(error);
      }
    }

    return true;
  }
}

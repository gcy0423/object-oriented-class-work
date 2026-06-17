import { AppError } from "../http/errors.js";

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) {
    return null;
  }
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

async function readPayload(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      ok: false,
      code: "INVALID_RESPONSE",
      message: "下游服务返回了无法解析的响应。"
    };
  }
}

export class ServiceClient {
  constructor({ serviceName, baseUrl, timeoutMs = 3000, defaultHeaders = {} }) {
    this.serviceName = serviceName;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.timeoutMs = timeoutMs;
    this.defaultHeaders = defaultHeaders;
  }

  async request(path, { method = "GET", headers = {}, body } = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (!this.baseUrl) {
        throw new AppError("下游服务未配置。", 503, "DOWNSTREAM_UNAVAILABLE", {
          service: this.serviceName
        });
      }
      const resolvedBody = body === undefined || typeof body === "string" ? body : JSON.stringify(body);
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          ...this.defaultHeaders,
          ...(resolvedBody !== undefined ? { "content-type": "application/json" } : {}),
          ...headers
        },
        body: resolvedBody,
        signal: controller.signal
      });
      const payload = await readPayload(response);

      if (!response.ok || payload.ok === false) {
        throw new AppError(
          payload.message || "下游服务请求失败。",
          response.status || 502,
          payload.code || "DOWNSTREAM_ERROR",
          { service: this.serviceName }
        );
      }

      return payload;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new AppError("下游服务请求超时。", 504, "DOWNSTREAM_TIMEOUT", { service: this.serviceName });
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("下游服务不可用。", 503, "DOWNSTREAM_UNAVAILABLE", {
        service: this.serviceName,
        cause: error.message
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: "GET" });
  }

  post(path, body, options = {}) {
    return this.request(path, { ...options, method: "POST", body });
  }

  patch(path, body, options = {}) {
    return this.request(path, { ...options, method: "PATCH", body });
  }

  delete(path, options = {}) {
    return this.request(path, { ...options, method: "DELETE" });
  }
}

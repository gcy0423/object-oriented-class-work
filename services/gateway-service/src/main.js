import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { ServiceClient } from "../../../shared/client/serviceClient.js";
import { Router } from "../../../shared/http/router.js";
import { AppError, AuthError } from "../../../shared/http/errors.js";
import { ok, sendJson } from "../../../shared/http/response.js";
import { createServiceServer } from "../../../shared/http/server.js";
import { loadConfig } from "./config.js";
import { registerRoutes } from "./routes.js";

async function readServiceHealth(service, config) {
  const startedAt = Date.now();
  const client = new ServiceClient({
    serviceName: service.name,
    baseUrl: service.url,
    timeoutMs: config.healthTimeoutMs
  });

  try {
    const response = await client.get("/health");
    return {
      name: service.name,
      status: response.data?.status || "up",
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      name: service.name,
      status: "down",
      latencyMs: Date.now() - startedAt,
      error: {
        code: error.code || "DOWNSTREAM_UNAVAILABLE",
        message: error.message
      }
    };
  }
}

function registerGatewayHealth(router, config) {
  router.get("/api/health", async () => {
    const services = await Promise.all(config.services.map((service) => readServiceHealth(service, config)));
    const status = services.some((service) => service.status !== "up") ? "degraded" : "up";
    return ok({
      status,
      service: config.serviceName,
      services,
      time: new Date().toISOString()
    });
  });
}

export function createApp(config = loadConfig()) {
  const serviceMap = new Map(config.services.map((service) => [service.name, service.url]));
  const identity = new ServiceClient({
    serviceName: "identity-service",
    baseUrl: serviceMap.get("identity-service")
  });
  const learning = new ServiceClient({
    serviceName: "learning-service",
    baseUrl: serviceMap.get("learning-service")
  });
  const ai = new ServiceClient({
    serviceName: "ai-service",
    baseUrl: serviceMap.get("ai-service")
  });
  const assessment = new ServiceClient({
    serviceName: "assessment-service",
    baseUrl: serviceMap.get("assessment-service")
  });
  const collaboration = new ServiceClient({
    serviceName: "collaboration-service",
    baseUrl: serviceMap.get("collaboration-service")
  });
  const analytics = new ServiceClient({
    serviceName: "analytics-service",
    baseUrl: serviceMap.get("analytics-service")
  });
  const knowledge = new ServiceClient({
    serviceName: "knowledge-service",
    baseUrl: serviceMap.get("knowledge-service")
  });
  const verifyUser = async (req) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : req.query?.token || "";
    if (!token) {
      throw new AuthError();
    }
    const response = await identity.post("/internal/auth/verify", { token }, {
      headers: {
        "x-edumind-internal-key": config.internalKey
      }
    });
    return response.data.user;
  };
  const proxySse = async (req, res, { baseUrl, path, headers }) => {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "GET",
        headers
      });
      if (!response.ok || !response.body) {
        const text = await response.text();
        let payload;
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { ok: false, code: "DOWNSTREAM_ERROR", message: "下游 SSE 服务不可用。" };
        }
        sendJson(res, payload, response.status || 502);
        return;
      }
      res.writeHead(response.status, {
        "content-type": response.headers.get("content-type") || "text/event-stream; charset=utf-8",
        "cache-control": response.headers.get("cache-control") || "no-cache, no-transform",
        connection: response.headers.get("connection") || "keep-alive"
      });
      const stream = Readable.fromWeb(response.body);
      stream.pipe(res);
      req.on("close", () => {
        stream.destroy();
      });
    } catch (error) {
      throw new AppError("下游 SSE 服务不可用。", 503, "DOWNSTREAM_UNAVAILABLE", {
        cause: error.message
      });
    }
  };
  const services = { identity, learning, assessment, ai, collaboration, analytics, knowledge, verifyUser, proxySse, serviceMap };
  const router = new Router();
  registerRoutes(router, config, services);
  registerGatewayHealth(router, config);
  const server = createServiceServer({
    router,
    config,
    staticRoot: config.clientRoot
  });
  return { config, router, server, services };
}

export async function startService(config = loadConfig()) {
  const app = createApp(config);
  await new Promise((resolve) => {
    app.server.listen(config.port, config.host, resolve);
  });
  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = await startService();
  console.log(`${app.config.serviceName} running at http://${app.config.host}:${app.server.address().port}`);
}

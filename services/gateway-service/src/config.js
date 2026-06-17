import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../..");

function readServiceUrl(env, key, fallback) {
  return env[key] || fallback;
}

export function loadConfig(env = process.env) {
  return {
    serviceName: "gateway-service",
    host: env.GATEWAY_SERVICE_HOST || env.HOST || "127.0.0.1",
    port: Number(env.GATEWAY_SERVICE_PORT || env.PORT || 4077),
    clientRoot: env.EDUMIND_CLIENT_ROOT || resolve(projectRoot, "client"),
    internalKey: env.EDUMIND_INTERNAL_KEY || "edumind-local-internal-key",
    healthTimeoutMs: Number(env.EDUMIND_HEALTH_TIMEOUT_MS || 2000),
    services: [
      { name: "identity-service", url: readServiceUrl(env, "IDENTITY_SERVICE_URL", "http://127.0.0.1:4101") },
      { name: "learning-service", url: readServiceUrl(env, "LEARNING_SERVICE_URL", "http://127.0.0.1:4102") },
      { name: "assessment-service", url: readServiceUrl(env, "ASSESSMENT_SERVICE_URL", "http://127.0.0.1:4103") },
      { name: "ai-service", url: readServiceUrl(env, "AI_SERVICE_URL", "http://127.0.0.1:4104") },
      { name: "collaboration-service", url: readServiceUrl(env, "COLLABORATION_SERVICE_URL", "http://127.0.0.1:4105") },
      { name: "analytics-service", url: readServiceUrl(env, "ANALYTICS_SERVICE_URL", "http://127.0.0.1:4106") },
      { name: "knowledge-service", url: readServiceUrl(env, "KNOWLEDGE_SERVICE_URL", "http://127.0.0.1:4107") }
    ]
  };
}

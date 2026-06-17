import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../..");

export function loadConfig(env = process.env) {
  return {
    serviceName: "learning-service",
    host: env.LEARNING_SERVICE_HOST || env.HOST || "127.0.0.1",
    port: Number(env.LEARNING_SERVICE_PORT || env.PORT || 4102),
    internalKey: env.EDUMIND_INTERNAL_KEY || "edumind-local-internal-key",
    dataFile: env.LEARNING_SERVICE_DATA_FILE || resolve(projectRoot, "data/learning.json"),
    collaborationServiceUrl: env.COLLABORATION_SERVICE_URL || "http://127.0.0.1:4105"
  };
}

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../..");

export function loadConfig(env = process.env) {
  return {
    serviceName: "collaboration-service",
    host: env.COLLABORATION_SERVICE_HOST || env.HOST || "127.0.0.1",
    port: Number(env.COLLABORATION_SERVICE_PORT || env.PORT || 4105),
    internalKey: env.EDUMIND_INTERNAL_KEY || "edumind-local-internal-key",
    dataFile: env.COLLABORATION_SERVICE_DATA_FILE || resolve(projectRoot, "data/collaboration.json")
  };
}

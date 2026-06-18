import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../..");

export function loadConfig(env = process.env) {
  return {
    serviceName: "operations-service",
    host: env.OPERATIONS_SERVICE_HOST || env.HOST || "127.0.0.1",
    port: Number(env.OPERATIONS_SERVICE_PORT || env.PORT || 4111),
    internalKey: env.EDUMIND_INTERNAL_KEY || "edumind-local-internal-key",
    dataFile: env.OPERATIONS_SERVICE_DATA_FILE || resolve(projectRoot, "data/operations.json")
  };
}

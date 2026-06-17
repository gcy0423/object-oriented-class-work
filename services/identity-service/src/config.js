import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../..");

export function loadConfig(env = process.env) {
  return {
    serviceName: "identity-service",
    host: env.IDENTITY_SERVICE_HOST || env.HOST || "127.0.0.1",
    port: Number(env.IDENTITY_SERVICE_PORT || env.PORT || 4101),
    internalKey: env.EDUMIND_INTERNAL_KEY || "edumind-local-internal-key",
    dataFile: env.IDENTITY_SERVICE_DATA_FILE || resolve(projectRoot, "data/identity.json"),
    tokenSecret: env.IDENTITY_SERVICE_TOKEN_SECRET || env.EDUMIND_TOKEN_SECRET || "edumind-v2-identity-secret"
  };
}

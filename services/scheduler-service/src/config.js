import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../..");

export function loadConfig(env = process.env) {
  return {
    serviceName: "scheduler-service",
    host: env.SCHEDULER_SERVICE_HOST || env.HOST || "127.0.0.1",
    port: Number(env.SCHEDULER_SERVICE_PORT || env.PORT || 4109),
    internalKey: env.EDUMIND_INTERNAL_KEY || "edumind-local-internal-key",
    dataFile: env.SCHEDULER_SERVICE_DATA_FILE || resolve(projectRoot, "data/scheduler.json"),
    notificationServiceUrl: env.NOTIFICATION_SERVICE_URL || "http://127.0.0.1:4108",
    lookAheadHours: Number(env.SCHEDULER_LOOKAHEAD_HOURS || 72),
    maxRunBatchSize: Number(env.SCHEDULER_MAX_RUN_BATCH_SIZE || 50),
    timeoutMs: Number(env.SCHEDULER_TIMEOUT_MS || 3000)
  };
}

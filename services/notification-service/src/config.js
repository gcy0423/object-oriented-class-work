import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../..");

export function loadConfig(env = process.env) {
  return {
    serviceName: "notification-service",
    host: env.NOTIFICATION_SERVICE_HOST || env.HOST || "127.0.0.1",
    port: Number(env.NOTIFICATION_SERVICE_PORT || env.PORT || 4108),
    internalKey: env.EDUMIND_INTERNAL_KEY || "edumind-local-internal-key",
    dataFile: env.NOTIFICATION_SERVICE_DATA_FILE || resolve(projectRoot, "data/notifications.json"),
    defaultChannel: env.NOTIFICATION_DEFAULT_CHANNEL || "in_app",
    maxPageSize: Number(env.NOTIFICATION_MAX_PAGE_SIZE || 50)
  };
}

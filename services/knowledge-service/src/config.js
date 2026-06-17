import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../..");

export function loadConfig(env = process.env) {
  return {
    serviceName: "knowledge-service",
    host: env.KNOWLEDGE_SERVICE_HOST || env.HOST || "127.0.0.1",
    port: Number(env.KNOWLEDGE_SERVICE_PORT || env.PORT || 4107),
    internalKey: env.EDUMIND_INTERNAL_KEY || "edumind-local-internal-key",
    dataFile: env.KNOWLEDGE_SERVICE_DATA_FILE || resolve(projectRoot, "data/knowledge.json"),
    defaultCourseId: env.KNOWLEDGE_DEFAULT_COURSE_ID || "course_ood",
    maxSearchLimit: Number(env.KNOWLEDGE_MAX_SEARCH_LIMIT || 20),
    graphDepth: Number(env.KNOWLEDGE_GRAPH_DEPTH || 2)
  };
}

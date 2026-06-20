import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../..");

export function loadConfig(env = process.env) {
  const uploadDir = env.ASSESSMENT_UPLOAD_DIR || resolve(projectRoot, "data/uploads");
  return {
    serviceName: "assessment-service",
    host: env.ASSESSMENT_SERVICE_HOST || env.HOST || "127.0.0.1",
    port: Number(env.ASSESSMENT_SERVICE_PORT || env.PORT || 4103),
    internalKey: env.EDUMIND_INTERNAL_KEY || "edumind-local-internal-key",
    dataFile: env.ASSESSMENT_SERVICE_DATA_FILE || resolve(projectRoot, "data/assessment.json"),
    uploadDir,
    identityServiceUrl: env.IDENTITY_SERVICE_URL || "http://127.0.0.1:4101",
    learningServiceUrl: env.LEARNING_SERVICE_URL || "http://127.0.0.1:4102",
    aiServiceUrl: env.AI_SERVICE_URL || "http://127.0.0.1:4104",
    collaborationServiceUrl: env.COLLABORATION_SERVICE_URL || "http://127.0.0.1:4105"
  };
}

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "../../..");

export function loadConfig(env = process.env) {
  return {
    serviceName: "ai-service",
    host: env.AI_SERVICE_HOST || env.HOST || "127.0.0.1",
    port: Number(env.AI_SERVICE_PORT || env.PORT || 4104),
    internalKey: env.EDUMIND_INTERNAL_KEY || "edumind-local-internal-key",
    dataFile: env.AI_SERVICE_DATA_FILE || resolve(projectRoot, "data/ai.json"),
    learningServiceUrl: env.LEARNING_SERVICE_URL || "http://127.0.0.1:4102",
    knowledgeServiceUrl: env.KNOWLEDGE_SERVICE_URL || "http://127.0.0.1:4107",
    llm: {
      provider: env.LLM_PROVIDER || "mock",
      endpoint: env.LLM_ENDPOINT || env.OPENAI_COMPATIBLE_ENDPOINT || "http://10.108.10.110:1234",
      model: env.LLM_MODEL || "qwopus3.6-27b-v2-mtp@iq4_xs",
      apiKey: env.OPENAI_API_KEY || env.LLM_API_KEY || "",
      timeoutMs: Number(env.LLM_TIMEOUT_MS || 12000),
      maxTokens: Number(env.LLM_MAX_TOKENS || 1024)
    }
  };
}

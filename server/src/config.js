import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(here, "../..");

export function loadConfig(env = process.env) {
  return {
    name: "EduMind Agent",
    port: Number(env.PORT || 4077),
    host: env.HOST || "127.0.0.1",
    dataFile: env.EDUMIND_DATA_FILE || join(projectRoot, "data", "app-data.json"),
    clientRoot: env.EDUMIND_CLIENT_ROOT || join(projectRoot, "client"),
    tokenSecret: env.EDUMIND_TOKEN_SECRET || "edumind-local-development-secret",
    llm: {
      provider: env.LLM_PROVIDER || "lmstudio",
      endpoint: env.LLM_ENDPOINT || "http://10.108.10.110:1234/v1/chat/completions",
      model: env.LLM_MODEL || "qwopus3.6-27b-v2-mtp@iq4_xs",
      apiKey: env.LLM_API_KEY || "",
      timeoutMs: Number(env.LLM_TIMEOUT_MS || 90000),
      maxTokens: Number(env.LLM_MAX_TOKENS || 1024)
    }
  };
}

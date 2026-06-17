import { fileURLToPath } from "node:url";
import { JsonDatabase } from "../../../shared/data/jsonDatabase.js";
import { Router } from "../../../shared/http/router.js";
import { createServiceServer } from "../../../shared/http/server.js";
import { AITutorService } from "./application/aiTutorService.js";
import { loadConfig } from "./config.js";
import { AIRequestRepository, AIResponseRepository, PromptTemplateRepository, ProviderHealthRepository } from "./domain/ai.js";
import { LearningClient } from "./infrastructure/clients/learningClient.js";
import { createAiSeed } from "./infrastructure/seed.js";
import { registerRoutes } from "./routes.js";

export function createApp(config = loadConfig()) {
  const database = new JsonDatabase(config.dataFile, () => createAiSeed());
  const ready = database.load();
  const repositories = {
    templates: new PromptTemplateRepository(database),
    requests: new AIRequestRepository(database),
    responses: new AIResponseRepository(database),
    providerHealth: new ProviderHealthRepository(database)
  };
  const aiTutor = new AITutorService({
    config,
    database,
    ...repositories,
    learningClient: new LearningClient({
      baseUrl: config.learningServiceUrl,
      internalKey: config.internalKey,
      timeoutMs: config.llm.timeoutMs
    })
  });
  const services = { ready, database, repositories, aiTutor };
  const router = new Router();
  registerRoutes(router, config, services);
  const server = createServiceServer({ router, config });
  return { config, router, server, services };
}

export async function startService(config = loadConfig()) {
  const app = createApp(config);
  await new Promise((resolve) => {
    app.server.listen(config.port, config.host, resolve);
  });
  return app;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const app = await startService();
  console.log(`${app.config.serviceName} running at http://${app.config.host}:${app.server.address().port}`);
}

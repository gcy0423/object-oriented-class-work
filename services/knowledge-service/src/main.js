import { fileURLToPath } from "node:url";
import { JsonDatabase } from "../../../shared/data/jsonDatabase.js";
import { Router } from "../../../shared/http/router.js";
import { createServiceServer } from "../../../shared/http/server.js";
import { KnowledgeImportValidator } from "./application/importValidator.js";
import { KnowledgeService } from "./application/knowledgeService.js";
import { LearningPathPlanner } from "./application/learningPathPlanner.js";
import { PracticeSetBuilder } from "./application/practiceSetBuilder.js";
import { loadConfig } from "./config.js";
import {
  KnowledgeArticleRepository,
  KnowledgeChunkRepository,
  KnowledgeConceptRepository,
  KnowledgeRelationRepository,
  ReviewCardRepository
} from "./domain/knowledge.js";
import { createKnowledgeSeed } from "./infrastructure/seed.js";
import { registerRoutes } from "./routes.js";

export function createApp(config = loadConfig()) {
  const database = new JsonDatabase(config.dataFile, () => createKnowledgeSeed());
  const ready = database.load();
  const repositories = {
    concepts: new KnowledgeConceptRepository(database),
    articles: new KnowledgeArticleRepository(database),
    chunks: new KnowledgeChunkRepository(database),
    relations: new KnowledgeRelationRepository(database),
    reviewCards: new ReviewCardRepository(database)
  };
  const importValidator = new KnowledgeImportValidator(repositories);
  const pathPlanner = new LearningPathPlanner(repositories);
  const practiceSetBuilder = new PracticeSetBuilder(repositories);
  const knowledge = new KnowledgeService({
    config,
    ...repositories,
    importValidator,
    pathPlanner,
    practiceSetBuilder
  });
  const services = { ready, database, repositories, knowledge };
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

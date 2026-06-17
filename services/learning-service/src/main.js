import { fileURLToPath } from "node:url";
import { JsonDatabase } from "../../../shared/data/jsonDatabase.js";
import { Router } from "../../../shared/http/router.js";
import { createServiceServer } from "../../../shared/http/server.js";
import { LearningService } from "./application/learningService.js";
import { loadConfig } from "./config.js";
import { CourseRepository, GoalRepository, NoteRepository, TaskRepository } from "./domain/learning.js";
import { CollaborationClient } from "./infrastructure/clients/collaborationClient.js";
import { createLearningSeed } from "./infrastructure/seed.js";
import { registerRoutes } from "./routes.js";

export function createApp(config = loadConfig()) {
  const database = new JsonDatabase(config.dataFile, () => createLearningSeed());
  const ready = database.load();
  const repositories = {
    courses: new CourseRepository(database),
    goals: new GoalRepository(database),
    tasks: new TaskRepository(database),
    notes: new NoteRepository(database)
  };
  const learning = new LearningService({
    database,
    ...repositories,
    collaborationClient: new CollaborationClient({
      baseUrl: config.collaborationServiceUrl,
      internalKey: config.internalKey
    })
  });
  const services = { ready, database, repositories, learning };
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

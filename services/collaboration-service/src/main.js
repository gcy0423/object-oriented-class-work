import { fileURLToPath } from "node:url";
import { JsonDatabase } from "../../../shared/data/jsonDatabase.js";
import { Router } from "../../../shared/http/router.js";
import { createServiceServer } from "../../../shared/http/server.js";
import { ActivityService } from "./application/activityService.js";
import { CollaborationService } from "./application/collaborationService.js";
import { SyncHub } from "./application/syncHub.js";
import { loadConfig } from "./config.js";
import { ActivityLogRepository, EventRepository, MessageRepository, RoomRepository } from "./domain/collaboration.js";
import { createCollaborationSeed } from "./infrastructure/seed.js";
import { registerRoutes } from "./routes.js";

export function createApp(config = loadConfig()) {
  const database = new JsonDatabase(config.dataFile, () => createCollaborationSeed());
  const ready = database.load();
  const repositories = {
    rooms: new RoomRepository(database),
    messages: new MessageRepository(database),
    activityLogs: new ActivityLogRepository(database),
    events: new EventRepository(database)
  };
  const syncHub = new SyncHub();
  const activity = new ActivityService({
    database,
    activityLogs: repositories.activityLogs,
    events: repositories.events,
    syncHub
  });
  const collaboration = new CollaborationService({
    database,
    rooms: repositories.rooms,
    messages: repositories.messages,
    activity,
    syncHub
  });
  const services = { ready, database, repositories, syncHub, activity, collaboration };
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

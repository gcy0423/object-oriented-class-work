import { fileURLToPath } from "node:url";
import { JsonDatabase } from "../../../shared/data/jsonDatabase.js";
import { Router } from "../../../shared/http/router.js";
import { createServiceServer } from "../../../shared/http/server.js";
import { NotificationDigestService } from "./application/notificationDigestService.js";
import { NotificationService } from "./application/notificationService.js";
import { loadConfig } from "./config.js";
import {
  DeliveryLogRepository,
  NotificationPreferenceRepository,
  NotificationRepository,
  NotificationTemplateRepository
} from "./domain/notification.js";
import { createNotificationSeed } from "./infrastructure/seed.js";
import { registerRoutes } from "./routes.js";

export function createApp(config = loadConfig()) {
  const database = new JsonDatabase(config.dataFile, () => createNotificationSeed());
  const ready = database.load();
  const repositories = {
    notifications: new NotificationRepository(database),
    preferences: new NotificationPreferenceRepository(database),
    templates: new NotificationTemplateRepository(database),
    deliveryLogs: new DeliveryLogRepository(database)
  };
  const digestService = new NotificationDigestService(repositories);
  const notificationService = new NotificationService({
    database,
    config,
    ...repositories,
    digestService
  });
  const services = { ready, database, repositories, digestService, notificationService };
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

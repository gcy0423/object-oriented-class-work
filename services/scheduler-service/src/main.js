import { fileURLToPath } from "node:url";
import { JsonDatabase } from "../../../shared/data/jsonDatabase.js";
import { Router } from "../../../shared/http/router.js";
import { createServiceServer } from "../../../shared/http/server.js";
import { SchedulerAnalyticsService } from "./application/schedulerAnalyticsService.js";
import { SchedulerService } from "./application/schedulerService.js";
import { loadConfig } from "./config.js";
import { ReminderRuleRepository, ScheduleRunRepository } from "./domain/schedule.js";
import { NotificationClient } from "./infrastructure/clients/notificationClient.js";
import { createSchedulerSeed } from "./infrastructure/seed.js";
import { registerRoutes } from "./routes.js";

export function createApp(config = loadConfig()) {
  const database = new JsonDatabase(config.dataFile, () => createSchedulerSeed());
  const ready = database.load();
  const repositories = {
    reminderRules: new ReminderRuleRepository(database),
    scheduleRuns: new ScheduleRunRepository(database)
  };
  const notificationClient = new NotificationClient({
    baseUrl: config.notificationServiceUrl,
    internalKey: config.internalKey,
    timeoutMs: config.timeoutMs
  });
  const analyticsService = new SchedulerAnalyticsService(repositories);
  const schedulerService = new SchedulerService({
    database,
    config,
    ...repositories,
    notificationClient,
    analyticsService
  });
  const services = { ready, database, repositories, notificationClient, analyticsService, schedulerService };
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

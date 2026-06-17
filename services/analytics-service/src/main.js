import { fileURLToPath } from "node:url";
import { Router } from "../../../shared/http/router.js";
import { createServiceServer } from "../../../shared/http/server.js";
import { AnalyticsService } from "./application/analyticsService.js";
import { loadConfig } from "./config.js";
import { AIClient } from "./infrastructure/clients/aiClient.js";
import { AssessmentClient } from "./infrastructure/clients/assessmentClient.js";
import { CollaborationClient } from "./infrastructure/clients/collaborationClient.js";
import { IdentityClient } from "./infrastructure/clients/identityClient.js";
import { LearningClient } from "./infrastructure/clients/learningClient.js";
import { registerRoutes } from "./routes.js";

export function createApp(config = loadConfig()) {
  const services = {
    analytics: new AnalyticsService({
      identityClient: new IdentityClient({
        baseUrl: config.identityServiceUrl,
        internalKey: config.internalKey,
        timeoutMs: config.timeoutMs
      }),
      learningClient: new LearningClient({
        baseUrl: config.learningServiceUrl,
        internalKey: config.internalKey,
        timeoutMs: config.timeoutMs
      }),
      assessmentClient: new AssessmentClient({
        baseUrl: config.assessmentServiceUrl,
        internalKey: config.internalKey,
        timeoutMs: config.timeoutMs
      }),
      collaborationClient: new CollaborationClient({
        baseUrl: config.collaborationServiceUrl,
        internalKey: config.internalKey,
        timeoutMs: config.timeoutMs
      }),
      aiClient: new AIClient({
        baseUrl: config.aiServiceUrl,
        internalKey: config.internalKey,
        timeoutMs: config.timeoutMs
      })
    })
  };
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

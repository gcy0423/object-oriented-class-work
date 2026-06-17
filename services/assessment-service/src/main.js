import { fileURLToPath } from "node:url";
import { JsonDatabase } from "../../../shared/data/jsonDatabase.js";
import { Router } from "../../../shared/http/router.js";
import { createServiceServer } from "../../../shared/http/server.js";
import { AssignmentService } from "./application/assignmentService.js";
import { AssessmentFacade } from "./application/assessmentFacade.js";
import { GradingService } from "./application/gradingService.js";
import { MasteryService } from "./application/masteryService.js";
import { MistakeService } from "./application/mistakeService.js";
import { PracticeService } from "./application/practiceService.js";
import { QuestionBankService } from "./application/questionBankService.js";
import * as assignmentModule from "./domain/assignment.js";
import { createAssessmentRepositories } from "./domain/assessment.js";
import * as questionModule from "./domain/question.js";
import { loadConfig } from "./config.js";
import { AIClient } from "./infrastructure/clients/aiClient.js";
import { CollaborationClient } from "./infrastructure/clients/collaborationClient.js";
import { IdentityClient } from "./infrastructure/clients/identityClient.js";
import { LearningClient } from "./infrastructure/clients/learningClient.js";
import { createAssessmentSeed } from "./infrastructure/seed.js";
import { registerRoutes } from "./routes.js";

export function createApp(config = loadConfig()) {
  const database = new JsonDatabase(config.dataFile, () => createAssessmentSeed());
  const ready = database.load();
  const repositories = createAssessmentRepositories(database, assignmentModule, questionModule);

  const identityClient = new IdentityClient({
    baseUrl: config.identityServiceUrl,
    internalKey: config.internalKey
  });
  const learningClient = new LearningClient({
    baseUrl: config.learningServiceUrl,
    internalKey: config.internalKey
  });
  const aiClient = new AIClient({
    baseUrl: config.aiServiceUrl,
    internalKey: config.internalKey
  });
  const collaborationClient = new CollaborationClient({
    baseUrl: config.collaborationServiceUrl,
    internalKey: config.internalKey
  });

  const assignmentService = new AssignmentService({
    database,
    ...repositories,
    learningClient,
    identityClient,
    collaborationClient
  });
  const gradingService = new GradingService({
    database,
    ...repositories,
    aiClient,
    identityClient,
    collaborationClient
  });
  const questionBankService = new QuestionBankService({
    database,
    ...repositories,
    learningClient
  });
  const practiceService = new PracticeService({
    database,
    ...repositories,
    learningClient,
    collaborationClient
  });
  const mistakeService = new MistakeService({
    ...repositories,
    collaborationClient
  });
  const masteryService = new MasteryService({
    masteryRecords: repositories.masteryRecords
  });
  const assessment = new AssessmentFacade({
    assignmentService,
    gradingService,
    questionBankService,
    practiceService,
    mistakeService,
    masteryService,
    repositories
  });

  const services = {
    ready,
    database,
    repositories,
    assignmentService,
    gradingService,
    questionBankService,
    practiceService,
    mistakeService,
    masteryService,
    assessment
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

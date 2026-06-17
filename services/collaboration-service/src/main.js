import { fileURLToPath } from "node:url";
import { JsonDatabase } from "../../../shared/data/jsonDatabase.js";
import { Router } from "../../../shared/http/router.js";
import { createServiceServer } from "../../../shared/http/server.js";
import { ActivityService } from "./application/activityService.js";
import { CollaborationService } from "./application/collaborationService.js";
import { SyncHub } from "./application/syncHub.js";
import { loadConfig } from "./config.js";
import {
  ActivityLogRepository,
  AuditRepository,
  ChecklistItemRepository,
  CollaborationTaskRepository,
  EventRepository,
  HandoffNoteRepository,
  MentionRepository,
  MessageReplyRepository,
  MessageRepository,
  RoomDecisionRepository,
  RoomMemberRepository,
  RoomRepository,
  RoomSummaryRepository,
  SharedResourceRepository
} from "./domain/collaboration.js";
import { createCollaborationSeed } from "./infrastructure/seed.js";
import { registerRoutes } from "./routes.js";

export function createApp(config = loadConfig()) {
  const database = new JsonDatabase(config.dataFile, () => createCollaborationSeed());
  const ready = database.load();
  const repositories = {
    rooms: new RoomRepository(database),
    members: new RoomMemberRepository(database),
    messages: new MessageRepository(database),
    replies: new MessageReplyRepository(database),
    mentions: new MentionRepository(database),
    collaborationTasks: new CollaborationTaskRepository(database),
    summaries: new RoomSummaryRepository(database),
    decisions: new RoomDecisionRepository(database),
    resources: new SharedResourceRepository(database),
    checklist: new ChecklistItemRepository(database),
    handoffs: new HandoffNoteRepository(database),
    audits: new AuditRepository(database),
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
    members: repositories.members,
    messages: repositories.messages,
    replies: repositories.replies,
    mentions: repositories.mentions,
    tasks: repositories.collaborationTasks,
    summaries: repositories.summaries,
    decisions: repositories.decisions,
    resources: repositories.resources,
    checklist: repositories.checklist,
    handoffs: repositories.handoffs,
    audits: repositories.audits,
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

import { requireInternal, requireUserContext } from "../../../shared/auth/userContext.js";
import { ok, readJson } from "../../../shared/http/response.js";

export function registerRoutes(router, config, services) {
  router.get("/health", () => ok({
    service: config.serviceName,
    status: "up",
    time: new Date().toISOString()
  }));

  router.get("/api/collaboration/messages", async (req) => {
    await services.ready;
    requireUserContext(req);
    return ok(services.collaboration.roomMessages(req.query.roomId || "room_ood", req.query));
  });

  router.post("/api/collaboration/messages", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.sendMessage(user, await readJson(req)));
  });

  router.get("/api/collaboration/rooms", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.collaboration.listRooms(user, req.query));
  });

  router.post("/api/collaboration/rooms", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.createRoom(user, await readJson(req)));
  });

  router.get("/api/collaboration/rooms/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.collaboration.getRoomWorkspace(user, req.params.id));
  });

  router.post("/api/collaboration/rooms/:id/members", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.addMember(user, req.params.id, await readJson(req)));
  });

  router.get("/api/collaboration/rooms/:id/tasks", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.collaboration.listTasks(user, { ...req.query, roomId: req.params.id }));
  });

  router.post("/api/collaboration/messages/:id/replies", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.replyToMessage(user, req.params.id, await readJson(req)));
  });

  router.get("/api/collaboration/mentions", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.collaboration.listMentions(user, req.query));
  });

  router.patch("/api/collaboration/mentions/:id/read", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.markMentionRead(user, req.params.id));
  });

  router.get("/api/collaboration/tasks", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.collaboration.listTasks(user, req.query));
  });

  router.post("/api/collaboration/tasks", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.createTask(user, await readJson(req)));
  });

  router.patch("/api/collaboration/tasks/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.updateTask(user, req.params.id, await readJson(req)));
  });

  router.post("/api/collaboration/summaries", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.createSummary(user, await readJson(req)));
  });

  router.get("/api/collaboration/rooms/:id/insight", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.collaboration.roomInsight(user, req.params.id));
  });

  router.get("/api/collaboration/decisions", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.collaboration.listDecisions(user, req.query));
  });

  router.post("/api/collaboration/decisions", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.createDecision(user, await readJson(req)));
  });

  router.get("/api/collaboration/resources", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.collaboration.listResources(user, req.query));
  });

  router.post("/api/collaboration/resources", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.createResource(user, await readJson(req)));
  });

  router.get("/api/collaboration/checklist", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.collaboration.listChecklist(user, req.query));
  });

  router.post("/api/collaboration/checklist", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.createChecklistItem(user, await readJson(req)));
  });

  router.patch("/api/collaboration/checklist/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.updateChecklistItem(user, req.params.id, await readJson(req)));
  });

  router.get("/api/collaboration/handoffs", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.collaboration.listHandoffs(user, req.query));
  });

  router.post("/api/collaboration/handoffs", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.createHandoff(user, await readJson(req)));
  });

  router.patch("/api/collaboration/handoffs/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.updateHandoff(user, req.params.id, await readJson(req)));
  });

  router.get("/api/collaboration/audit", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.collaboration.auditTrail(user, req.query));
  });

  router.get("/api/activity", async (req) => {
    await services.ready;
    requireUserContext(req);
    const limit = Number(req.query.limit || 20);
    return ok(services.activity.listLatest(Number.isFinite(limit) ? limit : 20));
  });

  router.get("/api/events", async (req, res) => {
    await services.ready;
    requireUserContext(req);
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    });
    services.syncHub.connect(res);
    res.write("event: ready\ndata: {\"ok\":true}\n\n");
    req.on("close", () => {
      services.syncHub.disconnect(res);
    });
  });

  router.post("/internal/events", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(await services.activity.recordEvent(await readJson(req)));
  });

  router.get("/internal/collaboration/analytics", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok({
      rooms: services.repositories.rooms.all().map((item) => item.toJSON()),
      members: services.repositories.members.all().map((item) => item.toJSON()),
      messages: services.repositories.messages.all().map((item) => item.toJSON()),
      replies: services.repositories.replies.all().map((item) => item.toJSON()),
      mentions: services.repositories.mentions.all().map((item) => item.toJSON()),
      tasks: services.repositories.collaborationTasks.all().map((item) => item.toJSON()),
      summaries: services.repositories.summaries.all().map((item) => item.toJSON()),
      decisions: services.repositories.decisions.all().map((item) => item.toJSON()),
      resources: services.repositories.resources.all().map((item) => item.toJSON()),
      checklist: services.repositories.checklist.all().map((item) => item.toJSON()),
      handoffs: services.repositories.handoffs.all().map((item) => item.toJSON()),
      audits: services.repositories.audits.all().map((item) => item.toJSON()),
      activityLogs: services.repositories.activityLogs.all().map((item) => item.toJSON())
    });
  });
}

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
    return ok(services.collaboration.roomMessages(req.query.roomId || "room_ood"));
  });

  router.post("/api/collaboration/messages", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.collaboration.sendMessage(user, await readJson(req)));
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
      messages: services.repositories.messages.all().map((item) => item.toJSON()),
      activityLogs: services.repositories.activityLogs.all().map((item) => item.toJSON())
    });
  });
}

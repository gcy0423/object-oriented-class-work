import { requireInternal, requireUserContext } from "../../../shared/auth/userContext.js";
import { ok, readJson } from "../../../shared/http/response.js";

export function registerRoutes(router, config, services) {
  router.get("/health", () => ok({
    service: config.serviceName,
    status: "up",
    time: new Date().toISOString()
  }));

  router.get("/api/notifications", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.notificationService.listNotifications(user, req.query));
  });

  router.post("/api/notifications", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.notificationService.createNotification(user, await readJson(req)));
  });

  router.post("/api/notifications/bulk", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.notificationService.createBulk(user, await readJson(req)));
  });

  router.get("/api/notifications/summary", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.notificationService.getSummary(user, req.query));
  });

  router.get("/api/notification-preferences", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.notificationService.getPreference(user));
  });

  router.patch("/api/notification-preferences", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.notificationService.updatePreference(user, await readJson(req)));
  });

  router.patch("/api/notifications/read-all", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.notificationService.markAllRead(user, await readJson(req)));
  });

  router.patch("/api/notifications/:id/read", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.notificationService.markRead(user, req.params.id));
  });

  router.patch("/api/notifications/:id/dismiss", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.notificationService.dismiss(user, req.params.id));
  });

  router.post("/internal/notifications/emit", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(await services.notificationService.emit(await readJson(req)));
  });

  router.get("/internal/notifications/summary", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(services.notificationService.getSystemSummary());
  });
}

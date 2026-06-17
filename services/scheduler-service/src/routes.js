import { requireInternal, requireUserContext } from "../../../shared/auth/userContext.js";
import { ForbiddenError } from "../../../shared/http/errors.js";
import { ok, readJson } from "../../../shared/http/response.js";

function isTeacherRole(role) {
  return role === "teacher" || role === "admin";
}

function requireTeacher(user) {
  if (!isTeacherRole(user.role)) {
    throw new ForbiddenError("teacher role required");
  }
}

export function registerRoutes(router, config, services) {
  router.get("/health", () => ok({
    service: config.serviceName,
    status: "up",
    time: new Date().toISOString()
  }));

  router.get("/api/scheduler/reminders", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.schedulerService.listReminders(user, req.query));
  });

  router.post("/api/scheduler/reminders", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.schedulerService.createReminder(user, await readJson(req)));
  });

  router.patch("/api/scheduler/reminders/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.schedulerService.updateReminder(user, req.params.id, await readJson(req)));
  });

  router.get("/api/scheduler/due-preview", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.schedulerService.previewDue(user, req.query));
  });

  router.post("/api/scheduler/run-due", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    requireTeacher(user);
    return ok(await services.schedulerService.runDueJobs({
      ...(await readJson(req)),
      triggeredBy: user.id
    }));
  });

  router.get("/api/scheduler/timeline", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.schedulerService.getTimeline(user, req.query));
  });

  router.get("/api/scheduler/dashboard", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.schedulerService.getDashboard(user, req.query));
  });

  router.post("/internal/scheduler/tick", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(await services.schedulerService.runDueJobs(await readJson(req)));
  });
}

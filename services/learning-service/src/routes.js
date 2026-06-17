import { requireInternal, requireUserContext } from "../../../shared/auth/userContext.js";
import { ok, readJson } from "../../../shared/http/response.js";

export function registerRoutes(router, config, services) {
  router.get("/health", () => ok({
    service: config.serviceName,
    status: "up",
    time: new Date().toISOString()
  }));

  router.get("/api/courses", async (req) => {
    await services.ready;
    requireUserContext(req);
    return ok(services.repositories.courses.all());
  });

  router.get("/api/dashboard/learning", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.learning.dashboardFor(user.id));
  });

  router.post("/api/goals", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    const goal = await services.learning.createGoal(user, await readJson(req));
    return ok(goal);
  });

  router.post("/api/tasks", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    const task = await services.learning.createTask(user, await readJson(req));
    return ok(task);
  });

  router.patch("/api/tasks/:id/complete", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    const task = await services.learning.completeTask(user, req.params.id);
    return ok(task);
  });

  router.post("/api/notes", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    const note = await services.learning.createNote(user, await readJson(req));
    return ok(note);
  });

  router.get("/internal/learning/context/:userId", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(services.learning.buildLearningContext(req.params.userId));
  });
}

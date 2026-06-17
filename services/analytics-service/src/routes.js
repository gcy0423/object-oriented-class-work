import { ok } from "../../../shared/http/response.js";
import { requireUserContext } from "../../../shared/auth/userContext.js";

export function registerRoutes(router, config, services) {
  router.get("/health", () => ok({
    service: config.serviceName,
    status: "up",
    time: new Date().toISOString()
  }));

  router.get("/api/analytics/overview", async (req) => {
    const user = requireUserContext(req);
    return ok(await services.analytics.getOverview(user));
  });

  router.get("/api/analytics/courses/:id", async (req) => {
    const user = requireUserContext(req);
    return ok(await services.analytics.getCourseAnalytics(user, req.params.id));
  });

  router.get("/api/analytics/students/:id", async (req) => {
    const user = requireUserContext(req);
    return ok(await services.analytics.getStudentAnalytics(user, req.params.id));
  });

  router.get("/api/analytics/teacher", async (req) => {
    const user = requireUserContext(req);
    return ok(await services.analytics.getTeacherAnalytics(user));
  });
}

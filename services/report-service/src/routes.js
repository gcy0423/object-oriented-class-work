import { requireUserContext } from "../../../shared/auth/userContext.js";
import { ok } from "../../../shared/http/response.js";

export function registerRoutes(router, config, services) {
  router.get("/health", () => ok({
    service: config.serviceName,
    status: "up",
    time: new Date().toISOString()
  }));

  router.get("/api/reports/catalog", async (req) => {
    const user = requireUserContext(req);
    return ok(services.reports.catalog(user));
  });

  router.get("/api/reports/student-weekly", async (req) => {
    const user = requireUserContext(req);
    return ok(await services.reports.buildStudentWeeklyReport(user, req.query));
  });

  router.get("/api/reports/course-weekly", async (req) => {
    const user = requireUserContext(req);
    return ok(await services.reports.buildTeacherCourseWeeklyReport(user, req.query));
  });

  router.get("/api/reports/assignments/:id/grading", async (req) => {
    const user = requireUserContext(req);
    return ok(await services.reports.buildAssignmentGradingReport(user, req.params.id, req.query));
  });

  router.get("/api/reports/mistakes/review", async (req) => {
    const user = requireUserContext(req);
    return ok(await services.reports.buildMistakeReviewReport(user, req.query));
  });

  router.get("/api/reports/ai-usage", async (req) => {
    const user = requireUserContext(req);
    return ok(await services.reports.buildAiUsageReport(user, req.query));
  });
}

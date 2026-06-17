import { requireInternal, requireUserContext } from "../../../shared/auth/userContext.js";
import { ok, readJson } from "../../../shared/http/response.js";

export function registerRoutes(router, config, services) {
  router.get("/health", () => ok({
    service: config.serviceName,
    status: "up",
    time: new Date().toISOString()
  }));

  router.post("/api/ai/ask", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.aiTutor.ask(user, await readJson(req)));
  });

  router.post("/api/ai/plan", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.aiTutor.generatePlan(user, await readJson(req)));
  });

  router.post("/api/ai/summarize", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.aiTutor.summarizeNote(user, await readJson(req)));
  });

  router.get("/internal/ai/provider-health", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(await services.aiTutor.getProviderHealth());
  });

  router.post("/internal/ai/review-submission", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(await services.aiTutor.reviewSubmission(await readJson(req)));
  });
}

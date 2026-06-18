import { requireUserContext } from "../../../shared/auth/userContext.js";
import { ok, readJson } from "../../../shared/http/response.js";

export function registerRoutes(router, config, services) {
  router.get("/health", () => ok({
    service: config.serviceName,
    status: "up",
    time: new Date().toISOString()
  }));

  router.get("/api/operations/catalog", async () => {
    await services.ready;
    return ok(services.operations.catalog());
  });

  router.get("/api/operations/dashboard", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.operations.dashboard(user, req.query));
  });

  router.get("/api/operations/imports", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.operations.listImports(user, req.query));
  });

  router.post("/api/operations/imports/preview", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.operations.previewImport(user, await readJson(req)));
  });

  router.get("/api/operations/imports/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.operations.getImport(user, req.params.id));
  });

  router.post("/api/operations/imports/:id/commit", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.operations.commitImport(user, req.params.id, await readJson(req)));
  });

  router.get("/api/operations/batch-jobs", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.operations.listJobs(user, req.query));
  });

  router.post("/api/operations/batch-jobs", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.operations.createBatchJob(user, await readJson(req)));
  });

  router.get("/api/operations/batch-jobs/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.operations.getJob(user, req.params.id));
  });

  router.post("/api/operations/batch-jobs/:id/run", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.operations.runJob(user, req.params.id));
  });

  router.get("/api/operations/audit", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.operations.listAudits(user, req.query));
  });

  router.post("/api/operations/audit", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.operations.recordAudit(user, await readJson(req)));
  });

  router.get("/api/operations/audit/digest", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.operations.auditDigest(user, req.query));
  });
}

import { requireInternal } from "../../../shared/auth/userContext.js";
import { ok, readJson } from "../../../shared/http/response.js";

export function registerRoutes(router, config, services) {
  router.get("/health", () => ok({
    service: config.serviceName,
    status: "up",
    time: new Date().toISOString()
  }));

  router.post("/api/auth/login", async (req) => {
    await services.ready;
    const result = await services.auth.login(await readJson(req));
    return ok(result);
  });

  router.get("/api/me", async (req) => {
    await services.ready;
    const user = services.auth.getCurrentUserFromHeader(req.headers.authorization || "");
    return ok({ user });
  });

  router.post("/internal/auth/verify", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    const { token } = await readJson(req);
    const result = services.auth.verifyToken(token);
    return ok(result);
  });

  router.get("/internal/users", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok({ users: services.auth.listUsers() });
  });

  router.get("/internal/users/:id", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok({ user: services.auth.getUserById(req.params.id) });
  });

  router.post("/internal/users/batch", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    const body = await readJson(req);
    return ok({ users: services.auth.getUsersByIds(body.ids) });
  });
}

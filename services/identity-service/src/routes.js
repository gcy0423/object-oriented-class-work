import { requireInternal, requireUserContext } from "../../../shared/auth/userContext.js";
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

  router.get("/api/identity/users", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.classes.listUsers(user, req.query));
  });

  router.get("/api/identity/users/:id/profile", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.classes.getUserProfile(user, req.params.id));
  });

  router.patch("/api/identity/users/:id/profile", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.classes.updateUserProfile(user, req.params.id, await readJson(req)));
  });

  router.get("/api/classes", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.classes.listClassrooms(user, req.query));
  });

  router.post("/api/classes", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.classes.createClassroom(user, await readJson(req)));
  });

  router.get("/api/classes/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.classes.getClassroom(user, req.params.id));
  });

  router.post("/api/classes/:id/students", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    const body = await readJson(req);
    return ok(await services.classes.assignUser(user, req.params.id, { ...body, role: "student" }));
  });

  router.post("/api/classes/:id/teachers", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    const body = await readJson(req);
    return ok(await services.classes.assignUser(user, req.params.id, { ...body, role: "teacher" }));
  });

  router.get("/api/groups", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.classes.listGroups(user, req.query));
  });

  router.post("/api/groups", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.classes.createGroup(user, await readJson(req)));
  });

  router.post("/api/groups/:id/members", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.classes.addGroupMember(user, req.params.id, await readJson(req)));
  });

  router.get("/api/role-permissions", async (req) => {
    await services.ready;
    requireUserContext(req);
    return ok(services.classes.roleMatrix());
  });

  router.get("/api/admin/identity-dashboard", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.classes.adminDashboard(user));
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
    return ok({ users: services.auth.listUsers().map((user) => user.toJSON()) });
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

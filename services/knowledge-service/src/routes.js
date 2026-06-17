import { requireInternal, readUserContext } from "../../../shared/auth/userContext.js";
import { ok, readJson } from "../../../shared/http/response.js";

function optionalCourse(req, config) {
  return req.query.courseId || config.defaultCourseId;
}

export function registerRoutes(router, config, services) {
  router.get("/health", async () => {
    await services.ready;
    return ok({
      service: config.serviceName,
      status: "up",
      summary: services.knowledge.summary(),
      time: new Date().toISOString()
    });
  });

  router.get("/api/knowledge/summary", async (req) => {
    await services.ready;
    readUserContext(req);
    return ok(services.knowledge.summary());
  });

  router.get("/api/knowledge/concepts", async (req) => {
    await services.ready;
    readUserContext(req);
    return ok(services.knowledge.listConcepts({
      courseId: req.query.courseId,
      category: req.query.category,
      tag: req.query.tag,
      difficulty: req.query.difficulty
    }));
  });

  router.get("/api/knowledge/concepts/:id", async (req) => {
    await services.ready;
    readUserContext(req);
    return ok(services.knowledge.getConceptProfile(req.params.id));
  });

  router.get("/api/knowledge/search", async (req) => {
    await services.ready;
    readUserContext(req);
    return ok(services.knowledge.search({
      query: req.query.q || req.query.query || "",
      courseId: req.query.courseId,
      limit: req.query.limit
    }));
  });

  router.get("/api/knowledge/graph", async (req) => {
    await services.ready;
    readUserContext(req);
    return ok(services.knowledge.buildGraph({
      courseId: optionalCourse(req, config),
      conceptId: req.query.conceptId,
      depth: req.query.depth
    }));
  });

  router.get("/api/knowledge/recommendations", async (req) => {
    await services.ready;
    const user = readUserContext(req) || { role: "student", name: "学习者" };
    return ok(services.knowledge.recommend({
      courseId: optionalCourse(req, config),
      goalText: req.query.goal || `${user.role} ${user.name} 面向对象 项目实践`,
      weakConcepts: req.query.weakConcepts ? String(req.query.weakConcepts).split(",") : [],
      limit: req.query.limit
    }));
  });

  router.post("/api/knowledge/ai-context", async (req) => {
    await services.ready;
    readUserContext(req);
    const body = await readJson(req);
    return ok(services.knowledge.buildAiContext(body));
  });

  router.post("/api/knowledge/learning-path", async (req) => {
    await services.ready;
    readUserContext(req);
    const body = await readJson(req);
    return ok(services.knowledge.buildLearningPath(body));
  });

  router.post("/api/knowledge/practice-set", async (req) => {
    await services.ready;
    readUserContext(req);
    const body = await readJson(req);
    return ok(services.knowledge.buildPracticeSet(body));
  });

  router.post("/internal/knowledge/context", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    const body = await readJson(req);
    return ok(services.knowledge.buildAiContext(body));
  });

  router.post("/internal/knowledge/validate-import", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    const body = await readJson(req);
    return ok(services.knowledge.validateImport(body));
  });
}

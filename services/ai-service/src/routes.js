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

  router.post("/api/student-ai/daily-plan", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.buildAndStore(user, "daily_plan", await readJson(req)));
  });

  router.post("/api/student-ai/weakness-insight", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.buildAndStore(user, "weakness_insight", await readJson(req)));
  });

  router.post("/api/student-ai/task-drafts", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    const body = await readJson(req);
    if (body.draft || body.resultId || body.title) {
      return ok(await services.studentAiWorkspace.createTaskDraft(user, body));
    }
    return ok(await services.studentAiWorkspace.buildAndStore(user, "task_draft", body));
  });

  router.post("/api/student-ai/assignment-guide", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.buildAndStore(user, "assignment_guide", await readJson(req)));
  });

  router.post("/api/student-ai/submission-check", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.buildAndStore(user, "submission_check", await readJson(req)));
  });

  router.post("/api/student-ai/note-organize", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.buildAndStore(user, "note_organize", await readJson(req)));
  });

  router.get("/api/student-ai/results", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.listResults(user, req.query));
  });

  router.get("/api/student-ai/results/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.getResult(user, req.params.id));
  });

  router.patch("/api/student-ai/results/:id/actions/:actionId", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.updateAction(user, req.params.id, req.params.actionId, await readJson(req)));
  });

  router.get("/api/student-ai/timeline", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.buildTimeline(user, req.query));
  });

  router.get("/api/student-ai/task-drafts", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.listTaskDrafts(user));
  });

  router.patch("/api/student-ai/task-drafts/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.updateTaskDraft(user, req.params.id, await readJson(req)));
  });

  router.delete("/api/student-ai/task-drafts/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.deleteTaskDraft(user, req.params.id));
  });

  router.post("/api/student-ai/task-drafts/:id/confirm", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.confirmTaskDraft(user, req.params.id));
  });

  router.get("/api/note-organize-results", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.listNoteOrganizeResults(user));
  });

  router.post("/api/note-organize-results/:id/save-note", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.saveOrganizeResultAsNote(user, req.params.id, await readJson(req)));
  });

  router.get("/api/teacher/students/:id/ai-results", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.listResults(user, { ...req.query, studentId: req.params.id }));
  });

  router.get("/api/teacher/students/:id/ai-timeline", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.studentAiWorkspace.buildTimeline(user, { ...req.query, studentId: req.params.id }));
  });

  router.get("/internal/student-ai/students/:id/results", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(await services.studentAiWorkspace.listResults({ id: "internal", role: "teacher" }, { ...req.query, studentId: req.params.id }));
  });

  router.get("/internal/student-ai/students/:id/timeline", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(await services.studentAiWorkspace.buildTimeline({ id: "internal", role: "teacher" }, { ...req.query, studentId: req.params.id }));
  });

  router.get("/internal/student-ai/results/:id", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(await services.studentAiWorkspace.getResult({ id: "internal", role: "teacher" }, req.params.id));
  });

  router.get("/internal/student-ai/students/:id/summary", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(services.studentAiWorkspace.buildActionSummary(req.params.id));
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

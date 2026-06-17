import { requireInternal, requireUserContext } from "../../../shared/auth/userContext.js";
import { ok, readJson } from "../../../shared/http/response.js";

export function registerRoutes(router, config, services) {
  router.get("/health", () => ok({
    service: config.serviceName,
    status: "up",
    time: new Date().toISOString()
  }));

  router.get("/api/assignments", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.assignmentService.listAssignments(user, req.query));
  });

  router.post("/api/assignments", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.assignmentService.createAssignment(user, await readJson(req)));
  });

  router.patch("/api/assignments/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.assignmentService.updateAssignment(user, req.params.id, await readJson(req)));
  });

  router.delete("/api/assignments/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.assignmentService.deleteAssignment(user, req.params.id));
  });

  router.get("/api/assignments/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.assignmentService.getAssignmentDetail(user, req.params.id));
  });

  router.post("/api/assignments/:id/submissions", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.assignmentService.createSubmission(user, req.params.id, await readJson(req)));
  });

  router.post("/api/submissions/:id/grade", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.gradingService.gradeSubmission(user, req.params.id, await readJson(req)));
  });

  router.post("/api/submissions/:id/ai-review", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.gradingService.reviewSubmissionByAi(user, req.params.id));
  });

  router.post("/api/rubrics", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.assignmentService.createRubric(user, await readJson(req)));
  });

  router.get("/api/rubrics", async (req) => {
    await services.ready;
    requireUserContext(req);
    return ok(services.assignmentService.listRubrics(req.query));
  });

  router.post("/api/question-banks", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.questionBankService.createQuestionBank(user, await readJson(req)));
  });

  router.get("/api/question-banks", async (req) => {
    await services.ready;
    requireUserContext(req);
    return ok(services.questionBankService.listQuestionBanks(req.query));
  });

  router.patch("/api/question-banks/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.questionBankService.updateQuestionBank(user, req.params.id, await readJson(req)));
  });

  router.delete("/api/question-banks/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.questionBankService.deleteQuestionBank(user, req.params.id));
  });

  router.post("/api/questions", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.questionBankService.createQuestion(user, await readJson(req)));
  });

  router.get("/api/questions", async (req) => {
    await services.ready;
    requireUserContext(req);
    return ok(services.questionBankService.listQuestions(req.query));
  });

  router.patch("/api/questions/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.questionBankService.updateQuestion(user, req.params.id, await readJson(req)));
  });

  router.delete("/api/questions/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.questionBankService.deleteQuestion(user, req.params.id));
  });

  router.post("/api/practice-sessions", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.practiceService.startSession(user, await readJson(req)));
  });

  router.get("/api/practice-sessions", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok({ items: services.practiceService.listSessions(user, req.query) });
  });

  router.get("/api/practice-sessions/:id", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.practiceService.getSession(user, req.params.id));
  });

  router.post("/api/practice-sessions/:id/answers", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.practiceService.submitAnswer(user, req.params.id, await readJson(req)));
  });

  router.post("/api/practice-sessions/:id/finish", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.practiceService.finishSession(user, req.params.id));
  });

  router.get("/api/mistakes", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(services.mistakeService.listMistakes(user, req.query));
  });

  router.patch("/api/mistakes/:id/review", async (req) => {
    await services.ready;
    const user = requireUserContext(req);
    return ok(await services.mistakeService.reviewMistake(user, req.params.id, await readJson(req)));
  });

  router.get("/internal/assessment/context/:userId", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(services.assessment.buildInternalContext(req.params.userId));
  });

  router.get("/internal/assessment/dashboard/:userId", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(services.assessment.buildDashboard(req.params.userId));
  });

  router.get("/internal/assessment/analytics", async (req) => {
    await services.ready;
    requireInternal(req, config.internalKey);
    return ok(services.assessment.buildAnalyticsSummary());
  });
}

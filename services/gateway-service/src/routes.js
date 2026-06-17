import { AppError } from "../../../shared/http/errors.js";
import { ok, readJson } from "../../../shared/http/response.js";
import {
  INTERNAL_KEY_HEADER,
  USER_CONTEXT_HEADERS,
  encodeUserContextHeader
} from "../../../shared/auth/userContext.js";

function buildInternalHeaders(config) {
  return {
    [INTERNAL_KEY_HEADER]: config.internalKey
  };
}

function buildUserHeaders(config, user) {
  return {
    ...buildInternalHeaders(config),
    [USER_CONTEXT_HEADERS.id]: user.id,
    [USER_CONTEXT_HEADERS.role]: user.role,
    [USER_CONTEXT_HEADERS.name]: encodeUserContextHeader(user.name)
  };
}

export function registerRoutes(router, config, services = {}) {
  router.get("/health", () => ok({
    service: config.serviceName,
    status: "up",
    time: new Date().toISOString()
  }));

  router.post("/api/auth/login", async (req) => {
    const body = await readJson(req);
    return services.identity.post("/api/auth/login", body);
  });

  router.get("/api/me", async (req) => {
    const user = await services.verifyUser(req);
    return ok({ user });
  });

  router.get("/api/courses", async (req) => {
    const user = await services.verifyUser(req);
    return services.learning.get("/api/courses", {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/goals", async (req) => {
    const user = await services.verifyUser(req);
    const body = await readJson(req);
    return services.learning.post("/api/goals", body, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/tasks", async (req) => {
    const user = await services.verifyUser(req);
    const body = await readJson(req);
    return services.learning.post("/api/tasks", body, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/tasks/:id/complete", async (req) => {
    const user = await services.verifyUser(req);
    return services.learning.patch(`/api/tasks/${encodeURIComponent(req.params.id)}/complete`, undefined, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/notes", async (req) => {
    const user = await services.verifyUser(req);
    const body = await readJson(req);
    return services.learning.post("/api/notes", body, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/dashboard", async (req) => {
    const user = await services.verifyUser(req);
    const [learningDashboard, assessmentDashboard, identityUsers, activityLogs, providerHealth, analyticsOverview] = await Promise.allSettled([
      services.learning.get("/api/dashboard/learning", {
        headers: buildUserHeaders(config, user)
      }),
      services.assessment.get(`/internal/assessment/dashboard/${encodeURIComponent(user.id)}`, {
        headers: buildInternalHeaders(config)
      }),
      services.identity.get("/internal/users", {
        headers: buildInternalHeaders(config)
      }),
      services.collaboration.get("/api/activity?limit=20", {
        headers: buildUserHeaders(config, user)
      }),
      services.ai.get("/internal/ai/provider-health", {
        headers: buildInternalHeaders(config)
      }),
      services.analytics.get("/api/analytics/overview", {
        headers: buildUserHeaders(config, user)
      })
    ]);

    if (
      learningDashboard.status !== "fulfilled"
      || assessmentDashboard.status !== "fulfilled"
      || identityUsers.status !== "fulfilled"
      || activityLogs.status !== "fulfilled"
      || providerHealth.status !== "fulfilled"
    ) {
      throw new AppError("Dashboard 聚合失败。", 502, "DOWNSTREAM_ERROR");
    }

    return ok({
      ...learningDashboard.value.data,
      assignments: assessmentDashboard.value.data.assignments || [],
      practice: assessmentDashboard.value.data.practice || { activeSessions: 0, mistakeCount: 0 },
      metrics: {
        ...(learningDashboard.value.data.metrics || {}),
        ...(assessmentDashboard.value.data.metrics || {})
      },
      users: identityUsers.value.data.users || [],
      activity: activityLogs.value.data || [],
      analytics: analyticsOverview.status === "fulfilled" ? analyticsOverview.value.data : null
    }, {
      provider: providerHealth.value.data.provider,
      analyticsStatus: analyticsOverview.status === "fulfilled" ? "up" : "down"
    });
  });

  router.post("/api/ai/ask", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/ai/ask", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/ai/plan", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/ai/plan", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/ai/summarize", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/ai/summarize", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/messages", async (req) => {
    const user = await services.verifyUser(req);
    const roomId = req.query.roomId ? `?roomId=${encodeURIComponent(req.query.roomId)}` : "";
    return services.collaboration.get(`/api/collaboration/messages${roomId}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/collaboration/messages", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.post("/api/collaboration/messages", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/activity", async (req) => {
    const user = await services.verifyUser(req);
    const limit = req.query.limit ? `?limit=${encodeURIComponent(req.query.limit)}` : "";
    return services.collaboration.get(`/api/activity${limit}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/events", async (req, res) => {
    const user = await services.verifyUser(req);
    await services.proxySse(req, res, {
      baseUrl: services.serviceMap.get("collaboration-service"),
      path: "/api/events",
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/assignments", async (req) => {
    const user = await services.verifyUser(req);
    const params = new URLSearchParams(req.query).toString();
    return services.assessment.get(`/api/assignments${params ? `?${params}` : ""}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/assignments", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post("/api/assignments", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/assignments/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.patch(`/api/assignments/${encodeURIComponent(req.params.id)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.delete("/api/assignments/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.delete(`/api/assignments/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/assignments/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(`/api/assignments/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/assignments/:id/submissions", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post(`/api/assignments/${encodeURIComponent(req.params.id)}/submissions`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/submissions/:id/grade", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post(`/api/submissions/${encodeURIComponent(req.params.id)}/grade`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/submissions/:id/ai-review", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post(`/api/submissions/${encodeURIComponent(req.params.id)}/ai-review`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/rubrics", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post("/api/rubrics", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/rubrics", async (req) => {
    const user = await services.verifyUser(req);
    const params = new URLSearchParams(req.query).toString();
    return services.assessment.get(`/api/rubrics${params ? `?${params}` : ""}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/question-banks", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post("/api/question-banks", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/question-banks", async (req) => {
    const user = await services.verifyUser(req);
    const params = new URLSearchParams(req.query).toString();
    return services.assessment.get(`/api/question-banks${params ? `?${params}` : ""}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/question-banks/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.patch(`/api/question-banks/${encodeURIComponent(req.params.id)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.delete("/api/question-banks/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.delete(`/api/question-banks/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/questions", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post("/api/questions", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/questions", async (req) => {
    const user = await services.verifyUser(req);
    const params = new URLSearchParams(req.query).toString();
    return services.assessment.get(`/api/questions${params ? `?${params}` : ""}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/questions/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.patch(`/api/questions/${encodeURIComponent(req.params.id)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.delete("/api/questions/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.delete(`/api/questions/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/practice-sessions", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post("/api/practice-sessions", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/practice-sessions", async (req) => {
    const user = await services.verifyUser(req);
    const params = new URLSearchParams(req.query).toString();
    return services.assessment.get(`/api/practice-sessions${params ? `?${params}` : ""}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/practice-sessions/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(`/api/practice-sessions/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/practice-sessions/:id/answers", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post(`/api/practice-sessions/${encodeURIComponent(req.params.id)}/answers`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/practice-sessions/:id/finish", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post(`/api/practice-sessions/${encodeURIComponent(req.params.id)}/finish`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/mistakes", async (req) => {
    const user = await services.verifyUser(req);
    const params = new URLSearchParams(req.query).toString();
    return services.assessment.get(`/api/mistakes${params ? `?${params}` : ""}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/mistakes/:id/review", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.patch(`/api/mistakes/${encodeURIComponent(req.params.id)}/review`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/knowledge/summary", async (req) => {
    const user = await services.verifyUser(req);
    return services.knowledge.get("/api/knowledge/summary", {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/knowledge/concepts", async (req) => {
    const user = await services.verifyUser(req);
    const params = new URLSearchParams(req.query).toString();
    return services.knowledge.get(`/api/knowledge/concepts${params ? `?${params}` : ""}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/knowledge/concepts/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.knowledge.get(`/api/knowledge/concepts/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/knowledge/search", async (req) => {
    const user = await services.verifyUser(req);
    const params = new URLSearchParams(req.query).toString();
    return services.knowledge.get(`/api/knowledge/search${params ? `?${params}` : ""}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/knowledge/graph", async (req) => {
    const user = await services.verifyUser(req);
    const params = new URLSearchParams(req.query).toString();
    return services.knowledge.get(`/api/knowledge/graph${params ? `?${params}` : ""}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/knowledge/recommendations", async (req) => {
    const user = await services.verifyUser(req);
    const params = new URLSearchParams(req.query).toString();
    return services.knowledge.get(`/api/knowledge/recommendations${params ? `?${params}` : ""}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/knowledge/ai-context", async (req) => {
    const user = await services.verifyUser(req);
    return services.knowledge.post("/api/knowledge/ai-context", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/knowledge/learning-path", async (req) => {
    const user = await services.verifyUser(req);
    return services.knowledge.post("/api/knowledge/learning-path", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/knowledge/practice-set", async (req) => {
    const user = await services.verifyUser(req);
    return services.knowledge.post("/api/knowledge/practice-set", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/analytics/overview", async (req) => {
    const user = await services.verifyUser(req);
    return services.analytics.get("/api/analytics/overview", {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/analytics/courses/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.analytics.get(`/api/analytics/courses/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/analytics/students/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.analytics.get(`/api/analytics/students/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/analytics/teacher", async (req) => {
    const user = await services.verifyUser(req);
    return services.analytics.get("/api/analytics/teacher", {
      headers: buildUserHeaders(config, user)
    });
  });
}

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

function withQuery(path, query) {
  const params = new URLSearchParams(query).toString();
  return `${path}${params ? `?${params}` : ""}`;
}

function teacherAiCommentaryExport(draft, body = {}) {
  const payload = draft.structuredPayload || {};
  const title = body.title || draft.title || "教师 AI 草稿";
  const lines = [
    `# ${title}`,
    "",
    draft.summary || "",
    "",
    draft.body || "",
    ""
  ];
  const actions = Array.isArray(payload.actions) ? payload.actions : [];
  if (actions.length) {
    lines.push("## 建议动作", "");
    for (const item of actions) {
      lines.push(`- ${item.label || item.title || item.type || "待确认动作"}`);
    }
    lines.push("");
  }
  return {
    report: {
      id: `teacher_ai_${draft.id}`,
      type: draft.type,
      title,
      generatedAt: draft.updatedAt || draft.createdAt,
      summary: draft.summary || "",
      sections: [
        {
          title: "草稿正文",
          body: draft.body || "",
          items: []
        }
      ],
      recommendations: actions.map((item) => item.label || item.title || item.type || "待确认动作"),
      evidence: draft.sourceEvidenceIds || []
    },
    export: {
      filename: `${draft.type}-${draft.id}.md`,
      contentType: "text/markdown",
      format: "markdown",
      body: lines.join("\n").trim()
    }
  };
}

function teacherAiPracticePlanPayload(draft, body = {}) {
  const payload = draft.structuredPayload || {};
  const detail = payload.payload || {};
  const practiceItems = Array.isArray(payload.practiceItems) ? payload.practiceItems : [];
  const weakConcepts = Array.isArray(payload.weakConcepts) ? payload.weakConcepts : [];
  return {
    ownerId: body.studentId || draft.studentId || null,
    courseId: body.courseId || draft.courseId || payload.courseId || detail.courseId || null,
    bankId: body.bankId || payload.bankId || detail.bankId || null,
    targetCount: Number(body.questionCount || payload.questionCount || detail.questionCount || practiceItems.length || 0),
    selectedCount: practiceItems.length,
    estimatedMinutes: Number(payload.estimatedMinutes || practiceItems.length * 6 || 0),
    weakConcepts: weakConcepts.map((item) => ({
      concept: item.concept || item.title || "未命名知识点",
      priority: item.priority || "medium",
      reason: item.reason || ""
    })),
    strategy: payload.strategy || draft.summary || "已生成课程补练草稿。",
    questions: practiceItems.map((item, index) => ({
      id: item.id || `${draft.id}_practice_${index + 1}`,
      stem: item.stem || item.title || item.prompt || "补练题目",
      concept: item.concept || item.title || "未命名知识点",
      difficulty: item.difficulty || "medium",
      reason: item.reason || item.note || "用于巩固当前薄弱点"
    })),
    sourceDraftId: draft.id
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

  router.get("/api/identity/users", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.get(withQuery("/api/identity/users", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/identity/users/:id/profile", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.get(`/api/identity/users/${encodeURIComponent(req.params.id)}/profile`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/identity/users/:id/profile", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.patch(`/api/identity/users/${encodeURIComponent(req.params.id)}/profile`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/classes", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.get(withQuery("/api/classes", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/classes", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.post("/api/classes", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/classes/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.get(`/api/classes/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/classes/:id/students", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.post(`/api/classes/${encodeURIComponent(req.params.id)}/students`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/classes/:id/teachers", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.post(`/api/classes/${encodeURIComponent(req.params.id)}/teachers`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/groups", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.get(withQuery("/api/groups", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/groups", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.post("/api/groups", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/groups/:id/members", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.post(`/api/groups/${encodeURIComponent(req.params.id)}/members`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/role-permissions", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.get("/api/role-permissions", {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/admin/identity-dashboard", async (req) => {
    const user = await services.verifyUser(req);
    return services.identity.get("/api/admin/identity-dashboard", {
      headers: buildUserHeaders(config, user)
    });
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

  router.get("/api/notes", async (req) => {
    const user = await services.verifyUser(req);
    return services.learning.get(withQuery("/api/notes", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/notes/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.learning.get(`/api/notes/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/notes/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.learning.patch(`/api/notes/${encodeURIComponent(req.params.id)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.delete("/api/notes/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.learning.delete(`/api/notes/${encodeURIComponent(req.params.id)}`, {
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

  router.post("/api/student-ai/daily-plan", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/student-ai/daily-plan", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/student-ai/weakness-insight", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/student-ai/weakness-insight", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/student-ai/task-drafts", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/student-ai/task-drafts", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/student-ai/assignment-guide", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/student-ai/assignment-guide", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/student-ai/submission-check", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/student-ai/submission-check", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/student-ai/note-organize", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/student-ai/note-organize", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/student-ai/results", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.get(withQuery("/api/student-ai/results", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/student-ai/results/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.get(`/api/student-ai/results/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/student-ai/results/:id/actions/:actionId", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.patch(`/api/student-ai/results/${encodeURIComponent(req.params.id)}/actions/${encodeURIComponent(req.params.actionId)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/student-ai/timeline", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.get(withQuery("/api/student-ai/timeline", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/student-ai/task-drafts", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.get("/api/student-ai/task-drafts", {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/student-ai/task-drafts/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.patch(`/api/student-ai/task-drafts/${encodeURIComponent(req.params.id)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.delete("/api/student-ai/task-drafts/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.delete(`/api/student-ai/task-drafts/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/student-ai/task-drafts/:id/confirm", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post(`/api/student-ai/task-drafts/${encodeURIComponent(req.params.id)}/confirm`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/note-organize-results", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.get("/api/note-organize-results", {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/note-organize-results/:id/save-note", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post(`/api/note-organize-results/${encodeURIComponent(req.params.id)}/save-note`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/teacher/students/:id/ai-results", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.get(withQuery(`/api/teacher/students/${encodeURIComponent(req.params.id)}/ai-results`, req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/teacher/students/:id/ai-timeline", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.get(withQuery(`/api/teacher/students/${encodeURIComponent(req.params.id)}/ai-timeline`, req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/teacher-ai/teaching-plan", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/teacher-ai/teaching-plan", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/teacher-ai/student-intervention", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/teacher-ai/student-intervention", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/teacher-ai/assignment-commentary", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/teacher-ai/assignment-commentary", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/teacher-ai/feedback-draft", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/teacher-ai/feedback-draft", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/teacher-ai/course-practice-plan", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/teacher-ai/course-practice-plan", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/teacher-ai/report-summary", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.post("/api/teacher-ai/report-summary", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/teacher-ai/results", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.get(withQuery("/api/teacher-ai/results", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/teacher-ai/results/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.get(`/api/teacher-ai/results/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/teacher-ai/results/:id/actions/:actionId", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.patch(`/api/teacher-ai/results/${encodeURIComponent(req.params.id)}/actions/${encodeURIComponent(req.params.actionId)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/teacher-ai/drafts", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.get(withQuery("/api/teacher-ai/drafts", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/teacher-ai/drafts/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.get(`/api/teacher-ai/drafts/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/teacher-ai/drafts/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.patch(`/api/teacher-ai/drafts/${encodeURIComponent(req.params.id)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.delete("/api/teacher-ai/drafts/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.ai.delete(`/api/teacher-ai/drafts/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/teacher-ai/drafts/:id/send-intervention", async (req) => {
    const user = await services.verifyUser(req);
    const body = await readJson(req);
    const draftResult = await services.ai.post(`/api/teacher-ai/drafts/${encodeURIComponent(req.params.id)}/send-intervention`, body, {
      headers: buildUserHeaders(config, user)
    });
    const draft = draftResult.data;
    const payload = draft.structuredPayload || {};
    const recipientId = body.studentId || draft.studentId || payload.studentId;
    if (!recipientId) {
      throw new AppError("Teacher AI draft is missing studentId.", 400, "VALIDATION_ERROR");
    }
    const message = body.message || payload.message || draft.body || "请优先处理当前最关键的一项学习行动。";
    const reason = body.reason || draft.summary || payload.summary || "教师基于学生 AI 过程证据发起干预。";
    const courseId = body.courseId || draft.courseId || payload.courseId || null;
    const dueAt = body.dueAt || payload.dueAt || null;
    const channels = body.channels || payload.channels || ["in_app"];
    const notification = await services.notification.post("/api/notifications", {
      recipientId,
      title: draft.title || "教师干预建议",
      body: message,
      type: "teacher.intervention",
      category: "system",
      severity: "warning",
      channels,
      data: { reason, courseId, dueAt, teacherAiDraftId: draft.id }
    }, {
      headers: buildUserHeaders(config, user)
    });
    let reminder = null;
    if (dueAt) {
      reminder = await services.scheduler.post("/api/scheduler/reminders", {
        ownerId: recipientId,
        createdBy: user.id,
        courseId,
        title: draft.title || "教师干预提醒",
        message,
        targetType: "teacher_intervention",
        targetId: notification.data.id,
        dueAt,
        channels,
        severity: "warning",
        metadata: { reason, teacherAiDraftId: draft.id }
      }, {
        headers: buildUserHeaders(config, user)
      });
    }
    return ok({
      draft,
      notification: notification.data,
      reminder: reminder?.data || null
    });
  });

  router.post("/api/teacher-ai/drafts/:id/save-feedback", async (req) => {
    const user = await services.verifyUser(req);
    const body = await readJson(req);
    const draftResult = await services.ai.post(`/api/teacher-ai/drafts/${encodeURIComponent(req.params.id)}/save-feedback`, body, {
      headers: buildUserHeaders(config, user)
    });
    const draft = draftResult.data;
    const payload = draft.structuredPayload || {};
    const submissionId = body.submissionId || draft.submissionId || payload.submissionId;
    if (!submissionId) {
      throw new AppError("Teacher AI feedback draft is missing submissionId.", 400, "VALIDATION_ERROR");
    }
    const feedbackResult = await services.assessment.post(`/api/submissions/${encodeURIComponent(submissionId)}/teacher-feedback`, {
      score: body.score ?? payload.scoreSuggestion ?? payload.payload?.scoreSuggestion ?? payload.suggestedScore ?? 0,
      summary: body.summary || draft.summary || payload.summary || draft.body || "",
      feedback: body.feedback || draft.body || payload.body || draft.summary || "",
      criteriaScores: body.criteriaScores || payload.criteriaScores || payload.criteriaFeedback || payload.payload?.criteriaScores || [],
      provider: "teacher-ai-draft"
    }, {
      headers: buildUserHeaders(config, user)
    });
    return ok({
      draft,
      savedFeedback: feedbackResult.data
    });
  });

  router.post("/api/teacher-ai/drafts/:id/save-commentary", async (req) => {
    const user = await services.verifyUser(req);
    const body = await readJson(req);
    const draftResult = await services.ai.post(`/api/teacher-ai/drafts/${encodeURIComponent(req.params.id)}/save-commentary`, body, {
      headers: buildUserHeaders(config, user)
    });
    return ok({
      draft: draftResult.data,
      savedCommentary: teacherAiCommentaryExport(draftResult.data, body)
    });
  });

  router.post("/api/teacher-ai/drafts/:id/save-practice-plan", async (req) => {
    const user = await services.verifyUser(req);
    const body = await readJson(req);
    const draftResult = await services.ai.post(`/api/teacher-ai/drafts/${encodeURIComponent(req.params.id)}/save-practice-plan`, body, {
      headers: buildUserHeaders(config, user)
    });
    const draft = draftResult.data;
    const payload = draft.structuredPayload || {};
    const detail = payload.payload || {};
    const courseId = body.courseId || draft.courseId || payload.courseId || detail.courseId;
    if (!courseId) {
      throw new AppError("Teacher AI practice draft is missing courseId.", 400, "VALIDATION_ERROR");
    }
    const practicePlanResult = await services.assessment.post("/api/adaptive-practice-plan", {
      courseId,
      studentId: body.studentId || draft.studentId || null,
      bankId: body.bankId || payload.bankId || detail.bankId || null,
      questionCount: body.questionCount || payload.questionCount || detail.questionCount || 6
    }, {
      headers: buildUserHeaders(config, user)
    });
    const savedPracticePlan = {
      ...practicePlanResult.data,
      strategy: draft.summary || practicePlanResult.data.strategy,
      teacherAiDraftId: draft.id,
      teacherAiBody: draft.body || ""
    };
    return ok({
      draft,
      savedPracticePlan: savedPracticePlan.questions?.length ? savedPracticePlan : teacherAiPracticePlanPayload(draft, body)
    });
  });

  router.post("/api/teacher/students/:id/interventions", async (req) => {
    const user = await services.verifyUser(req);
    const body = await readJson(req);
    const studentId = req.params.id;
    const reason = body.reason || "教师根据学生 AI 过程证据发起干预。";
    const message = body.message || "建议优先根据 AI 自检和学习时间线补齐薄弱环节。";
    const courseId = body.courseId || null;
    const dueAt = body.dueAt || null;
    const notification = await services.notification.post("/api/notifications", {
      recipientId: studentId,
      title: "教师干预建议",
      body: message,
      type: "teacher.intervention",
      category: "system",
      severity: "warning",
      channels: body.channels || ["in_app"],
      data: { reason, courseId, dueAt }
    }, {
      headers: buildUserHeaders(config, user)
    });
    let reminder = null;
    if (dueAt) {
      reminder = await services.scheduler.post("/api/scheduler/reminders", {
        ownerId: studentId,
        createdBy: user.id,
        courseId,
        title: "教师干预提醒",
        message,
        targetType: "teacher_intervention",
        targetId: notification.data.id,
        dueAt,
        channels: body.channels || ["in_app"],
        severity: "warning",
        metadata: { reason }
      }, {
        headers: buildUserHeaders(config, user)
      });
    }
    return ok({
      studentId,
      reason,
      message,
      notification: notification.data,
      reminder: reminder?.data || null
    });
  });

  router.get("/api/collaboration/messages", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(withQuery("/api/collaboration/messages", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/collaboration/messages", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.post("/api/collaboration/messages", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/rooms", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(withQuery("/api/collaboration/rooms", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/collaboration/rooms", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.post("/api/collaboration/rooms", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/rooms/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(`/api/collaboration/rooms/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/collaboration/rooms/:id/members", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.post(`/api/collaboration/rooms/${encodeURIComponent(req.params.id)}/members`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/rooms/:id/tasks", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(withQuery(`/api/collaboration/rooms/${encodeURIComponent(req.params.id)}/tasks`, req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/collaboration/messages/:id/replies", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.post(`/api/collaboration/messages/${encodeURIComponent(req.params.id)}/replies`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/mentions", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(withQuery("/api/collaboration/mentions", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/collaboration/mentions/:id/read", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.patch(`/api/collaboration/mentions/${encodeURIComponent(req.params.id)}/read`, undefined, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/tasks", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(withQuery("/api/collaboration/tasks", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/collaboration/tasks", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.post("/api/collaboration/tasks", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/collaboration/tasks/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.patch(`/api/collaboration/tasks/${encodeURIComponent(req.params.id)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/collaboration/summaries", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.post("/api/collaboration/summaries", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/rooms/:id/insight", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(`/api/collaboration/rooms/${encodeURIComponent(req.params.id)}/insight`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/decisions", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(withQuery("/api/collaboration/decisions", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/collaboration/decisions", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.post("/api/collaboration/decisions", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/resources", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(withQuery("/api/collaboration/resources", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/collaboration/resources", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.post("/api/collaboration/resources", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/checklist", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(withQuery("/api/collaboration/checklist", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/collaboration/checklist", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.post("/api/collaboration/checklist", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/collaboration/checklist/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.patch(`/api/collaboration/checklist/${encodeURIComponent(req.params.id)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/handoffs", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(withQuery("/api/collaboration/handoffs", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/collaboration/handoffs", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.post("/api/collaboration/handoffs", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/collaboration/handoffs/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.patch(`/api/collaboration/handoffs/${encodeURIComponent(req.params.id)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/collaboration/audit", async (req) => {
    const user = await services.verifyUser(req);
    return services.collaboration.get(withQuery("/api/collaboration/audit", req.query), {
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

  router.get("/api/assignments/:id/grading-overview", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(`/api/assignments/${encodeURIComponent(req.params.id)}/grading-overview`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/assignments/:id/submissions", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post(`/api/assignments/${encodeURIComponent(req.params.id)}/submissions`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/assignment-submission-drafts", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(withQuery("/api/assignment-submission-drafts", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/assignment-submission-drafts", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post("/api/assignment-submission-drafts", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/assignment-submission-drafts/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.patch(`/api/assignment-submission-drafts/${encodeURIComponent(req.params.id)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.delete("/api/assignment-submission-drafts/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.delete(`/api/assignment-submission-drafts/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/assignment-submission-drafts/:id/submit", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post(`/api/assignment-submission-drafts/${encodeURIComponent(req.params.id)}/submit`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/uploads", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post("/api/uploads", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/uploads/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(`/api/uploads/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.delete("/api/uploads/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.delete(`/api/uploads/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/submissions/:id/grade", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post(`/api/submissions/${encodeURIComponent(req.params.id)}/grade`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/submissions/:id/teacher-feedback", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post(`/api/submissions/${encodeURIComponent(req.params.id)}/teacher-feedback`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/submissions/:id/ai-review", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post(`/api/submissions/${encodeURIComponent(req.params.id)}/ai-review`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/submissions/:id/grading-insight", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(`/api/submissions/${encodeURIComponent(req.params.id)}/grading-insight`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/assignments/:id/student-ai-evidence", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(`/api/assignments/${encodeURIComponent(req.params.id)}/student-ai-evidence`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/submissions/:id/student-ai-evidence", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(`/api/submissions/${encodeURIComponent(req.params.id)}/student-ai-evidence`, {
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

  router.get("/api/rubrics/:id/insight", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(`/api/rubrics/${encodeURIComponent(req.params.id)}/insight`, {
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

  router.get("/api/practice-sessions/:id/review", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(`/api/practice-sessions/${encodeURIComponent(req.params.id)}/review`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/adaptive-practice-plan", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.post("/api/adaptive-practice-plan", await readJson(req), {
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

  router.get("/api/mistake-analysis", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(withQuery("/api/mistake-analysis", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/mistakes/:id/analysis", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(`/api/mistakes/${encodeURIComponent(req.params.id)}/analysis`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/assessment/course-report", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(withQuery("/api/assessment/course-report", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/assessment/student-portfolio", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(withQuery("/api/assessment/student-portfolio", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/assessment/student-portfolio/deep", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(withQuery("/api/assessment/student-portfolio/deep", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/assessment/student-portfolio/evidence-map", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(withQuery("/api/assessment/student-portfolio/evidence-map", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/assessment/student-portfolio/intervention-plan", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(withQuery("/api/assessment/student-portfolio/intervention-plan", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/assessment/portfolio-board", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(withQuery("/api/assessment/portfolio-board", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/assessment/risk-register", async (req) => {
    const user = await services.verifyUser(req);
    return services.assessment.get(withQuery("/api/assessment/risk-register", req.query), {
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

  router.get("/api/notifications", async (req) => {
    const user = await services.verifyUser(req);
    return services.notification.get(withQuery("/api/notifications", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/notifications", async (req) => {
    const user = await services.verifyUser(req);
    return services.notification.post("/api/notifications", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/notifications/bulk", async (req) => {
    const user = await services.verifyUser(req);
    return services.notification.post("/api/notifications/bulk", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/notifications/summary", async (req) => {
    const user = await services.verifyUser(req);
    return services.notification.get(withQuery("/api/notifications/summary", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/notification-preferences", async (req) => {
    const user = await services.verifyUser(req);
    return services.notification.get("/api/notification-preferences", {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/notification-preferences", async (req) => {
    const user = await services.verifyUser(req);
    return services.notification.patch("/api/notification-preferences", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/notifications/read-all", async (req) => {
    const user = await services.verifyUser(req);
    return services.notification.patch("/api/notifications/read-all", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/notifications/:id/read", async (req) => {
    const user = await services.verifyUser(req);
    return services.notification.patch(`/api/notifications/${encodeURIComponent(req.params.id)}/read`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/notifications/:id/dismiss", async (req) => {
    const user = await services.verifyUser(req);
    return services.notification.patch(`/api/notifications/${encodeURIComponent(req.params.id)}/dismiss`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/scheduler/reminders", async (req) => {
    const user = await services.verifyUser(req);
    return services.scheduler.get(withQuery("/api/scheduler/reminders", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/scheduler/reminders", async (req) => {
    const user = await services.verifyUser(req);
    return services.scheduler.post("/api/scheduler/reminders", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.patch("/api/scheduler/reminders/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.scheduler.patch(`/api/scheduler/reminders/${encodeURIComponent(req.params.id)}`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/scheduler/due-preview", async (req) => {
    const user = await services.verifyUser(req);
    return services.scheduler.get(withQuery("/api/scheduler/due-preview", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/scheduler/run-due", async (req) => {
    const user = await services.verifyUser(req);
    return services.scheduler.post("/api/scheduler/run-due", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/scheduler/timeline", async (req) => {
    const user = await services.verifyUser(req);
    return services.scheduler.get(withQuery("/api/scheduler/timeline", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/scheduler/dashboard", async (req) => {
    const user = await services.verifyUser(req);
    return services.scheduler.get(withQuery("/api/scheduler/dashboard", req.query), {
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

  router.get("/api/analytics/funnel", async (req) => {
    const user = await services.verifyUser(req);
    return services.analytics.get(withQuery("/api/analytics/funnel", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/analytics/risk-board", async (req) => {
    const user = await services.verifyUser(req);
    return services.analytics.get(withQuery("/api/analytics/risk-board", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/analytics/courses/:id/deep-report", async (req) => {
    const user = await services.verifyUser(req);
    return services.analytics.get(`/api/analytics/courses/${encodeURIComponent(req.params.id)}/deep-report`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/analytics/students/:id/progress-report", async (req) => {
    const user = await services.verifyUser(req);
    return services.analytics.get(`/api/analytics/students/${encodeURIComponent(req.params.id)}/progress-report`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/analytics/engagement", async (req) => {
    const user = await services.verifyUser(req);
    return services.analytics.get(withQuery("/api/analytics/engagement", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/reports/catalog", async (req) => {
    const user = await services.verifyUser(req);
    return services.reports.get("/api/reports/catalog", {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/reports/student-weekly", async (req) => {
    const user = await services.verifyUser(req);
    return services.reports.get(withQuery("/api/reports/student-weekly", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/reports/course-weekly", async (req) => {
    const user = await services.verifyUser(req);
    return services.reports.get(withQuery("/api/reports/course-weekly", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/reports/assignments/:id/grading", async (req) => {
    const user = await services.verifyUser(req);
    return services.reports.get(withQuery(`/api/reports/assignments/${encodeURIComponent(req.params.id)}/grading`, req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/reports/mistakes/review", async (req) => {
    const user = await services.verifyUser(req);
    return services.reports.get(withQuery("/api/reports/mistakes/review", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/reports/ai-usage", async (req) => {
    const user = await services.verifyUser(req);
    return services.reports.get(withQuery("/api/reports/ai-usage", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/operations/catalog", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.get("/api/operations/catalog", {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/operations/dashboard", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.get(withQuery("/api/operations/dashboard", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/operations/imports", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.get(withQuery("/api/operations/imports", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/operations/imports/preview", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.post("/api/operations/imports/preview", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/operations/imports/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.get(`/api/operations/imports/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/operations/imports/:id/commit", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.post(`/api/operations/imports/${encodeURIComponent(req.params.id)}/commit`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/operations/batch-jobs", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.get(withQuery("/api/operations/batch-jobs", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/operations/batch-jobs", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.post("/api/operations/batch-jobs", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/operations/batch-jobs/:id", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.get(`/api/operations/batch-jobs/${encodeURIComponent(req.params.id)}`, {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/operations/batch-jobs/:id/run", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.post(`/api/operations/batch-jobs/${encodeURIComponent(req.params.id)}/run`, await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/operations/audit", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.get(withQuery("/api/operations/audit", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.post("/api/operations/audit", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.post("/api/operations/audit", await readJson(req), {
      headers: buildUserHeaders(config, user)
    });
  });

  router.get("/api/operations/audit/digest", async (req) => {
    const user = await services.verifyUser(req);
    return services.operations.get(withQuery("/api/operations/audit/digest", req.query), {
      headers: buildUserHeaders(config, user)
    });
  });
}

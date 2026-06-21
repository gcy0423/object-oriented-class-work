function compactContext(user, input = {}) {
  return {
    user: {
      id: user?.id || "",
      role: user?.role || "",
      name: user?.name || ""
    },
    route: input.route || "",
    courseId: input.courseId || "",
    studentId: input.studentId || "",
    assignmentId: input.assignmentId || "",
    submissionId: input.submissionId || "",
    metrics: input.metrics || {},
    risks: (input.risks || []).slice(0, 6),
    evidence: (input.evidence || []).slice(0, 8),
    students: (input.students || []).slice(0, 6),
    submissions: (input.submissions || []).slice(0, 6),
    concepts: (input.concepts || []).slice(0, 6),
    report: input.report || null,
    request: input.request || ""
  };
}

function buildPrompt(task, schemaName, user, input = {}) {
  return [
    "你是 EduMind 教师端 AI workflow 服务。",
    `task=${task}`,
    `schema=${schemaName}`,
    "只返回一个合法 JSON object，不要返回 markdown，不要返回 HTML。",
    "所有 action 必须有稳定 type、route、label。",
    "所有 draft 都必须保留教师最终确认权，不能默认自动发送或自动评分。",
    `context=${JSON.stringify(compactContext(user, input))}`
  ].join("\n");
}

export function buildTeachingPlanPrompt(user, input = {}) {
  return buildPrompt("teaching_plan", "teacher_ai_result", user, input);
}

export function buildStudentInterventionPrompt(user, input = {}) {
  return buildPrompt("student_intervention", "teacher_ai_result", user, input);
}

export function buildAssignmentCommentaryPrompt(user, input = {}) {
  return buildPrompt("assignment_commentary", "teacher_ai_result", user, input);
}

export function buildFeedbackDraftPrompt(user, input = {}) {
  return buildPrompt("feedback_draft", "teacher_ai_result", user, input);
}

export function buildCoursePracticePlanPrompt(user, input = {}) {
  return buildPrompt("course_practice_plan", "teacher_ai_result", user, input);
}

export function buildReportSummaryPrompt(user, input = {}) {
  return buildPrompt("report_summary", "teacher_ai_result", user, input);
}

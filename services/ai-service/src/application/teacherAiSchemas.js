function asText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeAction(item, index) {
  return {
    id: asText(item?.id, `action_${index + 1}`),
    label: asText(item?.label, `Action ${index + 1}`),
    route: asText(item?.route, "teacher-home"),
    type: asText(item?.type, "navigate"),
    kind: asText(item?.kind, "navigate"),
    status: asText(item?.status, "open"),
    note: asText(item?.note, "")
  };
}

function normalizeDraft(type, draft = {}, fallback = {}) {
  return {
    type: asText(draft?.type, type),
    title: asText(draft?.title, fallback.title || "教师 AI 草稿"),
    summary: asText(draft?.summary, fallback.summary || ""),
    body: asText(draft?.body, fallback.body || ""),
    message: asText(draft?.message, fallback.message || ""),
    courseId: draft?.courseId || fallback.courseId || null,
    studentId: draft?.studentId || fallback.studentId || null,
    assignmentId: draft?.assignmentId || fallback.assignmentId || null,
    submissionId: draft?.submissionId || fallback.submissionId || null,
    dueAt: draft?.dueAt || fallback.dueAt || null,
    channels: asArray(draft?.channels).length ? asArray(draft.channels) : asArray(fallback.channels),
    payload: draft?.payload && typeof draft.payload === "object" ? draft.payload : (fallback.payload || {})
  };
}

function normalizeResult(type, value, fallback = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    type,
    summary: asText(source.summary, fallback.summary || ""),
    actions: asArray(source.actions).map(normalizeAction),
    risks: asArray(source.risks).map((item) => asText(item)).filter(Boolean),
    evidence: asArray(source.evidence).map((item) => asText(item)).filter(Boolean),
    draft: normalizeDraft(type, source.draft, fallback.draft || {}),
    provider: asText(source.provider, fallback.provider || "fallback"),
    generatedAt: source.generatedAt || fallback.generatedAt || new Date().toISOString(),
    rawText: asText(source.rawText, fallback.rawText || "")
  };
}

export function normalizeTeachingPlan(value, fallback = {}) {
  return normalizeResult("teaching_plan", value, fallback);
}

export function normalizeStudentIntervention(value, fallback = {}) {
  return normalizeResult("student_intervention", value, fallback);
}

export function normalizeAssignmentCommentary(value, fallback = {}) {
  return normalizeResult("assignment_commentary", value, fallback);
}

export function normalizeFeedbackDraft(value, fallback = {}) {
  return normalizeResult("feedback_draft", value, fallback);
}

export function normalizeCoursePracticePlan(value, fallback = {}) {
  return normalizeResult("course_practice_plan", value, fallback);
}

export function normalizeReportSummary(value, fallback = {}) {
  return normalizeResult("report_summary", value, fallback);
}

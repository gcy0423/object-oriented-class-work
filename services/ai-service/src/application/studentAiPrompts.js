function compactContext(user, input = {}) {
  return {
    user: {
      id: user?.id || "",
      role: user?.role || "",
      name: user?.name || ""
    },
    route: input.route || "",
    focus: input.focus || "",
    courseId: input.courseId || input.assignment?.courseId || input.note?.courseId || "",
    goalTitles: (input.goals || []).map((item) => item?.title || "").filter(Boolean).slice(0, 4),
    taskTitles: (input.tasks || []).map((item) => item?.title || "").filter(Boolean).slice(0, 6),
    assignmentTitles: (input.assignments || []).map((item) => item?.title || "").filter(Boolean).slice(0, 6),
    mistakeConcepts: (input.mistakes || []).map((item) => item?.question?.concept || item?.concept || item?.questionId || "").filter(Boolean).slice(0, 6),
    noteTitle: input.note?.title || input.noteDraft?.title || "",
    request: input.request || ""
  };
}

function buildPrompt(task, schemaName, user, input = {}) {
  return [
    "你是 EduMind 学生端 AI workflow 服务。",
    `task=${task}`,
    `schema=${schemaName}`,
    "只返回一个合法 JSON object，不要返回 markdown，不要返回 HTML。",
    "所有 action 必须有稳定 type 和 route。",
    `context=${JSON.stringify(compactContext(user, input))}`
  ].join("\n");
}

export function buildDailyPlanPrompt(user, input = {}) {
  return buildPrompt("daily_plan", "daily_plan", user, input);
}

export function buildWeaknessInsightPrompt(user, input = {}) {
  return buildPrompt("weakness_insight", "weakness_insight", user, input);
}

export function buildTaskDraftPrompt(user, input = {}) {
  return buildPrompt("task_draft", "task_draft", user, input);
}

export function buildAssignmentGuidePrompt(user, input = {}) {
  return buildPrompt("assignment_guide", "assignment_guide", user, input);
}

export function buildSubmissionCheckPrompt(user, input = {}) {
  return buildPrompt("submission_check", "submission_check", user, input);
}

export function buildNoteOrganizePrompt(user, input = {}) {
  return buildPrompt("note_organize", "note_organize", user, input);
}

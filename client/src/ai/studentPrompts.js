function compactContext(context = {}) {
  return {
    route: context.route,
    userName: context.user?.name || "",
    goalTitles: (context.goals || []).map((item) => item.title).slice(0, 3),
    taskTitles: (context.tasks || []).map((item) => item.title).slice(0, 5),
    assignmentTitles: (context.assignments || []).map((item) => item.title).slice(0, 5),
    mistakeConcepts: (context.mistakes || []).map((item) => item.question?.concept || item.concept || item.questionId).slice(0, 5)
  };
}

function makePrompt(name, context, schemaName, extra = "") {
  return [
    `system: 你是 EduMind 学生端 AI adapter 的 fallback 结构化输出器。`,
    `task: ${name}`,
    `schema: ${schemaName}`,
    `rule: 只输出 JSON object，不输出 markdown。`,
    `context: ${JSON.stringify(compactContext(context))}`,
    extra
  ].filter(Boolean).join("\n");
}

export function dailyPlanPrompt(context) {
  return makePrompt("build_daily_plan", context, "dailyPlan");
}

export function weaknessInsightPrompt(context) {
  return makePrompt("build_weakness_insight", context, "weaknessInsight");
}

export function taskDraftPrompt(context) {
  return makePrompt("draft_learning_task", context, "taskDraft");
}

export function assignmentGuidePrompt(context) {
  return makePrompt("guide_assignment", context, "assignmentGuide");
}

export function submissionCheckPrompt(context) {
  return makePrompt("check_submission_draft", context, "submissionCheck");
}

export function noteOrganizePrompt(context) {
  return makePrompt("organize_note", context, "noteOrganize");
}

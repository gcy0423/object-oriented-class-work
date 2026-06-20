function asText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function asTextArray(value, fallback = []) {
  if (!Array.isArray(value)) {
    return Array.isArray(fallback) ? fallback.map((item) => asText(item)).filter(Boolean) : [];
  }
  return value.map((item) => asText(item)).filter(Boolean);
}

function normalizeAction(item = {}, index = 0) {
  return {
    type: asText(item.type, `action_${index + 1}`),
    label: asText(item.label || item.title, "查看建议"),
    targetId: asText(item.targetId),
    route: asText(item.route, "student-ai"),
    priority: asText(item.priority, "medium"),
    reason: asText(item.reason || item.detail),
    detail: asText(item.detail || item.reason)
  };
}

function normalizeRisk(item = {}, index = 0) {
  if (typeof item === "string") {
    return {
      level: index === 0 ? "medium" : "low",
      title: item,
      evidence: ""
    };
  }
  return {
    level: asText(item.level, "medium"),
    title: asText(item.title || item.summary || `风险 ${index + 1}`),
    evidence: asText(item.evidence || item.reason)
  };
}

function normalizeQuestion(item = {}, index = 0) {
  if (typeof item === "string") {
    return { text: item };
  }
  return {
    text: asText(item.text || item.question, `问题 ${index + 1}`)
  };
}

function baseResult(type, raw, fallback = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const merged = {
    ...fallback,
    ...source
  };
  return {
    type,
    summary: asText(merged.summary),
    actions: Array.isArray(merged.actions) ? merged.actions.map(normalizeAction) : [],
    risks: Array.isArray(merged.risks) ? merged.risks.map(normalizeRisk) : [],
    evidence: asTextArray(merged.evidence),
    questions: Array.isArray(merged.questions) ? merged.questions.map(normalizeQuestion) : [],
    provider: asText(merged.provider, "fallback"),
    generatedAt: asText(merged.generatedAt, new Date().toISOString()),
    rawText: asText(merged.rawText)
  };
}

export function normalizeDailyPlan(raw, fallback = {}) {
  return baseResult("daily_plan", raw, fallback);
}

export function normalizeWeaknessInsight(raw, fallback = {}) {
  const result = baseResult("weakness_insight", raw, fallback);
  const source = raw && typeof raw === "object" ? raw : {};
  const fallbackWeaknesses = Array.isArray(fallback.weaknesses) ? fallback.weaknesses : [];
  result.weaknesses = (Array.isArray(source.weaknesses) ? source.weaknesses : fallbackWeaknesses).map((item, index) => ({
    concept: asText(item.concept || item.title, "薄弱点"),
    title: asText(item.title || item.concept, "薄弱点"),
    score: Number(item.score ?? 0),
    rank: Number(item.rank ?? index + 1),
    evidence: asTextArray(item.evidence),
    action: asText(item.action)
  }));
  return result;
}

export function normalizeTaskDraft(raw, fallback = {}) {
  const result = baseResult("task_draft", raw, fallback);
  const draft = (raw && typeof raw === "object" && raw.draft) || fallback.draft || {};
  result.draft = {
    title: asText(draft.title),
    type: asText(draft.type, "练习巩固"),
    courseId: asText(draft.courseId),
    goalId: asText(draft.goalId),
    estimateMinutes: Number(draft.estimateMinutes ?? 45),
    dueDate: asText(draft.dueDate),
    steps: asTextArray(draft.steps),
    doneDefinition: asTextArray(draft.doneDefinition),
    linkedAssignmentId: asText(draft.linkedAssignmentId)
  };
  return result;
}

export function normalizeAssignmentGuide(raw, fallback = {}) {
  const result = baseResult("assignment_guide", raw, fallback);
  const source = raw && typeof raw === "object" ? raw : {};
  result.outline = asTextArray(source.outline ?? fallback.outline);
  result.checklist = asTextArray(source.checklist ?? fallback.checklist);
  return result;
}

export function normalizeSubmissionCheck(raw, fallback = {}) {
  const result = baseResult("submission_check", raw, fallback);
  const source = raw && typeof raw === "object" ? raw : {};
  const fallbackIssues = Array.isArray(fallback.issues) ? fallback.issues : [];
  result.completionEstimate = Number(source.completionEstimate ?? fallback.completionEstimate ?? 0);
  result.issues = (Array.isArray(source.issues) ? source.issues : fallbackIssues).map((item, index) => {
    if (typeof item === "string") {
      return {
        level: "warning",
        title: item,
        suggestion: ""
      };
    }
    return {
      level: asText(item.level, "warning"),
      title: asText(item.title || `问题 ${index + 1}`),
      suggestion: asText(item.suggestion || item.detail)
    };
  });
  result.strengths = asTextArray(source.strengths ?? fallback.strengths);
  result.rewriteSuggestions = asTextArray(source.rewriteSuggestions ?? fallback.rewriteSuggestions);
  return result;
}

export function normalizeNoteOrganize(raw, fallback = {}) {
  const result = baseResult("note_organize", raw, fallback);
  const source = raw && typeof raw === "object" ? raw : {};
  const cards = Array.isArray(source.cards) ? source.cards : Array.isArray(fallback.cards) ? fallback.cards : [];
  result.cards = cards.map((item) => ({
    front: asText(item.front || item.question),
    back: asText(item.back || item.answer)
  }));
  result.assignmentParagraphs = asTextArray(source.assignmentParagraphs ?? fallback.assignmentParagraphs);
  return result;
}

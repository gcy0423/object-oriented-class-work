function arrayOfText(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeAction(item = {}, index = 0) {
  return {
    id: String(item.id || `action_${index + 1}`),
    label: String(item.label || item.title || "查看建议"),
    route: String(item.route || "student-ai"),
    kind: String(item.kind || "navigate"),
    detail: String(item.detail || item.description || ""),
    params: item.params && typeof item.params === "object" ? item.params : {}
  };
}

function normalizeQuestion(item = {}, index = 0) {
  return {
    id: String(item.id || `question_${index + 1}`),
    text: String(item.text || item.question || "我接下来应该先做什么？")
  };
}

function baseResult(type, raw = {}, fallback = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const actions = Array.isArray(source.actions) ? source.actions : [];
  const questions = Array.isArray(source.questions) ? source.questions : [];
  return {
    id: String(source.id || fallback.id || `local_${type}`),
    type,
    provider: String(source.provider || fallback.provider || "fallback"),
    generatedAt: String(source.generatedAt || source.createdAt || fallback.generatedAt || fallback.createdAt || new Date().toISOString()),
    createdAt: String(source.createdAt || source.generatedAt || fallback.createdAt || fallback.generatedAt || new Date().toISOString()),
    summary: String(source.summary || fallback.summary || ""),
    actions: actions.map(normalizeAction),
    risks: arrayOfText(source.risks ?? fallback.risks),
    evidence: arrayOfText(source.evidence ?? fallback.evidence),
    questions: questions.map(normalizeQuestion),
    rawText: String(source.rawText || fallback.rawText || "")
  };
}

export const studentAiSchemas = {
  dailyPlan: {
    required: ["summary", "actions", "risks", "questions"]
  },
  weaknessInsight: {
    required: ["summary", "weaknesses", "actions", "evidence"]
  },
  taskDraft: {
    required: ["summary", "draft", "actions"]
  },
  assignmentGuide: {
    required: ["summary", "outline", "checklist", "actions"]
  },
  submissionCheck: {
    required: ["summary", "completionEstimate", "issues", "actions"]
  },
  noteOrganize: {
    required: ["summary", "cards", "assignmentParagraphs", "actions"]
  }
};

export function normalizeDailyPlan(raw, fallback = {}) {
  return {
    ...baseResult("daily_plan", raw, fallback),
    actions: (raw?.actions || fallback.actions || []).map(normalizeAction)
  };
}

export function normalizeWeaknessInsight(raw, fallback = {}) {
  return {
    ...baseResult("weakness_insight", raw, fallback),
    weaknesses: Array.isArray(raw?.weaknesses)
      ? raw.weaknesses.map((item, index) => ({
          id: String(item.id || `weakness_${index + 1}`),
          title: String(item.title || item.concept || "薄弱点"),
          score: Number(item.score ?? item.masteryScore ?? 0),
          reason: String(item.reason || item.priority || ""),
          evidence: arrayOfText(item.evidence || item.reasons),
          action: String(item.action || item.remediation?.advice || "")
        }))
      : Array.isArray(fallback.weaknesses)
        ? fallback.weaknesses
        : []
  };
}

export function normalizeTaskDraft(raw, fallback = {}) {
  const draft = raw?.draft || fallback.draft || {};
  return {
    ...baseResult("task_draft", raw, fallback),
    draft: {
      title: String(draft.title || ""),
      type: String(draft.type || "练习巩固"),
      estimateMinutes: Number(draft.estimateMinutes || 45),
      dueDate: String(draft.dueDate || ""),
      goalId: String(draft.goalId || ""),
      courseId: String(draft.courseId || ""),
      steps: arrayOfText(draft.steps),
      doneDefinition: arrayOfText(draft.doneDefinition)
    }
  };
}

export function normalizeAssignmentGuide(raw, fallback = {}) {
  return {
    ...baseResult("assignment_guide", raw, fallback),
    outline: arrayOfText(raw?.outline ?? fallback.outline),
    checklist: arrayOfText(raw?.checklist ?? fallback.checklist)
  };
}

export function normalizeSubmissionCheck(raw, fallback = {}) {
  return {
    ...baseResult("submission_check", raw, fallback),
    completionEstimate: Number(raw?.completionEstimate ?? fallback.completionEstimate ?? 0),
    issues: arrayOfText(raw?.issues ?? fallback.issues),
    strengths: arrayOfText(raw?.strengths ?? fallback.strengths)
  };
}

export function normalizeNoteOrganize(raw, fallback = {}) {
  return {
    ...baseResult("note_organize", raw, fallback),
    cards: Array.isArray(raw?.cards)
      ? raw.cards.map((item, index) => ({
          id: String(item.id || `card_${index + 1}`),
          front: String(item.front || item.question || ""),
          back: String(item.back || item.answer || "")
        }))
      : Array.isArray(fallback.cards)
        ? fallback.cards
        : [],
    assignmentParagraphs: arrayOfText(raw?.assignmentParagraphs ?? fallback.assignmentParagraphs)
  };
}

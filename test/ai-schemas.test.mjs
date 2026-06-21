import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeAssignmentGuide,
  normalizeDailyPlan,
  normalizeNoteOrganize,
  normalizeSubmissionCheck,
  normalizeTaskDraft,
  normalizeWeaknessInsight
} from "../services/ai-service/src/application/studentAiSchemas.js";
import {
  normalizeAssignmentCommentary,
  normalizeCoursePracticePlan,
  normalizeFeedbackDraft,
  normalizeReportSummary,
  normalizeStudentIntervention,
  normalizeTeachingPlan
} from "../services/ai-service/src/application/teacherAiSchemas.js";

function studentFallback() {
  return {
    summary: "fallback summary",
    actions: [
      { type: "fallback_action", label: "Fallback action", route: "student-ai", priority: "low", reason: "fallback" }
    ],
    risks: [{ level: "medium", title: "Fallback risk", evidence: "fallback evidence" }],
    evidence: ["fallback evidence 1", "fallback evidence 2"],
    questions: [{ text: "fallback question" }],
    provider: "fallback-provider",
    generatedAt: "2026-06-21T08:00:00.000Z",
    rawText: "fallback raw",
    weaknesses: [{ concept: "Fallback Concept", title: "Fallback Concept", score: 51, rank: 1, evidence: ["f1"], action: "review" }],
    draft: {
      title: "Fallback Draft",
      type: "文档产出",
      courseId: "course_fb",
      goalId: "goal_fb",
      estimateMinutes: 45,
      dueDate: "2026-06-22",
      steps: ["step 1"],
      doneDefinition: ["done 1"],
      linkedAssignmentId: "assignment_fb"
    },
    outline: ["fallback outline"],
    checklist: ["fallback checklist"],
    completionEstimate: 65,
    issues: [{ level: "warning", title: "Fallback issue", suggestion: "Fix it" }],
    strengths: ["fallback strength"],
    rewriteSuggestions: ["fallback rewrite"],
    cards: [{ front: "Fallback front", back: "Fallback back" }],
    assignmentParagraphs: ["Fallback paragraph"]
  };
}

function teacherFallback(type = "teaching_plan") {
  return {
    summary: "teacher fallback summary",
    actions: [
      { id: "action_fb", label: "Fallback teacher action", route: "teacher-home", type: "generate", kind: "navigate", status: "open", note: "fallback" }
    ],
    risks: ["teacher fallback risk"],
    evidence: ["teacher fallback evidence"],
    provider: "teacher-fallback-provider",
    generatedAt: "2026-06-21T09:00:00.000Z",
    rawText: "teacher fallback raw",
    draft: {
      type,
      title: "Teacher fallback draft",
      summary: "Teacher fallback summary",
      body: "Teacher fallback body",
      message: "Teacher fallback message",
      courseId: "course_teacher",
      studentId: "user_student",
      assignmentId: "assignment_teacher",
      submissionId: "submission_teacher",
      dueAt: "2026-06-23T00:00:00.000Z",
      channels: ["in_app"],
      payload: { scoreSuggestion: 92 }
    }
  };
}

test("normalizeDailyPlan keeps base shape and stringifies fields", () => {
  const result = normalizeDailyPlan({
    summary: "  today summary  ",
    actions: [
      { type: "plan", title: "Open plan", detail: "read plan", route: "student-learning", priority: "high" },
      { type: "practice", label: "Practice", reason: "close gap" }
    ],
    risks: [
      "string risk",
      { level: "critical", title: "Due soon", reason: "assignment due" }
    ],
    evidence: [" e1 ", "", "e2"],
    questions: ["q1", { question: "q2" }],
    provider: "official-provider",
    generatedAt: "2026-06-21T10:00:00.000Z",
    rawText: "raw json"
  }, studentFallback());

  assert.equal(result.type, "daily_plan");
  assert.equal(result.summary, "today summary");
  assert.equal(result.actions.length, 2);
  assert.deepEqual(result.actions[0], {
    type: "plan",
    label: "Open plan",
    targetId: "",
    route: "student-learning",
    priority: "high",
    reason: "read plan",
    detail: "read plan"
  });
  assert.deepEqual(result.actions[1], {
    type: "practice",
    label: "Practice",
    targetId: "",
    route: "student-ai",
    priority: "medium",
    reason: "close gap",
    detail: "close gap"
  });
  assert.deepEqual(result.risks, [
    { level: "medium", title: "string risk", evidence: "" },
    { level: "critical", title: "Due soon", evidence: "assignment due" }
  ]);
  assert.deepEqual(result.evidence, ["e1", "e2"]);
  assert.deepEqual(result.questions, [{ text: "q1" }, { text: "q2" }]);
  assert.equal(result.provider, "official-provider");
  assert.equal(result.generatedAt, "2026-06-21T10:00:00.000Z");
  assert.equal(result.rawText, "raw json");
});

test("normalizeDailyPlan falls back for non-object values", () => {
  const fallback = studentFallback();
  const result = normalizeDailyPlan("not-an-object", fallback);
  assert.equal(result.summary, fallback.summary);
  assert.equal(result.provider, fallback.provider);
  assert.equal(result.rawText, fallback.rawText);
  assert.equal(result.actions.length, 1);
  assert.equal(result.questions[0].text, "fallback question");
});

test("normalizeWeaknessInsight normalizes weakness rows and preserves fallback evidence", () => {
  const result = normalizeWeaknessInsight({
    summary: "weakness summary",
    weaknesses: [
      {
        concept: "Sequence Diagram",
        title: "Sequence Diagram",
        score: "61",
        rank: "2",
        evidence: ["lifeline", "message"],
        action: "redo practice"
      },
      {
        title: "Service Boundary",
        score: 48,
        evidence: ["boundary"]
      }
    ],
    evidence: ["local evidence"]
  }, studentFallback());

  assert.equal(result.type, "weakness_insight");
  assert.equal(result.summary, "weakness summary");
  assert.equal(result.weaknesses.length, 2);
  assert.deepEqual(result.weaknesses[0], {
    concept: "Sequence Diagram",
    title: "Sequence Diagram",
    score: 61,
    rank: 2,
    evidence: ["lifeline", "message"],
    action: "redo practice"
  });
  assert.deepEqual(result.weaknesses[1], {
    concept: "Service Boundary",
    title: "Service Boundary",
    score: 48,
    rank: 2,
    evidence: ["boundary"],
    action: ""
  });
  assert.deepEqual(result.evidence, ["local evidence"]);
});

test("normalizeWeaknessInsight uses fallback weaknesses when source is missing", () => {
  const fallback = studentFallback();
  const result = normalizeWeaknessInsight({ summary: "only summary" }, fallback);
  assert.equal(result.summary, "only summary");
  assert.deepEqual(result.weaknesses, [{
    concept: "Fallback Concept",
    title: "Fallback Concept",
    score: 51,
    rank: 1,
    evidence: ["f1"],
    action: "review"
  }]);
});

test("normalizeTaskDraft normalizes nested draft values", () => {
  const result = normalizeTaskDraft({
    summary: "draft summary",
    draft: {
      title: "  UML note  ",
      type: "练习巩固",
      courseId: "course_ood",
      goalId: "goal_1",
      estimateMinutes: "90",
      dueDate: "2026-06-30",
      steps: ["step1", "  ", "step2"],
      doneDefinition: ["done1", "done2"],
      linkedAssignmentId: "assignment_1"
    }
  }, studentFallback());

  assert.equal(result.type, "task_draft");
  assert.equal(result.summary, "draft summary");
  assert.deepEqual(result.draft, {
    title: "UML note",
    type: "练习巩固",
    courseId: "course_ood",
    goalId: "goal_1",
    estimateMinutes: 90,
    dueDate: "2026-06-30",
    steps: ["step1", "step2"],
    doneDefinition: ["done1", "done2"],
    linkedAssignmentId: "assignment_1"
  });
});

test("normalizeTaskDraft falls back nested draft defaults when source is partial", () => {
  const result = normalizeTaskDraft({ draft: { title: "Only title" } }, studentFallback());
  assert.equal(result.draft.title, "Only title");
  assert.equal(result.draft.type, "练习巩固");
  assert.equal(result.draft.estimateMinutes, 45);
  assert.deepEqual(result.draft.steps, []);
  assert.deepEqual(result.draft.doneDefinition, []);
});

test("normalizeAssignmentGuide keeps outline and checklist arrays", () => {
  const result = normalizeAssignmentGuide({
    summary: "guide summary",
    outline: ["read prompt", "draw class diagram", "write rationale"],
    checklist: ["cover all requirements", "cite evidence"]
  }, studentFallback());

  assert.equal(result.type, "assignment_guide");
  assert.deepEqual(result.outline, ["read prompt", "draw class diagram", "write rationale"]);
  assert.deepEqual(result.checklist, ["cover all requirements", "cite evidence"]);
});

test("normalizeAssignmentGuide falls back to configured outline and checklist", () => {
  const fallback = studentFallback();
  const result = normalizeAssignmentGuide({ summary: "fallback guide" }, fallback);
  assert.equal(result.summary, "fallback guide");
  assert.deepEqual(result.outline, ["fallback outline"]);
  assert.deepEqual(result.checklist, ["fallback checklist"]);
});

test("normalizeSubmissionCheck handles issue objects and strings together", () => {
  const result = normalizeSubmissionCheck({
    summary: "check summary",
    completionEstimate: "83",
    issues: [
      "正文太短",
      { level: "critical", title: "缺少附件", detail: "add link" }
    ],
    strengths: ["结构清楚", "术语准确"],
    rewriteSuggestions: ["加一段依据", "补图例"]
  }, studentFallback());

  assert.equal(result.type, "submission_check");
  assert.equal(result.completionEstimate, 83);
  assert.deepEqual(result.issues, [
    { level: "warning", title: "正文太短", suggestion: "" },
    { level: "critical", title: "缺少附件", suggestion: "add link" }
  ]);
  assert.deepEqual(result.strengths, ["结构清楚", "术语准确"]);
  assert.deepEqual(result.rewriteSuggestions, ["加一段依据", "补图例"]);
});

test("normalizeSubmissionCheck uses fallback issues and strengths when source omits them", () => {
  const fallback = studentFallback();
  const result = normalizeSubmissionCheck({ summary: "partial check" }, fallback);
  assert.equal(result.summary, "partial check");
  assert.equal(result.completionEstimate, 65);
  assert.deepEqual(result.issues, [{ level: "warning", title: "Fallback issue", suggestion: "Fix it" }]);
  assert.deepEqual(result.strengths, ["fallback strength"]);
  assert.deepEqual(result.rewriteSuggestions, ["fallback rewrite"]);
});

test("normalizeNoteOrganize normalizes cards and assignment paragraphs", () => {
  const result = normalizeNoteOrganize({
    summary: "note summary",
    cards: [
      { question: "What is a lifeline?", answer: "Timeline of an object." },
      { front: "What is a message?", back: "Communication between objects." }
    ],
    assignmentParagraphs: ["para 1", "para 2"]
  }, studentFallback());

  assert.equal(result.type, "note_organize");
  assert.deepEqual(result.cards, [
    { front: "What is a lifeline?", back: "Timeline of an object." },
    { front: "What is a message?", back: "Communication between objects." }
  ]);
  assert.deepEqual(result.assignmentParagraphs, ["para 1", "para 2"]);
});

test("normalizeNoteOrganize falls back cards when raw payload is invalid", () => {
  const fallback = studentFallback();
  const result = normalizeNoteOrganize({ cards: "bad" }, fallback);
  assert.deepEqual(result.cards, [{ front: "Fallback front", back: "Fallback back" }]);
  assert.deepEqual(result.assignmentParagraphs, ["Fallback paragraph"]);
});

test("teacher normalizeTeachingPlan keeps actions and draft shape", () => {
  const result = normalizeTeachingPlan({
    summary: "teacher summary",
    actions: [
      { id: "review", label: "Open review", route: "teacher-review", type: "generate", kind: "navigate", status: "open", note: "first" },
      { label: "Open course" }
    ],
    risks: ["risk 1", "risk 2"],
    evidence: ["e1", "e2"],
    draft: {
      title: "Today plan",
      summary: "summary",
      body: "body",
      courseId: "course_ood",
      payload: { sectionCount: 3 }
    },
    provider: "teacher-official",
    generatedAt: "2026-06-21T11:00:00.000Z",
    rawText: "teacher raw"
  }, teacherFallback("teaching_plan"));

  assert.equal(result.type, "teaching_plan");
  assert.equal(result.summary, "teacher summary");
  assert.deepEqual(result.actions, [
    { id: "review", label: "Open review", route: "teacher-review", type: "generate", kind: "navigate", status: "open", note: "first" },
    { id: "action_2", label: "Open course", route: "teacher-home", type: "navigate", kind: "navigate", status: "open", note: "" }
  ]);
  assert.deepEqual(result.risks, ["risk 1", "risk 2"]);
  assert.deepEqual(result.evidence, ["e1", "e2"]);
  assert.equal(result.draft.title, "Today plan");
  assert.equal(result.draft.body, "body");
  assert.equal(result.draft.courseId, "course_ood");
  assert.deepEqual(result.draft.payload, { sectionCount: 3 });
  assert.equal(result.provider, "teacher-official");
  assert.equal(result.generatedAt, "2026-06-21T11:00:00.000Z");
});

test("teacher normalizers all preserve fallback provider and nested draft defaults", () => {
  const typeCases = [
    ["student_intervention", normalizeStudentIntervention],
    ["assignment_commentary", normalizeAssignmentCommentary],
    ["feedback_draft", normalizeFeedbackDraft],
    ["course_practice_plan", normalizeCoursePracticePlan],
    ["report_summary", normalizeReportSummary]
  ];

  for (const [type, normalize] of typeCases) {
    const result = normalize(null, teacherFallback(type));
    assert.equal(result.type, type);
    assert.equal(result.summary, "teacher fallback summary");
    assert.equal(result.provider, "teacher-fallback-provider");
    assert.equal(result.rawText, "teacher fallback raw");
    assert.equal(result.draft.type, type);
    assert.equal(result.draft.title, "Teacher fallback draft");
    assert.equal(result.draft.summary, "Teacher fallback summary");
    assert.equal(result.draft.body, "Teacher fallback body");
    assert.equal(result.draft.message, "Teacher fallback message");
    assert.equal(result.draft.courseId, "course_teacher");
    assert.equal(result.draft.studentId, "user_student");
    assert.equal(result.draft.assignmentId, "assignment_teacher");
    assert.equal(result.draft.submissionId, "submission_teacher");
    assert.deepEqual(result.draft.channels, ["in_app"]);
  }
});

test("teacher normalizers sanitize incomplete action payloads", () => {
  const result = normalizeFeedbackDraft({
    summary: "feedback",
    actions: [
      { label: "Save", kind: "save-feedback" },
      {}
    ],
    draft: {
      body: "feedback body",
      payload: "bad payload"
    }
  }, teacherFallback("feedback_draft"));

  assert.deepEqual(result.actions, [
    { id: "action_1", label: "Save", route: "teacher-home", type: "navigate", kind: "save-feedback", status: "open", note: "" },
    { id: "action_2", label: "Action 2", route: "teacher-home", type: "navigate", kind: "navigate", status: "open", note: "" }
  ]);
  assert.equal(result.draft.body, "feedback body");
  assert.deepEqual(result.draft.payload, { scoreSuggestion: 92 });
});

import assert from "node:assert/strict";
import test from "node:test";
import { ApiClient } from "../client/src/api.js";
import { createInitialState } from "../client/src/state/appState.js";
import { buildModelConfig, canManageAssessment, selectPracticeProgress, selectQuestionBankViewModel } from "../client/src/state/selectors.js";
import { formatDate, formatPercent } from "../client/src/utils/format.js";
import { toQuery } from "../client/src/utils/query.js";
import { compactErrors, validateAssignment, validateQuestion } from "../client/src/utils/validation.js";
import { assessmentInsightView } from "../client/src/views/assessmentInsightView.js";
import { assignmentManageView } from "../client/src/views/assignmentManageView.js";
import { analyticsView } from "../client/src/views/analyticsView.js";
import { knowledgeView } from "../client/src/views/knowledgeView.js";
import { practiceView } from "../client/src/views/practiceView.js";
import { questionBankManageView } from "../client/src/views/questionBankManageView.js";
import { settingsView } from "../client/src/views/settingsView.js";
import { workbenchView } from "../client/src/views/workbenchView.js";

test("format and query utilities support v6 view rendering", () => {
  assert.equal(formatDate("2026-06-16T08:00:00.000Z"), "2026-06-16");
  assert.equal(formatPercent(82.1), "82%");
  assert.equal(toQuery({ courseId: "course_ood", status: "", page: 1 }), "?courseId=course_ood&page=1");
  assert.deepEqual(compactErrors({ a: "", b: "x" }), { b: "x" });
});

test("validation helpers expose field-level errors", () => {
  assert.deepEqual(validateAssignment({ title: "", courseId: "", dueAt: "", rubricId: "" }), {
    title: "请输入作业标题。",
    courseId: "请选择课程。",
    dueAt: "请选择截止日期。",
    rubricId: "请选择评分规则。"
  });
  assert.deepEqual(validateQuestion({ bankId: "", courseId: "", type: "", stem: "", answer: "", analysis: "" }), {
    bankId: "请选择题库。",
    courseId: "请选择课程。",
    type: "请选择题型。",
    stem: "请输入题干。",
    answer: "请输入参考答案。",
    analysis: "请输入答案解析。"
  });
});

test("selectors derive v6 permissions and practice progress", () => {
  assert.equal(canManageAssessment({ role: "teacher" }), true);
  assert.equal(canManageAssessment({ role: "student" }), false);
  assert.deepEqual(selectPracticeProgress({
    questions: [{ id: "q1" }, { id: "q2" }],
    answers: [{ questionId: "q1" }]
  }), { total: 2, answered: 1, percent: 50 });
  const state = createInitialState();
  state.user = { role: "teacher" };
  state.assessment.questionBanks = [{ id: "bank_1", title: "题库", courseId: "course_ood", description: "" }];
  state.assessment.questions = [{ id: "q_1", bankId: "bank_1", type: "single_choice", difficulty: "easy", stem: "题干", analysis: "解析" }];
  state.selected.questionBankId = "bank_1";
  const vm = selectQuestionBankViewModel(state);
  assert.equal(vm.banks.length, 1);
  assert.equal(vm.questions.length, 1);
});

test("ApiClient v6 methods call expected paths and methods", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || "GET" });
    return {
      ok: true,
      async json() {
        return { ok: true, data: {} };
      }
    };
  };
  try {
    const client = new ApiClient({ baseUrl: "http://demo.local" });
    await client.updateAssignment("assignment_1", { title: "A" });
    await client.deleteAssignment("assignment_1");
    await client.updateQuestionBank("bank_1", { title: "B" });
    await client.deleteQuestion("question_1");
    await client.practiceSessions({ courseId: "course_ood" });
    await client.health();
    await client.analyticsFunnel({ courseId: "course_ood" });
    await client.notificationSummary();
    await client.notifications({ category: "scheduler" });
    await client.markNotificationRead("notification_1");
    await client.schedulerReminders({ status: "active" });
    await client.runSchedulerDue({ now: "2026-06-17T00:00:00.000Z" });
    await client.knowledgeSummary();
    await client.knowledgeConcepts({ courseId: "course_ood" });
    await client.knowledgeSearch({ q: "sequence", limit: 3 });
    await client.knowledgeGraph({ conceptId: "kc_sequence", depth: 2 });
    await client.buildKnowledgeLearningPath({ courseId: "course_ood", conceptIds: ["kc_sequence"], days: 2 });
    await client.buildKnowledgePracticeSet({ courseId: "course_ood", conceptIds: ["kc_sequence"], limit: 1 });
    await client.buildKnowledgeAiContext({ courseId: "course_ood", question: "Why cite sources?", limit: 2 });
    await client.assignmentGradingOverview("assignment_1");
    await client.submissionGradingInsight("submission_1");
    await client.rubricInsight("rubric_1");
    await client.practiceSessionReview("practice_1");
    await client.adaptivePracticePlan({ courseId: "course_ood", questionCount: 8 });
    await client.mistakeAnalysis({ courseId: "course_ood" });
    await client.mistakeDetailAnalysis("mistake_1");
    await client.assessmentCourseReport({ courseId: "course_ood" });
    await client.assessmentStudentPortfolio({ courseId: "course_ood", studentId: "user_student" });
    await client.assessmentRiskRegister({ courseId: "course_ood" });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(calls, [
    { url: "http://demo.local/api/assignments/assignment_1", method: "PATCH" },
    { url: "http://demo.local/api/assignments/assignment_1", method: "DELETE" },
    { url: "http://demo.local/api/question-banks/bank_1", method: "PATCH" },
    { url: "http://demo.local/api/questions/question_1", method: "DELETE" },
    { url: "http://demo.local/api/practice-sessions?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/health", method: "GET" },
    { url: "http://demo.local/api/analytics/funnel?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/notifications/summary", method: "GET" },
    { url: "http://demo.local/api/notifications?category=scheduler", method: "GET" },
    { url: "http://demo.local/api/notifications/notification_1/read", method: "PATCH" },
    { url: "http://demo.local/api/scheduler/reminders?status=active", method: "GET" },
    { url: "http://demo.local/api/scheduler/run-due", method: "POST" },
    { url: "http://demo.local/api/knowledge/summary", method: "GET" },
    { url: "http://demo.local/api/knowledge/concepts?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/knowledge/search?q=sequence&limit=3", method: "GET" },
    { url: "http://demo.local/api/knowledge/graph?conceptId=kc_sequence&depth=2", method: "GET" },
    { url: "http://demo.local/api/knowledge/learning-path", method: "POST" },
    { url: "http://demo.local/api/knowledge/practice-set", method: "POST" },
    { url: "http://demo.local/api/knowledge/ai-context", method: "POST" },
    { url: "http://demo.local/api/assignments/assignment_1/grading-overview", method: "GET" },
    { url: "http://demo.local/api/submissions/submission_1/grading-insight", method: "GET" },
    { url: "http://demo.local/api/rubrics/rubric_1/insight", method: "GET" },
    { url: "http://demo.local/api/practice-sessions/practice_1/review", method: "GET" },
    { url: "http://demo.local/api/adaptive-practice-plan", method: "POST" },
    { url: "http://demo.local/api/mistake-analysis?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/mistakes/mistake_1/analysis", method: "GET" },
    { url: "http://demo.local/api/assessment/course-report?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/assessment/student-portfolio?courseId=course_ood&studentId=user_student", method: "GET" },
    { url: "http://demo.local/api/assessment/risk-register?courseId=course_ood", method: "GET" }
  ]);
});

test("v6 views render as importable ESM modules without build tools", () => {
  const state = createInitialState();
  state.user = { id: "user_teacher", name: "周老师", role: "teacher", email: "teacher@edumind.local", avatar: "周" };
  state.provider = "mock-local-llm";
  state.dashboard = {
    courses: [{ id: "course_ood", title: "面向对象技术与方法" }],
    metrics: { activeGoals: 1, completionRate: 80, assignmentCompletionRate: 75, masteryScore: 70 }
  };
  state.assessment.assignments = [{ id: "assignment_1", title: "领域模型作业", courseId: "course_ood", status: "published", dueAt: "2026-06-16" }];
  state.assessment.rubrics = [{ id: "rubric_1", title: "课堂 Rubric" }];
  state.assessment.questionBanks = [{ id: "bank_1", title: "设计模式题库", courseId: "course_ood", description: "题库说明" }];
  state.assessment.questions = [{ id: "q_1", bankId: "bank_1", courseId: "course_ood", type: "single_choice", stem: "题干", analysis: "解析", difficulty: "easy" }];
  state.assessment.practiceSession = { id: "practice_1", questions: [{ id: "q_1", stem: "题干", choices: [] }], answers: [] };
  state.assessment.practiceHistory = [{ id: "practice_1", courseId: "course_ood", status: "finished", correctRate: 80 }];
  state.assessment.mistakes = [{ id: "mistake_1", courseId: "course_ood", status: "open", questionId: "q_1" }];
  state.analytics.teacher = { courses: [], students: [], riskStudents: [], recentActivity: [] };
  state.workbench.notificationSummary = { unread: 1 };
  state.workbench.notifications = [{ id: "notification_1", title: "Notice", body: "Body", category: "scheduler", severity: "info", createdAt: "2026-06-16" }];
  state.workbench.reminders = [{ id: "reminder_1", title: "Reminder", message: "Message", targetType: "practice", courseId: "course_ood", nextRunAt: "2026-06-17", status: "active" }];
  state.workbench.schedulerDashboard = { activeReminders: 1 };
  state.workbench.schedulerTimeline = [{ type: "reminder.next", reminderId: "reminder_1", at: "2026-06-17", title: "Reminder", status: "active" }];
  state.workbench.funnel = { stages: [{ key: "students", count: 1, rate: 100 }] };
  state.workbench.riskBoard = { summary: { high: 0 }, items: [] };
  state.workbench.engagement = { activityCount: 1, messageCount: 1, channelMix: [{ channel: "message", count: 1 }], quietSignals: ["ok"] };
  state.workbench.courseDeepReport = { assignments: { published: 1, submitted: 1 }, practice: { sessionCount: 1, openMistakes: 0 }, mastery: { concepts: [{ concept: "UML", score: 80 }] } };
  state.workbench.studentProgress = { learning: { completedTaskCount: 1, taskCount: 2 }, assignments: { submittedCount: 1 }, grading: { averageScore: 90 }, practice: { averageCorrectRate: 80 }, nextFocus: ["Review"] };
  state.knowledge.summary = { concepts: 3, articles: 2, chunks: 4, relations: 2 };
  state.knowledge.concepts = [{ id: "kc_sequence", title: "Sequence Diagram", summary: "Object collaboration over time.", category: "design", difficulty: "intermediate", tags: ["UML"], learningObjectives: ["Explain lifelines"] }];
  state.knowledge.selectedConcept = { id: "kc_sequence", title: "Sequence Diagram", summary: "Object collaboration over time.", category: "design", difficulty: "intermediate", tags: ["UML"], learningObjectives: ["Explain lifelines"], reviewCards: [{ question: "What is a lifeline?", answer: "An object timeline." }], chunks: [{ title: "Rule", kind: "rule", content: "Use messages to explain responsibility." }] };
  state.knowledge.searchResults = [{ type: "concept", id: "kc_sequence", title: "Sequence Diagram", conceptId: "kc_sequence", conceptTitle: "Sequence Diagram", score: 12, matches: ["sequence"], preview: "Object collaboration over time." }];
  state.knowledge.graph = { nodes: [{ id: "kc_sequence", title: "Sequence Diagram", category: "design", difficulty: "intermediate" }], edges: [] };
  state.knowledge.recommendations = [{ conceptId: "kc_sequence", title: "Sequence Diagram", reason: "Useful for collaboration modeling.", nextActions: ["Draw one interaction"] }];
  state.knowledge.learningPath = { totalConcepts: 1, totalMinutes: 60, schedule: [{ date: "2026-06-17", minutes: 60, items: [{ title: "Sequence Diagram", category: "design", difficulty: "intermediate", estimateMinutes: 60 }] }] };
  state.knowledge.practiceSet = { conceptCount: 1, questionCount: 1, questions: [{ title: "Sequence Diagram", type: "short-answer", question: "Explain a lifeline.", referenceAnswer: "Object timeline." }] };
  state.knowledge.aiContext = { query: "Why cite sources?", concepts: [{ title: "RAG", summary: "Retrieved evidence." }], promptHints: ["cite retrieved chunks"] };
  state.assessmentInsight.gradingOverview = { submissionCount: 1, gradedCount: 1, average: 90, bands: { excellent: 1 }, consistency: { status: "stable" }, rows: [{ submissionId: "submission_1", studentName: "Student", teacherScore: 90, aiScore: 88, scoreGap: 2, band: "excellent" }] };
  state.assessmentInsight.rubricInsight = { totalScore: 100, qualityScore: 92, warnings: [], dimensionCoverage: [{ key: "modeling", covered: true }], criteria: [{ title: "Modeling", maxScore: 40, weight: 40, description: "Model quality" }], improvementPlan: ["Keep collecting samples."] };
  state.assessmentInsight.submissionInsight = { assignment: { title: "Assignment" }, submission: { studentId: "user_student", submittedAt: "2026-06-16T00:00:00.000Z" }, comparison: [{ metric: "total-score-gap", teacher: 90, ai: 88, gap: 2, risk: "normal" }], recommendation: "Scores are consistent." };
  state.assessmentInsight.sessionReview = { answeredCount: 2, correctCount: 1, incorrectCount: 1, pendingCount: 0, conceptBreakdown: [{ concept: "UML", correctRate: 50 }], difficultyBreakdown: { easy: { total: 1, correct: 1, correctRate: 100 } }, nextActions: ["Review UML."] };
  state.assessmentInsight.adaptivePlan = { selectedCount: 1, targetCount: 8, estimatedMinutes: 10, weakConcepts: [{ concept: "UML" }], strategy: "Prioritize UML.", questions: [{ stem: "Question", concept: "UML", difficulty: "easy", reason: "Weak concept." }] };
  state.assessmentInsight.mistakeAnalysis = { totalMistakes: 1, openMistakes: 1, reviewedMistakes: 0, concepts: [{ concept: "UML", priority: "high", openCount: 1, masteryScore: 50, remediation: { advice: "Review class diagrams." } }], nextReviewQueue: [{ mistakeId: "mistake_1", concept: "UML", priority: "high", stem: "Question", reason: "concept-confusion" }] };
  state.assessmentInsight.mistakeDetail = { reason: "concept-confusion", mistake: { status: "open" }, question: { stem: "Question", analysis: "Analysis", answer: "A", difficulty: "easy" }, answer: { answer: "B" }, remediation: { advice: "Compare concepts.", evidenceToCollect: ["notes"] } };
  state.assessmentInsight.courseReport = { assignmentCount: 1, submissionCount: 1, rubricCount: 1, gradedSubmissionCount: 1, gradeDistribution: { excellent: 1, good: 0, pass: 0, risk: 0 }, practiceEngagement: { sessionCount: 1 }, mistakeLoad: { openMistakes: 1 }, masteryCoverage: { averageMastery: 80 } };
  state.assessmentInsight.studentPortfolio = { assignmentProgress: { totalAssignments: 1, completionRate: 100, rows: [{ title: "Assignment", submitted: true, teacherScore: 90, aiScore: 88 }] }, gradeTrend: { averageScore: 90 }, practiceSummary: { sessionCount: 1 }, risk: { level: "low", score: 0 }, evidenceTimeline: [{ at: "2026-06-16T00:00:00.000Z", summary: "Submitted assignment." }] };
  state.assessmentInsight.riskRegister = { totalStudents: 1, highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 1, items: [{ studentId: "user_student", risk: { level: "low", score: 0 }, assignmentCompletionRate: 100, averageScore: 90, openMistakes: 1, weakConcepts: [{ concept: "UML" }] }] };
  state.settings.health = { service: "gateway-service", status: "up", time: "2026-06-16T00:00:00.000Z", services: [] };
  state.settings.modelConfig = buildModelConfig(state.provider);
  const renderedWorkbench = workbenchView(state);
  assert.match(renderedWorkbench, /Learning Funnel/);
  const renderedKnowledge = knowledgeView(state);
  assert.match(renderedKnowledge, /Graph Evidence/);
  const renderedAssessmentInsight = assessmentInsightView(state);
  assert.match(renderedAssessmentInsight, /Teacher Grading Insight/);

  assert.match(assignmentManageView(state), /作业列表/);
  assert.match(questionBankManageView(state), /题库列表/);
  assert.match(practiceView(state), /练习历史/);
  assert.match(analyticsView(state), /课程统计/);
  assert.match(settingsView(state), /模型配置说明/);
});

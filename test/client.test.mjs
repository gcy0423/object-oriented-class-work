import assert from "node:assert/strict";
import test from "node:test";
import { ApiClient } from "../client/src/api.js";
import { StudentAiAdapter } from "../client/src/ai/studentAiAdapter.js";
import { TeacherAiAdapter } from "../client/src/ai/teacherAiAdapter.js";
import { createInitialState } from "../client/src/state/appState.js";
import { buildModelConfig, canManageAssessment, selectPracticeProgress, selectQuestionBankViewModel } from "../client/src/state/selectors.js";
import { selectStudentAiContext, selectStudentAssignmentsModel, selectStudentPracticeSessionModel } from "../client/src/state/studentSelectors.js";
import { selectTeacherAiPanelModel, selectTeacherCourseModel, selectTeacherInterventionModel, selectTeacherReportModel } from "../client/src/state/teacherSelectors.js";
import { formatDate, formatPercent } from "../client/src/utils/format.js";
import { toQuery } from "../client/src/utils/query.js";
import { compactErrors, validateAssignment, validateQuestion } from "../client/src/utils/validation.js";
import { assessmentInsightView } from "../client/src/views/assessmentInsightView.js";
import { assignmentManageView } from "../client/src/views/assignmentManageView.js";
import { analyticsView } from "../client/src/views/analyticsView.js";
import { identityAdminView } from "../client/src/views/identityAdminView.js";
import { knowledgeView } from "../client/src/views/knowledgeView.js";
import { operationsView } from "../client/src/views/operationsView.js";
import { practiceView } from "../client/src/views/practiceView.js";
import { questionBankManageView } from "../client/src/views/questionBankManageView.js";
import { reportView } from "../client/src/views/reportView.js";
import { settingsView } from "../client/src/views/settingsView.js";
import { studentAiView } from "../client/src/views/student/studentAiView.js";
import { studentAiInsightView } from "../client/src/views/student/studentAiInsightView.js";
import { studentLearningView } from "../client/src/views/student/studentLearningView.js";
import { studentTaskDetailView } from "../client/src/views/student/studentTaskDetailView.js";
import { studentAssignmentsView } from "../client/src/views/student/studentAssignmentsView.js";
import { studentAssignmentDetailView } from "../client/src/views/student/studentAssignmentDetailView.js";
import { studentSubmitView } from "../client/src/views/student/studentSubmitView.js";
import { studentSubmitPreviewView } from "../client/src/views/student/studentSubmitPreviewView.js";
import { studentSubmitSuccessView } from "../client/src/views/student/studentSubmitSuccessView.js";
import { studentAssignmentHistoryView } from "../client/src/views/student/studentAssignmentHistoryView.js";
import { studentFeedbackView } from "../client/src/views/student/studentFeedbackView.js";
import { studentPracticeView } from "../client/src/views/student/studentPracticeView.js";
import { studentPracticeSessionView } from "../client/src/views/student/studentPracticeSessionView.js";
import { studentPracticeResultView } from "../client/src/views/student/studentPracticeResultView.js";
import { studentMistakeDetailView } from "../client/src/views/student/studentMistakeDetailView.js";
import { studentNotesView } from "../client/src/views/student/studentNotesView.js";
import { studentNoteEditorView } from "../client/src/views/student/studentNoteEditorView.js";
import { studentNoteAiResultView } from "../client/src/views/student/studentNoteAiResultView.js";
import { STUDENT_PRIMARY_ROUTES, studentRouteTable } from "../client/src/views/studentRouteTable.js";
import { defaultRouteForUser, hydrateStudentWorkspace } from "../client/src/studentRuntime.js";
import { defaultRouteForTeacher, handleTeacherAction, hydrateTeacherWorkspace, renderTeacherRoute } from "../client/src/teacherRuntime.js";
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
    await client.studentDashboard();
    await client.studentCourses();
    await client.studentAssignments({ status: "published" });
    await client.studentAssignmentDetail("assignment_1");
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
    await client.assessmentStudentPortfolioDeep({ courseId: "course_ood", studentId: "user_student" });
    await client.assessmentStudentPortfolioEvidenceMap({ courseId: "course_ood", studentId: "user_student" });
    await client.assessmentStudentPortfolioInterventionPlan({ courseId: "course_ood", studentId: "user_student" });
    await client.assessmentPortfolioBoard({ courseId: "course_ood" });
    await client.assessmentRiskRegister({ courseId: "course_ood" });
    await client.identityUsers({ role: "student", status: "active" });
    await client.identityUserProfile("user_student");
    await client.updateIdentityUserProfile("user_student", { major: "Software Engineering" });
    await client.classes({ courseId: "course_ood" });
    await client.createClassroom({ name: "Class 02" });
    await client.classroomDetail("class_ood_01");
    await client.assignClassStudent("class_ood_01", { userId: "user_student" });
    await client.assignClassTeacher("class_ood_01", { userId: "user_teacher" });
    await client.groups({ classroomId: "class_ood_01" });
    await client.createGroup({ classroomId: "class_ood_01", name: "Alpha" });
    await client.addGroupMember("group_ood_alpha", { userId: "user_student" });
    await client.rolePermissions();
    await client.identityDashboard();
    await client.operationsCatalog();
    await client.operationsDashboard({ courseId: "course_ood" });
    await client.operationImports({ target: "students" });
    await client.operationImportDetail("import_1");
    await client.previewOperationImport({ target: "students", rows: [] });
    await client.commitOperationImport("import_1", { allowWarnings: true });
    await client.operationBatchJobs({ status: "queued" });
    await client.createOperationBatchJob({ type: "portfolio-refresh" });
    await client.operationBatchJobDetail("job_1");
    await client.runOperationBatchJob("job_1");
    await client.operationAudit({ severity: "warning" });
    await client.createOperationAudit({ action: "manual" });
    await client.operationAuditDigest({ courseId: "course_ood" });
    await client.reportCatalog();
    await client.studentWeeklyReport({ courseId: "course_ood" });
    await client.courseWeeklyReport({ courseId: "course_ood", format: "markdown" });
    await client.assignmentGradingReport("assignment_1", { format: "csv" });
    await client.mistakeReviewReport({ studentId: "user_student" });
    await client.aiUsageReport({ format: "html" });
    await client.summarizeNote({ noteId: "note_1" });
    await client.studentAiDailyPlan({ focus: "today" });
    await client.studentAiWeaknessInsight({ courseId: "course_ood" });
    await client.studentAiTaskDraft({ request: "拆任务" });
    await client.studentAiAssignmentGuide({ assignment: { id: "assignment_1" } });
    await client.studentAiSubmissionCheck({ draft: { content: "draft" } });
    await client.studentAiNoteOrganize({ courseId: "course_ood", note: { title: "UML" } });
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
    { url: "http://demo.local/api/dashboard", method: "GET" },
    { url: "http://demo.local/api/courses", method: "GET" },
    { url: "http://demo.local/api/assignments?status=published", method: "GET" },
    { url: "http://demo.local/api/assignments/assignment_1", method: "GET" },
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
    { url: "http://demo.local/api/assessment/student-portfolio/deep?courseId=course_ood&studentId=user_student", method: "GET" },
    { url: "http://demo.local/api/assessment/student-portfolio/evidence-map?courseId=course_ood&studentId=user_student", method: "GET" },
    { url: "http://demo.local/api/assessment/student-portfolio/intervention-plan?courseId=course_ood&studentId=user_student", method: "GET" },
    { url: "http://demo.local/api/assessment/portfolio-board?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/assessment/risk-register?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/identity/users?role=student&status=active", method: "GET" },
    { url: "http://demo.local/api/identity/users/user_student/profile", method: "GET" },
    { url: "http://demo.local/api/identity/users/user_student/profile", method: "PATCH" },
    { url: "http://demo.local/api/classes?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/classes", method: "POST" },
    { url: "http://demo.local/api/classes/class_ood_01", method: "GET" },
    { url: "http://demo.local/api/classes/class_ood_01/students", method: "POST" },
    { url: "http://demo.local/api/classes/class_ood_01/teachers", method: "POST" },
    { url: "http://demo.local/api/groups?classroomId=class_ood_01", method: "GET" },
    { url: "http://demo.local/api/groups", method: "POST" },
    { url: "http://demo.local/api/groups/group_ood_alpha/members", method: "POST" },
    { url: "http://demo.local/api/role-permissions", method: "GET" },
    { url: "http://demo.local/api/admin/identity-dashboard", method: "GET" },
    { url: "http://demo.local/api/operations/catalog", method: "GET" },
    { url: "http://demo.local/api/operations/dashboard?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/operations/imports?target=students", method: "GET" },
    { url: "http://demo.local/api/operations/imports/import_1", method: "GET" },
    { url: "http://demo.local/api/operations/imports/preview", method: "POST" },
    { url: "http://demo.local/api/operations/imports/import_1/commit", method: "POST" },
    { url: "http://demo.local/api/operations/batch-jobs?status=queued", method: "GET" },
    { url: "http://demo.local/api/operations/batch-jobs", method: "POST" },
    { url: "http://demo.local/api/operations/batch-jobs/job_1", method: "GET" },
    { url: "http://demo.local/api/operations/batch-jobs/job_1/run", method: "POST" },
    { url: "http://demo.local/api/operations/audit?severity=warning", method: "GET" },
    { url: "http://demo.local/api/operations/audit", method: "POST" },
    { url: "http://demo.local/api/operations/audit/digest?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/reports/catalog", method: "GET" },
    { url: "http://demo.local/api/reports/student-weekly?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/reports/course-weekly?courseId=course_ood&format=markdown", method: "GET" },
    { url: "http://demo.local/api/reports/assignments/assignment_1/grading?format=csv", method: "GET" },
    { url: "http://demo.local/api/reports/mistakes/review?studentId=user_student", method: "GET" },
    { url: "http://demo.local/api/reports/ai-usage?format=html", method: "GET" },
    { url: "http://demo.local/api/ai/summarize", method: "POST" },
    { url: "http://demo.local/api/student-ai/daily-plan", method: "POST" },
    { url: "http://demo.local/api/student-ai/weakness-insight", method: "POST" },
    { url: "http://demo.local/api/student-ai/task-drafts", method: "POST" },
    { url: "http://demo.local/api/student-ai/assignment-guide", method: "POST" },
    { url: "http://demo.local/api/student-ai/submission-check", method: "POST" },
    { url: "http://demo.local/api/student-ai/note-organize", method: "POST" }
  ]);
});

test("student route table and selectors expose stable view models", () => {
  const state = createInitialState();
  state.user = { id: "user_student", name: "林知夏", role: "student", avatar: "夏" };
  state.dashboard = {
    courses: [{ id: "course_ood", title: "面向对象技术与方法" }],
    goals: [{ id: "goal_1", courseId: "course_ood", title: "完成 UML 复盘", targetDate: "2026-06-21", status: "active" }],
    tasks: [{ id: "task_1", goalId: "goal_1", title: "整理顺序图", status: "todo", estimateMinutes: 40, dueDate: "2026-06-20" }],
    notes: [{ id: "note_1", courseId: "course_ood", title: "UML 笔记", content: "对象协作", tags: ["UML"] }],
    assignments: [
      { id: "assignment_1", courseId: "course_ood", title: "领域模型作业", description: "提交 UML 图", dueAt: "2026-06-21T23:59:59.000Z", status: "published" }
    ],
    metrics: { activeGoals: 1, completionRate: 20, studyMinutes: 40, noteCount: 1 }
  };
  state.assessment.assignments = state.dashboard.assignments;
  state.assessment.practiceSession = { id: "practice_1", questions: [{ id: "q_1", stem: "题干" }, { id: "q_2", stem: "题干2" }], answers: [{ id: "a_1", questionId: "q_1" }] };
  state.assessment.mistakes = [{ id: "mistake_1", questionId: "q_1", question: { concept: "顺序图", stem: "题目" }, status: "open" }];
  state.student.assignments.mode = "deadline";

  assert.equal(STUDENT_PRIMARY_ROUTES.length, 5);
  assert.equal(studentRouteTable["student-ai"].title, "AI 学习台");
  assert.equal(selectStudentAssignmentsModel(state).deadlineList.length, 1);
  assert.equal(selectStudentPracticeSessionModel(state).answeredCount, 1);
  assert.equal(selectStudentAiContext(state, "student-ai").assignments.length, 1);
});

test("student default route prefers AI workspace for empty hash and dashboard fallback", () => {
  const student = { role: "student" };
  const teacher = { role: "teacher" };

  assert.equal(defaultRouteForUser(student, ""), "student-ai");
  assert.equal(defaultRouteForUser(student, "dashboard"), "student-ai");
  assert.equal(defaultRouteForUser(student, "unknown-route"), "student-ai");
  assert.equal(defaultRouteForUser(student, "student-assignments"), "student-assignments");
  assert.equal(defaultRouteForUser(teacher, ""), "dashboard");
});

test("teacher runtime defaults to v11 shell and context-aware AI panel", () => {
  const teacher = { role: "teacher" };
  const state = createInitialState();
  state.user = { id: "user_teacher", name: "周老师", role: "teacher", avatar: "周" };
  state.route = "teacher-home";
  state.loading.dashboard = true;
  state.dashboard = {
    courses: [{ id: "course_ood", title: "面向对象技术与方法", description: "UML 和设计模式。" }],
    assignments: [{ id: "assignment_ood_model", courseId: "course_ood", title: "领域模型设计作业", description: "提交 UML 图。", dueAt: "2026-06-21T23:59:59.000Z", status: "published" }]
  };
  state.assessment.assignments = state.dashboard.assignments;
  state.assessment.assignmentDetail = {
    assignment: state.dashboard.assignments[0],
    submissions: [{ id: "submission_1", studentId: "user_student", studentSnapshot: { name: "林知夏" }, content: "提交正文", status: "submitted", submittedAt: "2026-06-20T00:00:00.000Z" }],
    submissionSummary: { submitted: 1, graded: 0 }
  };
  state.identityAdmin.users = [{ id: "user_student", name: "林知夏", role: "student" }];
  state.assessmentInsight.riskRegister = { items: [{ studentId: "user_student", risk: { level: "medium" }, assignmentCompletionRate: 60, openMistakes: 2, weakConcepts: [{ concept: "顺序图" }] }] };

  assert.equal(defaultRouteForTeacher(teacher, ""), "teacher-home");
  assert.equal(defaultRouteForTeacher(teacher, "dashboard"), "teacher-home");
  assert.equal(defaultRouteForTeacher(teacher, "assignments"), "teacher-assignment");
  assert.equal(defaultRouteForTeacher(teacher, "settings"), "teacher-settings");

  const homePanel = selectTeacherAiPanelModel(state, "teacher-home");
  const studentPanel = selectTeacherAiPanelModel({ ...state, route: "teacher-student", selected: { ...state.selected, studentId: "user_student" } }, "teacher-student");
  assert.notEqual(homePanel.title, studentPanel.title);
  assert.notEqual(homePanel.summary, studentPanel.summary);

  const rendered = renderTeacherRoute(state);
  assert.match(rendered, /teacher-app-shell/);
  assert.match(rendered, /正在同步课程、作业和学情数据/);
  assert.match(rendered, /AI 教学台/);
  assert.match(rendered, /面向对象技术与方法/);
  const visibleMarkup = rendered.replace(/\sdata-id="[^"]*"/g, "");
  assert.doesNotMatch(visibleMarkup, /course_ood|assignment_ood_model|user_student/);

  const intervention = renderTeacherRoute({ ...state, route: "teacher-intervention" });
  assert.match(intervention, /候选学生/);
  assert.match(intervention, /待确认建议/);
  const report = renderTeacherRoute({ ...state, route: "teacher-report" });
  assert.match(report, /报告类型/);
  assert.match(report, /预览状态/);
  const settings = renderTeacherRoute({ ...state, route: "teacher-settings" });
  assert.match(settings, /个人信息/);
  assert.match(settings, /账号助手/);
  assert.doesNotMatch(settings.replace(/\sdata-id="[^"]*"/g, ""), /user_teacher/);
});

test("teacher workspace hydrates assignment context without falling back to old pages", async () => {
  const state = createInitialState();
  state.user = { id: "user_teacher", name: "周老师", role: "teacher" };
  state.route = "teacher-assignment";
  state.dashboard = { courses: [{ id: "course_ood", title: "面向对象技术与方法" }] };
  state.assessment.assignments = [{ id: "assignment_ood_model", courseId: "course_ood", title: "领域模型设计作业", status: "published" }];

  const calls = [];
  const app = {
    store: { get: () => state },
    api: {
      async assignmentDetail(id) {
        calls.push(["detail", id]);
        return {
          data: {
            assignment: state.assessment.assignments[0],
            submissions: [{ id: "submission_1", studentId: "user_student", studentSnapshot: { name: "林知夏" }, content: "提交正文", status: "submitted" }],
            submissionSummary: { submitted: 1, graded: 0 }
          }
        };
      },
      async assignmentGradingOverview(id) {
        calls.push(["overview", id]);
        return { data: { submissionCount: 1, gradedCount: 0, average: 0, consistency: { status: "stable" }, rows: [] } };
      }
    },
    setState(patch) {
      Object.assign(state, patch);
    }
  };

  await hydrateTeacherWorkspace(app, state);

  assert.deepEqual(calls, [["detail", "assignment_ood_model"], ["overview", "assignment_ood_model"]]);
  assert.equal(state.assessment.assignmentDetail.submissions.length, 1);
  const rendered = renderTeacherRoute(state);
  assert.match(rendered, /teacher-app-shell/);
  assert.match(rendered, /林知夏/);
  assert.doesNotMatch(rendered.replace(/\sdata-id="[^"]*"/g, ""), /assignment_ood_model|submission_1|user_student/);
});

test("teacher submission insight action stays inside v11 review shell", async () => {
  const state = createInitialState();
  state.user = { id: "user_teacher", name: "周老师", role: "teacher" };
  state.route = "teacher-assignment";
  state.filters.assessmentInsight = { assignmentId: "assignment_ood_model" };

  const routes = [];
  const calls = [];
  const app = {
    store: { get: () => state },
    api: {
      async submissionGradingInsight(id) {
        calls.push(["insight", id]);
        return {
          data: {
            assignment: { title: "领域模型设计作业" },
            submission: { studentId: "user_student", submittedAt: "2026-06-20T00:00:00.000Z" },
            recommendation: "评分稳定。"
          }
        };
      },
      async submissionStudentAiEvidence(id) {
        calls.push(["evidence", id]);
        return { data: { items: [{ title: "自检记录", summary: "学生已完成提交前自检。" }] } };
      }
    },
    writeRoute(route) {
      routes.push(route);
    },
    setState(patch) {
      Object.assign(state, patch);
    },
    toast(message) {
      throw new Error(message);
    }
  };

  const handled = await handleTeacherAction(app, {
    dataset: { action: "teacher-load-submission-insight", id: "submission_1" }
  });

  assert.equal(handled, true);
  assert.deepEqual(routes, ["teacher-review"]);
  assert.deepEqual(calls, [["insight", "submission_1"], ["evidence", "submission_1"]]);
  assert.equal(state.route, "teacher-review");
  assert.equal(state.filters.assessmentInsight.submissionId, "submission_1");
  assert.equal(state.assessmentInsight.submissionInsight.aiEvidence.items[0].title, "自检记录");
  const rendered = renderTeacherRoute(state);
  assert.match(rendered, /teacher-app-shell/);
  assert.match(rendered, /批改助手/);
  assert.doesNotMatch(rendered, /assessment-insight|旧工作台/);
});

test("teacher intervention send requires teacher confirmation", async () => {
  const state = createInitialState();
  state.user = { id: "user_teacher", name: "周老师", role: "teacher" };
  state.route = "teacher-intervention";
  state.selected.studentId = "user_student";

  let sent = false;
  let refreshed = false;
  const app = {
    store: { get: () => state },
    api: {
      async createTeacherIntervention() {
        sent = true;
      }
    },
    confirm() {
      return false;
    },
    async refreshApp() {
      refreshed = true;
    },
    toast(message) {
      throw new Error(message);
    }
  };

  const handled = await handleTeacherAction(app, {
    dataset: { action: "teacher-send-intervention", id: "user_student" }
  });

  assert.equal(handled, true);
  assert.equal(sent, false);
  assert.equal(refreshed, false);
});

test("teacher AI actions call services and stay in v11 routes", async () => {
  const state = createInitialState();
  state.user = { id: "user_teacher", name: "周老师", role: "teacher" };
  state.route = "teacher-review";
  state.dashboard = { courses: [{ id: "course_ood", title: "面向对象技术与方法" }] };
  state.assessment.assignments = [{ id: "assignment_ood_model", courseId: "course_ood", title: "领域模型设计作业" }];
  state.selected.assignmentId = "assignment_ood_model";
  const calls = [];
  const routes = [];
  const toasts = [];
  const app = {
    store: { get: () => state },
    api: {
      async reviewSubmissionWithAI(id) {
        calls.push(["ai-review", id]);
        return { data: { ok: true } };
      },
      async submissionGradingInsight(id) {
        calls.push(["insight", id]);
        return { data: { recommendation: "评分稳定。" } };
      },
      async submissionStudentAiEvidence(id) {
        calls.push(["evidence", id]);
        return { data: { items: [] } };
      },
      async adaptivePracticePlan(input) {
        calls.push(["practice-plan", input.courseId, input.questionCount]);
        return { data: { selectedCount: 1, targetCount: 8, estimatedMinutes: 10, strategy: "先复盘顺序图。", questions: [{ concept: "顺序图", stem: "画出一次消息交互。", reason: "薄弱点" }] } };
      },
      async assignmentGradingReport(id, params) {
        calls.push(["assignment-report", id, params.format]);
        return { data: { report: { title: "领域模型设计作业 Grading Report", summary: "ok", generatedAt: "2026-06-21T00:00:00.000Z" } } };
      }
    },
    writeRoute(route) {
      routes.push(route);
    },
    setState(patch) {
      Object.assign(state, patch);
    },
    toast(message) {
      toasts.push(message);
    }
  };

  await handleTeacherAction(app, { dataset: { action: "teacher-run-ai-review", id: "submission_1" } });
  assert.equal(state.route, "teacher-review");
  assert.equal(state.assessmentInsight.submissionInsight.recommendation, "评分稳定。");

  await handleTeacherAction(app, { dataset: { action: "teacher-build-practice-plan" } });
  assert.equal(state.route, "teacher-course");
  assert.equal(selectTeacherCourseModel(state).adaptivePlan.questions[0].concept, "顺序图");

  await handleTeacherAction(app, { dataset: { action: "teacher-generate-assignment-report" } });
  assert.equal(state.route, "teacher-report");
  assert.equal(state.reports.assignmentGrading.report.title, "领域模型设计作业 Grading Report");
  assert.deepEqual(routes, ["teacher-review", "teacher-report"]);
  assert.deepEqual(calls, [
    ["ai-review", "submission_1"],
    ["insight", "submission_1"],
    ["evidence", "submission_1"],
    ["practice-plan", "course_ood", 8],
    ["assignment-report", "assignment_ood_model", "markdown"]
  ]);
  assert.match(toasts.join("\n"), /AI 初评已完成/);
  assert.match(toasts.join("\n"), /补练建议已生成/);
  assert.match(toasts.join("\n"), /作业评阅报告已生成/);
});

test("teacher AI draft confirmations write results back into teacher route state", async () => {
  const state = createInitialState();
  state.user = { id: "user_teacher", name: "周老师", role: "teacher" };
  state.route = "teacher-review";
  state.teacher.ai.drafts = [{
    id: "draft_feedback",
    type: "feedback_draft",
    title: "批改反馈草稿",
    summary: "请补充关键依据。",
    body: "建议补充关键判断依据。",
    structuredPayload: {},
    submissionId: "submission_1"
  }];

  const app = {
    store: { get: () => state },
    api: {
      async saveTeacherAiFeedbackDraft() {
        return {
          data: {
            draft: { ...state.teacher.ai.drafts[0], status: "saved" },
            savedFeedback: {
              submissionId: "submission_1",
              grade: { score: 88 },
              feedbackItem: { summary: "建议补充关键判断依据。" }
            }
          }
        };
      },
      async teacherAiDrafts() {
        return { data: { items: [] } };
      }
    },
    setState(patch) {
      Object.assign(state, patch);
    },
    toast() {},
    patchSaving() {}
  };

  await handleTeacherAction(app, {
    dataset: { action: "teacher-confirm-ai-draft", command: "save-feedback" }
  });

  assert.equal(state.assessmentInsight.submissionInsight.teacherFeedback.grade.score, 88);
  assert.equal(state.assessmentInsight.submissionInsight.recommendation, "请补充关键依据。");

  state.route = "teacher-course";
  state.teacher.ai.drafts = [{
    id: "draft_practice",
    type: "course_practice_plan",
    title: "课程补练草稿",
    summary: "先补顺序图，再补边界识别。",
    body: "安排 6 题短练习。",
    structuredPayload: {}
  }];
  app.api.saveTeacherAiPracticePlanDraft = async () => ({
    data: {
      draft: { ...state.teacher.ai.drafts[0], status: "saved" },
      savedPracticePlan: {
        selectedCount: 2,
        targetCount: 6,
        estimatedMinutes: 18,
        strategy: "先补顺序图，再补边界识别。",
        questions: [{ concept: "顺序图", stem: "题目", reason: "薄弱点" }]
      }
    }
  });

  await handleTeacherAction(app, {
    dataset: { action: "teacher-confirm-ai-draft", command: "save-practice-plan" }
  });

  assert.equal(state.assessmentInsight.adaptivePlan.strategy, "先补顺序图，再补边界识别。");
  assert.equal(state.assessmentInsight.adaptivePlan.questions[0].concept, "顺序图");

  state.route = "teacher-assignment";
  state.teacher.ai.drafts = [{
    id: "draft_commentary",
    type: "assignment_commentary",
    title: "作业讲评草稿",
    summary: "重点讲解概念边界。",
    body: "全班需要补强概念边界与举例。",
    structuredPayload: {}
  }];
  app.api.saveTeacherAiCommentaryDraft = async () => ({
    data: {
      draft: { ...state.teacher.ai.drafts[0], status: "saved" },
      savedCommentary: {
        report: { title: "作业讲评草稿", summary: "重点讲解概念边界。" },
        export: { filename: "commentary.md", format: "markdown", body: "# 作业讲评草稿" }
      }
    }
  });

  await handleTeacherAction(app, {
    dataset: { action: "teacher-confirm-ai-draft", command: "save-commentary" }
  });

  assert.equal(state.reports.exportPreview.report.title, "作业讲评草稿");
  assert.equal(state.reports.assignmentGrading.report.summary, "重点讲解概念边界。");
});

test("teacher selectors localize backend report and intervention copy", () => {
  const state = createInitialState();
  state.user = { id: "user_teacher", name: "周老师", role: "teacher" };
  state.operations.interventionPlan = {
    actions: [{ title: "Recover missing assignment evidence", reason: "1 assignment(s) have no submission evidence.", priority: "high" }]
  };
  state.reports.catalog = {
    reports: [{ title: "Teacher Course Weekly Report", formats: ["json", "markdown"] }]
  };
  state.reports.courseWeekly = {
    report: {
      title: "面向对象技术与方法 Teacher Weekly Report",
      summary: "Weekly course report with assignment progress, grading throughput, practice engagement, collaboration activity, and AI provider status.",
      generatedAt: "2026-06-21T00:00:00.000Z"
    }
  };
  state.reports.assignmentGrading = {
    report: {
      title: "领域模型设计作业 Grading Report",
      summary: "Grading report for 领域模型设计作业, including submission coverage, score distribution, rubric insight, and collaboration evidence.",
      generatedAt: "2026-06-21T00:00:00.000Z"
    }
  };
  state.reports.mistakeReview = {
    report: {
      title: "周老师 Mistake Review Report",
      summary: "Mistake review report with concept-level load, open mistake queue, reviewed items, and mastery alignment.",
      generatedAt: "2026-06-21T00:00:00.000Z"
    }
  };

  const intervention = selectTeacherInterventionModel(state);
  assert.equal(intervention.actions[0].title, "补齐缺失作业证据");
  assert.equal(intervention.actions[0].reason, "1 份作业缺少提交证据。");
  const report = selectTeacherReportModel(state);
  assert.equal(report.catalog[0].title, "教师课程周报");
  assert.equal(report.reports[0].title, "面向对象技术与方法教师周报");
  assert.equal(report.reports[1].title, "领域模型设计作业评阅报告");
  assert.equal(report.reports[2].title, "周老师错题复盘报告");
  assert.doesNotMatch(JSON.stringify(report), /Teacher Weekly Report|Grading Report|Mistake Review Report|Weekly course report|Grading report for/);
});

test("StudentAiAdapter prefers official student AI APIs when available", async () => {
  const calls = [];
  const adapter = new StudentAiAdapter({
    api: {
      async studentAiDailyPlan(input) {
        calls.push(["daily", input.route]);
        return {
          data: {
            type: "daily_plan",
            summary: "official daily",
            actions: [{ label: "查看作业", route: "student-assignments", detail: "优先处理" }],
            risks: [],
            evidence: [],
            questions: [],
            provider: "official-api",
            generatedAt: "2026-06-18T00:00:00.000Z"
          }
        };
      },
      async studentAiWeaknessInsight() {
        calls.push(["weakness"]);
        return {
          data: {
            type: "weakness_insight",
            summary: "official weakness",
            weaknesses: [{ title: "类图关系", score: 62, action: "再练习", evidence: ["错题 3 道"] }],
            actions: [],
            risks: [],
            evidence: [],
            questions: [],
            provider: "official-api",
            generatedAt: "2026-06-18T00:00:00.000Z"
          }
        };
      },
      async studentAiTaskDraft() {
        calls.push(["task"]);
        return {
          data: {
            type: "task_draft",
            summary: "official draft",
            draft: { title: "复习类图关系", type: "练习巩固", estimateMinutes: 30, dueDate: "2026-06-21", goalId: "goal_1", courseId: "course_ood", steps: ["看笔记"], doneDefinition: ["能解释"] },
            actions: [],
            risks: [],
            evidence: [],
            questions: [],
            provider: "official-api",
            generatedAt: "2026-06-18T00:00:00.000Z"
          }
        };
      },
      async studentAiAssignmentGuide() {
        calls.push(["guide"]);
        return {
          data: {
            type: "assignment_guide",
            summary: "official guide",
            outline: ["确认交付物"],
            checklist: ["检查关系说明"],
            actions: [],
            risks: [],
            evidence: [],
            questions: [],
            provider: "official-api",
            generatedAt: "2026-06-18T00:00:00.000Z"
          }
        };
      },
      async studentAiSubmissionCheck() {
        calls.push(["check"]);
        return {
          data: {
            type: "submission_check",
            summary: "official check",
            completionEstimate: 88,
            issues: ["补充关系理由"],
            strengths: ["结构完整"],
            actions: [],
            risks: [],
            evidence: [],
            questions: [],
            provider: "official-api",
            generatedAt: "2026-06-18T00:00:00.000Z"
          }
        };
      },
      async studentAiNoteOrganize() {
        calls.push(["note"]);
        return {
          data: {
            type: "note_organize",
            summary: "official note",
            cards: [{ front: "Q", back: "A" }],
            assignmentParagraphs: ["段落"],
            actions: [],
            risks: [],
            evidence: [],
            questions: [],
            provider: "official-api",
            generatedAt: "2026-06-18T00:00:00.000Z"
          }
        };
      }
    }
  });
  const context = {
    route: "student-ai",
    goals: [{ id: "goal_1", title: "完成 UML 复盘" }],
    assignments: [{ id: "assignment_1", title: "领域模型作业" }],
    submitDraft: { content: "提交正文", attachmentsText: "" },
    noteDraft: { title: "UML", content: "对象协作" }
  };

  const dailyPlan = await adapter.buildDailyPlan(context);
  const weakness = await adapter.buildWeaknessInsight(context);
  const taskDraft = await adapter.draftLearningTask(context);
  const guide = await adapter.guideAssignment(context);
  const check = await adapter.checkSubmissionDraft(context);
  const organize = await adapter.organizeNote(context);

  assert.equal(dailyPlan.provider, "official-api");
  assert.equal(weakness.weaknesses[0].title, "类图关系");
  assert.equal(taskDraft.draft.goalId, "goal_1");
  assert.equal(guide.outline[0], "确认交付物");
  assert.equal(check.completionEstimate, 88);
  assert.equal(organize.cards[0].front, "Q");
  assert.deepEqual(calls.map((entry) => entry[0]), ["daily", "weakness", "task", "guide", "check", "note"]);
});

test("StudentAiAdapter returns structured fallback without throwing", async () => {
  const adapter = new StudentAiAdapter({
    api: {
      async askAI() {
        throw new Error("offline");
      },
      async summarizeNote() {
        throw new Error("offline");
      }
    }
  });
  const context = {
    route: "student-ai",
    user: { id: "user_student", name: "林知夏" },
    goals: [{ id: "goal_1", title: "完成 UML 复盘", targetDate: "2026-06-21" }],
    tasks: [{ id: "task_1", title: "整理顺序图", status: "todo" }],
    assignments: [{ id: "assignment_1", title: "领域模型作业", dueAt: "2026-06-21T23:59:59.000Z" }],
    mistakes: [{ id: "mistake_1", question: { concept: "顺序图", stem: "题目" } }],
    submitDraft: { content: "我的提交草稿", attachmentsText: "" },
    noteDraft: { title: "UML", content: "对象协作", tags: "UML" }
  };

  const dailyPlan = await adapter.buildDailyPlan(context);
  const weakness = await adapter.buildWeaknessInsight(context);
  const taskDraft = await adapter.draftLearningTask(context);
  const guide = await adapter.guideAssignment(context);
  const check = await adapter.checkSubmissionDraft(context);
  const organize = await adapter.organizeNote(context);

  assert.equal(dailyPlan.type, "daily_plan");
  assert.ok(Array.isArray(dailyPlan.actions));
  assert.ok(Array.isArray(weakness.weaknesses));
  assert.ok(taskDraft.draft.title);
  assert.ok(Array.isArray(guide.outline));
  assert.equal(typeof check.completionEstimate, "number");
  assert.ok(Array.isArray(organize.cards));
});

test("TeacherAiAdapter prefers official teacher AI APIs when available", async () => {
  const adapter = new TeacherAiAdapter({
    api: {
      async teacherAiTeachingPlan() {
        return {
          data: {
            id: "teacher_ai_result_1",
            summary: "先批改，再干预。",
            actions: [{ id: "a1", label: "打开批改页", route: "teacher-review", type: "generate", kind: "navigate" }],
            risks: ["风险学生需要二次核对。"],
            evidence: ["待批改 4 份"],
            draft: { title: "今日教学方案", body: "1. 先批改。\n2. 再看风险学生。" },
            provider: "official-api",
            generatedAt: "2026-06-21T00:00:00.000Z"
          }
        };
      }
    }
  });

  const result = await adapter.buildTeachingPlan({ route: "teacher-home", evidence: ["待批改 4 份"] });
  assert.equal(result.summary, "先批改，再干预。");
  assert.equal(result.actions[0].route, "teacher-review");
  assert.equal(result.draft.title, "今日教学方案");
});

test("TeacherAiAdapter returns structured fallback without throwing", async () => {
  const adapter = new TeacherAiAdapter({
    api: {
      async askAI() {
        throw new Error("offline");
      }
    }
  });

  const result = await adapter.buildStudentIntervention({
    route: "teacher-student",
    courseId: "course_ood",
    studentId: "user_student",
    studentName: "林知夏"
  });

  assert.equal(result.type, "student_intervention");
  assert.equal(result.draft.studentId, "user_student");
  assert.ok(Array.isArray(result.actions));
});

test("teacher AI panel exposes route-specific quick commands", () => {
  const state = createInitialState();
  state.user = { id: "user_teacher", name: "周老师", role: "teacher" };
  state.dashboard = { courses: [{ id: "course_ood", title: "面向对象技术与方法" }], assignments: [] };
  state.assessment.assignments = [{ id: "assignment_1", courseId: "course_ood", title: "领域模型设计作业" }];
  state.analytics.selectedStudent = {
    student: { id: "user_student", name: "林知夏", ai: { completionRate: 75 }, risk: { level: "medium" } },
    recommendations: ["先检查自检证据。"]
  };
  state.teacher.ai.resultsByRoute = {
    "teacher-home": { summary: "home result", draft: { title: "今日教学方案" } },
    "teacher-student": { summary: "student result", draft: { title: "学生干预草稿" } }
  };

  const homePanel = selectTeacherAiPanelModel({ ...state, route: "teacher-home" }, "teacher-home");
  const studentPanel = selectTeacherAiPanelModel({ ...state, route: "teacher-student" }, "teacher-student");

  assert.equal(homePanel.commands[0].label, "生成今日方案");
  assert.equal(studentPanel.commands[0].label, "生成干预草稿");
});

test("student runtime can auto-hydrate default AI cards for student routes", async () => {
  const state = createInitialState();
  state.user = { id: "user_student", name: "林知夏", role: "student", avatar: "夏" };
  state.route = "student-assignment-detail";
  state.dashboard = {
    courses: [{ id: "course_ood", title: "面向对象技术与方法" }],
    goals: [{ id: "goal_1", courseId: "course_ood", title: "完成 UML 复盘", targetDate: "2026-06-21" }],
    tasks: [{ id: "task_1", goalId: "goal_1", title: "整理顺序图", status: "todo" }],
    notes: [],
    assignments: [{ id: "assignment_1", courseId: "course_ood", title: "领域模型作业", dueAt: "2026-06-21T23:59:59.000Z" }]
  };
  state.assessment.assignmentDetail = {
    assignment: { id: "assignment_1", courseId: "course_ood", title: "领域模型作业", description: "提交 UML 图", dueAt: "2026-06-21T23:59:59.000Z" },
    submissions: [],
    rubric: null,
    submissionSummary: { submitted: 0, graded: 0 }
  };
  state.assessment.mistakes = [{ id: "mistake_1", question: { concept: "顺序图", stem: "题目" }, status: "open" }];

  const store = { current: state };
  const app = {
    api: {
      async askAI() {
        throw new Error("offline");
      },
      async summarizeNote() {
        throw new Error("offline");
      }
    },
    store: {
      get() {
        return store.current;
      }
    },
    setState(patch) {
      store.current = { ...store.current, ...patch };
    }
  };

  await hydrateStudentWorkspace(app, state);

  assert.equal(store.current.student.ai.dailyPlan?.type, "daily_plan");
  assert.equal(store.current.student.ai.assignmentGuide?.type, "assignment_guide");
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
  const sampleReport = {
    report: {
      id: "report_1",
      type: "student-weekly",
      title: "Student Weekly",
      generatedAt: "2026-06-16T00:00:00.000Z",
      summary: "Structured weekly report.",
      metrics: [{ label: "Open mistakes", value: 1 }],
      sections: [{ title: "Progress", body: "Stable", items: ["Review UML"] }],
      recommendations: ["Keep evidence traceable."],
      tables: [{ title: "Rows", columns: [{ key: "name", label: "Name" }], rows: [{ name: "A" }] }]
    }
  };
  state.reports.catalog = { reports: [{ key: "student-weekly", title: "Student Weekly", roles: ["student"], formats: ["markdown"] }] };
  state.reports.studentWeekly = sampleReport;
  state.reports.courseWeekly = { report: { ...sampleReport.report, id: "report_2", type: "course-weekly", title: "Course Weekly" } };
  state.reports.assignmentGrading = { report: { ...sampleReport.report, id: "report_3", type: "assignment-grading", title: "Assignment Grading" } };
  state.reports.mistakeReview = { report: { ...sampleReport.report, id: "report_4", type: "mistake-review", title: "Mistake Review" } };
  state.reports.aiUsage = { report: { ...sampleReport.report, id: "report_5", type: "ai-usage", title: "AI Usage" } };
  state.reports.exportPreview = { export: { filename: "report.md", contentType: "text/markdown", format: "markdown", body: "# Report" } };
  state.identityAdmin.users = [
    { id: "user_student", name: "Student", role: "student", email: "student@edumind.local", status: "active", department: "CS", major: "SE", classroomCount: 1, groupCount: 1 },
    { id: "user_teacher", name: "Teacher", role: "teacher", email: "teacher@edumind.local", status: "active", department: "CS", classroomCount: 1, groupCount: 0 }
  ];
  state.identityAdmin.classrooms = [
    { id: "class_ood_01", name: "Object-Oriented Class 01", courseId: "course_ood", courseTitle: "Object-Oriented Technology", description: "Classroom", status: "active", capacity: 60, stats: { studentCount: 1, teacherCount: 1, groupCount: 1, fillRate: 3 } }
  ];
  state.identityAdmin.groups = [
    { id: "group_ood_alpha", classroomId: "class_ood_01", name: "OO Design Alpha", leaderId: "user_student", description: "Group", status: "active", tags: ["design"], stats: { memberCount: 1, leaderName: "Student" } }
  ];
  state.identityAdmin.selectedProfile = {
    user: state.identityAdmin.users[0],
    enrollments: [{ classroomId: "class_ood_01", role: "student", status: "active", joinedAt: "2026-06-16", classroom: state.identityAdmin.classrooms[0] }],
    groups: [{ groupId: "group_ood_alpha", role: "leader", status: "active", joinedAt: "2026-06-16", group: state.identityAdmin.groups[0] }]
  };
  state.identityAdmin.classroomDetail = {
    classroom: state.identityAdmin.classrooms[0],
    enrollments: [{ userId: "user_student", role: "student", status: "active", source: "seed", user: state.identityAdmin.users[0] }],
    groups: state.identityAdmin.groups
  };
  state.identityAdmin.roleMatrix = {
    roles: ["student", "teacher", "admin"],
    matrix: [
      { role: "student", resources: [{ resource: "learning", actions: ["read:self"], description: "Student learning scope" }] },
      { role: "teacher", resources: [{ resource: "classroom", actions: ["create:class", "assign:student"], description: "Teacher class scope" }] }
    ]
  };
  state.identityAdmin.dashboard = { metrics: { userCount: 2, studentCount: 1, teacherCount: 1, classroomCount: 1, groupCount: 1, enrollmentCount: 2 } };
  state.operations.catalog = {
    importTargets: [{ key: "portfolioEvidence", required: ["studentId", "courseId", "summary"], optional: ["score"], identity: "summary" }],
    jobTypes: [{ key: "portfolio-refresh", stepCount: 4, steps: ["collect-evidence", "recompute-quality"] }],
    auditSeverities: ["info", "warning", "critical"]
  };
  state.operations.dashboard = {
    metrics: { importBatchCount: 1, committedImportCount: 0, queuedJobCount: 1, completedJobCount: 1, auditEventCount: 2, criticalAuditCount: 0 }
  };
  state.operations.imports = [{
    id: "import_1",
    title: "Portfolio evidence import",
    target: "portfolioEvidence",
    courseId: "course_ood",
    status: "validated",
    summary: { totalRows: 1, validRows: 1, errorRows: 0 },
    createdAt: "2026-06-16T00:00:00.000Z"
  }];
  state.operations.selectedImport = {
    batch: state.operations.imports[0],
    rows: [{ id: "row_1", rowNumber: 1, externalId: "e1", status: "valid", normalized: { studentId: "user_student", summary: "Evidence" }, errors: [], warnings: [] }]
  };
  state.operations.jobs = [{
    id: "job_1",
    title: "Portfolio refresh",
    type: "portfolio-refresh",
    courseId: "course_ood",
    status: "queued",
    priority: "normal",
    progress: 0,
    steps: [{ id: "step_1", key: "collect-evidence" }],
    updatedAt: "2026-06-16T00:00:00.000Z"
  }];
  state.operations.selectedJob = {
    job: state.operations.jobs[0],
    steps: [{ id: "step_1", order: 1, key: "collect-evidence", title: "Collect evidence", status: "pending", output: {} }]
  };
  state.operations.audits = [{ id: "audit_1", action: "operations.import.previewed", resourceType: "import-batch", resourceId: "import_1", actorId: "user_teacher", severity: "info", summary: "Previewed import.", createdAt: "2026-06-16T00:00:00.000Z" }];
  state.operations.auditDigest = { total: 1, bySeverity: [{ severity: "info", count: 1 }], recommendations: ["Audit trail is stable."] };
  state.operations.deepPortfolio = {
    quality: { overallScore: 82, tone: "stable", dimensions: [{ key: "completion", label: "Completion", score: 90, evidence: ["assignment_1"] }] },
    defenseNarrative: { headline: "Portfolio score 82", paragraphs: ["Evidence is balanced."] }
  };
  state.operations.evidenceMap = { totalEvidence: 5, gaps: [{ message: "Add reviewed mistake evidence." }] };
  state.operations.interventionPlan = { actionCount: 1, actions: [{ priority: "medium", title: "Review UML", reason: "Weak concept", evidence: ["mistake_1"] }] };
  state.operations.portfolioBoard = { totalStudents: 1, averageQualityScore: 82 };
  state.settings.health = { service: "gateway-service", status: "up", time: "2026-06-16T00:00:00.000Z", services: [] };
  state.settings.modelConfig = buildModelConfig(state.provider);
  const renderedWorkbench = workbenchView(state);
  assert.match(renderedWorkbench, /学习漏斗/);
  const renderedKnowledge = knowledgeView(state);
  assert.match(renderedKnowledge, /知识关联/);
  const renderedAssessmentInsight = assessmentInsightView(state);
  assert.match(renderedAssessmentInsight, /教师评分洞察/);
  const renderedReports = reportView(state);
  assert.match(renderedReports, /报告目录/);
  assert.match(renderedReports, /导出预览/);
  const renderedIdentity = identityAdminView(state);
  assert.match(renderedIdentity, /用户目录/);
  assert.match(renderedIdentity, /角色权限矩阵/);
  const renderedOperations = operationsView(state);
  assert.match(renderedOperations, /导入预览/);
  assert.match(renderedOperations, /审计摘要/);
  assert.match(renderedOperations, /学习档案深度分析/);

  assert.match(assignmentManageView(state), /作业列表/);
  assert.match(questionBankManageView(state), /题库列表/);
  assert.match(practiceView(state), /练习历史/);
  assert.match(analyticsView(state), /课程统计/);
  assert.match(settingsView(state), /模型配置说明/);
  state.route = "student-ai";
  state.assessment.assignmentDetail = { assignment: state.assessment.assignments[0], submissions: [], rubric: null, submissionSummary: { submitted: 0, graded: 0 } };
  state.assessmentInsight.mistakeDetail = { question: { stem: "错题", answer: "A", analysis: "解析" }, answer: { answer: "B" }, remediation: { advice: "复盘。" } };
  state.student.ai.dailyPlan = { summary: "先完成任务。", actions: [], risks: [], evidence: [], questions: [] };
  state.student.ai.weaknessInsight = { summary: "薄弱点", actions: [], risks: [], evidence: [], questions: [], weaknesses: [{ title: "顺序图", score: 55, action: "再做题", evidence: ["题目"] }] };
  state.student.ai.assignmentGuide = { summary: "拆解作业", actions: [], risks: [], evidence: [], questions: [], outline: ["步骤"], checklist: ["检查"] };
  state.student.ai.submissionCheck = { summary: "自检", actions: [], risks: [], evidence: [], questions: [], completionEstimate: 80, issues: [], strengths: [] };
  state.student.ai.noteOrganizeResult = { summary: "整理完成", actions: [], risks: [], evidence: [], questions: [], cards: [{ front: "Q", back: "A" }], assignmentParagraphs: ["段落"] };
  state.student.notes.editorDraft = { title: "UML", content: "对象协作", tags: "UML" };
  state.student.assignments.submitDraft = { assignmentId: "assignment_1", content: "提交正文", attachmentsText: "diagram.png: https://demo.local/file.png", updatedAt: "2026-06-18T00:00:00.000Z" };
  state.assessment.questionBanks = [{ id: "bank_1", title: "题库", courseId: "course_ood", description: "说明" }];
  state.assessment.practiceHistory = [{ id: "practice_1", correctRate: 80, startedAt: "2026-06-18T00:00:00.000Z" }];
  state.assessment.practiceSession = { id: "practice_1", questions: [{ id: "q_1", stem: "题干", choices: [{ id: "A", text: "选项A" }] }], answers: [] };

  assert.match(studentAiView(state), /AI 快捷指令/);
  assert.match(studentAiInsightView(state), /薄弱点排序/);
  assert.match(studentLearningView(state), /任务规划区/);
  assert.match(studentTaskDetailView(state), /任务详情/);
  assert.match(studentAssignmentsView(state), /作业三视图/);
  assert.match(studentAssignmentDetailView(state), /作业要求/);
  assert.match(studentSubmitView(state), /提交内容/);
  assert.match(studentSubmitPreviewView(state), /提交预览/);
  assert.match(studentSubmitSuccessView(state), /提交成功/);
  assert.match(studentAssignmentHistoryView(state), /作业历史/);
  assert.match(studentFeedbackView(state), /教师反馈/);
  assert.match(studentPracticeView(state), /练习入口/);
  assert.match(studentPracticeSessionView(state), /答题卡/);
  assert.match(studentPracticeResultView(state), /练习结果/);
  assert.match(studentMistakeDetailView(state), /错题详情/);
  assert.match(studentNotesView(state), /当前课程笔记/);
  assert.match(studentNoteEditorView(state), /笔记编辑/);
  assert.match(studentNoteAiResultView(state), /AI 整理结果/);
});

test("student detail views escape untrusted HTML content", () => {
  const state = createInitialState();
  state.user = { id: "user_student", name: "林知夏", role: "student" };
  state.assessment.assignmentDetail = {
    assignment: { id: "assignment_1", courseId: "course_ood", title: "<img src=x onerror=1>", description: "<script>alert(1)</script>", dueAt: "2026-06-21" },
    submissions: [{ submittedAt: "<b>now</b>", content: "<svg/onload=1>" }],
    rubric: null,
    submissionSummary: { submitted: 1, graded: 0 }
  };
  state.assessmentInsight.mistakeDetail = {
    question: { stem: "<iframe>", answer: "<bad>", analysis: "<unsafe>" },
    answer: { answer: "<mine>" },
    remediation: { advice: "<advice>" }
  };
  state.student.ai.weaknessInsight = {
    summary: "ok",
    actions: [],
    risks: [],
    evidence: [],
    questions: [],
    weaknesses: [{ title: "<weak>", score: 55, action: "<fix>", evidence: ["<proof>"] }]
  };
  state.student.ai.noteOrganizeResult = {
    summary: "ok",
    actions: [{ label: "查看", route: 'student-assignments" autofocus data-pwn="1', detail: '" onclick="evil()' }],
    risks: [],
    evidence: [],
    questions: [],
    cards: [{ front: "<front>", back: "<back>" }],
    assignmentParagraphs: ["<para>"]
  };
  state.student.assignments.submitDraft = {
    assignmentId: "assignment_1",
    content: "<draft>",
    attachmentsText: "file:<unsafe>",
    updatedAt: "2026-06-18T00:00:00.000Z"
  };
  state.student.assignments.lastSubmission = {
    id: '<submission" data-bad="1>',
    submittedAt: "<just-now>"
  };
  state.assessment.practiceSession = {
    id: "practice_1",
    questions: [{ id: "q_1", stem: "题干", choices: [] }],
    answers: []
  };

  const renderedDetail = studentAssignmentDetailView(state);
  const renderedInsight = studentAiInsightView(state);
  const renderedPreview = studentSubmitPreviewView(state);
  const renderedMistake = studentMistakeDetailView(state);
  const renderedNotes = studentNoteAiResultView(state);
  const renderedSuccess = studentSubmitSuccessView(state);
  const renderedSession = studentPracticeSessionView(state);

  assert.doesNotMatch(renderedDetail, /<script>|<img|<svg|<b>now<\/b>/);
  assert.match(renderedDetail, /&lt;img src=x onerror=1&gt;/);
  assert.doesNotMatch(renderedInsight, /<weak>|<fix>|<proof>/);
  assert.match(renderedInsight, /&lt;weak&gt;/);
  assert.doesNotMatch(renderedPreview, /<draft>|<unsafe>/);
  assert.match(renderedPreview, /&lt;draft&gt;/);
  assert.doesNotMatch(renderedMistake, /<iframe>|<advice>/);
  assert.match(renderedMistake, /&lt;iframe&gt;/);
  assert.doesNotMatch(renderedNotes, /<front>|<para>/);
  assert.match(renderedNotes, /&lt;front&gt;/);
  assert.doesNotMatch(renderedNotes, /data-route="student-assignments" autofocus|data-detail="" onclick=/);
  assert.match(renderedNotes, /data-route="student-assignments&quot; autofocus data-pwn=&quot;1"/);
  assert.doesNotMatch(renderedSuccess, /<li[^>]+data-bad=|<just-now>/);
  assert.match(renderedSuccess, /&lt;submission&quot; data-bad=&quot;1&gt;/);
  assert.match(renderedSession, /data-index="0"/);
});

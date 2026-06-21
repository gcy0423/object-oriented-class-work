import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../client/src/state/appState.js";
import { studentActionCards } from "../client/src/widgets/studentActionCards.js";
import { attr, escapeHtml } from "../client/src/utils/dom.js";
import {
  aiResultBlock,
  assignmentCard,
  chip,
  courseTabs,
  emptyBlock,
  listCards,
  noteCard,
  percentText,
  studentHero,
  studentSection,
  taskCard
} from "../client/src/views/student/shared.js";
import {
  actionRow,
  cardList,
  metricStrip,
  panel,
  teacherEmpty
} from "../client/src/views/teacher/shared.js";
import {
  buildStudentAiPanelModel,
  selectStudentAiContext,
  selectStudentAssignmentDetailModel,
  selectStudentAssignmentsModel,
  selectStudentHomeModel,
  selectStudentLearningModel,
  selectStudentMistakeDetailModel,
  selectStudentNotesModel,
  selectStudentPracticeModel,
  selectStudentPracticeResultModel,
  selectStudentPracticeSessionModel,
  selectStudentSubmitModel
} from "../client/src/state/studentSelectors.js";
import {
  selectTeacherAiContext,
  selectTeacherAiPanelModel,
  selectTeacherAssignmentModel,
  selectTeacherCourseModel,
  selectTeacherHomeModel,
  selectTeacherInterventionModel,
  selectTeacherReportModel,
  selectTeacherReviewModel,
  selectTeacherStudentModel
} from "../client/src/state/teacherSelectors.js";

function buildState() {
  const state = createInitialState();
  state.user = { id: "user_student", role: "student", name: "林知夏", avatar: "夏" };
  state.route = "student-ai";
  state.dashboard = {
    courses: [
      { id: "course_ood", title: "面向对象技术与方法", description: "课程说明" },
      { id: "course_ai", title: "AI 工程实践", description: "第二门课" }
    ],
    goals: [
      { id: "goal_1", courseId: "course_ood", title: "掌握顺序图", targetDate: "2026-06-30" },
      { id: "goal_2", courseId: "course_ai", title: "理解 RAG", targetDate: "2026-07-02" }
    ],
    tasks: [
      { id: "task_1", goalId: "goal_1", title: "复盘 lifeline", status: "todo", estimateMinutes: 45, dueDate: "2026-06-22" },
      { id: "task_2", goalId: "goal_1", title: "画顺序图", status: "done", estimateMinutes: 60, dueDate: "2026-06-23" }
    ],
    notes: [
      { id: "note_1", courseId: "course_ood", title: "课堂笔记", content: "对象协作与消息。", tags: ["UML"], createdAt: "2026-06-20T00:00:00.000Z", updatedAt: "2026-06-21T00:00:00.000Z" }
    ],
    assignments: [
      { id: "assignment_1", courseId: "course_ood", title: "领域模型作业", description: "画图并说明", dueAt: "2026-06-22T00:00:00.000Z", status: "published" },
      { id: "assignment_2", courseId: "course_ai", title: "RAG 作业", description: "说明检索策略", dueAt: "2026-06-28T00:00:00.000Z", status: "published" }
    ],
    metrics: { activeGoals: 2, completionRate: 50, studyMinutes: 120, noteCount: 1 }
  };
  state.assessment.assignments = state.dashboard.assignments;
  state.assessment.assignmentDetail = {
    assignment: state.dashboard.assignments[0],
    submissions: [{ id: "submission_1", studentId: "user_student", content: "提交内容", status: "submitted", submittedAt: "2026-06-21T12:00:00.000Z" }],
    rubric: { id: "rubric_1" },
    submissionSummary: { submitted: 1, graded: 0 }
  };
  state.assessment.questionBanks = [{ id: "bank_1", courseId: "course_ood", title: "顺序图题库", description: "基础题" }];
  state.assessment.practiceHistory = [{ id: "practice_1", courseId: "course_ood", correctRate: 80, startedAt: "2026-06-20T08:00:00.000Z", status: "finished" }];
  state.assessment.practiceSession = {
    id: "practice_1",
    questions: [{ id: "q_1", stem: "解释 lifeline", choices: [] }, { id: "q_2", stem: "解释消息", choices: [] }],
    answers: [{ questionId: "q_1", answer: "对象时间线" }]
  };
  state.assessment.mistakes = [{ id: "mistake_1", courseId: "course_ood", question: { concept: "顺序图", stem: "解释对象协作" }, status: "open" }];
  state.assessmentInsight.mistakeDetail = {
    question: { stem: "题干", answer: "A", analysis: "解析" },
    answer: { answer: "B" },
    remediation: { advice: "复盘概念边界。" }
  };
  state.assessmentInsight.sessionReview = { correctRate: 50, nextActions: ["复盘错题"] };
  state.student.learning.selectedCourseId = "course_ood";
  state.student.notes.selectedCourseId = "course_ood";
  state.student.notes.editorDraft = { title: "课堂笔记", content: "对象协作与消息", tags: "UML,Design" };
  state.student.assignments.mode = "deadline";
  state.student.assignments.submitDraft = {
    assignmentId: "assignment_1",
    content: "提交正文",
    attachmentsText: "diagram.png: https://demo.local/diagram.png",
    updatedAt: "2026-06-21T00:00:00.000Z"
  };
  state.student.practice.focusedQuestionIndex = 1;
  state.student.practice.result = { correctRate: 80 };
  state.student.ai.dailyPlan = { summary: "先处理课堂任务。", actions: [{ label: "去学习页", route: "student-learning" }], risks: ["今天任务较多。"] };
  state.student.ai.weaknessInsight = { summary: "顺序图较弱。", actions: [{ label: "去练习", route: "student-practice" }], risks: ["错题未复盘"], weaknesses: [{ title: "顺序图", score: 55, action: "再做题" }] };
  state.student.ai.assignmentGuide = { summary: "先读要求。", actions: [], risks: [], outline: ["读要求"], checklist: ["查 rubric"] };
  state.student.ai.submissionCheck = { summary: "可再补证据。", actions: [], risks: [], completionEstimate: 75, issues: [{ title: "缺依据" }], strengths: ["结构清楚"] };
  state.student.ai.noteOrganizeResult = { summary: "已整理。", actions: [], risks: [], cards: [{ front: "Q", back: "A" }], assignmentParagraphs: ["Para"] };
  state.user = { id: "user_teacher", role: "teacher", name: "周老师", avatar: "周" };
  state.identityAdmin.users = [{ id: "user_student", name: "林知夏", role: "student", email: "student@edumind.local", status: "active" }];
  state.analytics.selectedStudent = {
    student: { id: "user_student", name: "林知夏", ai: { completionRate: 75 }, risk: { level: "medium" } },
    recommendations: ["需要跟进"]
  };
  state.analytics.selectedStudentAiResults = [{ result: { summary: "AI result" }, summary: "AI result" }];
  state.analytics.selectedStudentAiTimeline = [{ summary: "Timeline item" }];
  state.assessmentInsight.riskRegister = { items: [{ studentId: "user_student", risk: { level: "medium" }, assignmentCompletionRate: 80, openMistakes: 2, weakConcepts: [{ concept: "顺序图" }] }] };
  state.assessmentInsight.gradingOverview = { submissionCount: 1, gradedCount: 0, average: 88, consistency: { status: "stable" }, rows: [{ studentName: "林知夏", teacherScore: 90, aiScore: 87, band: "normal" }] };
  state.assessmentInsight.submissionInsight = { recommendation: "Check difference", comparison: [{ metric: "gap", teacher: 90, risk: "warning" }], aiEvidence: { items: [{ summary: "self-check" }] } };
  state.assessmentInsight.courseReport = { assignmentCount: 2, submissionCount: 1, masteryCoverage: { averageMastery: 80 }, mistakeLoad: { openMistakes: 1 } };
  state.workbench.courseDeepReport = { mastery: { concepts: [{ concept: "顺序图", score: 80 }] } };
  state.operations.interventionPlan = { actions: [{ title: "提醒复盘", priority: "medium", reason: "错题积压" }] };
  state.reports.catalog = { reports: [{ title: "Student Weekly Report", formats: ["markdown"] }] };
  state.reports.courseWeekly = { report: { title: "Teacher Course Weekly Report", summary: "weekly", generatedAt: "2026-06-21T00:00:00.000Z" } };
  state.teacher.ai.resultsByRoute = {
    "teacher-home": { summary: "home ai", actions: [] },
    "teacher-student": { summary: "student ai", actions: [] },
    "teacher-review": { summary: "review ai", actions: [] }
  };
  state.teacher.ai.drafts = [
    { id: "draft_1", type: "student_intervention", status: "draft", title: "Intervention draft" },
    { id: "draft_2", type: "feedback_draft", status: "saved", title: "Feedback draft" }
  ];
  return state;
}

test("DOM helpers escape html and attributes safely", () => {
  assert.equal(escapeHtml(`<script>alert("x")</script>`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  assert.equal(attr(`student-ai" onclick="hack()`), "student-ai&quot; onclick=&quot;hack()");
});

test("student shared view helpers render stable markup", () => {
  const hero = studentHero("AI 学习台", "今天先复盘课堂内容。", [{ label: "任务", value: "2" }]);
  const section = studentSection("今日任务", "<div>body</div>", "<button>go</button>");
  const tabHtml = courseTabs([{ id: "course_1", title: "课程一" }, { id: "course_2", title: "课程二" }], "course_2");
  const assign = assignmentCard({ id: "assignment_1", title: "作业", description: "说明", dueAt: "2026-06-22T00:00:00.000Z", urgency: "high", courseTitle: "课程一" });
  const task = taskCard({ id: "task_1", title: "任务", status: "todo", estimateMinutes: 45, dueDate: "2026-06-22" });
  const note = noteCard({ id: "note_1", title: "笔记", content: "内容", updatedAt: "2026-06-21T00:00:00.000Z" });
  const ai = aiResultBlock({ id: "result_1", summary: "summary", actions: [{ id: "a1", label: "Do", route: "student-learning" }], evidence: ["e1"], risks: ["r1"], questions: [{ text: "q1" }] });
  const empty = emptyBlock("暂无内容");
  const list = listCards([{ id: "x" }], (item) => `<article>${item.id}</article>`);
  const chips = chip("active", "active");

  assert.match(hero, /AI 学习台/);
  assert.match(hero, /今天先复盘课堂内容/);
  assert.match(section, /今日任务/);
  assert.match(section, /<div>body<\/div>/);
  assert.match(tabHtml, /is-active/);
  assert.match(assign, /截止 2026-06-22/);
  assert.match(task, /完成任务/);
  assert.match(note, /查看\/编辑/);
  assert.match(ai, /可继续追问/);
  assert.match(empty, /暂无内容/);
  assert.match(list, /<article>x<\/article>/);
  assert.match(chips, /student-chip active/);
  assert.equal(percentText(82), "82%");
});

test("teacher shared view helpers render empty, metrics, action rows, and panel", () => {
  const empty = teacherEmpty("暂无数据");
  const metrics = metricStrip([{ label: "待批改", value: 3 }, { label: "高风险", value: 2 }]);
  const actions = actionRow([{ label: "回到批改", action: "teacher-route", route: "teacher-review" }]);
  const renderedPanel = panel({ eyebrow: "教师 AI", title: "批改助手", text: "先看评分差异", actions: [{ label: "去批改", action: "teacher-route", route: "teacher-review" }], body: "<div>Body</div>" });
  const cards = cardList([{ title: "Card 1" }], (item) => `<article>${item.title}</article>`, "空");
  const noCards = cardList([], (item) => `<article>${item.title}</article>`, "空");

  assert.match(empty, /暂无数据/);
  assert.match(metrics, /待批改/);
  assert.match(metrics, /3/);
  assert.match(actions, /data-route="teacher-review"/);
  assert.match(renderedPanel, /教师 AI/);
  assert.match(renderedPanel, /批改助手/);
  assert.match(renderedPanel, /<div>Body<\/div>/);
  assert.match(cards, /Card 1/);
  assert.match(noCards, /空/);
});

test("student selector matrix adapts panel source by route", () => {
  const state = buildState();

  state.route = "student-learning";
  assert.match(buildStudentAiPanelModel(state).summary, /当前有|任务/);

  state.route = "student-assignment-detail";
  assert.equal(buildStudentAiPanelModel(state).summary, "可再补证据。");

  state.route = "student-submit";
  assert.equal(buildStudentAiPanelModel(state).summary, "可再补证据。");

  state.route = "student-practice";
  assert.equal(buildStudentAiPanelModel(state).summary, "顺序图较弱。");

  state.route = "student-note-editor";
  assert.equal(buildStudentAiPanelModel(state).summary, "已整理。");

  state.route = "student-ai";
  assert.equal(buildStudentAiPanelModel(state).summary, "先处理课堂任务。");
});

test("student selectors return coherent models across learning assignment practice and notes", () => {
  const state = buildState();
  state.user = { id: "user_student", role: "student", name: "林知夏", avatar: "夏" };
  state.route = "student-ai";

  const home = selectStudentHomeModel(state);
  const learning = selectStudentLearningModel(state);
  const assignments = selectStudentAssignmentsModel(state);
  const assignmentDetail = selectStudentAssignmentDetailModel(state);
  const submit = selectStudentSubmitModel(state);
  const practice = selectStudentPracticeModel(state);
  const session = selectStudentPracticeSessionModel(state);
  const result = selectStudentPracticeResultModel(state);
  const mistake = selectStudentMistakeDetailModel(state);
  const notes = selectStudentNotesModel(state);
  const context = selectStudentAiContext(state, "student-submit");

  assert.equal(home.goals.length, 2);
  assert.equal(home.nextActions.length, 1);
  assert.equal(learning.selectedCourse.id, "course_ood");
  assert.equal(learning.tasks.length, 2);
  assert.equal(assignments.deadlineList.length, 2);
  assert.equal(assignments.byCourse.length, 2);
  assert.equal(assignmentDetail.assignment.id, "assignment_1");
  assert.equal(submit.draft.attachmentHints.length, 1);
  assert.equal(practice.banks.length, 1);
  assert.equal(practice.mistakes.length, 1);
  assert.equal(session.currentQuestion.id, "q_2");
  assert.equal(session.answeredCount, 1);
  assert.equal(result.correctRate, 80);
  assert.equal(mistake.question.stem, "题干");
  assert.equal(notes.selectedNote.id, "note_1");
  assert.equal(context.assignments.length, 2);
  assert.equal(context.noteDraft.title, "课堂笔记");
});

test("teacher selector matrix returns route-specific contexts and panel commands", () => {
  const state = buildState();

  const homeContext = selectTeacherAiContext(state, "teacher-home");
  const studentContext = selectTeacherAiContext(state, "teacher-student");
  const assignmentContext = selectTeacherAiContext(state, "teacher-assignment");
  const reviewContext = selectTeacherAiContext(state, "teacher-review");
  const courseContext = selectTeacherAiContext(state, "teacher-course");
  const reportContext = selectTeacherAiContext(state, "teacher-report");

  assert.equal(homeContext.type, "teaching_plan");
  assert.equal(studentContext.type, "student_intervention");
  assert.equal(assignmentContext.type, "assignment_commentary");
  assert.equal(reviewContext.type, "feedback_draft");
  assert.equal(courseContext.type, "course_practice_plan");
  assert.equal(reportContext.type, "report_summary");

  assert.equal(selectTeacherAiPanelModel(state, "teacher-home").commands.length, 2);
  assert.equal(selectTeacherAiPanelModel(state, "teacher-student").title, "学生干预助手");
  assert.equal(selectTeacherAiPanelModel(state, "teacher-assignment").title, "作业助手");
  assert.equal(selectTeacherAiPanelModel(state, "teacher-review").title, "批改助手");
  assert.equal(selectTeacherAiPanelModel(state, "teacher-course").title, "课程学情助手");
  assert.equal(selectTeacherAiPanelModel(state, "teacher-intervention").title, "干预助手");
  assert.equal(selectTeacherAiPanelModel(state, "teacher-report").title, "报告助手");
  assert.equal(selectTeacherAiPanelModel(state, "teacher-settings").title, "账号助手");
});

test("teacher selectors return coherent home course student review intervention and report models", () => {
  const state = buildState();

  const home = selectTeacherHomeModel(state);
  const course = selectTeacherCourseModel(state);
  const student = selectTeacherStudentModel(state);
  const assignment = selectTeacherAssignmentModel(state);
  const review = selectTeacherReviewModel(state);
  const intervention = selectTeacherInterventionModel(state);
  const report = selectTeacherReportModel(state);

  assert.equal(home.metrics.length, 4);
  assert.equal(home.tasks.length, 3);
  assert.equal(course.metrics.length, 4);
  assert.equal(course.mastery.length, 1);
  assert.equal(student.name, "林知夏");
  assert.equal(student.metrics.length, 4);
  assert.equal(student.aiResults.length, 1);
  assert.equal(assignment.submissions.length, 1);
  assert.equal(assignment.rows.length, 1);
  assert.equal(review.comparisons.length, 1);
  assert.equal(review.evidence.length, 1);
  assert.equal(intervention.actions.length, 1);
  assert.equal(report.catalog.length, 1);
  assert.equal(report.reports.length, 1);
});

test("student action cards and AI result block escape untrusted text", () => {
  const cards = studentActionCards([
    {
      id: 'a1" autofocus data-bad="1',
      label: "<script>alert(1)</script>",
      route: 'student-ai" onclick="evil()',
      detail: "<img src=x onerror=1>",
      kind: "navigate",
      status: "open"
    }
  ]);
  const block = aiResultBlock({
    id: "result_1",
    summary: "<script>summary</script>",
    actions: [],
    evidence: ["<b>e1</b>"],
    risks: ["<i>r1</i>"],
    questions: [{ text: "<u>q1</u>" }]
  });

  assert.doesNotMatch(cards, /<script>|<img/);
  assert.match(cards, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(cards, /data-route="student-ai&quot; onclick=&quot;evil\(\)"/);
  assert.match(cards, /data-detail="&lt;img src=x onerror=1&gt;"/);
  assert.doesNotMatch(block, /<script>|<b>|<i>|<u>/);
  assert.match(block, /&lt;script&gt;summary&lt;\/script&gt;/);
});

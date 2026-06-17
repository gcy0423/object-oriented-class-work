import assert from "node:assert/strict";
import test from "node:test";
import { ApiClient } from "../client/src/api.js";
import { createInitialState } from "../client/src/state/appState.js";
import { buildModelConfig, canManageAssessment, selectPracticeProgress, selectQuestionBankViewModel } from "../client/src/state/selectors.js";
import { formatDate, formatPercent } from "../client/src/utils/format.js";
import { toQuery } from "../client/src/utils/query.js";
import { compactErrors, validateAssignment, validateQuestion } from "../client/src/utils/validation.js";
import { assignmentManageView } from "../client/src/views/assignmentManageView.js";
import { analyticsView } from "../client/src/views/analyticsView.js";
import { practiceView } from "../client/src/views/practiceView.js";
import { questionBankManageView } from "../client/src/views/questionBankManageView.js";
import { settingsView } from "../client/src/views/settingsView.js";

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
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(calls, [
    { url: "http://demo.local/api/assignments/assignment_1", method: "PATCH" },
    { url: "http://demo.local/api/assignments/assignment_1", method: "DELETE" },
    { url: "http://demo.local/api/question-banks/bank_1", method: "PATCH" },
    { url: "http://demo.local/api/questions/question_1", method: "DELETE" },
    { url: "http://demo.local/api/practice-sessions?courseId=course_ood", method: "GET" },
    { url: "http://demo.local/api/health", method: "GET" }
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
  state.analytics.teacher = { courses: [], students: [], riskStudents: [], recentActivity: [] };
  state.settings.health = { service: "gateway-service", status: "up", time: "2026-06-16T00:00:00.000Z", services: [] };
  state.settings.modelConfig = buildModelConfig(state.provider);

  assert.match(assignmentManageView(state), /作业列表/);
  assert.match(questionBankManageView(state), /题库列表/);
  assert.match(practiceView(state), /练习历史/);
  assert.match(analyticsView(state), /课程统计/);
  assert.match(settingsView(state), /模型配置说明/);
});

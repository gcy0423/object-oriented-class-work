import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { JsonDatabase } from "../shared/data/jsonDatabase.js";
import {
  AIRequestRepository,
  AIResponseRepository,
  PromptTemplate,
  ProviderHealthRepository,
  StudentAiResultRepository,
  StudentTaskDraftRepository,
  TeacherAiDraftRepository,
  TeacherAiResultRepository,
  normalizeChatCompletionsEndpoint
} from "../services/ai-service/src/domain/ai.js";
import {
  buildAssignmentGuidePrompt,
  buildDailyPlanPrompt,
  buildNoteOrganizePrompt,
  buildSubmissionCheckPrompt,
  buildTaskDraftPrompt,
  buildWeaknessInsightPrompt
} from "../services/ai-service/src/application/studentAiPrompts.js";
import {
  buildAssignmentCommentaryPrompt,
  buildCoursePracticePlanPrompt,
  buildFeedbackDraftPrompt,
  buildReportSummaryPrompt,
  buildStudentInterventionPrompt,
  buildTeachingPlanPrompt
} from "../services/ai-service/src/application/teacherAiPrompts.js";

function studentUser() {
  return { id: "user_student", role: "student", name: "林知夏" };
}

function teacherUser() {
  return { id: "user_teacher", role: "teacher", name: "周老师" };
}

async function withRepoDb(fn) {
  const dir = await mkdtemp(join(tmpdir(), "edumind-ai-domain-"));
  const file = join(dir, "ai-domain.json");
  const database = new JsonDatabase(file, () => ({
    aiRequests: [],
    aiResponses: [],
    providerHealth: [],
    studentAiResults: [],
    studentTaskDrafts: [],
    teacherAiResults: [],
    teacherAiDrafts: []
  }));
  await database.load();
  try {
    await fn(database);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("student prompt builders include task name, schema name, and compact context", () => {
  const user = studentUser();
  const input = {
    route: "student-submit",
    focus: "assignment",
    courseId: "course_ood",
    goals: [{ title: "掌握顺序图" }, { title: "掌握领域建模" }],
    tasks: [{ title: "复盘 lifeline" }, { title: "画一张顺序图" }],
    assignments: [{ title: "领域模型作业" }],
    mistakes: [{ question: { concept: "顺序图" } }],
    noteDraft: { title: "课堂笔记" },
    request: "请帮我自检"
  };

  const prompts = [
    buildDailyPlanPrompt(user, input),
    buildWeaknessInsightPrompt(user, input),
    buildTaskDraftPrompt(user, input),
    buildAssignmentGuidePrompt(user, input),
    buildSubmissionCheckPrompt(user, input),
    buildNoteOrganizePrompt(user, input)
  ];

  assert.match(prompts[0], /task=daily_plan/);
  assert.match(prompts[1], /task=weakness_insight/);
  assert.match(prompts[2], /task=task_draft/);
  assert.match(prompts[3], /task=assignment_guide/);
  assert.match(prompts[4], /task=submission_check/);
  assert.match(prompts[5], /task=note_organize/);

  for (const prompt of prompts) {
    assert.match(prompt, /只返回一个合法 JSON object/);
    assert.match(prompt, /所有 action 必须有稳定 type 和 route/);
    assert.match(prompt, /"id":"user_student"/);
    assert.match(prompt, /"role":"student"/);
    assert.match(prompt, /"route":"student-submit"/);
    assert.match(prompt, /"courseId":"course_ood"/);
    assert.match(prompt, /"goalTitles":\["掌握顺序图","掌握领域建模"\]/);
    assert.match(prompt, /"taskTitles":\["复盘 lifeline","画一张顺序图"\]/);
    assert.match(prompt, /"assignmentTitles":\["领域模型作业"\]/);
    assert.match(prompt, /"mistakeConcepts":\["顺序图"\]/);
    assert.match(prompt, /"noteTitle":"课堂笔记"/);
    assert.match(prompt, /"request":"请帮我自检"/);
  }
});

test("teacher prompt builders include compact context and confirmation rules", () => {
  const user = teacherUser();
  const input = {
    route: "teacher-review",
    courseId: "course_ood",
    studentId: "user_student",
    assignmentId: "assignment_1",
    submissionId: "submission_1",
    metrics: { pendingReview: 3, riskStudents: 2 },
    risks: ["待批改 3 份", "高风险学生 2 人"],
    evidence: ["学生提交包含 UML 图", "AI 自检记录"],
    students: ["林知夏", "许星"],
    submissions: ["submission_1", "submission_2"],
    concepts: ["顺序图", "服务边界"],
    report: { title: "课程周报" },
    request: "生成反馈"
  };

  const prompts = [
    buildTeachingPlanPrompt(user, input),
    buildStudentInterventionPrompt(user, input),
    buildAssignmentCommentaryPrompt(user, input),
    buildFeedbackDraftPrompt(user, input),
    buildCoursePracticePlanPrompt(user, input),
    buildReportSummaryPrompt(user, input)
  ];

  assert.match(prompts[0], /task=teaching_plan/);
  assert.match(prompts[1], /task=student_intervention/);
  assert.match(prompts[2], /task=assignment_commentary/);
  assert.match(prompts[3], /task=feedback_draft/);
  assert.match(prompts[4], /task=course_practice_plan/);
  assert.match(prompts[5], /task=report_summary/);

  for (const prompt of prompts) {
    assert.match(prompt, /所有 action 必须有稳定 type、route、label/);
    assert.match(prompt, /所有 draft 都必须保留教师最终确认权/);
    assert.match(prompt, /"id":"user_teacher"/);
    assert.match(prompt, /"role":"teacher"/);
    assert.match(prompt, /"route":"teacher-review"/);
    assert.match(prompt, /"courseId":"course_ood"/);
    assert.match(prompt, /"studentId":"user_student"/);
    assert.match(prompt, /"assignmentId":"assignment_1"/);
    assert.match(prompt, /"submissionId":"submission_1"/);
    assert.match(prompt, /"pendingReview":3/);
    assert.match(prompt, /"riskStudents":2/);
    assert.match(prompt, /"待批改 3 份"/);
    assert.match(prompt, /"AI 自检记录"/);
    assert.match(prompt, /"课程周报"/);
  }
});

test("PromptTemplate render replaces placeholders without touching system text", () => {
  const template = new PromptTemplate({
    id: "prompt_1",
    title: "Ask",
    system: "You are a tutor.",
    user: "Question={{question}}; Goal={{goal}}; Course={{course}}"
  });

  const rendered = template.render({
    question: "How to explain a lifeline?",
    goal: "掌握顺序图",
    course: "面向对象技术与方法"
  });

  assert.equal(rendered.system, "You are a tutor.");
  assert.equal(rendered.user, "Question=How to explain a lifeline?; Goal=掌握顺序图; Course=面向对象技术与方法");
});

test("normalizeChatCompletionsEndpoint handles raw host, /v1, and full path", () => {
  assert.equal(normalizeChatCompletionsEndpoint("http://10.108.10.110:1234"), "http://10.108.10.110:1234/v1/chat/completions");
  assert.equal(normalizeChatCompletionsEndpoint("http://10.108.10.110:1234/"), "http://10.108.10.110:1234/v1/chat/completions");
  assert.equal(normalizeChatCompletionsEndpoint("http://10.108.10.110:1234/v1"), "http://10.108.10.110:1234/v1/chat/completions");
  assert.equal(normalizeChatCompletionsEndpoint("http://10.108.10.110:1234/v1/"), "http://10.108.10.110:1234/v1/chat/completions");
  assert.equal(normalizeChatCompletionsEndpoint("http://10.108.10.110:1234/v1/chat/completions"), "http://10.108.10.110:1234/v1/chat/completions");
});

test("student AI repositories filter and sort by owner, type, course, and assignment", async () => {
  await withRepoDb(async (database) => {
    const results = new StudentAiResultRepository(database);
    const drafts = new StudentTaskDraftRepository(database);

    await results.save({
      id: "student_ai_result_1",
      ownerId: "user_student",
      type: "daily_plan",
      courseId: "course_ood",
      assignmentId: "assignment_1",
      provider: "mock",
      result: {},
      actions: [],
      meta: {},
      generatedAt: "2026-06-21T10:00:00.000Z",
      createdAt: "2026-06-21T10:00:00.000Z",
      updatedAt: "2026-06-21T10:00:00.000Z"
    });
    await results.save({
      id: "student_ai_result_2",
      ownerId: "user_student",
      type: "weakness_insight",
      courseId: "course_ood",
      assignmentId: null,
      provider: "mock",
      result: {},
      actions: [],
      meta: {},
      generatedAt: "2026-06-21T11:00:00.000Z",
      createdAt: "2026-06-21T11:00:00.000Z",
      updatedAt: "2026-06-21T11:00:00.000Z"
    });
    await results.save({
      id: "student_ai_result_3",
      ownerId: "other_student",
      type: "daily_plan",
      courseId: "course_other",
      assignmentId: "assignment_other",
      provider: "mock",
      result: {},
      actions: [],
      meta: {},
      generatedAt: "2026-06-21T12:00:00.000Z",
      createdAt: "2026-06-21T12:00:00.000Z",
      updatedAt: "2026-06-21T12:00:00.000Z"
    });

    const all = results.findByOwner("user_student");
    const byType = results.findByOwner("user_student", { type: "daily_plan" });
    const byCourse = results.findByOwner("user_student", { courseId: "course_ood" });
    const byAssignment = results.findByOwner("user_student", { assignmentId: "assignment_1" });
    const limited = results.findByOwner("user_student", { limit: 1 });

    assert.equal(all.length, 2);
    assert.equal(all[0].id, "student_ai_result_2");
    assert.equal(byType.length, 1);
    assert.equal(byType[0].id, "student_ai_result_1");
    assert.equal(byCourse.length, 2);
    assert.equal(byAssignment.length, 1);
    assert.equal(limited.length, 1);
    assert.equal(limited[0].id, "student_ai_result_2");

    await drafts.save({
      id: "student_task_draft_1",
      ownerId: "user_student",
      courseId: "course_ood",
      goalId: "goal_1",
      title: "Draft 1",
      type: "练习巩固",
      estimateMinutes: 45,
      dueDate: "2026-06-22",
      steps: [],
      doneDefinition: [],
      summary: "",
      status: "draft",
      sourceResultId: null,
      confirmedTaskId: null,
      createdAt: "2026-06-21T08:00:00.000Z",
      updatedAt: "2026-06-21T08:00:00.000Z"
    });
    await drafts.save({
      id: "student_task_draft_2",
      ownerId: "user_student",
      courseId: "course_ood",
      goalId: "goal_1",
      title: "Draft 2",
      type: "文档产出",
      estimateMinutes: 60,
      dueDate: "2026-06-23",
      steps: [],
      doneDefinition: [],
      summary: "",
      status: "confirmed",
      sourceResultId: null,
      confirmedTaskId: "task_1",
      createdAt: "2026-06-21T09:00:00.000Z",
      updatedAt: "2026-06-21T09:00:00.000Z"
    });

    const draftList = drafts.findByOwner("user_student");
    assert.equal(draftList.length, 2);
    assert.equal(draftList[0].id, "student_task_draft_2");
  });
});

test("teacher AI repositories filter by type, route, course, student, assignment, and status", async () => {
  await withRepoDb(async (database) => {
    const results = new TeacherAiResultRepository(database);
    const drafts = new TeacherAiDraftRepository(database);
    const health = new ProviderHealthRepository(database);
    const requests = new AIRequestRepository(database);
    const responses = new AIResponseRepository(database);

    await results.save({
      id: "teacher_ai_result_1",
      ownerId: "user_teacher",
      type: "teaching_plan",
      route: "teacher-home",
      courseId: "course_ood",
      studentId: null,
      assignmentId: null,
      submissionId: null,
      provider: "mock",
      result: {},
      actions: [],
      sourceEvidenceIds: [],
      generatedAt: "2026-06-21T10:00:00.000Z",
      createdAt: "2026-06-21T10:00:00.000Z",
      updatedAt: "2026-06-21T10:00:00.000Z"
    });
    await results.save({
      id: "teacher_ai_result_2",
      ownerId: "user_teacher",
      type: "feedback_draft",
      route: "teacher-review",
      courseId: "course_ood",
      studentId: "user_student",
      assignmentId: "assignment_1",
      submissionId: "submission_1",
      provider: "mock",
      result: {},
      actions: [],
      sourceEvidenceIds: [],
      generatedAt: "2026-06-21T11:00:00.000Z",
      createdAt: "2026-06-21T11:00:00.000Z",
      updatedAt: "2026-06-21T11:00:00.000Z"
    });
    await results.save({
      id: "teacher_ai_result_3",
      ownerId: "other_teacher",
      type: "report_summary",
      route: "teacher-report",
      courseId: "course_other",
      studentId: null,
      assignmentId: null,
      submissionId: null,
      provider: "mock",
      result: {},
      actions: [],
      sourceEvidenceIds: [],
      generatedAt: "2026-06-21T12:00:00.000Z",
      createdAt: "2026-06-21T12:00:00.000Z",
      updatedAt: "2026-06-21T12:00:00.000Z"
    });

    await drafts.save({
      id: "teacher_ai_draft_1",
      ownerId: "user_teacher",
      type: "student_intervention",
      status: "draft",
      title: "Draft 1",
      summary: "",
      body: "",
      structuredPayload: {},
      courseId: "course_ood",
      studentId: "user_student",
      assignmentId: null,
      submissionId: null,
      resultId: "teacher_ai_result_1",
      sourceEvidenceIds: [],
      createdAt: "2026-06-21T10:00:00.000Z",
      updatedAt: "2026-06-21T10:00:00.000Z"
    });
    await drafts.save({
      id: "teacher_ai_draft_2",
      ownerId: "user_teacher",
      type: "feedback_draft",
      status: "saved",
      title: "Draft 2",
      summary: "",
      body: "",
      structuredPayload: {},
      courseId: "course_ood",
      studentId: "user_student",
      assignmentId: "assignment_1",
      submissionId: "submission_1",
      resultId: "teacher_ai_result_2",
      sourceEvidenceIds: [],
      createdAt: "2026-06-21T11:00:00.000Z",
      updatedAt: "2026-06-21T11:00:00.000Z"
    });

    await health.save({
      id: "provider_1",
      provider: "mock-local-llm",
      model: "mock",
      status: "up",
      endpoint: null,
      checkedAt: "2026-06-21T10:00:00.000Z",
      createdAt: "2026-06-21T10:00:00.000Z",
      updatedAt: "2026-06-21T10:00:00.000Z"
    });
    await health.save({
      id: "provider_2",
      provider: "lmstudio:model",
      model: "qwopus3",
      status: "up",
      endpoint: "http://10.108.10.110:1234/v1/chat/completions",
      checkedAt: "2026-06-21T11:00:00.000Z",
      createdAt: "2026-06-21T11:00:00.000Z",
      updatedAt: "2026-06-21T11:00:00.000Z"
    });

    await requests.save({
      id: "ai_request_1",
      actorId: "user_student",
      type: "ask",
      input: { question: "What is a lifeline?" },
      provider: "mock-local-llm",
      createdAt: "2026-06-21T10:00:00.000Z",
      updatedAt: "2026-06-21T10:00:00.000Z"
    });
    await responses.save({
      id: "ai_response_1",
      requestId: "ai_request_1",
      answer: "A lifeline is an object timeline.",
      suggestions: ["Create flashcards"],
      provider: "mock-local-llm",
      raw: null,
      generatedAt: "2026-06-21T10:01:00.000Z",
      createdAt: "2026-06-21T10:01:00.000Z",
      updatedAt: "2026-06-21T10:01:00.000Z"
    });

    assert.equal(results.findByOwner("user_teacher").length, 2);
    assert.equal(results.findByOwner("user_teacher", { type: "feedback_draft" })[0].id, "teacher_ai_result_2");
    assert.equal(results.findByOwner("user_teacher", { route: "teacher-review" })[0].id, "teacher_ai_result_2");
    assert.equal(results.findByOwner("user_teacher", { courseId: "course_ood" }).length, 2);
    assert.equal(results.findByOwner("user_teacher", { studentId: "user_student" })[0].id, "teacher_ai_result_2");
    assert.equal(results.findByOwner("user_teacher", { assignmentId: "assignment_1" })[0].id, "teacher_ai_result_2");
    assert.equal(drafts.findByOwner("user_teacher").length, 2);
    assert.equal(drafts.findByOwner("user_teacher", { type: "feedback_draft" })[0].id, "teacher_ai_draft_2");
    assert.equal(drafts.findByOwner("user_teacher", { status: "saved" })[0].id, "teacher_ai_draft_2");
    assert.equal(health.latest().id, "provider_2");
    assert.equal(requests.findById("ai_request_1").input.question, "What is a lifeline?");
    assert.equal(responses.findById("ai_response_1").answer, "A lifeline is an object timeline.");
  });
});

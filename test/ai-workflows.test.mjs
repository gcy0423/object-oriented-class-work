import assert from "node:assert/strict";
import test from "node:test";
import { AuthError } from "../shared/http/errors.js";
import { StudentAiWorkflowService } from "../services/ai-service/src/application/studentAiWorkflowService.js";
import { TeacherAiWorkflowService } from "../services/ai-service/src/application/teacherAiWorkflowService.js";

function user(role = "student") {
  return {
    id: role === "teacher" ? "user_teacher" : "user_student",
    name: role === "teacher" ? "周老师" : "林知夏",
    role
  };
}

function createProvider(responses) {
  const queue = Array.isArray(responses) ? [...responses] : [responses];
  const calls = [];
  return {
    calls,
    async complete(messages) {
      calls.push(messages);
      const next = queue.shift();
      if (next instanceof Error) {
        throw next;
      }
      return next;
    }
  };
}

test("StudentAiWorkflowService rejects missing user context", async () => {
  const service = new StudentAiWorkflowService({
    provider: createProvider({ provider: "mock", text: "{}" })
  });
  await assert.rejects(() => service.buildDailyPlan(null, {}), AuthError);
});

test("TeacherAiWorkflowService rejects missing user context", async () => {
  const service = new TeacherAiWorkflowService({
    provider: createProvider({ provider: "mock", text: "{}" })
  });
  await assert.rejects(() => service.buildTeachingPlan(null, {}), AuthError);
});

test("StudentAiWorkflowService parses plain JSON and markdown wrapped JSON", async () => {
  const provider = createProvider([
    {
      provider: "student-official",
      text: JSON.stringify({
        summary: "daily summary",
        actions: [{ label: "Open task", route: "student-learning" }],
        evidence: ["task pending"]
      })
    },
    {
      provider: "student-official",
      text: "```json\n{\"summary\":\"guide summary\",\"outline\":[\"step1\"],\"checklist\":[\"check1\"]}\n```"
    }
  ]);
  const service = new StudentAiWorkflowService({ provider });

  const dailyPlan = await service.buildDailyPlan(user(), { tasks: [{ title: "Task A" }] });
  const guide = await service.guideAssignment(user(), { assignments: [{ id: "assignment_1", title: "A1" }] });

  assert.equal(dailyPlan.summary, "daily summary");
  assert.equal(dailyPlan.provider, "student-official");
  assert.equal(dailyPlan.actions[0].label, "Open task");
  assert.deepEqual(guide.outline, ["step1"]);
  assert.deepEqual(guide.checklist, ["check1"]);
  assert.equal(provider.calls.length, 2);
  assert.match(provider.calls[0][0].content, /Return one valid JSON object/);
});

test("StudentAiWorkflowService falls back when provider returns invalid JSON", async () => {
  const provider = createProvider({
    provider: "student-invalid",
    text: "I refuse to provide JSON today."
  });
  const service = new StudentAiWorkflowService({ provider });

  const result = await service.checkSubmission(user(), {
    draft: { content: "short", attachmentsText: "" }
  });

  assert.equal(result.type, "submission_check");
  assert.equal(result.provider, "student-invalid");
  assert.equal(result.rawText, "I refuse to provide JSON today.");
  assert.ok(result.issues.length >= 1);
  assert.match(result.summary, /建议|完整|提交/);
});

test("StudentAiWorkflowService falls back when provider throws", async () => {
  const warnings = [];
  const provider = createProvider(new Error("provider down"));
  const service = new StudentAiWorkflowService({
    provider,
    logger: { warn(message) { warnings.push(message); } }
  });

  const result = await service.organizeNote(user(), {
    note: { title: "UML", content: "对象协作与顺序图。" }
  });

  assert.equal(result.type, "note_organize");
  assert.equal(result.provider, "fallback");
  assert.equal(result.rawText, "provider down");
  assert.ok(result.cards.length >= 1);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /student ai workflow fallback/);
});

test("StudentAiWorkflowService dispatches all six workflow types to provider", async () => {
  const provider = createProvider([
    { provider: "mock-1", text: "{\"summary\":\"daily\"}" },
    { provider: "mock-2", text: "{\"summary\":\"weakness\",\"weaknesses\":[{\"title\":\"UML\"}]}" },
    { provider: "mock-3", text: "{\"summary\":\"task\",\"draft\":{\"title\":\"Draft\"}}" },
    { provider: "mock-4", text: "{\"summary\":\"guide\",\"outline\":[\"1\"],\"checklist\":[\"2\"]}" },
    { provider: "mock-5", text: "{\"summary\":\"check\",\"completionEstimate\":70}" },
    { provider: "mock-6", text: "{\"summary\":\"note\",\"cards\":[{\"front\":\"Q\",\"back\":\"A\"}]}" }
  ]);
  const service = new StudentAiWorkflowService({ provider });

  const daily = await service.buildDailyPlan(user(), { tasks: [{ title: "Task" }] });
  const weakness = await service.buildWeaknessInsight(user(), { mistakes: [{ question: { concept: "UML" } }] });
  const draft = await service.draftTask(user(), { goals: [{ id: "goal_1" }] });
  const guide = await service.guideAssignment(user(), { assignment: { id: "a1", title: "Assignment" } });
  const check = await service.checkSubmission(user(), { draft: { content: "x".repeat(120), attachmentsText: "f: u" } });
  const note = await service.organizeNote(user(), { note: { title: "Note", content: "Body" } });

  assert.equal(daily.summary, "daily");
  assert.equal(weakness.summary, "weakness");
  assert.equal(draft.summary, "task");
  assert.equal(guide.summary, "guide");
  assert.equal(check.summary, "check");
  assert.equal(note.summary, "note");
  assert.equal(provider.calls.length, 6);
});

test("TeacherAiWorkflowService parses JSON and keeps provider metadata", async () => {
  const provider = createProvider([
    {
      provider: "teacher-official",
      text: JSON.stringify({
        summary: "plan summary",
        actions: [{ label: "Open review", route: "teacher-review" }],
        risks: ["risk"],
        evidence: ["evidence"],
        draft: { title: "Today plan", body: "1. review\n2. intervene" }
      })
    },
    {
      provider: "teacher-official",
      text: "```json\n{\"summary\":\"report summary\",\"draft\":{\"title\":\"Report draft\",\"body\":\"Body\"}}\n```"
    }
  ]);
  const service = new TeacherAiWorkflowService({ provider });

  const plan = await service.buildTeachingPlan(user("teacher"), { risks: ["待批改 3 份"] });
  const report = await service.buildReportSummary(user("teacher"), { report: { title: "Course Weekly" } });

  assert.equal(plan.summary, "plan summary");
  assert.equal(plan.provider, "teacher-official");
  assert.equal(plan.actions[0].label, "Open review");
  assert.equal(plan.draft.title, "Today plan");
  assert.equal(report.summary, "report summary");
  assert.equal(report.draft.title, "Report draft");
});

test("TeacherAiWorkflowService falls back when provider returns non-json text", async () => {
  const provider = createProvider({
    provider: "teacher-invalid",
    text: "This is a prose answer, not JSON."
  });
  const service = new TeacherAiWorkflowService({ provider });

  const result = await service.buildStudentIntervention(user("teacher"), {
    studentName: "林知夏",
    evidence: ["待处理作业", "最近错题"]
  });

  assert.equal(result.type, "student_intervention");
  assert.equal(result.provider, "teacher-invalid");
  assert.equal(result.rawText, "This is a prose answer, not JSON.");
  assert.ok(result.draft.message.includes("建议"));
  assert.equal(result.actions.length, 0);
});

test("TeacherAiWorkflowService falls back when provider throws", async () => {
  const warnings = [];
  const provider = createProvider(new Error("teacher provider timeout"));
  const service = new TeacherAiWorkflowService({
    provider,
    logger: { warn(message) { warnings.push(message); } }
  });

  const result = await service.buildCoursePracticePlan(user("teacher"), {
    courseId: "course_ood",
    evidence: ["顺序图掌握度偏低"]
  });

  assert.equal(result.type, "course_practice_plan");
  assert.equal(result.provider, "fallback");
  assert.equal(result.rawText, "teacher provider timeout");
  assert.ok(result.draft.body.length > 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /teacher ai workflow fallback/);
});

test("TeacherAiWorkflowService dispatches all six teacher workflow types", async () => {
  const provider = createProvider([
    { provider: "t1", text: "{\"summary\":\"teaching\"}" },
    { provider: "t2", text: "{\"summary\":\"intervention\",\"draft\":{\"title\":\"Intervention\"}}" },
    { provider: "t3", text: "{\"summary\":\"commentary\",\"draft\":{\"title\":\"Commentary\"}}" },
    { provider: "t4", text: "{\"summary\":\"feedback\",\"draft\":{\"title\":\"Feedback\"}}" },
    { provider: "t5", text: "{\"summary\":\"practice\",\"draft\":{\"title\":\"Practice\"}}" },
    { provider: "t6", text: "{\"summary\":\"report\",\"draft\":{\"title\":\"Report\"}}" }
  ]);
  const service = new TeacherAiWorkflowService({ provider });
  const teacher = user("teacher");

  const results = await Promise.all([
    service.buildTeachingPlan(teacher, {}),
    service.buildStudentIntervention(teacher, {}),
    service.buildAssignmentCommentary(teacher, {}),
    service.buildFeedbackDraft(teacher, {}),
    service.buildCoursePracticePlan(teacher, {}),
    service.buildReportSummary(teacher, {})
  ]);

  assert.deepEqual(results.map((item) => item.summary), ["teaching", "intervention", "commentary", "feedback", "practice", "report"]);
  assert.equal(provider.calls.length, 6);
});

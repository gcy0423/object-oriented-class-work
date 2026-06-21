import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ForbiddenError, NotFoundError, ValidationError } from "../shared/http/errors.js";
import { JsonDatabase } from "../shared/data/jsonDatabase.js";
import {
  StudentAiResultRepository,
  StudentTaskDraftRepository,
  TeacherAiDraftRepository,
  TeacherAiResultRepository
} from "../services/ai-service/src/domain/ai.js";
import { StudentAiWorkspaceService } from "../services/ai-service/src/application/studentAiWorkspaceService.js";
import { TeacherAiWorkspaceService } from "../services/ai-service/src/application/teacherAiWorkspaceService.js";

async function withWorkspace(fn) {
  const dir = await mkdtemp(join(tmpdir(), "edumind-ai-workspace-"));
  const file = join(dir, "ai-workspace.json");
  const database = new JsonDatabase(file, () => ({
    studentAiResults: [],
    studentTaskDrafts: [],
    teacherAiResults: [],
    teacherAiDrafts: []
  }));
  await database.load();
  try {
    await fn({
      database,
      studentResults: new StudentAiResultRepository(database),
      studentDrafts: new StudentTaskDraftRepository(database),
      teacherResults: new TeacherAiResultRepository(database),
      teacherDrafts: new TeacherAiDraftRepository(database)
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function workflowStub() {
  return {
    async buildDailyPlan() {
      return {
        type: "daily_plan",
        summary: "Daily summary",
        actions: [{ label: "Open task", route: "student-learning", status: "open" }],
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:00:00.000Z"
      };
    },
    async buildWeaknessInsight() {
      return {
        type: "weakness_insight",
        summary: "Weakness summary",
        weaknesses: [{ title: "UML", concept: "UML", score: 58, rank: 1, evidence: ["mistake_1"], action: "redo" }],
        actions: [{ label: "Practice", route: "student-practice", status: "open" }],
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:01:00.000Z"
      };
    },
    async draftTask() {
      return {
        type: "task_draft",
        summary: "Draft summary",
        draft: {
          title: "Review sequence diagram",
          type: "练习巩固",
          courseId: "course_ood",
          goalId: "goal_1",
          estimateMinutes: 45,
          dueDate: "2026-06-22",
          steps: ["watch", "draw"],
          doneDefinition: ["submit notes"]
        },
        actions: [{ label: "Confirm draft", route: "student-learning", status: "open" }],
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:02:00.000Z"
      };
    },
    async guideAssignment() {
      return {
        type: "assignment_guide",
        summary: "Guide summary",
        outline: ["read", "draft"],
        checklist: ["check rubric"],
        actions: [{ label: "Open assignment", route: "student-assignments", status: "open" }],
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:03:00.000Z"
      };
    },
    async checkSubmission() {
      return {
        type: "submission_check",
        summary: "Check summary",
        completionEstimate: 82,
        issues: [{ level: "warning", title: "Need more evidence", suggestion: "add diagram" }],
        strengths: ["clear structure"],
        actions: [{ label: "Revise", route: "student-submit", status: "open" }],
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:04:00.000Z"
      };
    },
    async organizeNote() {
      return {
        type: "note_organize",
        summary: "Organize summary",
        cards: [{ front: "Q", back: "A" }],
        assignmentParagraphs: ["Paragraph A"],
        actions: [{ label: "Save note", route: "student-note-ai-result", status: "open" }],
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:05:00.000Z"
      };
    },
    async buildTeachingPlan() {
      return {
        type: "teaching_plan",
        summary: "Teaching plan summary",
        actions: [{ id: "review", label: "Open review", route: "teacher-review", status: "open" }],
        draft: { title: "Today plan", summary: "do work", body: "1. review" },
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:06:00.000Z"
      };
    },
    async buildStudentIntervention() {
      return {
        type: "student_intervention",
        summary: "Intervention summary",
        actions: [{ id: "send", label: "Send", route: "teacher-intervention", status: "open" }],
        draft: { title: "Intervention", summary: "summary", body: "body", message: "message", studentId: "user_student" },
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:07:00.000Z"
      };
    },
    async buildAssignmentCommentary() {
      return {
        type: "assignment_commentary",
        summary: "Commentary summary",
        actions: [{ id: "save", label: "Save commentary", route: "teacher-assignment", status: "open" }],
        draft: { title: "Commentary", body: "commentary body" },
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:08:00.000Z"
      };
    },
    async buildFeedbackDraft() {
      return {
        type: "feedback_draft",
        summary: "Feedback summary",
        actions: [{ id: "save", label: "Save feedback", route: "teacher-review", status: "open" }],
        draft: { title: "Feedback", body: "feedback body", submissionId: "submission_1" },
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:09:00.000Z"
      };
    },
    async buildCoursePracticePlan() {
      return {
        type: "course_practice_plan",
        summary: "Practice plan summary",
        actions: [{ id: "save", label: "Save practice", route: "teacher-course", status: "open" }],
        draft: { title: "Practice plan", body: "practice body", courseId: "course_ood" },
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:10:00.000Z"
      };
    },
    async buildReportSummary() {
      return {
        type: "report_summary",
        summary: "Report summary",
        actions: [{ id: "save", label: "Save report", route: "teacher-report", status: "open" }],
        draft: { title: "Report draft", body: "report body", courseId: "course_ood" },
        provider: "workflow-mock",
        generatedAt: "2026-06-21T10:11:00.000Z"
      };
    }
  };
}

function studentUser() {
  return { id: "user_student", role: "student", name: "林知夏" };
}

function teacherUser() {
  return { id: "user_teacher", role: "teacher", name: "周老师" };
}

test("student workspace buildAndStore persists result and flattens payload", async () => {
  await withWorkspace(async ({ database, studentResults, studentDrafts }) => {
    const learningClient = {
      async createTaskForUser() {
        return { id: "task_created" };
      },
      async createNoteForUser() {
        return { id: "note_created" };
      }
    };
    const workspace = new StudentAiWorkspaceService({
      database,
      results: studentResults,
      taskDrafts: studentDrafts,
      workflow: workflowStub(),
      learningClient
    });

    const saved = await workspace.buildAndStore(studentUser(), "daily_plan", {
      route: "student-ai",
      tasks: [{ id: "task_1", title: "Study", status: "todo" }]
    });

    assert.equal(saved.type, "daily_plan");
    assert.equal(saved.summary, "Daily summary");
    assert.equal(saved.provider, "workflow-mock");
    assert.equal(saved.actions.length, 1);
    const listed = workspace.listResults(studentUser(), {});
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].meta.route, "student-ai");
  });
});

test("student workspace supports result listing, detail, and action updates", async () => {
  await withWorkspace(async ({ database, studentResults, studentDrafts }) => {
    const workspace = new StudentAiWorkspaceService({
      database,
      results: studentResults,
      taskDrafts: studentDrafts,
      workflow: workflowStub(),
      learningClient: {}
    });

    const stored = await workspace.buildAndStore(studentUser(), "weakness_insight", {
      courseId: "course_ood"
    });
    const detail = workspace.getResult(studentUser(), stored.id);
    assert.equal(detail.type, "weakness_insight");
    assert.equal(detail.actions[0].status, "open");

    const updated = await workspace.updateAction(studentUser(), stored.id, detail.actions[0].id, {
      status: "completed",
      note: "handled"
    });
    assert.equal(updated.actions[0].status, "completed");
    assert.equal(updated.actions[0].note, "handled");
  });
});

test("student workspace timeline merges results, action events, and task drafts", async () => {
  await withWorkspace(async ({ database, studentResults, studentDrafts }) => {
    const learningClient = {
      async createTaskForUser() {
        return { id: "task_real_1" };
      }
    };
    const workspace = new StudentAiWorkspaceService({
      database,
      results: studentResults,
      taskDrafts: studentDrafts,
      workflow: workflowStub(),
      learningClient
    });

    const result = await workspace.buildAndStore(studentUser(), "task_draft", {
      route: "student-learning",
      courseId: "course_ood",
      goals: [{ id: "goal_1" }]
    });
    await workspace.updateAction(studentUser(), result.id, result.actions[0].id, { status: "converted", note: "created draft" });
    const draft = await workspace.createTaskDraft(studentUser(), {
      resultId: result.id
    });
    await workspace.confirmTaskDraft(studentUser(), draft.id);

    const timeline = workspace.buildTimeline(studentUser(), { limit: 10 });
    assert.ok(timeline.items.some((item) => item.type === "ai_result"));
    assert.ok(timeline.items.some((item) => item.type === "ai_action"));
    assert.ok(timeline.items.some((item) => item.type === "task_confirmed"));
  });
});

test("student workspace task draft lifecycle works end-to-end", async () => {
  await withWorkspace(async ({ database, studentResults, studentDrafts }) => {
    const createdTasks = [];
    const workspace = new StudentAiWorkspaceService({
      database,
      results: studentResults,
      taskDrafts: studentDrafts,
      workflow: workflowStub(),
      learningClient: {
        async createTaskForUser(userId, input) {
          createdTasks.push({ userId, input });
          return { id: "task_live_1", ...input };
        }
      }
    });

    const draft = await workspace.createTaskDraft(studentUser(), {
      title: "Write UML notes",
      type: "文档产出",
      courseId: "course_ood",
      goalId: "goal_1",
      estimateMinutes: 75,
      dueDate: "2026-06-23",
      steps: ["read", "write"],
      doneDefinition: ["final note"]
    });
    assert.equal(draft.title, "Write UML notes");

    const updated = await workspace.updateTaskDraft(studentUser(), draft.id, {
      title: "Write UML notes v2",
      summary: "updated summary",
      steps: ["read", "sketch", "write"]
    });
    assert.equal(updated.title, "Write UML notes v2");
    assert.equal(updated.steps.length, 3);

    const confirmed = await workspace.confirmTaskDraft(studentUser(), draft.id);
    assert.equal(confirmed.draft.status, "confirmed");
    assert.equal(confirmed.task.id, "task_live_1");
    assert.equal(createdTasks.length, 1);

    const listed = workspace.listTaskDrafts(studentUser());
    assert.equal(listed.items[0].confirmedTaskId, "task_live_1");

    const removed = await workspace.deleteTaskDraft(studentUser(), draft.id);
    assert.deepEqual(removed, { id: draft.id, removed: true });
  });
});

test("student workspace saveOrganizeResultAsNote forwards content to learning client", async () => {
  await withWorkspace(async ({ database, studentResults, studentDrafts }) => {
    const savedNotes = [];
    const workspace = new StudentAiWorkspaceService({
      database,
      results: studentResults,
      taskDrafts: studentDrafts,
      workflow: workflowStub(),
      learningClient: {
        async createNoteForUser(userId, input) {
          savedNotes.push({ userId, input });
          return { id: "note_1", ...input };
        }
      }
    });

    const result = await workspace.buildAndStore(studentUser(), "note_organize", {
      courseId: "course_ood",
      noteId: "note_source_1"
    });
    const saved = await workspace.saveOrganizeResultAsNote(studentUser(), result.id, {
      title: "整理后的笔记",
      tags: ["AI整理", "UML"]
    });

    assert.equal(saved.id, "note_1");
    assert.equal(savedNotes.length, 1);
    assert.equal(savedNotes[0].input.courseId, "course_ood");
    assert.match(savedNotes[0].input.content, /Organize summary/);
    assert.match(savedNotes[0].input.content, /Paragraph A/);
  });
});

test("student workspace enforces ownership and teacher access rules", async () => {
  await withWorkspace(async ({ database, studentResults, studentDrafts }) => {
    const workspace = new StudentAiWorkspaceService({
      database,
      results: studentResults,
      taskDrafts: studentDrafts,
      workflow: workflowStub(),
      learningClient: {}
    });

    const stored = await workspace.buildAndStore(studentUser(), "daily_plan", {});
    assert.throws(
      () => workspace.getResult({ id: "other_student", role: "student", name: "A" }, stored.id),
      NotFoundError
    );
    const teacherView = workspace.getResult(teacherUser(), stored.id, "user_student");
    assert.equal(teacherView.id, stored.id);
    assert.throws(
      () => workspace.listResults({ id: "other_student", role: "student" }, { studentId: "user_student" }),
      ForbiddenError
    );
  });
});

test("student workspace validates note-organize record type and draft presence", async () => {
  await withWorkspace(async ({ database, studentResults, studentDrafts }) => {
    const workspace = new StudentAiWorkspaceService({
      database,
      results: studentResults,
      taskDrafts: studentDrafts,
      workflow: workflowStub(),
      learningClient: {}
    });

    const result = await workspace.buildAndStore(studentUser(), "daily_plan", {});
    await assert.rejects(
      () => workspace.saveOrganizeResultAsNote(studentUser(), result.id, {}),
      ValidationError
    );
    await assert.rejects(
      () => workspace.createTaskDraft(studentUser(), {}),
      ValidationError
    );
  });
});

test("teacher workspace buildAndStore persists result and draft", async () => {
  await withWorkspace(async ({ database, teacherResults, teacherDrafts }) => {
    const workspace = new TeacherAiWorkspaceService({
      database,
      results: teacherResults,
      drafts: teacherDrafts,
      workflow: workflowStub()
    });

    const saved = await workspace.buildAndStore(teacherUser(), "teaching_plan", {
      route: "teacher-home",
      courseId: "course_ood",
      evidenceIds: ["e1", "e2"]
    });

    assert.equal(saved.type, "teaching_plan");
    assert.equal(saved.summary, "Teaching plan summary");
    assert.equal(saved.draft.title, "Today plan");
    const listedResults = workspace.listResults(teacherUser(), {});
    const listedDrafts = workspace.listDrafts(teacherUser(), {});
    assert.equal(listedResults.items.length, 1);
    assert.equal(listedDrafts.items.length, 1);
    assert.deepEqual(listedResults.items[0].sourceEvidenceIds, ["e1", "e2"]);
  });
});

test("teacher workspace supports result action updates and draft lifecycle", async () => {
  await withWorkspace(async ({ database, teacherResults, teacherDrafts }) => {
    const workspace = new TeacherAiWorkspaceService({
      database,
      results: teacherResults,
      drafts: teacherDrafts,
      workflow: workflowStub()
    });

    const saved = await workspace.buildAndStore(teacherUser(), "feedback_draft", {
      route: "teacher-review",
      assignmentId: "assignment_1",
      submissionId: "submission_1"
    });

    const result = workspace.getResult(teacherUser(), saved.id);
    const updatedAction = await workspace.updateAction(teacherUser(), result.id, result.actions[0].id, {
      status: "completed",
      note: "teacher checked"
    });
    assert.equal(updatedAction.actions[0].status, "completed");

    const draft = workspace.listDrafts(teacherUser(), {}).items[0];
    const updatedDraft = await workspace.updateDraft(teacherUser(), draft.id, {
      title: "Feedback draft v2",
      summary: "updated",
      body: "teacher edited body",
      status: "reviewing",
      structuredPayload: { edited: true }
    });
    assert.equal(updatedDraft.title, "Feedback draft v2");
    assert.equal(updatedDraft.status, "reviewing");
    assert.deepEqual(updatedDraft.structuredPayload, { edited: true });

    const confirmed = await workspace.confirmDraft(teacherUser(), draft.id, "save-feedback", {
      channel: "manual"
    });
    assert.equal(confirmed.status, "saved");
    assert.equal(confirmed.structuredPayload.confirmedAction, "save-feedback");

    const deleted = await workspace.deleteDraft(teacherUser(), draft.id);
    assert.deepEqual(deleted, { id: draft.id, removed: true });
  });
});

test("teacher workspace enforces teacher-only access and ownership", async () => {
  await withWorkspace(async ({ database, teacherResults, teacherDrafts }) => {
    const workspace = new TeacherAiWorkspaceService({
      database,
      results: teacherResults,
      drafts: teacherDrafts,
      workflow: workflowStub()
    });

    await assert.rejects(
      () => workspace.buildAndStore(studentUser(), "teaching_plan", {}),
      ForbiddenError
    );

    const saved = await workspace.buildAndStore(teacherUser(), "student_intervention", {
      studentId: "user_student"
    });

    assert.throws(
      () => workspace.getResult({ id: "teacher_2", role: "teacher", name: "李老师" }, saved.id),
      NotFoundError
    );
    assert.throws(
      () => workspace.getDraft({ id: "teacher_2", role: "teacher", name: "李老师" }, saved.draft.id),
      NotFoundError
    );
  });
});

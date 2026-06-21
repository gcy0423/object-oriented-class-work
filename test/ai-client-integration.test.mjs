import assert from "node:assert/strict";
import test from "node:test";
import { StudentAiAdapter } from "../client/src/ai/studentAiAdapter.js";
import { TeacherAiAdapter } from "../client/src/ai/teacherAiAdapter.js";
import { createInitialState } from "../client/src/state/appState.js";
import {
  buildStudentAiPanelModel,
  selectStudentAiContext,
  selectStudentAssignmentDetailModel,
  selectStudentAssignmentsModel,
  selectStudentLearningModel,
  selectStudentNotesModel,
  selectStudentPracticeModel
} from "../client/src/state/studentSelectors.js";
import {
  selectTeacherAiContext,
  selectTeacherAiPanelModel,
  selectTeacherAssignmentModel,
  selectTeacherCourseModel,
  selectTeacherHomeModel,
  selectTeacherInterventionModel,
  selectTeacherReportModel,
  selectTeacherStudentModel
} from "../client/src/state/teacherSelectors.js";

function baseState() {
  const state = createInitialState();
  state.user = { id: "user_student", role: "student", name: "林知夏", avatar: "夏" };
  state.dashboard = {
    courses: [{ id: "course_ood", title: "面向对象技术与方法", description: "课程描述" }],
    goals: [{ id: "goal_1", courseId: "course_ood", title: "掌握顺序图", targetDate: "2026-06-30" }],
    tasks: [{ id: "task_1", goalId: "goal_1", title: "复盘 lifeline", status: "todo", estimateMinutes: 45 }],
    notes: [{ id: "note_1", courseId: "course_ood", title: "课堂笔记", content: "对象协作与消息。", tags: ["UML"] }],
    assignments: [{ id: "assignment_1", courseId: "course_ood", title: "领域模型作业", description: "画图并说明", dueAt: "2026-06-22T00:00:00.000Z", status: "published" }],
    metrics: { activeGoals: 1, completionRate: 20 }
  };
  state.assessment.assignments = state.dashboard.assignments;
  state.assessment.assignmentDetail = {
    assignment: state.dashboard.assignments[0],
    submissions: [{ id: "submission_1", studentId: "user_student", content: "提交内容", status: "submitted" }],
    rubric: { id: "rubric_1" },
    submissionSummary: { submitted: 1, graded: 0 }
  };
  state.assessment.mistakes = [{ id: "mistake_1", courseId: "course_ood", question: { concept: "顺序图", stem: "解释对象协作" }, status: "open" }];
  state.assessment.practiceHistory = [{ id: "practice_1", courseId: "course_ood", correctRate: 80, startedAt: "2026-06-20T00:00:00.000Z" }];
  state.assessment.questionBanks = [{ id: "bank_1", courseId: "course_ood", title: "顺序图题库", description: "基础题" }];
  state.student.notes.editorDraft = { title: "课堂笔记", content: "对象协作与消息", tags: "UML,Design" };
  state.student.assignments.submitDraft = { assignmentId: "assignment_1", content: "提交正文", attachmentsText: "diagram.png: https://demo.local/diagram.png", updatedAt: "2026-06-21T00:00:00.000Z" };
  return state;
}

test("StudentAiAdapter prefers official APIs and normalizes payloads", async () => {
  const adapter = new StudentAiAdapter({
    api: {
      async studentAiDailyPlan() {
        return { data: { id: "r1", provider: "official", generatedAt: "2026-06-21T00:00:00.000Z", result: { summary: "official daily", actions: [{ label: "Do task", route: "student-learning" }] } } };
      },
      async studentAiWeaknessInsight() {
        return { data: { summary: "official weakness", weaknesses: [{ title: "UML", score: 55, evidence: ["m1"] }] } };
      },
      async studentAiTaskDraft() {
        return { data: { summary: "official task", draft: { title: "Task", estimateMinutes: 50 } } };
      },
      async studentAiAssignmentGuide() {
        return { data: { summary: "official guide", outline: ["read"], checklist: ["check"] } };
      },
      async studentAiSubmissionCheck() {
        return { data: { summary: "official check", completionEstimate: 88, issues: ["short"] } };
      },
      async studentAiNoteOrganize() {
        return { data: { summary: "official note", cards: [{ front: "Q", back: "A" }] } };
      }
    }
  });
  const context = selectStudentAiContext(baseState(), "student-ai");

  const daily = await adapter.buildDailyPlan(context);
  const weakness = await adapter.buildWeaknessInsight(context);
  const task = await adapter.draftLearningTask(context);
  const guide = await adapter.guideAssignment(context);
  const check = await adapter.checkSubmissionDraft(context);
  const note = await adapter.organizeNote(context);

  assert.equal(daily.summary, "official daily");
  assert.equal(daily.provider, "official");
  assert.equal(weakness.weaknesses[0].title, "UML");
  assert.equal(task.draft.title, "Task");
  assert.deepEqual(guide.outline, ["read"]);
  assert.equal(check.completionEstimate, 88);
  assert.equal(note.cards[0].front, "Q");
});

test("StudentAiAdapter falls back through askAI and summarizeNote when official APIs are unavailable", async () => {
  const adapter = new StudentAiAdapter({
    api: {
      async askAI() {
        return {
          data: {
            provider: "ask-provider",
            answer: "{\"summary\":\"ask fallback\",\"actions\":[{\"label\":\"Open practice\",\"route\":\"student-practice\"}]}"
          }
        };
      },
      async summarizeNote() {
        return {
          data: {
            provider: "note-provider",
            answer: "{\"summary\":\"note fallback\",\"cards\":[{\"front\":\"Q\",\"back\":\"A\"}]}"
          }
        };
      }
    }
  });
  const state = baseState();
  const context = selectStudentAiContext(state, "student-note-editor");

  const daily = await adapter.buildDailyPlan(context);
  const note = await adapter.organizeNote(context);

  assert.equal(daily.summary, "ask fallback");
  assert.equal(daily.provider, "ask-provider");
  assert.equal(note.summary, "note fallback");
  assert.equal(note.provider, "note-provider");
});

test("TeacherAiAdapter prefers official APIs and keeps draft payloads", async () => {
  const adapter = new TeacherAiAdapter({
    api: {
      async teacherAiTeachingPlan() {
        return { data: { summary: "official teaching", draft: { title: "Today plan", body: "1. review" } } };
      },
      async teacherAiStudentIntervention() {
        return { data: { summary: "official intervention", draft: { title: "Intervention", message: "remind" } } };
      },
      async teacherAiAssignmentCommentary() {
        return { data: { summary: "official commentary", draft: { title: "Commentary" } } };
      },
      async teacherAiFeedbackDraft() {
        return { data: { summary: "official feedback", draft: { title: "Feedback" } } };
      },
      async teacherAiCoursePracticePlan() {
        return { data: { summary: "official practice", draft: { title: "Practice" } } };
      },
      async teacherAiReportSummary() {
        return { data: { summary: "official report", draft: { title: "Report" } } };
      }
    }
  });

  assert.equal((await adapter.buildTeachingPlan({})).summary, "official teaching");
  assert.equal((await adapter.buildStudentIntervention({})).draft.title, "Intervention");
  assert.equal((await adapter.buildAssignmentCommentary({})).draft.title, "Commentary");
  assert.equal((await adapter.buildFeedbackDraft({})).draft.title, "Feedback");
  assert.equal((await adapter.buildCoursePracticePlan({})).draft.title, "Practice");
  assert.equal((await adapter.buildReportSummary({})).draft.title, "Report");
});

test("TeacherAiAdapter falls back through askAI and keeps structured result", async () => {
  const adapter = new TeacherAiAdapter({
    api: {
      async askAI() {
        return {
          data: {
            provider: "teacher-ask-provider",
            answer: "{\"summary\":\"fallback teaching\",\"actions\":[{\"label\":\"Open review\",\"route\":\"teacher-review\"}],\"draft\":{\"title\":\"Draft title\",\"body\":\"Body\"}}"
          }
        };
      }
    }
  });

  const result = await adapter.buildTeachingPlan({ evidence: ["待批改 3 份"] });
  assert.equal(result.summary, "fallback teaching");
  assert.equal(result.provider, "teacher-ask-provider");
  assert.equal(result.draft.title, "Draft title");
});

test("student selectors derive AI-facing view models from current state", () => {
  const state = baseState();
  state.route = "student-practice";
  state.student.ai.dailyPlan = { summary: "plan summary", actions: [{ label: "Do task", route: "student-learning" }], risks: ["risk"] };
  state.student.ai.weaknessInsight = {
    summary: "weakness summary",
    actions: [{ label: "Go practice", route: "student-practice" }],
    risks: ["practice risk"],
    weaknesses: [{ title: "UML", score: 55, action: "redo" }]
  };
  state.student.ai.assignmentGuide = { summary: "guide summary", actions: [], risks: [], outline: ["step"], checklist: ["check"] };
  state.student.ai.submissionCheck = { summary: "check summary", actions: [], risks: [], completionEstimate: 75, issues: [], strengths: [] };
  state.student.ai.noteOrganizeResult = { summary: "note summary", actions: [], risks: [], cards: [{ front: "Q", back: "A" }], assignmentParagraphs: ["Para"] };

  const panel = buildStudentAiPanelModel(state);
  const learning = selectStudentLearningModel(state);
  const assignments = selectStudentAssignmentsModel(state);
  const detail = selectStudentAssignmentDetailModel(state);
  const practice = selectStudentPracticeModel(state);
  const notes = selectStudentNotesModel(state);
  const context = selectStudentAiContext(state, "student-submit");

  assert.equal(panel.summary, "weakness summary");
  assert.equal(learning.tasks.length, 1);
  assert.equal(assignments.deadlineList.length, 1);
  assert.equal(detail.assignment.id, "assignment_1");
  assert.equal(practice.mistakes.length, 1);
  assert.equal(notes.selectedNote.id, "note_1");
  assert.equal(context.submitDraft.assignmentId, "assignment_1");
});

test("teacher selectors derive AI contexts and panels from current state", () => {
  const state = baseState();
  state.user = { id: "user_teacher", role: "teacher", name: "周老师" };
  state.identityAdmin.users = [
    { id: "user_student", name: "林知夏", role: "student", email: "student@edumind.local", status: "active" }
  ];
  state.analytics.selectedStudent = {
    student: { id: "user_student", name: "林知夏", ai: { completionRate: 75 }, risk: { level: "medium" } },
    recommendations: ["Need intervention"]
  };
  state.analytics.selectedStudentAiResults = [{ result: { summary: "AI result" }, summary: "AI result" }];
  state.analytics.selectedStudentAiTimeline = [{ summary: "Timeline item" }];
  state.assessmentInsight.riskRegister = { items: [{ studentId: "user_student", risk: { level: "medium" }, assignmentCompletionRate: 80, openMistakes: 2, weakConcepts: [{ concept: "UML" }] }] };
  state.assessmentInsight.gradingOverview = { submissionCount: 1, gradedCount: 0, average: 88, consistency: { status: "stable" }, rows: [{ studentName: "林知夏", teacherScore: 90, aiScore: 87, band: "normal" }] };
  state.assessmentInsight.submissionInsight = { recommendation: "Check difference", comparison: [{ metric: "gap", teacher: 90, risk: "warning" }], aiEvidence: { items: [{ summary: "self-check" }] } };
  state.assessmentInsight.courseReport = { assignmentCount: 1, submissionCount: 1, masteryCoverage: { averageMastery: 80 }, mistakeLoad: { openMistakes: 1 } };
  state.workbench.courseDeepReport = { mastery: { concepts: [{ concept: "UML", score: 80 }] } };
  state.reports.catalog = { reports: [{ title: "Student Weekly Report", formats: ["markdown"] }] };
  state.reports.courseWeekly = { report: { title: "Teacher Course Weekly Report", summary: "weekly", generatedAt: "2026-06-21T00:00:00.000Z" } };

  const home = selectTeacherHomeModel(state);
  const course = selectTeacherCourseModel(state);
  const student = selectTeacherStudentModel(state);
  const assignment = selectTeacherAssignmentModel(state);
  const intervention = selectTeacherInterventionModel(state);
  const report = selectTeacherReportModel(state);
  const studentContext = selectTeacherAiContext(state, "teacher-student");
  const reviewPanel = selectTeacherAiPanelModel(state, "teacher-review");

  assert.equal(home.metrics.length, 4);
  assert.equal(course.title, "面向对象技术与方法");
  assert.equal(student.name, "林知夏");
  assert.equal(assignment.title, "领域模型作业");
  assert.equal(intervention.risks.length, 1);
  assert.equal(report.catalog.length, 1);
  assert.equal(studentContext.type, "student_intervention");
  assert.equal(reviewPanel.title, "批改助手");
});

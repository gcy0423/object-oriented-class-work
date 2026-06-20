import { selectTeacherAiPanelModel } from "./state/teacherSelectors.js";
import { teacherAssignmentView } from "./views/teacher/teacherAssignmentView.js";
import { teacherCourseView } from "./views/teacher/teacherCourseView.js";
import { teacherHomeView } from "./views/teacher/teacherHomeView.js";
import { teacherInterventionView } from "./views/teacher/teacherInterventionView.js";
import { teacherReportView } from "./views/teacher/teacherReportView.js";
import { teacherReviewView } from "./views/teacher/teacherReviewView.js";
import { teacherStudentView } from "./views/teacher/teacherStudentView.js";
import { isTeacherRoute, teacherTitleFor } from "./views/teacherRouteTable.js";
import { teacherAiPanel } from "./widgets/teacherAiPanel.js";
import { teacherShell } from "./widgets/teacherShell.js";

const teacherViews = {
  "teacher-home": teacherHomeView,
  "teacher-course": teacherCourseView,
  "teacher-student": teacherStudentView,
  "teacher-assignment": teacherAssignmentView,
  "teacher-review": teacherReviewView,
  "teacher-intervention": teacherInterventionView,
  "teacher-report": teacherReportView
};

export function canUseTeacherRoutes(user) {
  return user?.role === "teacher" || user?.role === "admin";
}

export function defaultRouteForTeacher(user, route = "") {
  if (!canUseTeacherRoutes(user)) {
    return route;
  }
  const legacyMap = {
    assignments: "teacher-assignment",
    "question-banks": "teacher-intervention",
    practice: "teacher-course",
    knowledge: "teacher-course",
    reports: "teacher-report",
    team: "teacher-intervention",
    settings: "teacher-home",
    ai: "teacher-home",
    learning: "teacher-course",
    "identity-admin": "teacher-course",
    operations: "teacher-report"
  };
  if (legacyMap[route]) {
    return legacyMap[route];
  }
  if (!route || route === "dashboard" || route === "analytics" || route === "workbench" || route === "assessment-insight") {
    return "teacher-home";
  }
  return isTeacherRoute(route) ? route : "teacher-home";
}

export function teacherRouteVisible(route, user) {
  return canUseTeacherRoutes(user) && isTeacherRoute(route);
}

export function renderTeacherRoute(state) {
  const route = isTeacherRoute(state.route) ? state.route : "teacher-home";
  const view = teacherViews[route] || teacherHomeView;
  return teacherShell({
    state: { ...state, route },
    title: teacherTitleFor(route),
    subtitle: "",
    content: view({ ...state, route }),
    aiPanel: teacherAiPanel(selectTeacherAiPanelModel({ ...state, route }, route))
  });
}

function firstAssignmentId(state) {
  return state.selected?.assignmentId
    || state.assessment?.assignmentDetail?.assignment?.id
    || state.assessment?.assignments?.[0]?.id
    || state.dashboard?.assignments?.[0]?.id
    || "";
}

function firstStudentId(state) {
  return state.selected?.studentId
    || state.filters?.assessmentInsight?.studentId
    || state.assessmentInsight?.riskRegister?.items?.[0]?.studentId
    || state.analytics?.teacher?.riskStudents?.[0]?.id
    || state.analytics?.teacher?.students?.[0]?.id
    || state.identityAdmin?.users?.find((item) => item.role === "student")?.id
    || "";
}

export async function hydrateTeacherWorkspace(app, baseState = app.store.get()) {
  const state = baseState;
  if (!canUseTeacherRoutes(state.user) || !isTeacherRoute(state.route)) {
    return;
  }

  const patch = {};
  const assignmentId = firstAssignmentId(state);
  const shouldLoadAssignment = ["teacher-home", "teacher-assignment", "teacher-review"].includes(state.route)
    && assignmentId
    && state.assessment?.assignmentDetail?.assignment?.id !== assignmentId;
  if (shouldLoadAssignment) {
    const [detail, overview] = await Promise.allSettled([
      app.api.assignmentDetail(assignmentId),
      app.api.assignmentGradingOverview(assignmentId)
    ]);
    patch.selected = { ...(patch.selected || state.selected), assignmentId };
    patch.filters = {
      ...(patch.filters || state.filters),
      assessmentInsight: { ...state.filters.assessmentInsight, assignmentId }
    };
    patch.assessment = {
      ...(patch.assessment || state.assessment),
      assignmentDetail: detail.status === "fulfilled" ? detail.value.data : state.assessment.assignmentDetail
    };
    patch.assessmentInsight = {
      ...(patch.assessmentInsight || state.assessmentInsight),
      gradingOverview: overview.status === "fulfilled" ? overview.value.data : state.assessmentInsight.gradingOverview
    };
  }

  const nextAssessment = patch.assessment || state.assessment;
  const submissionId = nextAssessment?.assignmentDetail?.submissions?.[0]?.id || "";
  if (state.route === "teacher-review" && submissionId && !state.assessmentInsight?.submissionInsight) {
    const [insight, evidence] = await Promise.allSettled([
      app.api.submissionGradingInsight(submissionId),
      app.api.submissionStudentAiEvidence(submissionId)
    ]);
    patch.filters = {
      ...(patch.filters || state.filters),
      assessmentInsight: { ...state.filters.assessmentInsight, assignmentId, submissionId }
    };
    patch.assessmentInsight = {
      ...(patch.assessmentInsight || state.assessmentInsight),
      submissionInsight: insight.status === "fulfilled"
        ? { ...insight.value.data, aiEvidence: evidence.status === "fulfilled" ? evidence.value.data : null }
        : state.assessmentInsight.submissionInsight
    };
  }

  const studentId = firstStudentId(state);
  const selectedStudentId = state.analytics?.selectedStudent?.student?.id || state.analytics?.selectedStudent?.id || "";
  const shouldLoadStudent = ["teacher-student", "teacher-intervention"].includes(state.route)
    && studentId
    && selectedStudentId !== studentId;
  if (shouldLoadStudent) {
    const [student, aiResults, aiTimeline] = await Promise.allSettled([
      app.api.analyticsStudent(studentId),
      app.api.teacherStudentAiResults(studentId, { limit: 8 }),
      app.api.teacherStudentAiTimeline(studentId, { limit: 12 })
    ]);
    patch.selected = { ...(patch.selected || state.selected), studentId };
    patch.filters = {
      ...(patch.filters || state.filters),
      assessmentInsight: { ...state.filters.assessmentInsight, studentId }
    };
    patch.analytics = {
      ...(patch.analytics || state.analytics),
      selectedStudent: student.status === "fulfilled" ? student.value.data : state.analytics.selectedStudent,
      selectedStudentAiResults: aiResults.status === "fulfilled" ? aiResults.value.data.items || [] : state.analytics.selectedStudentAiResults,
      selectedStudentAiTimeline: aiTimeline.status === "fulfilled" ? aiTimeline.value.data.items || [] : state.analytics.selectedStudentAiTimeline
    };
  }

  if (Object.keys(patch).length) {
    app.setState(patch);
  }
}

async function openStudent(app, studentId) {
  const state = app.store.get();
  const [result, aiResults, aiTimeline] = studentId
    ? await Promise.allSettled([
      app.api.analyticsStudent(studentId),
      app.api.teacherStudentAiResults(studentId, { limit: 8 }),
      app.api.teacherStudentAiTimeline(studentId, { limit: 12 })
    ])
    : [];
  app.writeRoute("teacher-student");
  app.setState({
    route: "teacher-student",
    selected: { ...state.selected, studentId },
    filters: { ...state.filters, assessmentInsight: { ...state.filters.assessmentInsight, studentId } },
    analytics: {
      ...state.analytics,
      selectedStudent: result?.status === "fulfilled" ? result.value.data : state.analytics.selectedStudent,
      selectedStudentAiResults: aiResults?.status === "fulfilled" ? aiResults.value.data.items || [] : state.analytics.selectedStudentAiResults,
      selectedStudentAiTimeline: aiTimeline?.status === "fulfilled" ? aiTimeline.value.data.items || [] : state.analytics.selectedStudentAiTimeline
    }
  });
}

async function openAssignment(app, assignmentId) {
  const state = app.store.get();
  const [detail, overview] = assignmentId
    ? await Promise.allSettled([
      app.api.assignmentDetail(assignmentId),
      app.api.assignmentGradingOverview(assignmentId)
    ])
    : [];
  app.writeRoute("teacher-assignment");
  app.setState({
    route: "teacher-assignment",
    selected: { ...state.selected, assignmentId },
    filters: { ...state.filters, assessmentInsight: { ...state.filters.assessmentInsight, assignmentId } },
    assessment: {
      ...state.assessment,
      assignmentDetail: detail?.status === "fulfilled" ? detail.value.data : state.assessment.assignmentDetail
    },
    assessmentInsight: {
      ...state.assessmentInsight,
      gradingOverview: overview?.status === "fulfilled" ? overview.value.data : state.assessmentInsight.gradingOverview
    }
  });
}

export async function handleTeacherAction(app, actionButton) {
  const action = actionButton.dataset.action;
  const state = app.store.get();
  if (!canUseTeacherRoutes(state.user)) {
    return false;
  }
  if (action === "teacher-route") {
    const route = defaultRouteForTeacher(state.user, actionButton.dataset.route);
    app.writeRoute(route);
    app.setState({ route });
    hydrateTeacherWorkspace(app, { ...state, route }).catch(() => {});
    return true;
  }
  if (action === "teacher-open-student") {
    await openStudent(app, actionButton.dataset.id || state.selected.studentId || "");
    return true;
  }
  if (action === "teacher-open-assignment") {
    await openAssignment(app, actionButton.dataset.id || state.selected.assignmentId || "");
    return true;
  }
  if (action === "teacher-send-intervention") {
    const studentId = actionButton.dataset.id || state.selected.studentId || "";
    if (!studentId) {
      app.toast("请先选择学生。");
      return true;
    }
    await app.api.createTeacherIntervention(studentId, {
      courseId: state.filters.assessmentInsight.courseId || state.dashboard?.courses?.[0]?.id || "",
      reason: "教师基于学生 AI 行动、作业提交和风险证据确认后发起干预。",
      message: "老师建议你先补齐当前最关键的一项学习行动，并在两天内回看反馈。",
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      channels: ["in_app"]
    });
    await app.refreshApp("教师干预提醒已发送。");
    return true;
  }
  return false;
}

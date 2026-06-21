import { TeacherAiAdapter } from "./ai/teacherAiAdapter.js";
import { selectTeacherAiContext, selectTeacherAiPanelModel } from "./state/teacherSelectors.js";
import { teacherAssignmentView } from "./views/teacher/teacherAssignmentView.js";
import { teacherCourseView } from "./views/teacher/teacherCourseView.js";
import { teacherHomeView } from "./views/teacher/teacherHomeView.js";
import { teacherInterventionView } from "./views/teacher/teacherInterventionView.js";
import { teacherReportView } from "./views/teacher/teacherReportView.js";
import { teacherReviewView } from "./views/teacher/teacherReviewView.js";
import { teacherSettingsView } from "./views/teacher/teacherSettingsView.js";
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
  "teacher-report": teacherReportView,
  "teacher-settings": teacherSettingsView
};

function defaultTeacherStatePatch() {
  return {
    ai: {
      currentResult: null,
      resultsByRoute: {},
      drafts: [],
      lastCommand: null,
      loading: false
    }
  };
}

function mergeTeacherState(teacher = {}, patch = {}) {
  return {
    ...defaultTeacherStatePatch(),
    ...teacher,
    ...patch,
    ai: { ...defaultTeacherStatePatch().ai, ...(teacher.ai || {}), ...(patch.ai || {}) }
  };
}

function patchTeacherSaving(app, value) {
  if (typeof app.patchSaving === "function") {
    app.patchSaving("teacherAi", value);
  }
}

export function canUseTeacherRoutes(user) {
  return user?.role === "teacher" || user?.role === "admin";
}

export function defaultRouteForTeacher(user, route = "") {
  if (!canUseTeacherRoutes(user)) {
    return route;
  }
  const legacyMap = {
    assignments: "teacher-assignment",
    "question-banks": "teacher-course",
    practice: "teacher-course",
    knowledge: "teacher-course",
    reports: "teacher-report",
    team: "teacher-intervention",
    settings: "teacher-settings",
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

function firstCourseId(state) {
  return state.filters?.assessmentInsight?.courseId
    || state.filters?.reports?.courseId
    || state.dashboard?.courses?.[0]?.id
    || state.assessment?.assignments?.[0]?.courseId
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

  const context = selectTeacherAiContext(app.store.get(), state.route);
  const routeResult = app.store.get().teacher?.ai?.resultsByRoute?.[state.route];
  if (context.type) {
    const [latestResultPayload, draftsPayload] = await Promise.all([
      typeof app.api.teacherAiResults === "function"
        ? app.api.teacherAiResults({ type: context.type, route: state.route, limit: 1 }).catch(() => ({ data: { items: [] } }))
        : Promise.resolve({ data: { items: [] } }),
      typeof app.api.teacherAiDrafts === "function"
        ? app.api.teacherAiDrafts({ type: context.type }).catch(() => ({ data: { items: [] } }))
        : Promise.resolve({ data: { items: [] } })
    ]);
    const latestResult = (latestResultPayload.data.items || [])[0] || null;
    if (latestResult) {
      app.setState({
        teacher: mergeTeacherState(app.store.get().teacher, {
          ai: {
            currentResult: latestResult.result ? { ...latestResult.result, id: latestResult.id, actions: latestResult.actions || latestResult.result.actions || [], provider: latestResult.provider, generatedAt: latestResult.generatedAt } : latestResult,
            resultsByRoute: {
              ...(app.store.get().teacher?.ai?.resultsByRoute || {}),
              [state.route]: latestResult.result ? { ...latestResult.result, id: latestResult.id, actions: latestResult.actions || latestResult.result.actions || [], provider: latestResult.provider, generatedAt: latestResult.generatedAt } : latestResult
            },
            drafts: draftsPayload.data.items || []
          }
        })
      });
      return;
    }
  }
  if (!routeResult && context.type) {
    const adapter = new TeacherAiAdapter({ api: app.api });
    const buildMap = {
      teaching_plan: "buildTeachingPlan",
      student_intervention: "buildStudentIntervention",
      assignment_commentary: "buildAssignmentCommentary",
      feedback_draft: "buildFeedbackDraft",
      course_practice_plan: "buildCoursePracticePlan",
      report_summary: "buildReportSummary"
    };
    const method = buildMap[context.type];
    if (method && typeof adapter[method] === "function") {
      const result = await adapter[method](context);
      const draftsPayload = typeof app.api.teacherAiDrafts === "function"
        ? await app.api.teacherAiDrafts({ type: context.type }).catch(() => ({ data: { items: [] } }))
        : { data: { items: [] } };
      app.setState({
        teacher: mergeTeacherState(app.store.get().teacher, {
          ai: {
            currentResult: result,
            resultsByRoute: { ...(app.store.get().teacher?.ai?.resultsByRoute || {}), [state.route]: result },
            drafts: draftsPayload.data.items || [],
            lastCommand: context.type
          }
        })
      });
    }
  } else if (context.type) {
    const draftsPayload = typeof app.api.teacherAiDrafts === "function"
      ? await app.api.teacherAiDrafts({ type: context.type }).catch(() => ({ data: { items: [] } }))
      : { data: { items: [] } };
    app.setState({
      teacher: mergeTeacherState(app.store.get().teacher, {
        ai: {
          currentResult: routeResult || null,
          drafts: draftsPayload.data.items || []
        }
      })
    });
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

async function loadSubmissionInsight(app, submissionId) {
  const state = app.store.get();
  const targetSubmissionId = submissionId || state.filters.assessmentInsight?.submissionId || "";
  if (!targetSubmissionId) {
    app.toast("请先选择提交。");
    return;
  }
  const [insight, evidence] = await Promise.allSettled([
    app.api.submissionGradingInsight(targetSubmissionId),
    app.api.submissionStudentAiEvidence(targetSubmissionId)
  ]);
  app.writeRoute("teacher-review");
  app.setState({
    route: "teacher-review",
    filters: {
      ...state.filters,
      assessmentInsight: {
        ...state.filters.assessmentInsight,
        submissionId: targetSubmissionId
      }
    },
    assessmentInsight: {
      ...state.assessmentInsight,
      submissionInsight: insight.status === "fulfilled"
        ? { ...insight.value.data, aiEvidence: evidence.status === "fulfilled" ? evidence.value.data : null }
        : state.assessmentInsight.submissionInsight
    }
  });
}

async function runAiReview(app, submissionId) {
  const targetSubmissionId = submissionId || app.store.get().filters.assessmentInsight?.submissionId || "";
  if (!targetSubmissionId) {
    app.toast("请先选择一份提交。");
    return;
  }
  await app.api.reviewSubmissionWithAI(targetSubmissionId);
  await loadSubmissionInsight(app, targetSubmissionId);
  app.toast("AI 初评已完成，评分洞察已更新。");
}

async function buildPracticePlan(app) {
  const state = app.store.get();
  const courseId = firstCourseId(state);
  if (!courseId) {
    app.toast("请先选择课程。");
    return;
  }
  const result = await app.api.adaptivePracticePlan({ courseId, questionCount: 8 });
  app.setState({
    route: "teacher-course",
    filters: {
      ...state.filters,
      assessmentInsight: { ...state.filters.assessmentInsight, courseId }
    },
    assessmentInsight: {
      ...state.assessmentInsight,
      adaptivePlan: result.data
    }
  });
  app.toast("补练建议已生成。");
}

async function generateTeacherReport(app, type) {
  const state = app.store.get();
  const courseId = firstCourseId(state);
  const assignmentId = firstAssignmentId(state);
  const params = {
    format: state.filters?.reports?.format || "markdown",
    ...(courseId ? { courseId } : {})
  };
  let result;
  let reportsPatch = {};
  if (type === "assignment") {
    if (!assignmentId) {
      app.toast("请先选择作业。");
      return;
    }
    result = await app.api.assignmentGradingReport(assignmentId, { format: params.format });
    reportsPatch = { assignmentGrading: result.data };
  } else if (type === "ai-usage") {
    result = await app.api.aiUsageReport(courseId ? { courseId, format: params.format } : { format: params.format });
    reportsPatch = { aiUsage: result.data };
  } else {
    result = await app.api.courseWeeklyReport(params);
    reportsPatch = { courseWeekly: result.data };
  }
  app.writeRoute("teacher-report");
  app.setState({
    route: "teacher-report",
    filters: {
      ...state.filters,
      reports: {
        ...state.filters.reports,
        ...(courseId ? { courseId } : {}),
        ...(assignmentId ? { assignmentId } : {}),
        format: params.format
      }
    },
    reports: {
      ...state.reports,
      ...reportsPatch,
      exportPreview: result.data
    }
  });
  app.toast(type === "assignment" ? "作业评阅报告已生成。" : type === "ai-usage" ? "AI 使用报告已生成。" : "课程周报已生成。");
}

async function generateTeacherAi(app, command, overrides = {}) {
  const state = app.store.get();
  const route = isTeacherRoute(state.route) ? state.route : "teacher-home";
  const context = { ...selectTeacherAiContext(state, route), ...overrides };
  const adapter = new TeacherAiAdapter({ api: app.api });
  const buildMap = {
    teaching_plan: "buildTeachingPlan",
    student_intervention: "buildStudentIntervention",
    assignment_commentary: "buildAssignmentCommentary",
    feedback_draft: "buildFeedbackDraft",
    course_practice_plan: "buildCoursePracticePlan",
    report_summary: "buildReportSummary"
  };
  const method = buildMap[command];
  if (!method || typeof adapter[method] !== "function") {
    app.toast("当前页面暂不支持该 AI 指令。");
    return;
  }
  patchTeacherSaving(app, true);
  try {
    const result = await adapter[method](context);
    const drafts = typeof app.api.teacherAiDrafts === "function"
      ? await app.api.teacherAiDrafts({ type: command }).catch(() => ({ data: { items: [] } }))
      : { data: { items: [] } };
    app.setState({
      teacher: mergeTeacherState(state.teacher, {
        ai: {
          currentResult: result,
          resultsByRoute: { ...(state.teacher?.ai?.resultsByRoute || {}), [route]: result },
          drafts: drafts.data.items || [],
          lastCommand: command
        }
      }),
      provider: result.provider || state.provider
    });
    app.toast("教师 AI 草稿已生成。");
  } finally {
    patchTeacherSaving(app, false);
  }
}

async function confirmTeacherAiDraft(app, command) {
  const state = app.store.get();
  const drafts = state.teacher?.ai?.drafts || [];
  const draft = drafts[0] || null;
  if (!draft) {
    app.toast("当前没有可确认的 AI 草稿。");
    return;
  }
  patchTeacherSaving(app, true);
  try {
    if (command === "send-intervention" && typeof app.api.sendTeacherAiInterventionDraft === "function") {
      await app.api.sendTeacherAiInterventionDraft(draft.id, {
        studentId: draft.studentId,
        courseId: draft.courseId,
        message: draft.structuredPayload?.message || draft.body,
        dueAt: draft.structuredPayload?.dueAt || null,
        channels: draft.structuredPayload?.channels || ["in_app"]
      });
      await app.refreshApp("教师干预提醒已发送。");
      return;
    }
    if (command === "save-feedback" && typeof app.api.saveTeacherAiFeedbackDraft === "function") {
      const result = await app.api.saveTeacherAiFeedbackDraft(draft.id, {});
      const savedFeedback = result.data?.savedFeedback || null;
      const currentInsight = app.store.get().assessmentInsight?.submissionInsight || {};
      app.setState({
        assessmentInsight: {
          ...app.store.get().assessmentInsight,
          submissionInsight: {
            ...currentInsight,
            teacherFeedback: savedFeedback,
            recommendation: draft.summary || currentInsight.recommendation || ""
          }
        }
      });
      app.toast("反馈草稿已保存到批改记录。");
    } else if (command === "save-practice-plan" && typeof app.api.saveTeacherAiPracticePlanDraft === "function") {
      const result = await app.api.saveTeacherAiPracticePlanDraft(draft.id, {});
      if (result.data?.savedPracticePlan) {
        app.setState({
          assessmentInsight: {
            ...app.store.get().assessmentInsight,
            adaptivePlan: result.data.savedPracticePlan
          }
        });
      }
      app.toast("补练草稿已保存到课程建议。");
    } else if (typeof app.api.saveTeacherAiCommentaryDraft === "function") {
      const result = await app.api.saveTeacherAiCommentaryDraft(draft.id, {});
      const savedCommentary = result.data?.savedCommentary || null;
      if (savedCommentary) {
        app.setState({
          reports: {
            ...app.store.get().reports,
            exportPreview: savedCommentary,
            ...(draft.type === "report_summary" ? { courseWeekly: savedCommentary } : { assignmentGrading: savedCommentary })
          }
        });
      }
      app.toast(draft.type === "report_summary" ? "报告摘要草稿已保存。" : "讲评草稿已保存。");
    }
    const nextDrafts = typeof app.api.teacherAiDrafts === "function"
      ? await app.api.teacherAiDrafts({ type: draft.type }).catch(() => ({ data: { items: [] } }))
      : { data: { items: [] } };
    app.setState({
      teacher: mergeTeacherState(app.store.get().teacher, {
        ai: {
          drafts: nextDrafts.data.items || []
        }
      })
    });
  } finally {
    patchTeacherSaving(app, false);
  }
}

function confirmTeacherAction(app, message) {
  if (typeof app.confirm === "function") {
    return app.confirm(message);
  }
  if (typeof window !== "undefined" && typeof window.confirm === "function") {
    return window.confirm(message);
  }
  return true;
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
  if (action === "teacher-generate-ai") {
    await generateTeacherAi(app, actionButton.dataset.command || "");
    return true;
  }
  if (action === "teacher-confirm-ai-draft") {
    await confirmTeacherAiDraft(app, actionButton.dataset.command || "");
    return true;
  }
  if (action === "teacher-open-ai-draft") {
    if (typeof app.api.teacherAiDraft !== "function") {
      app.toast("当前环境未提供教师 AI 草稿详情接口。");
      return true;
    }
    const draft = await app.api.teacherAiDraft(actionButton.dataset.id || "");
    app.setState({
      teacher: mergeTeacherState(state.teacher, {
        ai: {
          drafts: [draft.data, ...(state.teacher?.ai?.drafts || []).filter((item) => item.id !== draft.data.id)]
        }
      })
    });
    app.toast("已载入教师 AI 草稿。");
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
  if (action === "teacher-load-submission-insight") {
    await loadSubmissionInsight(app, actionButton.dataset.id || "");
    return true;
  }
  if (action === "teacher-run-ai-review") {
    await runAiReview(app, actionButton.dataset.id || "");
    return true;
  }
  if (action === "teacher-build-practice-plan") {
    if (typeof app.api.teacherAiCoursePracticePlan === "function" || typeof app.api.askAI === "function") {
      await generateTeacherAi(app, "course_practice_plan");
    } else {
      await buildPracticePlan(app);
    }
    return true;
  }
  if (action === "teacher-generate-course-report") {
    await generateTeacherReport(app, "course");
    return true;
  }
  if (action === "teacher-generate-assignment-report") {
    await generateTeacherReport(app, "assignment");
    return true;
  }
  if (action === "teacher-generate-ai-usage-report") {
    await generateTeacherReport(app, "ai-usage");
    return true;
  }
  if (action === "teacher-send-intervention") {
    if (!confirmTeacherAction(app, "确认向这名学生发送干预提醒吗？发送前请确认对象、证据和语气。")) {
      return true;
    }
    if (typeof app.api.sendTeacherAiInterventionDraft === "function" || typeof app.api.teacherAiStudentIntervention === "function" || typeof app.api.askAI === "function") {
      await generateTeacherAi(app, "student_intervention", {
        studentId: actionButton.dataset.id || state.selected.studentId || "",
        studentName: actionButton.dataset.name || "",
        courseId: state.filters.assessmentInsight.courseId || state.dashboard?.courses?.[0]?.id || ""
      });
      await confirmTeacherAiDraft(app, "send-intervention");
    } else if (typeof app.api.createTeacherIntervention === "function") {
      await app.api.createTeacherIntervention(actionButton.dataset.id || state.selected.studentId || "", {
        courseId: state.filters.assessmentInsight.courseId || state.dashboard?.courses?.[0]?.id || "",
        reason: "教师基于学生 AI 行动、作业提交和风险证据确认后发起干预。",
        message: "老师建议你先补齐当前最关键的一项学习行动，并在两天内回看反馈。",
        dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        channels: ["in_app"]
      });
      await app.refreshApp("教师干预提醒已发送。");
    }
    return true;
  }
  return false;
}

import { ApiClient } from "./api.js";
import { assessmentInsightView } from "./views/assessmentInsightView.js";
import { assignmentManageView } from "./views/assignmentManageView.js";
import { analyticsView } from "./views/analyticsView.js";
import { aiView } from "./views/aiView.js";
import { dashboardView } from "./views/dashboardView.js";
import { identityAdminView } from "./views/identityAdminView.js";
import { knowledgeView } from "./views/knowledgeView.js";
import { learningView } from "./views/learningView.js";
import { operationsView } from "./views/operationsView.js";
import { practiceView } from "./views/practiceView.js";
import { questionBankManageView } from "./views/questionBankManageView.js";
import { reportView } from "./views/reportView.js";
import { settingsView } from "./views/settingsView.js";
import { teamView } from "./views/teamView.js";
import { workbenchView } from "./views/workbenchView.js";
import { createInitialState } from "./state/appState.js";
import { buildModelConfig, canManageAssessment, routeVisible, withErrorPatch, withLoadingPatch, withSavingPatch } from "./state/selectors.js";
import { Store } from "./state/viewState.js";
import { defaultRouteForUser, handleStudentAction, handleStudentSubmit, hydrateStudentWorkspace, renderStudentRoute, studentRouteVisible } from "./studentRuntime.js";
import { defaultRouteForTeacher, handleTeacherAction, hydrateTeacherWorkspace, renderTeacherRoute, teacherRouteVisible } from "./teacherRuntime.js";
import { readCheckedValues, readFormData } from "./utils/dom.js";
import { compactErrors, validateAssignment, validateGrade, validateProfile, validateQuestion, validateQuestionBank } from "./utils/validation.js";
import { routeTable, shellLayout, subtitleFor, titleFor } from "./widgets/layout.js";
import { toastView } from "./widgets/toast.js";

const views = {
  dashboard: dashboardView,
  workbench: workbenchView,
  knowledge: knowledgeView,
  learning: learningView,
  assignments: assignmentManageView,
  "question-banks": questionBankManageView,
  practice: practiceView,
  "assessment-insight": assessmentInsightView,
  reports: reportView,
  "identity-admin": identityAdminView,
  operations: operationsView,
  analytics: analyticsView,
  ai: aiView,
  team: teamView,
  settings: settingsView
};

function splitIds(value) {
  return String(value || "").split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
}

function firstItem(items) {
  return Array.isArray(items) && items.length ? items[0] : null;
}

class EduMindApp {
  constructor(root) {
    this.root = root;
    this.api = new ApiClient();
    this.store = new Store(createInitialState());
    this.events = null;
    this.isHydrating = false;
    this.isRefreshing = false;
    this.eventRefreshTimer = null;
    this.lastEventRefreshAt = 0;
    this.store.subscribe(() => this.render());
    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("submit", (event) => this.handleSubmit(event));
    this.root.addEventListener("change", (event) => this.handleChange(event));
    if (typeof window !== "undefined") {
      window.addEventListener("hashchange", () => this.syncRouteFromLocation());
    }
  }

  async start() {
    if (!this.api.token) {
      this.renderLogin();
      return;
    }
    try {
      await this.loadSession();
    } catch {
      this.api.setToken("");
      this.renderLogin();
    }
  }

  render() {
    const state = this.store.get();
    if (!state.user) {
      this.renderLogin();
      return;
    }
    if (this.isHydrating) {
      const route = this.resolveRoute(this.readRoute() || state.route, state.user);
      if (studentRouteVisible(route, state.user)) {
        this.root.innerHTML = `
          ${renderStudentRoute({ ...state, route })}
          ${toastView(state.toast)}
        `;
        return;
      }
      if (teacherRouteVisible(route, state.user)) {
        this.root.innerHTML = `
          ${renderTeacherRoute({ ...state, route })}
          ${toastView(state.toast)}
        `;
        return;
      }
      this.root.innerHTML = `
        ${shellLayout({
          state: { ...state, route },
          title: titleFor(route),
          subtitle: subtitleFor(route, state.user),
          content: `<section class="panel"><div class="empty-state">正在加载工作台数据...</div></section>`
        })}
        ${toastView(state.toast)}
      `;
      return;
    }
    const route = studentRouteVisible(state.route, state.user)
      ? state.route
      : routeVisible(state.route, state.user)
        ? state.route
        : defaultRouteForUser(state.user);
    if (studentRouteVisible(route, state.user)) {
      this.root.innerHTML = `
        ${renderStudentRoute({ ...state, route })}
        ${toastView(state.toast)}
      `;
      return;
    }
    if (teacherRouteVisible(route, state.user)) {
      this.root.innerHTML = `
        ${renderTeacherRoute({ ...state, route })}
        ${toastView(state.toast)}
      `;
      return;
    }
    const view = views[route] || views.dashboard;
    this.root.innerHTML = `
      ${shellLayout({
        state: { ...state, route },
        title: titleFor(route),
        subtitle: subtitleFor(route, state.user),
        content: view(state)
      })}
      ${toastView(state.toast)}
    `;
  }

  renderLogin() {
    this.root.innerHTML = `
      <section class="login-wrap">
        <div class="login-copy">
          <h1>EduMind Agent</h1>
          <p>把学习计划、作业反馈、课程练习和协作消息集中到一个清晰的学习工作台。</p>
        </div>
        <form class="login-panel form-grid" data-form="login">
          <h2>进入系统</h2>
          <label><span>姓名</span><input name="name" value="林知夏" /></label>
          <label><span>邮箱</span><input name="email" value="student@edumind.local" /></label>
          <label><span>角色</span><select name="role"><option value="student">学生</option><option value="teacher">教师</option><option value="admin">管理员</option></select></label>
          <button class="btn primary" type="submit">登录</button>
        </form>
      </section>
    `;
  }

  setState(patch) {
    this.store.set(patch);
  }

  patchLoading(key, value) {
    this.setState(withLoadingPatch(this.store.get(), key, value));
  }

  patchSaving(key, value) {
    this.setState(withSavingPatch(this.store.get(), key, value));
  }

  patchError(key, value) {
    this.setState(withErrorPatch(this.store.get(), key, value));
  }

  async loadSession() {
    this.isHydrating = true;
    this.patchLoading("session", true);
    try {
      const me = await this.api.me();
      const route = this.readRoute();
      const normalizedRoute = this.resolveRoute(route, me.data.user);
      this.writeRoute(normalizedRoute);
      this.setState({ user: me.data.user, route: normalizedRoute, draft: { ...this.store.get().draft, profile: me.data.user } });
      await this.refreshApp();
      this.connectEvents();
    } finally {
      this.patchLoading("session", false);
      this.isHydrating = false;
      this.syncRouteFromLocation();
    }
  }

  readRoute() {
    const value = typeof window !== "undefined" ? String(window.location.hash || "").replace(/^#/, "") : "";
    if (!value) {
      return "";
    }
    if (routeTable[value] || value.startsWith("student-") || value.startsWith("teacher-")) {
      return value;
    }
    return "dashboard";
  }

  writeRoute(route) {
    if (typeof window !== "undefined") {
      window.location.hash = route;
    }
  }

  resolveRoute(route, user = this.store.get().user) {
    if (user?.role === "student" && (!route || route === "dashboard")) {
      return defaultRouteForUser(user, "");
    }
    if ((user?.role === "teacher" || user?.role === "admin") && (!route || route === "dashboard" || route === "analytics" || route === "workbench" || route === "assessment-insight")) {
      return defaultRouteForTeacher(user, route);
    }
    if (teacherRouteVisible(route, user)) {
      return route;
    }
    if (user?.role === "teacher" || user?.role === "admin") {
      return defaultRouteForTeacher(user, route);
    }
    if (studentRouteVisible(route, user) || routeVisible(route, user)) {
      return route;
    }
    return user?.role === "teacher" || user?.role === "admin" ? defaultRouteForTeacher(user, "") : defaultRouteForUser(user, "");
  }

  syncRouteFromLocation() {
    if (this.isHydrating) {
      return;
    }
    const state = this.store.get();
    if (!state.user) {
      return;
    }
    const route = this.resolveRoute(this.readRoute(), state.user);
    if (route !== this.readRoute()) {
      this.writeRoute(route);
    }
    if (route !== state.route) {
      this.setState({ route });
      hydrateStudentWorkspace(this, { ...state, route }).catch(() => {});
      hydrateTeacherWorkspace(this, { ...state, route }).catch(() => {});
    }
  }

  async refreshApp(message = "") {
    if (this.isRefreshing) {
      return;
    }
    this.isRefreshing = true;
    const state = this.store.get();
    this.patchLoading("dashboard", true);
    try {
      const dashboard = await this.api.dashboard();
      const firstCourseId = dashboard.data.courses?.[0]?.id || "";
      const isTeacher = canManageAssessment(state.user);
      const [
        messagesResult,
        activityResult,
        assignmentsResult,
        rubricsResult,
        banksResult,
        questionsResult,
        mistakesResult,
        historyResult,
        overviewResult,
        teacherResult,
        healthResult
      ] = await Promise.allSettled([
        this.api.messages(),
        this.api.request("/api/activity"),
        this.api.assignments({ courseId: state.filters.assignments.courseId || firstCourseId }),
        isTeacher ? this.api.rubrics(firstCourseId ? { courseId: firstCourseId } : {}) : Promise.resolve({ data: [] }),
        this.api.questionBanks(state.filters.questionBanks.courseId ? { courseId: state.filters.questionBanks.courseId } : firstCourseId ? { courseId: firstCourseId } : {}),
        this.api.questions({ bankId: state.selected.questionBankId, courseId: state.filters.questionBanks.courseId || firstCourseId }),
        this.api.mistakes(firstCourseId ? { courseId: firstCourseId } : {}),
        this.api.practiceSessions(firstCourseId ? { courseId: firstCourseId } : {}),
        this.api.analyticsOverview(),
        isTeacher ? this.api.analyticsTeacher() : Promise.resolve({ data: null }),
        this.api.health()
      ]);

      const workbenchCourseId = state.filters.workbench.courseId || firstCourseId;
      const notificationParams = state.filters.workbench.category ? { category: state.filters.workbench.category } : {};
      const reminderParams = {
        ...(workbenchCourseId ? { courseId: workbenchCourseId } : {}),
        ...(state.filters.workbench.reminderStatus ? { status: state.filters.workbench.reminderStatus } : {})
      };
      const [
        notificationSummaryResult,
        notificationsResult,
        notificationPreferencesResult,
        remindersResult,
        schedulerDashboardResult,
        schedulerTimelineResult,
        schedulerDuePreviewResult,
        funnelResult,
        riskBoardResult,
        engagementResult,
        courseDeepReportResult,
        studentProgressResult
      ] = await Promise.allSettled([
        this.api.notificationSummary(notificationParams),
        this.api.notifications(notificationParams),
        this.api.notificationPreferences(),
        this.api.schedulerReminders(reminderParams),
        this.api.schedulerDashboard(reminderParams),
        this.api.schedulerTimeline(reminderParams),
        this.api.schedulerDuePreview(workbenchCourseId ? { courseId: workbenchCourseId } : {}),
        this.api.analyticsFunnel(workbenchCourseId ? { courseId: workbenchCourseId } : {}),
        isTeacher && workbenchCourseId ? this.api.analyticsRiskBoard({ courseId: workbenchCourseId }) : Promise.resolve({ data: null }),
        this.api.analyticsEngagement(workbenchCourseId ? { courseId: workbenchCourseId } : {}),
        workbenchCourseId ? this.api.analyticsCourseDeepReport(workbenchCourseId) : Promise.resolve({ data: null }),
        state.user?.id ? this.api.analyticsStudentProgress(state.user.id) : Promise.resolve({ data: null })
      ]);

      const [
        studentAiResultsResult,
        studentAiTimelineResult,
        studentTaskDraftsResult,
        studentSubmissionDraftResult,
        noteOrganizeHistoryResult
      ] = state.user?.role === "student"
        ? await Promise.allSettled([
          this.api.studentAiResults({ type: "daily_plan", limit: 1 }),
          this.api.studentAiTimeline({ limit: 12 }),
          this.api.studentAiTaskDrafts(),
          this.api.submissionDraft(state.selected.assignmentId ? { assignmentId: state.selected.assignmentId } : {}),
          this.api.noteOrganizeResults()
        ])
        : [null, null, null, null, null];

      const knowledgeCourseId = state.filters.knowledge.courseId || firstCourseId;
      const knowledgeParams = {
        ...(knowledgeCourseId ? { courseId: knowledgeCourseId } : {}),
        ...(state.filters.knowledge.category ? { category: state.filters.knowledge.category } : {}),
        ...(state.filters.knowledge.difficulty ? { difficulty: state.filters.knowledge.difficulty } : {}),
        ...(state.filters.knowledge.tag ? { tag: state.filters.knowledge.tag } : {})
      };
      const [
        knowledgeSummaryResult,
        knowledgeConceptsResult,
        knowledgeSearchResult,
        knowledgeGraphResult,
        knowledgeRecommendationsResult
      ] = await Promise.allSettled([
        this.api.knowledgeSummary(),
        this.api.knowledgeConcepts(knowledgeParams),
        this.api.knowledgeSearch({
          ...(knowledgeCourseId ? { courseId: knowledgeCourseId } : {}),
          q: state.filters.knowledge.query || "",
          limit: 8
        }),
        this.api.knowledgeGraph({
          ...(knowledgeCourseId ? { courseId: knowledgeCourseId } : {}),
          ...(state.filters.knowledge.conceptId ? { conceptId: state.filters.knowledge.conceptId } : {}),
          depth: state.filters.knowledge.conceptId ? 2 : 1
        }),
        this.api.knowledgeRecommendations({
          ...(knowledgeCourseId ? { courseId: knowledgeCourseId } : {}),
          goal: state.filters.knowledge.query || "",
          limit: 5
        })
      ]);

      let assignmentDetail = state.assessment.assignmentDetail;
      if (state.selected.assignmentId) {
        try {
          const detail = await this.api.assignmentDetail(state.selected.assignmentId);
          assignmentDetail = detail.data;
        } catch {
          assignmentDetail = null;
        }
      }

      let practiceSession = state.assessment.practiceSession;
      if (state.selected.practiceSessionId) {
        try {
          const detail = await this.api.practiceSession(state.selected.practiceSessionId);
          practiceSession = detail.data;
        } catch {
          practiceSession = null;
        }
      }

      const assignmentRows = assignmentsResult.status === "fulfilled" ? assignmentsResult.value.data : [];
      const rubricRows = rubricsResult.status === "fulfilled" ? rubricsResult.value.data : [];
      const mistakeRows = mistakesResult.status === "fulfilled" ? mistakesResult.value.data : [];
      const practiceRows = historyResult.status === "fulfilled" ? historyResult.value.data.items || historyResult.value.data : [];
      const insightFilter = state.filters.assessmentInsight;
      const insightCourseId = insightFilter.courseId || firstCourseId;
      const courseAssignments = assignmentRows.filter((item) => !insightCourseId || item.courseId === insightCourseId);
      const insightAssignmentId = insightFilter.assignmentId || state.selected.assignmentId || assignmentDetail?.assignment?.id || firstItem(courseAssignments)?.id || firstItem(assignmentRows)?.id || "";
      let insightAssignmentDetail = assignmentDetail?.assignment?.id === insightAssignmentId ? assignmentDetail : null;
      if (insightAssignmentId && !insightAssignmentDetail) {
        try {
          const detail = await this.api.assignmentDetail(insightAssignmentId);
          insightAssignmentDetail = detail.data;
        } catch {
          insightAssignmentDetail = null;
        }
      }
      const insightRubricId = insightFilter.rubricId || insightAssignmentDetail?.assignment?.rubricId || firstItem(rubricRows)?.id || "";
      const insightSubmissionId = insightFilter.submissionId || firstItem(insightAssignmentDetail?.submissions || [])?.id || "";
      const insightPracticeSessionId = insightFilter.practiceSessionId || state.selected.practiceSessionId || firstItem(practiceRows)?.id || "";
      const insightMistakeId = insightFilter.mistakeId || firstItem(mistakeRows)?.id || "";
      const insightStudentId = insightFilter.studentId || state.user?.id || "";
      const learnerScope = {
        ...(insightCourseId ? { courseId: insightCourseId } : {}),
        ...(insightStudentId ? { studentId: insightStudentId } : {})
      };
      const [
        gradingOverviewResult,
        rubricInsightResult,
        submissionInsightResult,
        submissionEvidenceResult,
        sessionReviewResult,
        mistakeAnalysisResult,
        mistakeDetailResult,
        courseReportResult,
        studentPortfolioResult,
        riskRegisterResult
      ] = await Promise.allSettled([
        isTeacher && insightAssignmentId ? this.api.assignmentGradingOverview(insightAssignmentId) : Promise.resolve({ data: null }),
        insightRubricId ? this.api.rubricInsight(insightRubricId) : Promise.resolve({ data: null }),
        isTeacher && insightSubmissionId ? this.api.submissionGradingInsight(insightSubmissionId) : Promise.resolve({ data: null }),
        isTeacher && insightSubmissionId ? this.api.submissionStudentAiEvidence(insightSubmissionId) : Promise.resolve({ data: null }),
        insightPracticeSessionId ? this.api.practiceSessionReview(insightPracticeSessionId) : Promise.resolve({ data: null }),
        insightCourseId ? this.api.mistakeAnalysis(learnerScope) : Promise.resolve({ data: null }),
        insightMistakeId ? this.api.mistakeDetailAnalysis(insightMistakeId) : Promise.resolve({ data: null }),
        isTeacher && insightCourseId ? this.api.assessmentCourseReport({ courseId: insightCourseId }) : Promise.resolve({ data: null }),
        insightCourseId ? this.api.assessmentStudentPortfolio(learnerScope) : Promise.resolve({ data: null }),
        isTeacher && insightCourseId ? this.api.assessmentRiskRegister({ courseId: insightCourseId }) : Promise.resolve({ data: null })
      ]);

      const collaborationFilter = state.filters.collaboration;
      const collaborationCourseId = collaborationFilter.courseId || firstCourseId;
      const roomParams = {
        ...(collaborationCourseId ? { courseId: collaborationCourseId } : {}),
        ...(collaborationFilter.type ? { type: collaborationFilter.type } : {})
      };
      const roomsResult = await this.api.collaborationRooms(roomParams).catch(() => ({ data: state.collaboration.rooms || [] }));
      const roomRows = Array.isArray(roomsResult.data) ? roomsResult.data : [];
      const selectedCollaborationRoomId = collaborationFilter.roomId
        || state.selected.collaborationRoomId
        || firstItem(roomRows)?.id
        || "room_ood";
      const [
        collaborationWorkspaceResult,
        collaborationMentionsResult,
        collaborationTasksResult,
        collaborationInsightResult,
        collaborationDecisionsResult,
        collaborationResourcesResult,
        collaborationChecklistResult,
        collaborationHandoffsResult,
        collaborationAuditResult
      ] = await Promise.allSettled([
        selectedCollaborationRoomId ? this.api.collaborationRoom(selectedCollaborationRoomId) : Promise.resolve({ data: null }),
        this.api.collaborationMentions({
          ...(collaborationFilter.mentionStatus ? { status: collaborationFilter.mentionStatus } : {}),
          ...(selectedCollaborationRoomId ? { roomId: selectedCollaborationRoomId } : {})
        }),
        this.api.collaborationTasks({
          ...(collaborationFilter.taskStatus ? { status: collaborationFilter.taskStatus } : {}),
          ...(selectedCollaborationRoomId ? { roomId: selectedCollaborationRoomId } : {})
        }),
        selectedCollaborationRoomId ? this.api.collaborationRoomInsight(selectedCollaborationRoomId) : Promise.resolve({ data: null }),
        this.api.collaborationDecisions(selectedCollaborationRoomId ? { roomId: selectedCollaborationRoomId } : {}),
        this.api.collaborationResources(selectedCollaborationRoomId ? { roomId: selectedCollaborationRoomId } : {}),
        this.api.collaborationChecklist(selectedCollaborationRoomId ? { roomId: selectedCollaborationRoomId } : {}),
        this.api.collaborationHandoffs(selectedCollaborationRoomId ? { roomId: selectedCollaborationRoomId } : {}),
        this.api.collaborationAudit(selectedCollaborationRoomId ? { roomId: selectedCollaborationRoomId, limit: 60 } : { limit: 60 })
      ]);

      const reportFilter = state.filters.reports;
      const reportCourseId = reportFilter.courseId || firstCourseId;
      const reportStudentId = reportFilter.studentId || state.user?.id || "";
      const reportAssignmentId = reportFilter.assignmentId || state.selected.assignmentId || firstItem(assignmentRows)?.id || "";
      const reportParams = {
        ...(reportCourseId ? { courseId: reportCourseId } : {}),
        ...(reportStudentId ? { studentId: reportStudentId } : {})
      };
      const [
        reportCatalogResult,
        studentWeeklyReportResult,
        courseWeeklyReportResult,
        assignmentGradingReportResult,
        mistakeReviewReportResult,
        aiUsageReportResult
      ] = await Promise.allSettled([
        this.api.reportCatalog(),
        this.api.studentWeeklyReport(reportParams),
        isTeacher ? this.api.courseWeeklyReport(reportCourseId ? { courseId: reportCourseId } : {}) : Promise.resolve({ data: null }),
        isTeacher && reportAssignmentId ? this.api.assignmentGradingReport(reportAssignmentId) : Promise.resolve({ data: null }),
        this.api.mistakeReviewReport(reportParams),
        this.api.aiUsageReport(reportCourseId ? { courseId: reportCourseId } : {})
      ]);

      const identityFilter = state.filters.identityAdmin;
      const identityParams = {
        ...(identityFilter.role ? { role: identityFilter.role } : {}),
        ...(identityFilter.status ? { status: identityFilter.status } : {}),
        ...(identityFilter.q ? { q: identityFilter.q } : {})
      };
      const identityClassParams = {
        ...(identityFilter.courseId || firstCourseId ? { courseId: identityFilter.courseId || firstCourseId } : {})
      };
      const [
        identityUsersResult,
        identityClassroomsResult,
        identityGroupsResult,
        identityRoleMatrixResult,
        identityDashboardResult
      ] = await Promise.allSettled([
        isTeacher ? this.api.identityUsers(identityParams) : Promise.resolve({ data: [] }),
        isTeacher ? this.api.classes(identityClassParams) : Promise.resolve({ data: [] }),
        isTeacher ? this.api.groups({ ...identityClassParams, ...(identityFilter.classroomId ? { classroomId: identityFilter.classroomId } : {}) }) : Promise.resolve({ data: [] }),
        isTeacher ? this.api.rolePermissions() : Promise.resolve({ data: null }),
        isTeacher ? this.api.identityDashboard() : Promise.resolve({ data: null })
      ]);
      const identityUsers = identityUsersResult.status === "fulfilled" ? identityUsersResult.value.data : state.identityAdmin.users;
      const identityClassrooms = identityClassroomsResult.status === "fulfilled" ? identityClassroomsResult.value.data : state.identityAdmin.classrooms;
      const identityGroups = identityGroupsResult.status === "fulfilled" ? identityGroupsResult.value.data : state.identityAdmin.groups;
      const selectedIdentityUserId = state.selected.identityUserId || firstItem(identityUsers)?.id || state.user?.id || "";
      const selectedClassroomId = identityFilter.classroomId || state.selected.classroomId || firstItem(identityClassrooms)?.id || "";
      let identityProfile = state.identityAdmin.selectedProfile;
      let identityClassroomDetail = state.identityAdmin.classroomDetail;
      if (isTeacher && selectedIdentityUserId) {
        try {
          const profileResult = await this.api.identityUserProfile(selectedIdentityUserId);
          identityProfile = profileResult.data;
        } catch {
          identityProfile = state.identityAdmin.selectedProfile;
        }
      }
      if (isTeacher && selectedClassroomId) {
        try {
          const detailResult = await this.api.classroomDetail(selectedClassroomId);
          identityClassroomDetail = detailResult.data;
        } catch {
          identityClassroomDetail = state.identityAdmin.classroomDetail;
        }
      }

      const operationFilter = state.filters.operations;
      const operationCourseId = operationFilter.courseId || reportCourseId || firstCourseId;
      const operationStudentId = operationFilter.studentId || reportStudentId || state.user?.id || "";
      const operationParams = {
        ...(operationCourseId ? { courseId: operationCourseId } : {})
      };
      const [
        operationsCatalogResult,
        operationsDashboardResult,
        operationImportsResult,
        operationJobsResult,
        operationAuditsResult,
        operationAuditDigestResult,
        deepPortfolioResult,
        evidenceMapResult,
        interventionPlanResult,
        portfolioBoardResult
      ] = await Promise.allSettled([
        isTeacher ? this.api.operationsCatalog() : Promise.resolve({ data: null }),
        isTeacher ? this.api.operationsDashboard(operationParams) : Promise.resolve({ data: null }),
        isTeacher ? this.api.operationImports({
          ...operationParams,
          ...(operationFilter.target ? { target: operationFilter.target } : {}),
          ...(operationFilter.importStatus ? { status: operationFilter.importStatus } : {})
        }) : Promise.resolve({ data: [] }),
        isTeacher ? this.api.operationBatchJobs({
          ...operationParams,
          ...(operationFilter.jobType ? { type: operationFilter.jobType } : {}),
          ...(operationFilter.jobStatus ? { status: operationFilter.jobStatus } : {})
        }) : Promise.resolve({ data: [] }),
        isTeacher ? this.api.operationAudit({
          ...operationParams,
          ...(operationFilter.severity ? { severity: operationFilter.severity } : {}),
          limit: 80
        }) : Promise.resolve({ data: [] }),
        isTeacher ? this.api.operationAuditDigest({
          ...operationParams,
          ...(operationFilter.severity ? { severity: operationFilter.severity } : {})
        }) : Promise.resolve({ data: null }),
        isTeacher && operationCourseId ? this.api.assessmentStudentPortfolioDeep({ courseId: operationCourseId, studentId: operationStudentId }) : Promise.resolve({ data: null }),
        isTeacher && operationCourseId ? this.api.assessmentStudentPortfolioEvidenceMap({ courseId: operationCourseId, studentId: operationStudentId }) : Promise.resolve({ data: null }),
        isTeacher && operationCourseId ? this.api.assessmentStudentPortfolioInterventionPlan({ courseId: operationCourseId, studentId: operationStudentId }) : Promise.resolve({ data: null }),
        isTeacher && operationCourseId ? this.api.assessmentPortfolioBoard({ courseId: operationCourseId }) : Promise.resolve({ data: null })
      ]);
      const operationImports = operationImportsResult.status === "fulfilled" ? operationImportsResult.value.data : state.operations.imports;
      const operationJobs = operationJobsResult.status === "fulfilled" ? operationJobsResult.value.data : state.operations.jobs;
      const selectedOperationImportId = state.selected.operationImportId || firstItem(operationImports)?.id || "";
      const selectedOperationJobId = state.selected.operationJobId || firstItem(operationJobs)?.id || "";
      let selectedOperationImport = state.operations.selectedImport;
      let selectedOperationJob = state.operations.selectedJob;
      if (isTeacher && selectedOperationImportId) {
        try {
          const result = await this.api.operationImportDetail(selectedOperationImportId);
          selectedOperationImport = result.data;
        } catch {
          selectedOperationImport = state.operations.selectedImport;
        }
      }
      if (isTeacher && selectedOperationJobId) {
        try {
          const result = await this.api.operationBatchJobDetail(selectedOperationJobId);
          selectedOperationJob = result.data;
        } catch {
          selectedOperationJob = state.operations.selectedJob;
        }
      }

      this.setState({
        dashboard: dashboard.data,
        provider: dashboard.meta?.provider || "",
        messages: messagesResult.status === "fulfilled" ? messagesResult.value.data : [],
        activity: activityResult.status === "fulfilled" ? activityResult.value.data : [],
        toast: message,
        selected: {
          ...state.selected,
          collaborationRoomId: selectedCollaborationRoomId,
          identityUserId: selectedIdentityUserId,
          classroomId: selectedClassroomId,
          operationImportId: selectedOperationImportId,
          operationJobId: selectedOperationJobId
        },
        assessment: {
          assignments: assignmentsResult.status === "fulfilled" ? assignmentsResult.value.data : [],
          assignmentDetail,
          rubrics: rubricsResult.status === "fulfilled" ? rubricsResult.value.data : [],
          questionBanks: banksResult.status === "fulfilled" ? banksResult.value.data : [],
          questions: questionsResult.status === "fulfilled" ? questionsResult.value.data : [],
          mistakes: mistakesResult.status === "fulfilled" ? mistakesResult.value.data : [],
          practiceSession,
          practiceHistory: historyResult.status === "fulfilled" ? historyResult.value.data.items || historyResult.value.data : []
        },
        analytics: {
          overview: overviewResult.status === "fulfilled" ? overviewResult.value.data : null,
          teacher: teacherResult.status === "fulfilled" ? teacherResult.value.data : null,
          selectedCourse: state.analytics.selectedCourse,
          selectedStudent: state.analytics.selectedStudent,
          selectedStudentAiResults: state.analytics.selectedStudentAiResults || [],
          selectedStudentAiTimeline: state.analytics.selectedStudentAiTimeline || []
        },
        workbench: {
          notifications: notificationsResult.status === "fulfilled" ? notificationsResult.value.data.items || [] : state.workbench.notifications,
          notificationSummary: notificationSummaryResult.status === "fulfilled" ? notificationSummaryResult.value.data : state.workbench.notificationSummary,
          notificationPreferences: notificationPreferencesResult.status === "fulfilled" ? notificationPreferencesResult.value.data : state.workbench.notificationPreferences,
          reminders: remindersResult.status === "fulfilled" ? remindersResult.value.data.items || [] : state.workbench.reminders,
          schedulerDashboard: schedulerDashboardResult.status === "fulfilled" ? schedulerDashboardResult.value.data : state.workbench.schedulerDashboard,
          schedulerTimeline: schedulerTimelineResult.status === "fulfilled" ? schedulerTimelineResult.value.data.items || [] : state.workbench.schedulerTimeline,
          schedulerDuePreview: schedulerDuePreviewResult.status === "fulfilled" ? schedulerDuePreviewResult.value.data : state.workbench.schedulerDuePreview,
          funnel: funnelResult.status === "fulfilled" ? funnelResult.value.data : state.workbench.funnel,
          riskBoard: riskBoardResult.status === "fulfilled" ? riskBoardResult.value.data : state.workbench.riskBoard,
          engagement: engagementResult.status === "fulfilled" ? engagementResult.value.data : state.workbench.engagement,
          courseDeepReport: courseDeepReportResult.status === "fulfilled" ? courseDeepReportResult.value.data : state.workbench.courseDeepReport,
          studentProgress: studentProgressResult.status === "fulfilled" ? studentProgressResult.value.data : state.workbench.studentProgress
        },
        knowledge: {
          summary: knowledgeSummaryResult.status === "fulfilled" ? knowledgeSummaryResult.value.data : state.knowledge.summary,
          concepts: knowledgeConceptsResult.status === "fulfilled" ? knowledgeConceptsResult.value.data : state.knowledge.concepts,
          selectedConcept: state.knowledge.selectedConcept,
          searchResults: knowledgeSearchResult.status === "fulfilled" ? knowledgeSearchResult.value.data : state.knowledge.searchResults,
          graph: knowledgeGraphResult.status === "fulfilled" ? knowledgeGraphResult.value.data : state.knowledge.graph,
          recommendations: knowledgeRecommendationsResult.status === "fulfilled" ? knowledgeRecommendationsResult.value.data : state.knowledge.recommendations,
          learningPath: state.knowledge.learningPath,
          practiceSet: state.knowledge.practiceSet,
          aiContext: state.knowledge.aiContext
        },
        assessmentInsight: {
          gradingOverview: gradingOverviewResult.status === "fulfilled" ? gradingOverviewResult.value.data : state.assessmentInsight.gradingOverview,
          rubricInsight: rubricInsightResult.status === "fulfilled" ? rubricInsightResult.value.data : state.assessmentInsight.rubricInsight,
          submissionInsight: submissionInsightResult.status === "fulfilled"
            ? { ...submissionInsightResult.value.data, aiEvidence: submissionEvidenceResult.status === "fulfilled" ? submissionEvidenceResult.value.data : null }
            : state.assessmentInsight.submissionInsight,
          sessionReview: sessionReviewResult.status === "fulfilled" ? sessionReviewResult.value.data : state.assessmentInsight.sessionReview,
          adaptivePlan: state.assessmentInsight.adaptivePlan,
          mistakeAnalysis: mistakeAnalysisResult.status === "fulfilled" ? mistakeAnalysisResult.value.data : state.assessmentInsight.mistakeAnalysis,
          mistakeDetail: mistakeDetailResult.status === "fulfilled" ? mistakeDetailResult.value.data : state.assessmentInsight.mistakeDetail,
          courseReport: courseReportResult.status === "fulfilled" ? courseReportResult.value.data : state.assessmentInsight.courseReport,
          studentPortfolio: studentPortfolioResult.status === "fulfilled" ? studentPortfolioResult.value.data : state.assessmentInsight.studentPortfolio,
          riskRegister: riskRegisterResult.status === "fulfilled" ? riskRegisterResult.value.data : state.assessmentInsight.riskRegister
        },
        collaboration: {
          rooms: roomRows,
          workspace: collaborationWorkspaceResult.status === "fulfilled" ? collaborationWorkspaceResult.value.data : state.collaboration.workspace,
          mentions: collaborationMentionsResult.status === "fulfilled" ? collaborationMentionsResult.value.data : state.collaboration.mentions,
          tasks: collaborationTasksResult.status === "fulfilled" ? collaborationTasksResult.value.data : state.collaboration.tasks,
          insight: collaborationInsightResult.status === "fulfilled" ? collaborationInsightResult.value.data : state.collaboration.insight,
          decisions: collaborationDecisionsResult.status === "fulfilled" ? collaborationDecisionsResult.value.data : state.collaboration.decisions,
          resources: collaborationResourcesResult.status === "fulfilled" ? collaborationResourcesResult.value.data : state.collaboration.resources,
          checklist: collaborationChecklistResult.status === "fulfilled" ? collaborationChecklistResult.value.data : state.collaboration.checklist,
          handoffs: collaborationHandoffsResult.status === "fulfilled" ? collaborationHandoffsResult.value.data : state.collaboration.handoffs,
          audit: collaborationAuditResult.status === "fulfilled" ? collaborationAuditResult.value.data : state.collaboration.audit
        },
        reports: {
          catalog: reportCatalogResult.status === "fulfilled" ? reportCatalogResult.value.data : state.reports.catalog,
          studentWeekly: studentWeeklyReportResult.status === "fulfilled" ? studentWeeklyReportResult.value.data : state.reports.studentWeekly,
          courseWeekly: courseWeeklyReportResult.status === "fulfilled" ? courseWeeklyReportResult.value.data : state.reports.courseWeekly,
          assignmentGrading: assignmentGradingReportResult.status === "fulfilled" ? assignmentGradingReportResult.value.data : state.reports.assignmentGrading,
          mistakeReview: mistakeReviewReportResult.status === "fulfilled" ? mistakeReviewReportResult.value.data : state.reports.mistakeReview,
          aiUsage: aiUsageReportResult.status === "fulfilled" ? aiUsageReportResult.value.data : state.reports.aiUsage,
          exportPreview: state.reports.exportPreview
        },
        identityAdmin: {
          users: identityUsers,
          selectedProfile: identityProfile,
          classrooms: identityClassrooms,
          classroomDetail: identityClassroomDetail,
          groups: identityGroups,
          roleMatrix: identityRoleMatrixResult.status === "fulfilled" ? identityRoleMatrixResult.value.data : state.identityAdmin.roleMatrix,
          dashboard: identityDashboardResult.status === "fulfilled" ? identityDashboardResult.value.data : state.identityAdmin.dashboard
        },
        operations: {
          catalog: operationsCatalogResult.status === "fulfilled" ? operationsCatalogResult.value.data : state.operations.catalog,
          dashboard: operationsDashboardResult.status === "fulfilled" ? operationsDashboardResult.value.data : state.operations.dashboard,
          imports: operationImports,
          selectedImport: selectedOperationImport,
          jobs: operationJobs,
          selectedJob: selectedOperationJob,
          audits: operationAuditsResult.status === "fulfilled" ? operationAuditsResult.value.data : state.operations.audits,
          auditDigest: operationAuditDigestResult.status === "fulfilled" ? operationAuditDigestResult.value.data : state.operations.auditDigest,
          deepPortfolio: deepPortfolioResult.status === "fulfilled" ? deepPortfolioResult.value.data : state.operations.deepPortfolio,
          evidenceMap: evidenceMapResult.status === "fulfilled" ? evidenceMapResult.value.data : state.operations.evidenceMap,
          interventionPlan: interventionPlanResult.status === "fulfilled" ? interventionPlanResult.value.data : state.operations.interventionPlan,
          portfolioBoard: portfolioBoardResult.status === "fulfilled" ? portfolioBoardResult.value.data : state.operations.portfolioBoard
        },
        settings: {
          health: healthResult.status === "fulfilled" ? healthResult.value.data : null,
          modelConfig: buildModelConfig(dashboard.meta?.provider || "")
        },
        student: state.user?.role === "student" ? {
          ...state.student,
          ai: {
            ...state.student.ai,
            dailyPlan: studentAiResultsResult?.status === "fulfilled"
              ? firstItem(studentAiResultsResult.value.data.items || []) || state.student.ai.dailyPlan
              : state.student.ai.dailyPlan,
            timeline: studentAiTimelineResult?.status === "fulfilled" ? studentAiTimelineResult.value.data.items || [] : state.student.ai.timeline,
            organizeHistory: noteOrganizeHistoryResult?.status === "fulfilled" ? noteOrganizeHistoryResult.value.data.items || [] : state.student.ai.organizeHistory
          },
          learning: {
            ...state.student.learning,
            taskDrafts: studentTaskDraftsResult?.status === "fulfilled" ? studentTaskDraftsResult.value.data.items || [] : state.student.learning.taskDrafts
          },
          assignments: {
            ...state.student.assignments,
            submitDraft: studentSubmissionDraftResult?.status === "fulfilled" && studentSubmissionDraftResult.value.data
              ? studentSubmissionDraftResult.value.data
              : state.student.assignments.submitDraft
          }
        } : state.student
      });
      this.syncRouteFromLocation();
      if (state.user?.role === "student") {
        hydrateStudentWorkspace(this, this.store.get()).catch(() => {});
      }
      if (state.user?.role === "teacher" || state.user?.role === "admin") {
        hydrateTeacherWorkspace(this, this.store.get()).catch(() => {});
      }
      if (message) {
        setTimeout(() => this.setState({ toast: "" }), 2600);
      }
    } finally {
      this.patchLoading("dashboard", false);
      this.isRefreshing = false;
    }
  }

  scheduleEventRefresh() {
    const now = Date.now();
    if (this.eventRefreshTimer || now - this.lastEventRefreshAt < 5000) {
      return;
    }
    this.eventRefreshTimer = setTimeout(() => {
      this.eventRefreshTimer = null;
      this.lastEventRefreshAt = Date.now();
      this.refreshApp().catch(() => {});
    }, 250);
  }

  connectEvents() {
    if (this.events) {
      this.events.close();
    }
    this.events = new EventSource(`/api/events?token=${encodeURIComponent(this.api.token)}`);
    for (const type of [
      "goal.changed",
      "task.changed",
      "note.changed",
      "message.created",
      "message.replied",
      "mention.created",
      "mention.read",
      "room.created",
      "room.member.changed",
      "collaboration.task.created",
      "collaboration.task.updated",
      "room.summary.created",
      "room.decision.created",
      "room.resource.created",
      "room.checklist.created",
      "room.checklist.updated",
      "room.handoff.created",
      "room.handoff.updated",
      "activity.created",
      "submission.created",
      "practice.completed"
    ]) {
      this.events.addEventListener(type, () => this.scheduleEventRefresh());
    }
    this.events.onerror = () => {
      this.events?.close();
      this.events = null;
    };
  }

  toast(message) {
    this.setState({ toast: message });
    setTimeout(() => this.setState({ toast: "" }), 3200);
  }

  async handleClick(event) {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) {
      return;
    }
    const action = actionButton.dataset.action;
    try {
      if (await handleStudentAction(this, actionButton)) {
        return;
      }
      if (await handleTeacherAction(this, actionButton)) {
        return;
      }
      if (action === "route") {
        const route = this.resolveRoute(actionButton.dataset.route);
        this.writeRoute(route);
        this.setState({ route });
        return;
      }
      if (action === "refresh") {
        await this.refreshApp();
        return;
      }
      if (action === "select-collaboration-room") {
        const roomId = actionButton.dataset.id;
        this.setState({
          route: "team",
          selected: { ...this.store.get().selected, collaborationRoomId: roomId },
          filters: { ...this.store.get().filters, collaboration: { ...this.store.get().filters.collaboration, roomId } }
        });
        await this.refreshApp();
        return;
      }
      if (action === "complete-collaboration-task") {
        await this.api.updateCollaborationTask(actionButton.dataset.id, { status: "done" });
        await this.refreshApp("Collaboration task completed.");
        return;
      }
      if (action === "reopen-collaboration-task") {
        await this.api.updateCollaborationTask(actionButton.dataset.id, { status: "open" });
        await this.refreshApp("Collaboration task reopened.");
        return;
      }
      if (action === "complete-collaboration-checklist") {
        await this.api.updateCollaborationChecklistItem(actionButton.dataset.id, { status: "done" });
        await this.refreshApp("Checklist item completed.");
        return;
      }
      if (action === "reopen-collaboration-checklist") {
        await this.api.updateCollaborationChecklistItem(actionButton.dataset.id, { status: "open" });
        await this.refreshApp("Checklist item reopened.");
        return;
      }
      if (action === "accept-collaboration-handoff") {
        await this.api.updateCollaborationHandoff(actionButton.dataset.id, { status: "accepted" });
        await this.refreshApp("Handoff accepted.");
        return;
      }
      if (action === "close-collaboration-handoff") {
        await this.api.updateCollaborationHandoff(actionButton.dataset.id, { status: "closed" });
        await this.refreshApp("Handoff closed.");
        return;
      }
      if (action === "reopen-collaboration-handoff") {
        await this.api.updateCollaborationHandoff(actionButton.dataset.id, { status: "open" });
        await this.refreshApp("Handoff reopened.");
        return;
      }
      if (action === "read-collaboration-mention") {
        await this.api.markCollaborationMentionRead(actionButton.dataset.id);
        await this.refreshApp("Mention marked as read.");
        return;
      }
      if (action === "logout") {
        this.api.setToken("");
        this.setState(createInitialState());
        this.renderLogin();
        return;
      }
      if (action === "select-assignment") {
        const detail = await this.api.assignmentDetail(actionButton.dataset.id);
        this.setState({
          route: "assignments",
          selected: { ...this.store.get().selected, assignmentId: actionButton.dataset.id },
          assessment: { ...this.store.get().assessment, assignmentDetail: detail.data }
        });
        return;
      }
      if (action === "new-assignment") {
        this.setState({ draft: { ...this.store.get().draft, assignment: {} }, errors: { ...this.store.get().errors, assignment: {} } });
        return;
      }
      if (action === "edit-assignment") {
        const detail = await this.api.assignmentDetail(actionButton.dataset.id);
        this.setState({
          route: "assignments",
          selected: { ...this.store.get().selected, assignmentId: actionButton.dataset.id },
          assessment: { ...this.store.get().assessment, assignmentDetail: detail.data },
          draft: { ...this.store.get().draft, assignment: detail.data.assignment }
        });
        return;
      }
      if (action === "delete-assignment") {
        if (!window.confirm("确认删除这份作业吗？")) {
          return;
        }
        await this.api.deleteAssignment(actionButton.dataset.id);
        await this.refreshApp("作业已删除。");
        return;
      }
      if (action === "prefill-grade") {
        const detail = this.store.get().assessment.assignmentDetail;
        const submission = (detail?.submissions || []).find((item) => item.id === actionButton.dataset.id) || null;
        this.setState({ draft: { ...this.store.get().draft, grade: submission } });
        return;
      }
      if (action === "ai-review-submission") {
        await this.api.reviewSubmissionWithAI(actionButton.dataset.id);
        await this.refreshApp("AI 初评已生成。");
        return;
      }
      if (action === "new-bank") {
        this.setState({ draft: { ...this.store.get().draft, questionBank: {} }, errors: { ...this.store.get().errors, questionBank: {} } });
        return;
      }
      if (action === "select-bank") {
        this.setState({
          route: "question-banks",
          selected: { ...this.store.get().selected, questionBankId: actionButton.dataset.id }
        });
        await this.refreshApp();
        return;
      }
      if (action === "edit-bank") {
        const bank = (this.store.get().assessment.questionBanks || []).find((item) => item.id === actionButton.dataset.id) || null;
        this.setState({
          route: "question-banks",
          selected: { ...this.store.get().selected, questionBankId: actionButton.dataset.id },
          draft: { ...this.store.get().draft, questionBank: bank }
        });
        return;
      }
      if (action === "delete-bank") {
        if (!window.confirm("确认删除这个题库吗？")) {
          return;
        }
        await this.api.deleteQuestionBank(actionButton.dataset.id);
        await this.refreshApp("题库已删除。");
        return;
      }
      if (action === "new-question") {
        this.setState({ draft: { ...this.store.get().draft, question: { bankId: this.store.get().selected.questionBankId } } });
        return;
      }
      if (action === "edit-question") {
        const question = (this.store.get().assessment.questions || []).find((item) => item.id === actionButton.dataset.id) || null;
        this.setState({ draft: { ...this.store.get().draft, question }, selected: { ...this.store.get().selected, questionId: actionButton.dataset.id }, route: "question-banks" });
        return;
      }
      if (action === "delete-question") {
        if (!window.confirm("确认删除这道题吗？")) {
          return;
        }
        await this.api.deleteQuestion(actionButton.dataset.id);
        await this.refreshApp("题目已删除。");
        return;
      }
      if (action === "start-practice") {
        const result = await this.api.startPractice({
          courseId: actionButton.dataset.courseId,
          bankId: actionButton.dataset.id,
          questionCount: 5
        });
        this.setState({
          route: "practice",
          selected: { ...this.store.get().selected, practiceSessionId: result.data.id },
          assessment: { ...this.store.get().assessment, practiceSession: result.data }
        });
        await this.refreshApp("练习已开始。");
        return;
      }
      if (action === "resume-practice") {
        const result = await this.api.practiceSession(actionButton.dataset.id);
        this.setState({
          route: "practice",
          selected: { ...this.store.get().selected, practiceSessionId: actionButton.dataset.id },
          assessment: { ...this.store.get().assessment, practiceSession: result.data }
        });
        return;
      }
      if (action === "focus-question") {
        this.setState({ ui: { ...this.store.get().ui, focusedQuestionId: actionButton.dataset.id } });
        return;
      }
      if (action === "finish-practice") {
        await this.api.finishPractice(actionButton.dataset.id);
        await this.refreshApp("练习已完成。");
        return;
      }
      if (action === "review-mistake") {
        await this.api.reviewMistake(actionButton.dataset.id, { status: "reviewed", note: "已在工作台完成回放。" });
        await this.refreshApp("错题已标记为已复习。");
        return;
      }
      if (action === "read-notification") {
        await this.api.markNotificationRead(actionButton.dataset.id);
        await this.refreshApp("Notification marked as read.");
        return;
      }
      if (action === "dismiss-notification") {
        await this.api.dismissNotification(actionButton.dataset.id);
        await this.refreshApp("Notification dismissed.");
        return;
      }
      if (action === "mark-all-notifications-read") {
        await this.api.markAllNotificationsRead({});
        await this.refreshApp("All notifications marked as read.");
        return;
      }
      if (action === "pause-reminder") {
        await this.api.updateReminder(actionButton.dataset.id, { status: "paused" });
        await this.refreshApp("Reminder paused.");
        return;
      }
      if (action === "resume-reminder") {
        await this.api.updateReminder(actionButton.dataset.id, { status: "active" });
        await this.refreshApp("Reminder resumed.");
        return;
      }
      if (action === "run-due-scheduler") {
        await this.api.runSchedulerDue({ now: new Date().toISOString() });
        await this.refreshApp("Due reminders processed.");
        return;
      }
      if (action === "clear-reminder-draft") {
        this.setState({ draft: { ...this.store.get().draft, reminder: null } });
        return;
      }
      if (action === "select-knowledge-concept") {
        const conceptId = actionButton.dataset.id;
        if (!conceptId) {
          return;
        }
        const state = this.store.get();
        const courseId = state.filters.knowledge.courseId || state.dashboard?.courses?.[0]?.id || "";
        const [profileResult, graphResult] = await Promise.allSettled([
          this.api.knowledgeConceptProfile(conceptId),
          this.api.knowledgeGraph({ ...(courseId ? { courseId } : {}), conceptId, depth: 2 })
        ]);
        this.setState({
          route: "knowledge",
          filters: { ...state.filters, knowledge: { ...state.filters.knowledge, conceptId } },
          knowledge: {
            ...state.knowledge,
            selectedConcept: profileResult.status === "fulfilled" ? profileResult.value.data : state.knowledge.selectedConcept,
            graph: graphResult.status === "fulfilled" ? graphResult.value.data : state.knowledge.graph
          }
        });
        return;
      }
      if (action === "focus-knowledge-practice") {
        const conceptId = actionButton.dataset.id;
        this.setState({
          route: "knowledge",
          filters: { ...this.store.get().filters, knowledge: { ...this.store.get().filters.knowledge, conceptId } },
          draft: { ...this.store.get().draft, knowledgePractice: { ...this.store.get().draft.knowledgePractice, conceptIds: conceptId } }
        });
        return;
      }
      if (action === "load-submission-insight") {
        const [result, evidence] = await Promise.all([
          this.api.submissionGradingInsight(actionButton.dataset.id),
          this.api.submissionStudentAiEvidence(actionButton.dataset.id)
        ]);
        this.setState({
          route: "assessment-insight",
          filters: { ...this.store.get().filters, assessmentInsight: { ...this.store.get().filters.assessmentInsight, submissionId: actionButton.dataset.id } },
          assessmentInsight: { ...this.store.get().assessmentInsight, submissionInsight: { ...result.data, aiEvidence: evidence.data } }
        });
        return;
      }
      if (action === "load-mistake-detail") {
        const result = await this.api.mistakeDetailAnalysis(actionButton.dataset.id);
        this.setState({
          route: "assessment-insight",
          filters: { ...this.store.get().filters, assessmentInsight: { ...this.store.get().filters.assessmentInsight, mistakeId: actionButton.dataset.id } },
          assessmentInsight: { ...this.store.get().assessmentInsight, mistakeDetail: result.data }
        });
        return;
      }
      if (action === "view-course-analytics") {
        const result = await this.api.analyticsCourse(actionButton.dataset.id);
        this.setState({ analytics: { ...this.store.get().analytics, selectedCourse: result.data }, route: "analytics" });
        return;
      }
      if (action === "view-student") {
        const [result, aiResults, aiTimeline] = await Promise.all([
          this.api.analyticsStudent(actionButton.dataset.id),
          this.api.teacherStudentAiResults(actionButton.dataset.id, { limit: 8 }),
          this.api.teacherStudentAiTimeline(actionButton.dataset.id, { limit: 12 })
        ]);
        this.setState({
          analytics: {
            ...this.store.get().analytics,
            selectedStudent: result.data,
            selectedStudentAiResults: aiResults.data.items || [],
            selectedStudentAiTimeline: aiTimeline.data.items || []
          },
          route: "analytics"
        });
        return;
      }
      if (action === "send-ai-intervention") {
        const student = this.store.get().analytics.selectedStudent;
        if (!student) {
          return;
        }
        await this.api.createTeacherIntervention(actionButton.dataset.id, {
          courseId: student.learning?.goals?.[0]?.courseId || "",
          reason: "教师基于学生 AI 行动完成率和提交证据发起干预。",
          message: `建议先补齐 ${student.recommendations?.[0] || "当前最关键的一项学习行动"}。`,
          dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          channels: ["in_app"]
        });
        await this.refreshApp("教师干预提醒已发送。");
        return;
      }
      if (action === "view-identity-profile") {
        const result = await this.api.identityUserProfile(actionButton.dataset.id);
        this.setState({
          route: "identity-admin",
          selected: { ...this.store.get().selected, identityUserId: actionButton.dataset.id },
          identityAdmin: { ...this.store.get().identityAdmin, selectedProfile: result.data }
        });
        return;
      }
      if (action === "view-classroom") {
        const result = await this.api.classroomDetail(actionButton.dataset.id);
        this.setState({
          route: "identity-admin",
          selected: { ...this.store.get().selected, classroomId: actionButton.dataset.id },
          filters: { ...this.store.get().filters, identityAdmin: { ...this.store.get().filters.identityAdmin, classroomId: actionButton.dataset.id } },
          identityAdmin: { ...this.store.get().identityAdmin, classroomDetail: result.data }
        });
        return;
      }
      if (action === "view-operation-import") {
        const result = await this.api.operationImportDetail(actionButton.dataset.id);
        this.setState({
          route: "operations",
          selected: { ...this.store.get().selected, operationImportId: actionButton.dataset.id },
          operations: { ...this.store.get().operations, selectedImport: result.data }
        });
        return;
      }
      if (action === "commit-operation-import") {
        this.patchSaving("operationCommit", true);
        try {
          const result = await this.api.commitOperationImport(actionButton.dataset.id, { allowWarnings: true });
          this.setState({
            route: "operations",
            selected: {
              ...this.store.get().selected,
              operationImportId: result.data.batch.id,
              operationJobId: result.data.job.id
            }
          });
        } finally {
          this.patchSaving("operationCommit", false);
        }
        await this.refreshApp("Import batch committed.");
        return;
      }
      if (action === "view-operation-job") {
        const result = await this.api.operationBatchJobDetail(actionButton.dataset.id);
        this.setState({
          route: "operations",
          selected: { ...this.store.get().selected, operationJobId: actionButton.dataset.id },
          operations: { ...this.store.get().operations, selectedJob: result.data }
        });
        return;
      }
      if (action === "run-operation-job") {
        this.patchSaving("operationJob", true);
        try {
          const result = await this.api.runOperationBatchJob(actionButton.dataset.id, {});
          this.setState({
            route: "operations",
            selected: { ...this.store.get().selected, operationJobId: actionButton.dataset.id },
            operations: { ...this.store.get().operations, selectedJob: result.data }
          });
        } finally {
          this.patchSaving("operationJob", false);
        }
        await this.refreshApp("Batch job completed.");
        return;
      }
      if (action === "refresh-health") {
        const result = await this.api.health();
        this.setState({ settings: { ...this.store.get().settings, health: result.data } });
      }
    } catch (error) {
      this.toast(error.message);
    }
  }

  async handleSubmit(event) {
    const form = event.target.closest("form[data-form]");
    if (!form) {
      return;
    }
    event.preventDefault();
    const data = readFormData(form);
    try {
      if (form.dataset.form === "login") {
        const result = await this.api.login(data);
        this.api.setToken(result.data.token);
        const requestedRoute = this.resolveRoute(this.readRoute(), result.data.user);
        const initialRoute = this.resolveRoute("", result.data.user);
        const nextRoute = requestedRoute || initialRoute;
        if (this.readRoute() !== nextRoute) {
          this.writeRoute(nextRoute);
        }
        this.isHydrating = true;
        this.setState({ user: result.data.user, route: nextRoute, draft: { ...this.store.get().draft, profile: result.data.user } });
        try {
          await this.refreshApp("登录成功。");
        } finally {
          this.isHydrating = false;
        }
        this.setState({ route: nextRoute });
        this.connectEvents();
        return;
      }
      if (await handleStudentSubmit(this, form, data)) {
        return;
      }
      if (form.dataset.form === "goal") {
        await this.api.createGoal(data);
        form.reset();
        await this.refreshApp("目标已创建。");
        return;
      }
      if (form.dataset.form === "task") {
        await this.api.createTask(data);
        form.reset();
        await this.refreshApp("任务已添加。");
        return;
      }
      if (form.dataset.form === "note") {
        await this.api.createNote({ ...data, tags: ["课堂"] });
        form.reset();
        await this.refreshApp("笔记已保存。");
        return;
      }
      if (form.dataset.form === "ai-question") {
        const result = await this.api.askAI(data.question);
        this.setState({ route: "ai", aiAnswer: result.data.answer, provider: result.data.provider });
        return;
      }
      if (form.dataset.form === "ai-plan") {
        const result = await this.api.generatePlan(data.goalId);
        this.setState({ route: "ai", aiAnswer: result.data.answer, provider: result.data.provider });
        return;
      }
      if (form.dataset.form === "message") {
        this.patchSaving("collaborationMessage", true);
        try {
          await this.api.sendMessage({
            roomId: data.roomId || this.store.get().selected.collaborationRoomId || "room_ood",
            content: data.content
          });
        } finally {
          this.patchSaving("collaborationMessage", false);
        }
        form.reset();
        await this.refreshApp("Message sent.");
        return;
      }
      if (form.dataset.form === "collaboration-filter") {
        this.setState({
          route: "team",
          filters: { ...this.store.get().filters, collaboration: { ...this.store.get().filters.collaboration, ...data } },
          selected: { ...this.store.get().selected, collaborationRoomId: data.roomId || this.store.get().selected.collaborationRoomId }
        });
        await this.refreshApp("Collaboration filters applied.");
        return;
      }
      if (form.dataset.form === "collaboration-room") {
        this.patchSaving("collaborationRoom", true);
        try {
          const result = await this.api.createCollaborationRoom({
            title: data.title,
            courseId: data.courseId,
            type: data.type,
            visibility: data.visibility,
            description: data.description,
            tags: data.tags
          });
          this.setState({
            route: "team",
            selected: { ...this.store.get().selected, collaborationRoomId: result.data.id },
            filters: { ...this.store.get().filters, collaboration: { ...this.store.get().filters.collaboration, roomId: result.data.id } }
          });
        } finally {
          this.patchSaving("collaborationRoom", false);
        }
        form.reset();
        await this.refreshApp("Collaboration room created.");
        return;
      }
      if (form.dataset.form === "collaboration-member") {
        const roomId = data.roomId || this.store.get().selected.collaborationRoomId || "room_ood";
        this.patchSaving("collaborationMember", true);
        try {
          await this.api.addCollaborationRoomMember(roomId, {
            userId: data.userId,
            displayName: data.displayName,
            role: data.role,
            notificationLevel: data.notificationLevel
          });
        } finally {
          this.patchSaving("collaborationMember", false);
        }
        form.reset();
        await this.refreshApp("Room member updated.");
        return;
      }
      if (form.dataset.form === "collaboration-reply") {
        this.patchSaving("collaborationReply", true);
        try {
          await this.api.replyToCollaborationMessage(data.messageId, { content: data.content });
        } finally {
          this.patchSaving("collaborationReply", false);
        }
        form.reset();
        await this.refreshApp("Reply added.");
        return;
      }
      if (form.dataset.form === "collaboration-task") {
        const roomId = data.roomId || this.store.get().selected.collaborationRoomId || "room_ood";
        this.patchSaving("collaborationTask", true);
        try {
          await this.api.createCollaborationTask({
            roomId,
            sourceMessageId: data.sourceMessageId,
            title: data.title,
            description: data.description,
            assigneeId: data.assigneeId,
            priority: data.priority,
            status: data.status,
            dueAt: data.dueAt,
            labels: data.labels,
            acceptanceCriteria: data.acceptanceCriteria
          });
        } finally {
          this.patchSaving("collaborationTask", false);
        }
        form.reset();
        await this.refreshApp("Collaboration task created.");
        return;
      }
      if (form.dataset.form === "collaboration-decision") {
        const roomId = data.roomId || this.store.get().selected.collaborationRoomId || "room_ood";
        this.patchSaving("collaborationDecision", true);
        try {
          await this.api.createCollaborationDecision({
            roomId,
            messageId: data.messageId,
            title: data.title,
            rationale: data.rationale,
            impact: data.impact,
            status: data.status,
            tags: data.tags
          });
        } finally {
          this.patchSaving("collaborationDecision", false);
        }
        form.reset();
        await this.refreshApp("Collaboration decision recorded.");
        return;
      }
      if (form.dataset.form === "collaboration-resource") {
        const roomId = data.roomId || this.store.get().selected.collaborationRoomId || "room_ood";
        this.patchSaving("collaborationResource", true);
        try {
          await this.api.createCollaborationResource({
            roomId,
            title: data.title,
            url: data.url,
            type: data.type,
            description: data.description,
            tags: data.tags
          });
        } finally {
          this.patchSaving("collaborationResource", false);
        }
        form.reset();
        await this.refreshApp("Collaboration resource shared.");
        return;
      }
      if (form.dataset.form === "collaboration-checklist") {
        const roomId = data.roomId || this.store.get().selected.collaborationRoomId || "room_ood";
        this.patchSaving("collaborationChecklist", true);
        try {
          await this.api.createCollaborationChecklistItem({
            roomId,
            title: data.title,
            description: data.description,
            ownerId: data.ownerId,
            status: data.status,
            dueAt: data.dueAt,
            sortOrder: data.sortOrder
          });
        } finally {
          this.patchSaving("collaborationChecklist", false);
        }
        form.reset();
        await this.refreshApp("Checklist item added.");
        return;
      }
      if (form.dataset.form === "collaboration-handoff") {
        const roomId = data.roomId || this.store.get().selected.collaborationRoomId || "room_ood";
        this.patchSaving("collaborationHandoff", true);
        try {
          await this.api.createCollaborationHandoff({
            roomId,
            toUserId: data.toUserId,
            title: data.title,
            context: data.context,
            blockers: data.blockers,
            nextSteps: data.nextSteps,
            status: data.status
          });
        } finally {
          this.patchSaving("collaborationHandoff", false);
        }
        form.reset();
        await this.refreshApp("Handoff created.");
        return;
      }
      if (form.dataset.form === "collaboration-summary") {
        const roomId = data.roomId || this.store.get().selected.collaborationRoomId || "room_ood";
        this.patchSaving("collaborationSummary", true);
        try {
          await this.api.createCollaborationSummary({
            roomId,
            summary: data.summary,
            decisions: data.decisions,
            risks: data.risks
          });
        } finally {
          this.patchSaving("collaborationSummary", false);
        }
        form.reset();
        await this.refreshApp("Collaboration summary generated.");
        return;
      }
      if (form.dataset.form === "report-filter") {
        this.setState({
          route: "reports",
          filters: { ...this.store.get().filters, reports: { ...this.store.get().filters.reports, ...data } }
        });
        await this.refreshApp("Reports refreshed.");
        return;
      }
      if (form.dataset.form === "report-export") {
        const state = this.store.get();
        const params = {
          format: data.format || state.filters.reports.format || "markdown",
          ...(data.courseId ? { courseId: data.courseId } : {}),
          ...(data.studentId ? { studentId: data.studentId } : {})
        };
        let result;
        if (data.type === "student-weekly") {
          result = await this.api.studentWeeklyReport(params);
        } else if (data.type === "course-weekly") {
          result = await this.api.courseWeeklyReport(params);
        } else if (data.type === "assignment-grading") {
          const assignmentId = data.assignmentId || state.filters.reports.assignmentId || state.selected.assignmentId || state.assessment.assignments?.[0]?.id;
          result = await this.api.assignmentGradingReport(assignmentId, { format: params.format });
        } else if (data.type === "mistake-review") {
          result = await this.api.mistakeReviewReport(params);
        } else {
          result = await this.api.aiUsageReport(params);
        }
        this.setState({
          route: "reports",
          filters: { ...state.filters, reports: { ...state.filters.reports, format: params.format } },
          reports: { ...state.reports, exportPreview: result.data }
        });
        this.toast("Report export built.");
        return;
      }
      if (form.dataset.form === "identity-admin-filter") {
        this.setState({
          route: "identity-admin",
          filters: { ...this.store.get().filters, identityAdmin: { ...this.store.get().filters.identityAdmin, ...data } },
          selected: { ...this.store.get().selected, classroomId: data.classroomId || this.store.get().selected.classroomId }
        });
        await this.refreshApp("Identity filters applied.");
        return;
      }
      if (form.dataset.form === "identity-user-profile") {
        const userId = data.id || this.store.get().selected.identityUserId;
        if (!userId) {
          this.toast("User is required.");
          return;
        }
        this.patchSaving("identityProfile", true);
        try {
          const result = await this.api.updateIdentityUserProfile(userId, {
            name: data.name,
            role: data.role,
            status: data.status,
            department: data.department,
            major: data.major,
            studentNo: data.studentNo,
            teacherNo: data.teacherNo,
            phone: data.phone
          });
          this.setState({
            route: "identity-admin",
            selected: { ...this.store.get().selected, identityUserId: userId },
            identityAdmin: {
              ...this.store.get().identityAdmin,
              selectedProfile: {
                ...(this.store.get().identityAdmin.selectedProfile || {}),
                user: result.data
              }
            }
          });
        } finally {
          this.patchSaving("identityProfile", false);
        }
        await this.refreshApp("User profile saved.");
        return;
      }
      if (form.dataset.form === "identity-classroom") {
        this.patchSaving("classroom", true);
        try {
          const result = await this.api.createClassroom({
            name: data.name,
            courseId: data.courseId,
            courseTitle: data.courseTitle,
            teacherId: data.teacherId,
            capacity: Number(data.capacity || 60),
            status: data.status,
            description: data.description,
            tags: data.tags
          });
          this.setState({
            route: "identity-admin",
            selected: { ...this.store.get().selected, classroomId: result.data.id },
            filters: { ...this.store.get().filters, identityAdmin: { ...this.store.get().filters.identityAdmin, classroomId: result.data.id, courseId: result.data.courseId } }
          });
        } finally {
          this.patchSaving("classroom", false);
        }
        form.reset();
        await this.refreshApp("Classroom created.");
        return;
      }
      if (form.dataset.form === "identity-class-assignment") {
        const classroomId = data.classroomId || this.store.get().selected.classroomId;
        if (!classroomId || !data.userId) {
          this.toast("Classroom and user are required.");
          return;
        }
        this.patchSaving("classAssignment", true);
        try {
          const input = { userId: data.userId, status: data.status };
          if (data.role === "teacher") {
            await this.api.assignClassTeacher(classroomId, input);
          } else {
            await this.api.assignClassStudent(classroomId, input);
          }
          this.setState({
            route: "identity-admin",
            selected: { ...this.store.get().selected, classroomId },
            filters: { ...this.store.get().filters, identityAdmin: { ...this.store.get().filters.identityAdmin, classroomId } }
          });
        } finally {
          this.patchSaving("classAssignment", false);
        }
        form.reset();
        await this.refreshApp("Class enrollment updated.");
        return;
      }
      if (form.dataset.form === "identity-group") {
        this.patchSaving("group", true);
        try {
          const result = await this.api.createGroup({
            classroomId: data.classroomId,
            name: data.name,
            leaderId: data.leaderId,
            status: data.status,
            description: data.description,
            tags: data.tags
          });
          this.setState({
            route: "identity-admin",
            selected: { ...this.store.get().selected, classroomId: result.data.classroomId },
            filters: { ...this.store.get().filters, identityAdmin: { ...this.store.get().filters.identityAdmin, classroomId: result.data.classroomId } }
          });
        } finally {
          this.patchSaving("group", false);
        }
        form.reset();
        await this.refreshApp("Study group created.");
        return;
      }
      if (form.dataset.form === "identity-group-member") {
        if (!data.groupId || !data.userId) {
          this.toast("Group and user are required.");
          return;
        }
        this.patchSaving("groupMember", true);
        try {
          await this.api.addGroupMember(data.groupId, {
            userId: data.userId,
            role: data.role,
            status: data.status
          });
        } finally {
          this.patchSaving("groupMember", false);
        }
        form.reset();
        await this.refreshApp("Group member updated.");
        return;
      }
      if (form.dataset.form === "operations-filter") {
        this.setState({
          route: "operations",
          filters: { ...this.store.get().filters, operations: { ...this.store.get().filters.operations, ...data } }
        });
        await this.refreshApp("Operations filters applied.");
        return;
      }
      if (form.dataset.form === "operations-import-preview") {
        this.patchSaving("operationImport", true);
        try {
          const result = await this.api.previewOperationImport({
            title: data.title,
            courseId: data.courseId,
            target: data.target,
            format: data.format,
            duplicatePolicy: data.duplicatePolicy,
            payload: data.payload
          });
          this.setState({
            route: "operations",
            selected: { ...this.store.get().selected, operationImportId: result.data.batch.id },
            draft: { ...this.store.get().draft, operationImport: { ...this.store.get().draft.operationImport, ...data } },
            operations: { ...this.store.get().operations, selectedImport: result.data }
          });
        } finally {
          this.patchSaving("operationImport", false);
        }
        await this.refreshApp("Import preview created.");
        return;
      }
      if (form.dataset.form === "operations-batch-job") {
        let params = {};
        if (data.params) {
          try {
            params = JSON.parse(data.params);
          } catch {
            this.toast("Params must be valid JSON.");
            return;
          }
        }
        this.patchSaving("operationJob", true);
        try {
          const result = await this.api.createOperationBatchJob({
            title: data.title,
            courseId: data.courseId,
            type: data.type,
            priority: data.priority,
            params
          });
          this.setState({
            route: "operations",
            selected: { ...this.store.get().selected, operationJobId: result.data.job.id },
            draft: { ...this.store.get().draft, operationJob: { ...this.store.get().draft.operationJob, title: data.title, type: data.type, priority: data.priority } },
            operations: { ...this.store.get().operations, selectedJob: result.data }
          });
        } finally {
          this.patchSaving("operationJob", false);
        }
        await this.refreshApp("Batch job created.");
        return;
      }
      if (form.dataset.form === "operations-audit") {
        this.patchSaving("operationAudit", true);
        try {
          await this.api.createOperationAudit({
            action: data.action,
            resourceType: data.resourceType,
            resourceId: data.resourceId,
            courseId: data.courseId,
            severity: data.severity,
            summary: data.summary,
            metadata: { source: "operations-ui" }
          });
          this.setState({
            route: "operations",
            draft: { ...this.store.get().draft, operationAudit: { ...this.store.get().draft.operationAudit, ...data } }
          });
        } finally {
          this.patchSaving("operationAudit", false);
        }
        form.reset();
        await this.refreshApp("Audit event recorded.");
        return;
      }
      if (form.dataset.form === "assignment-filter") {
        this.setState({ filters: { ...this.store.get().filters, assignments: { ...this.store.get().filters.assignments, ...data } } });
        await this.refreshApp();
        return;
      }
      if (form.dataset.form === "assignment") {
        const errors = validateAssignment(data);
        this.patchError("assignment", errors);
        if (Object.keys(errors).length) {
          return;
        }
        this.patchSaving("assignment", true);
        try {
          if (data.id) {
            await this.api.updateAssignment(data.id, data);
          } else {
            await this.api.createAssignment({ ...data, classroomId: "class_ood_01" });
          }
        } finally {
          this.patchSaving("assignment", false);
        }
        this.setState({ draft: { ...this.store.get().draft, assignment: null } });
        form.reset();
        await this.refreshApp(data.id ? "作业已更新。" : "作业已发布。");
        return;
      }
      if (form.dataset.form === "assignment-submission") {
        this.patchSaving("submission", true);
        try {
          await this.api.submitAssignment(data.assignmentId, { content: data.content });
        } finally {
          this.patchSaving("submission", false);
        }
        form.reset();
        await this.refreshApp("作业已提交。");
        return;
      }
      if (form.dataset.form === "grade-submission") {
        const errors = validateGrade(data);
        this.patchError("grade", errors);
        if (Object.keys(errors).length) {
          return;
        }
        this.patchSaving("grading", true);
        try {
          await this.api.gradeSubmission(data.submissionId, { score: Number(data.score), feedback: data.feedback, criteriaScores: [] });
        } finally {
          this.patchSaving("grading", false);
        }
        this.setState({ draft: { ...this.store.get().draft, grade: null } });
        await this.refreshApp("评分已保存。");
        return;
      }
      if (form.dataset.form === "workbench-filter") {
        this.setState({ filters: { ...this.store.get().filters, workbench: { ...this.store.get().filters.workbench, ...data } } });
        await this.refreshApp("Workbench filters applied.");
        return;
      }
      if (form.dataset.form === "workbench-reminder") {
        const dueAt = data.dueAt ? new Date(data.dueAt).toISOString() : "";
        if (!data.title || !dueAt) {
          this.toast("Reminder title and due time are required.");
          return;
        }
        this.patchSaving("reminder", true);
        try {
          await this.api.createReminder({
            title: data.title,
            message: data.message,
            courseId: data.courseId,
            dueAt,
            targetType: data.targetType,
            frequency: data.frequency,
            channels: ["in_app"]
          });
        } finally {
          this.patchSaving("reminder", false);
        }
        this.setState({ draft: { ...this.store.get().draft, reminder: null }, route: "workbench" });
        form.reset();
        await this.refreshApp("Reminder created.");
        return;
      }
      if (form.dataset.form === "knowledge-filter") {
        this.setState({
          route: "knowledge",
          filters: { ...this.store.get().filters, knowledge: { ...this.store.get().filters.knowledge, ...data } }
        });
        await this.refreshApp("Knowledge filter applied.");
        return;
      }
      if (form.dataset.form === "knowledge-path") {
        if (!data.goalText) {
          this.toast("Goal is required.");
          return;
        }
        this.patchSaving("knowledgePath", true);
        try {
          const result = await this.api.buildKnowledgeLearningPath({
            courseId: data.courseId,
            goalText: data.goalText,
            days: Number(data.days || 7)
          });
          this.setState({
            route: "knowledge",
            draft: { ...this.store.get().draft, knowledgePath: { goalText: data.goalText, days: data.days } },
            knowledge: { ...this.store.get().knowledge, learningPath: result.data }
          });
        } finally {
          this.patchSaving("knowledgePath", false);
        }
        this.toast("Learning path built.");
        return;
      }
      if (form.dataset.form === "knowledge-practice") {
        this.patchSaving("knowledgePractice", true);
        try {
          const result = await this.api.buildKnowledgePracticeSet({
            courseId: data.courseId,
            conceptIds: splitIds(data.conceptIds),
            limit: Number(data.limit || 4)
          });
          this.setState({
            route: "knowledge",
            draft: { ...this.store.get().draft, knowledgePractice: { conceptIds: data.conceptIds, limit: data.limit } },
            knowledge: { ...this.store.get().knowledge, practiceSet: result.data }
          });
        } finally {
          this.patchSaving("knowledgePractice", false);
        }
        this.toast("Practice set built.");
        return;
      }
      if (form.dataset.form === "knowledge-context") {
        if (!data.question) {
          this.toast("Question is required.");
          return;
        }
        this.patchSaving("knowledgeContext", true);
        try {
          const result = await this.api.buildKnowledgeAiContext({
            courseId: data.courseId,
            question: data.question,
            limit: Number(data.limit || 4)
          });
          this.setState({
            route: "knowledge",
            draft: { ...this.store.get().draft, knowledgeContext: { question: data.question, limit: data.limit } },
            knowledge: { ...this.store.get().knowledge, aiContext: result.data }
          });
        } finally {
          this.patchSaving("knowledgeContext", false);
        }
        this.toast("AI context built.");
        return;
      }
      if (form.dataset.form === "assessment-insight-filter") {
        this.setState({
          route: "assessment-insight",
          filters: { ...this.store.get().filters, assessmentInsight: { ...this.store.get().filters.assessmentInsight, ...data } }
        });
        await this.refreshApp("Assessment insight refreshed.");
        return;
      }
      if (form.dataset.form === "adaptive-practice-plan") {
        if (!data.courseId) {
          this.toast("Course is required.");
          return;
        }
        this.patchSaving("adaptivePlan", true);
        try {
          const result = await this.api.adaptivePracticePlan({
            courseId: data.courseId,
            studentId: data.studentId,
            bankId: data.bankId,
            questionCount: Number(data.questionCount || 8)
          });
          this.setState({
            route: "assessment-insight",
            draft: { ...this.store.get().draft, adaptivePlan: { bankId: data.bankId, questionCount: data.questionCount } },
            assessmentInsight: { ...this.store.get().assessmentInsight, adaptivePlan: result.data }
          });
        } finally {
          this.patchSaving("adaptivePlan", false);
        }
        this.toast("Adaptive practice plan built.");
        return;
      }
      if (form.dataset.form === "question-bank-filter") {
        this.setState({ filters: { ...this.store.get().filters, questionBanks: { ...this.store.get().filters.questionBanks, ...data } } });
        await this.refreshApp();
        return;
      }
      if (form.dataset.form === "question-bank") {
        const errors = validateQuestionBank(data);
        this.patchError("questionBank", errors);
        if (Object.keys(errors).length) {
          return;
        }
        this.patchSaving("questionBank", true);
        try {
          if (data.id) {
            await this.api.updateQuestionBank(data.id, data);
          } else {
            await this.api.createQuestionBank(data);
          }
        } finally {
          this.patchSaving("questionBank", false);
        }
        this.setState({ draft: { ...this.store.get().draft, questionBank: null } });
        form.reset();
        await this.refreshApp(data.id ? "题库已更新。" : "题库已创建。");
        return;
      }
      if (form.dataset.form === "question") {
        const enriched = {
          ...data,
          choices: ["A", "B", "C", "D"]
            .map((id) => ({ id, text: data[`choice_${id}`] || "" }))
            .filter((item) => item.text),
          answer: data.type === "multiple_choice" ? String(data.answer || "").split(",").map((item) => item.trim()).filter(Boolean) : data.answer,
          concepts: String(data.concept || "").split(",").map((item) => item.trim()).filter(Boolean)
        };
        const errors = validateQuestion(enriched);
        this.patchError("question", errors);
        if (Object.keys(errors).length) {
          return;
        }
        this.patchSaving("question", true);
        try {
          if (data.id) {
            await this.api.updateQuestion(data.id, enriched);
          } else {
            await this.api.createQuestion(enriched);
          }
        } finally {
          this.patchSaving("question", false);
        }
        this.setState({ draft: { ...this.store.get().draft, question: null } });
        form.reset();
        await this.refreshApp(data.id ? "题目已更新。" : "题目已创建。");
        return;
      }
      if (form.dataset.form === "practice-answer") {
        this.patchSaving("practiceAnswer", true);
        try {
          await this.api.submitPracticeAnswer(data.sessionId, {
            questionId: data.questionId,
            answer: readCheckedValues(form, "answer").length ? readCheckedValues(form, "answer") : data.answer
          });
        } finally {
          this.patchSaving("practiceAnswer", false);
        }
        await this.refreshApp("答案已提交。");
        return;
      }
      if (form.dataset.form === "profile") {
        const errors = validateProfile(data);
        this.patchError("profile", errors);
        if (Object.keys(errors).length) {
          return;
        }
        this.patchSaving("profile", true);
        try {
          this.setState({
            user: { ...this.store.get().user, ...data },
            draft: { ...this.store.get().draft, profile: { ...this.store.get().user, ...data } }
          });
        } finally {
          this.patchSaving("profile", false);
        }
        this.toast("资料已在当前工作台中更新。");
      }
    } catch (error) {
      this.toast(error.message);
    }
  }

  async handleChange(event) {
    const route = event.target.closest("[data-sync-route]");
    if (route) {
      this.writeRoute(route.dataset.syncRoute);
    }
  }
}

new EduMindApp(document.getElementById("app")).start();

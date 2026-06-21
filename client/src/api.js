import { toQuery } from "./utils/query.js";

function safeStorage() {
  if (typeof localStorage !== "undefined") {
    return localStorage;
  }
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    }
  };
}

export class ApiClient {
  constructor({ baseUrl = "" } = {}) {
    this.baseUrl = baseUrl;
    this.storage = safeStorage();
    this.token = this.storage.getItem("edumind.token") || "";
  }

  setToken(token) {
    this.token = token || "";
    if (this.token) {
      this.storage.setItem("edumind.token", this.token);
    } else {
      this.storage.removeItem("edumind.token");
    }
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({ ok: false, message: "响应无法解析。" }));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || `请求失败：${response.status}`);
    }
    return payload;
  }

  login(input) { return this.request("/api/auth/login", { method: "POST", body: JSON.stringify(input) }); }
  me() { return this.request("/api/me"); }
  health() { return this.request("/api/health"); }
  dashboard() { return this.request("/api/dashboard"); }
  studentDashboard() { return this.dashboard(); }
  courses() { return this.request("/api/courses"); }
  studentCourses() { return this.courses(); }

  assignments(params = {}) { return this.request(`/api/assignments${toQuery(params)}`); }
  studentAssignments(params = {}) { return this.assignments(params); }
  assignmentDetail(id) { return this.request(`/api/assignments/${encodeURIComponent(id)}`); }
  studentAssignmentDetail(id) { return this.assignmentDetail(id); }
  createAssignment(input) { return this.request("/api/assignments", { method: "POST", body: JSON.stringify(input) }); }
  updateAssignment(id, input) { return this.request(`/api/assignments/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  deleteAssignment(id) { return this.request(`/api/assignments/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  submitAssignment(id, input) { return this.request(`/api/assignments/${encodeURIComponent(id)}/submissions`, { method: "POST", body: JSON.stringify(input) }); }
  gradeSubmission(id, input) { return this.request(`/api/submissions/${encodeURIComponent(id)}/grade`, { method: "POST", body: JSON.stringify(input) }); }
  reviewSubmissionWithAI(id) { return this.request(`/api/submissions/${encodeURIComponent(id)}/ai-review`, { method: "POST", body: JSON.stringify({}) }); }
  assignmentGradingOverview(id) { return this.request(`/api/assignments/${encodeURIComponent(id)}/grading-overview`); }
  submissionGradingInsight(id) { return this.request(`/api/submissions/${encodeURIComponent(id)}/grading-insight`); }

  rubrics(params = {}) { return this.request(`/api/rubrics${toQuery(params)}`); }
  createRubric(input) { return this.request("/api/rubrics", { method: "POST", body: JSON.stringify(input) }); }
  rubricInsight(id) { return this.request(`/api/rubrics/${encodeURIComponent(id)}/insight`); }

  questionBanks(params = {}) { return this.request(`/api/question-banks${toQuery(params)}`); }
  createQuestionBank(input) { return this.request("/api/question-banks", { method: "POST", body: JSON.stringify(input) }); }
  updateQuestionBank(id, input) { return this.request(`/api/question-banks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  deleteQuestionBank(id) { return this.request(`/api/question-banks/${encodeURIComponent(id)}`, { method: "DELETE" }); }

  questions(params = {}) { return this.request(`/api/questions${toQuery(params)}`); }
  createQuestion(input) { return this.request("/api/questions", { method: "POST", body: JSON.stringify(input) }); }
  updateQuestion(id, input) { return this.request(`/api/questions/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  deleteQuestion(id) { return this.request(`/api/questions/${encodeURIComponent(id)}`, { method: "DELETE" }); }

  practiceSessions(params = {}) { return this.request(`/api/practice-sessions${toQuery(params)}`); }
  startPractice(input) { return this.request("/api/practice-sessions", { method: "POST", body: JSON.stringify(input) }); }
  practiceSession(id) { return this.request(`/api/practice-sessions/${encodeURIComponent(id)}`); }
  submitPracticeAnswer(id, input) { return this.request(`/api/practice-sessions/${encodeURIComponent(id)}/answers`, { method: "POST", body: JSON.stringify(input) }); }
  finishPractice(id) { return this.request(`/api/practice-sessions/${encodeURIComponent(id)}/finish`, { method: "POST", body: JSON.stringify({}) }); }
  practiceSessionReview(id) { return this.request(`/api/practice-sessions/${encodeURIComponent(id)}/review`); }
  adaptivePracticePlan(input) { return this.request("/api/adaptive-practice-plan", { method: "POST", body: JSON.stringify(input) }); }
  mistakes(params = {}) { return this.request(`/api/mistakes${toQuery(params)}`); }
  mistakeAnalysis(params = {}) { return this.request(`/api/mistake-analysis${toQuery(params)}`); }
  mistakeDetailAnalysis(id) { return this.request(`/api/mistakes/${encodeURIComponent(id)}/analysis`); }
  reviewMistake(id, input = { status: "reviewed" }) { return this.request(`/api/mistakes/${encodeURIComponent(id)}/review`, { method: "PATCH", body: JSON.stringify(input) }); }
  assessmentCourseReport(params = {}) { return this.request(`/api/assessment/course-report${toQuery(params)}`); }
  assessmentStudentPortfolio(params = {}) { return this.request(`/api/assessment/student-portfolio${toQuery(params)}`); }
  assessmentStudentPortfolioDeep(params = {}) { return this.request(`/api/assessment/student-portfolio/deep${toQuery(params)}`); }
  assessmentStudentPortfolioEvidenceMap(params = {}) { return this.request(`/api/assessment/student-portfolio/evidence-map${toQuery(params)}`); }
  assessmentStudentPortfolioInterventionPlan(params = {}) { return this.request(`/api/assessment/student-portfolio/intervention-plan${toQuery(params)}`); }
  assessmentPortfolioBoard(params = {}) { return this.request(`/api/assessment/portfolio-board${toQuery(params)}`); }
  assessmentRiskRegister(params = {}) { return this.request(`/api/assessment/risk-register${toQuery(params)}`); }

  analyticsOverview() { return this.request("/api/analytics/overview"); }
  analyticsCourse(id) { return this.request(`/api/analytics/courses/${encodeURIComponent(id)}`); }
  analyticsStudent(id) { return this.request(`/api/analytics/students/${encodeURIComponent(id)}`); }
  analyticsTeacher() { return this.request("/api/analytics/teacher"); }
  analyticsFunnel(params = {}) { return this.request(`/api/analytics/funnel${toQuery(params)}`); }
  analyticsRiskBoard(params = {}) { return this.request(`/api/analytics/risk-board${toQuery(params)}`); }
  analyticsCourseDeepReport(id) { return this.request(`/api/analytics/courses/${encodeURIComponent(id)}/deep-report`); }
  analyticsStudentProgress(id) { return this.request(`/api/analytics/students/${encodeURIComponent(id)}/progress-report`); }
  analyticsEngagement(params = {}) { return this.request(`/api/analytics/engagement${toQuery(params)}`); }

  knowledgeSummary() { return this.request("/api/knowledge/summary"); }
  knowledgeConcepts(params = {}) { return this.request(`/api/knowledge/concepts${toQuery(params)}`); }
  knowledgeConceptProfile(id) { return this.request(`/api/knowledge/concepts/${encodeURIComponent(id)}`); }
  knowledgeSearch(params = {}) { return this.request(`/api/knowledge/search${toQuery(params)}`); }
  knowledgeGraph(params = {}) { return this.request(`/api/knowledge/graph${toQuery(params)}`); }
  knowledgeRecommendations(params = {}) { return this.request(`/api/knowledge/recommendations${toQuery(params)}`); }
  buildKnowledgeAiContext(input) { return this.request("/api/knowledge/ai-context", { method: "POST", body: JSON.stringify(input) }); }
  buildKnowledgeLearningPath(input) { return this.request("/api/knowledge/learning-path", { method: "POST", body: JSON.stringify(input) }); }
  buildKnowledgePracticeSet(input) { return this.request("/api/knowledge/practice-set", { method: "POST", body: JSON.stringify(input) }); }

  notifications(params = {}) { return this.request(`/api/notifications${toQuery(params)}`); }
  notificationSummary(params = {}) { return this.request(`/api/notifications/summary${toQuery(params)}`); }
  createNotification(input) { return this.request("/api/notifications", { method: "POST", body: JSON.stringify(input) }); }
  notificationPreferences() { return this.request("/api/notification-preferences"); }
  updateNotificationPreferences(input) { return this.request("/api/notification-preferences", { method: "PATCH", body: JSON.stringify(input) }); }
  markNotificationRead(id) { return this.request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH", body: JSON.stringify({}) }); }
  dismissNotification(id) { return this.request(`/api/notifications/${encodeURIComponent(id)}/dismiss`, { method: "PATCH", body: JSON.stringify({}) }); }
  markAllNotificationsRead(input = {}) { return this.request("/api/notifications/read-all", { method: "PATCH", body: JSON.stringify(input) }); }

  schedulerReminders(params = {}) { return this.request(`/api/scheduler/reminders${toQuery(params)}`); }
  createReminder(input) { return this.request("/api/scheduler/reminders", { method: "POST", body: JSON.stringify(input) }); }
  updateReminder(id, input) { return this.request(`/api/scheduler/reminders/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  schedulerDuePreview(params = {}) { return this.request(`/api/scheduler/due-preview${toQuery(params)}`); }
  runSchedulerDue(input = {}) { return this.request("/api/scheduler/run-due", { method: "POST", body: JSON.stringify(input) }); }
  schedulerTimeline(params = {}) { return this.request(`/api/scheduler/timeline${toQuery(params)}`); }
  schedulerDashboard(params = {}) { return this.request(`/api/scheduler/dashboard${toQuery(params)}`); }

  createGoal(input) { return this.request("/api/goals", { method: "POST", body: JSON.stringify(input) }); }
  createTask(input) { return this.request("/api/tasks", { method: "POST", body: JSON.stringify(input) }); }
  completeTask(id) { return this.request(`/api/tasks/${encodeURIComponent(id)}/complete`, { method: "PATCH" }); }
  createNote(input) { return this.request("/api/notes", { method: "POST", body: JSON.stringify(input) }); }
  notes(params = {}) { return this.request(`/api/notes${toQuery(params)}`); }
  noteDetail(id) { return this.request(`/api/notes/${encodeURIComponent(id)}`); }
  updateNote(id, input) { return this.request(`/api/notes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  deleteNote(id) { return this.request(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" }); }

  askAI(question) { return this.request("/api/ai/ask", { method: "POST", body: JSON.stringify({ question }) }); }
  generatePlan(goalId) { return this.request("/api/ai/plan", { method: "POST", body: JSON.stringify({ goalId }) }); }
  summarizeNote(input) { return this.request("/api/ai/summarize", { method: "POST", body: JSON.stringify(input) }); }
  studentAiDailyPlan(input) { return this.request("/api/student-ai/daily-plan", { method: "POST", body: JSON.stringify(input) }); }
  studentAiWeaknessInsight(input) { return this.request("/api/student-ai/weakness-insight", { method: "POST", body: JSON.stringify(input) }); }
  studentAiTaskDraft(input) { return this.request("/api/student-ai/task-drafts", { method: "POST", body: JSON.stringify(input) }); }
  studentAiAssignmentGuide(input) { return this.request("/api/student-ai/assignment-guide", { method: "POST", body: JSON.stringify(input) }); }
  studentAiSubmissionCheck(input) { return this.request("/api/student-ai/submission-check", { method: "POST", body: JSON.stringify(input) }); }
  studentAiNoteOrganize(input) { return this.request("/api/student-ai/note-organize", { method: "POST", body: JSON.stringify(input) }); }
  studentAiResults(params = {}) { return this.request(`/api/student-ai/results${toQuery(params)}`); }
  studentAiResult(id) { return this.request(`/api/student-ai/results/${encodeURIComponent(id)}`); }
  updateStudentAiAction(resultId, actionId, input) { return this.request(`/api/student-ai/results/${encodeURIComponent(resultId)}/actions/${encodeURIComponent(actionId)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  studentAiTimeline(params = {}) { return this.request(`/api/student-ai/timeline${toQuery(params)}`); }
  studentAiTaskDrafts() { return this.request("/api/student-ai/task-drafts"); }
  updateStudentAiTaskDraft(id, input) { return this.request(`/api/student-ai/task-drafts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  deleteStudentAiTaskDraft(id) { return this.request(`/api/student-ai/task-drafts/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  confirmStudentAiTaskDraft(id) { return this.request(`/api/student-ai/task-drafts/${encodeURIComponent(id)}/confirm`, { method: "POST", body: JSON.stringify({}) }); }
  noteOrganizeResults() { return this.request("/api/note-organize-results"); }
  saveOrganizeResultAsNote(id, input) { return this.request(`/api/note-organize-results/${encodeURIComponent(id)}/save-note`, { method: "POST", body: JSON.stringify(input) }); }
  submissionDraft(params = {}) { return this.request(`/api/assignment-submission-drafts${toQuery(params)}`); }
  saveSubmissionDraft(input) { return this.request("/api/assignment-submission-drafts", { method: "POST", body: JSON.stringify(input) }); }
  updateSubmissionDraft(id, input) { return this.request(`/api/assignment-submission-drafts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  deleteSubmissionDraft(id) { return this.request(`/api/assignment-submission-drafts/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  submitSubmissionDraft(id) { return this.request(`/api/assignment-submission-drafts/${encodeURIComponent(id)}/submit`, { method: "POST", body: JSON.stringify({}) }); }
  uploadFile(input) { return this.request("/api/uploads", { method: "POST", body: JSON.stringify(input) }); }
  uploadDetail(id) { return this.request(`/api/uploads/${encodeURIComponent(id)}`); }
  deleteUpload(id) { return this.request(`/api/uploads/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  teacherStudentAiResults(id, params = {}) { return this.request(`/api/teacher/students/${encodeURIComponent(id)}/ai-results${toQuery(params)}`); }
  teacherStudentAiTimeline(id, params = {}) { return this.request(`/api/teacher/students/${encodeURIComponent(id)}/ai-timeline${toQuery(params)}`); }
  submissionStudentAiEvidence(id) { return this.request(`/api/submissions/${encodeURIComponent(id)}/student-ai-evidence`); }
  assignmentStudentAiEvidence(id) { return this.request(`/api/assignments/${encodeURIComponent(id)}/student-ai-evidence`); }
  createTeacherIntervention(id, input) { return this.request(`/api/teacher/students/${encodeURIComponent(id)}/interventions`, { method: "POST", body: JSON.stringify(input) }); }
  teacherAiTeachingPlan(input) { return this.request("/api/teacher-ai/teaching-plan", { method: "POST", body: JSON.stringify(input) }); }
  teacherAiStudentIntervention(input) { return this.request("/api/teacher-ai/student-intervention", { method: "POST", body: JSON.stringify(input) }); }
  teacherAiAssignmentCommentary(input) { return this.request("/api/teacher-ai/assignment-commentary", { method: "POST", body: JSON.stringify(input) }); }
  teacherAiFeedbackDraft(input) { return this.request("/api/teacher-ai/feedback-draft", { method: "POST", body: JSON.stringify(input) }); }
  teacherAiCoursePracticePlan(input) { return this.request("/api/teacher-ai/course-practice-plan", { method: "POST", body: JSON.stringify(input) }); }
  teacherAiReportSummary(input) { return this.request("/api/teacher-ai/report-summary", { method: "POST", body: JSON.stringify(input) }); }
  teacherAiResults(params = {}) { return this.request(`/api/teacher-ai/results${toQuery(params)}`); }
  teacherAiResult(id) { return this.request(`/api/teacher-ai/results/${encodeURIComponent(id)}`); }
  updateTeacherAiAction(resultId, actionId, input) { return this.request(`/api/teacher-ai/results/${encodeURIComponent(resultId)}/actions/${encodeURIComponent(actionId)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  teacherAiDrafts(params = {}) { return this.request(`/api/teacher-ai/drafts${toQuery(params)}`); }
  teacherAiDraft(id) { return this.request(`/api/teacher-ai/drafts/${encodeURIComponent(id)}`); }
  updateTeacherAiDraft(id, input) { return this.request(`/api/teacher-ai/drafts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  deleteTeacherAiDraft(id) { return this.request(`/api/teacher-ai/drafts/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  sendTeacherAiInterventionDraft(id, input) { return this.request(`/api/teacher-ai/drafts/${encodeURIComponent(id)}/send-intervention`, { method: "POST", body: JSON.stringify(input) }); }
  saveTeacherAiFeedbackDraft(id, input) { return this.request(`/api/teacher-ai/drafts/${encodeURIComponent(id)}/save-feedback`, { method: "POST", body: JSON.stringify(input) }); }
  saveTeacherAiCommentaryDraft(id, input) { return this.request(`/api/teacher-ai/drafts/${encodeURIComponent(id)}/save-commentary`, { method: "POST", body: JSON.stringify(input) }); }
  saveTeacherAiPracticePlanDraft(id, input) { return this.request(`/api/teacher-ai/drafts/${encodeURIComponent(id)}/save-practice-plan`, { method: "POST", body: JSON.stringify(input) }); }

  messages(params = {}) { return this.request(`/api/collaboration/messages${toQuery(params)}`); }
  sendMessage(input) {
    const body = typeof input === "string" ? { content: input } : input;
    return this.request("/api/collaboration/messages", { method: "POST", body: JSON.stringify(body) });
  }
  collaborationRooms(params = {}) { return this.request(`/api/collaboration/rooms${toQuery(params)}`); }
  createCollaborationRoom(input) { return this.request("/api/collaboration/rooms", { method: "POST", body: JSON.stringify(input) }); }
  collaborationRoom(id) { return this.request(`/api/collaboration/rooms/${encodeURIComponent(id)}`); }
  addCollaborationRoomMember(id, input) { return this.request(`/api/collaboration/rooms/${encodeURIComponent(id)}/members`, { method: "POST", body: JSON.stringify(input) }); }
  replyToCollaborationMessage(id, input) { return this.request(`/api/collaboration/messages/${encodeURIComponent(id)}/replies`, { method: "POST", body: JSON.stringify(input) }); }
  collaborationMentions(params = {}) { return this.request(`/api/collaboration/mentions${toQuery(params)}`); }
  markCollaborationMentionRead(id) { return this.request(`/api/collaboration/mentions/${encodeURIComponent(id)}/read`, { method: "PATCH", body: JSON.stringify({}) }); }
  collaborationTasks(params = {}) { return this.request(`/api/collaboration/tasks${toQuery(params)}`); }
  createCollaborationTask(input) { return this.request("/api/collaboration/tasks", { method: "POST", body: JSON.stringify(input) }); }
  updateCollaborationTask(id, input) { return this.request(`/api/collaboration/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  createCollaborationSummary(input) { return this.request("/api/collaboration/summaries", { method: "POST", body: JSON.stringify(input) }); }
  collaborationRoomInsight(id) { return this.request(`/api/collaboration/rooms/${encodeURIComponent(id)}/insight`); }
  collaborationDecisions(params = {}) { return this.request(`/api/collaboration/decisions${toQuery(params)}`); }
  createCollaborationDecision(input) { return this.request("/api/collaboration/decisions", { method: "POST", body: JSON.stringify(input) }); }
  collaborationResources(params = {}) { return this.request(`/api/collaboration/resources${toQuery(params)}`); }
  createCollaborationResource(input) { return this.request("/api/collaboration/resources", { method: "POST", body: JSON.stringify(input) }); }
  collaborationChecklist(params = {}) { return this.request(`/api/collaboration/checklist${toQuery(params)}`); }
  createCollaborationChecklistItem(input) { return this.request("/api/collaboration/checklist", { method: "POST", body: JSON.stringify(input) }); }
  updateCollaborationChecklistItem(id, input) { return this.request(`/api/collaboration/checklist/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  collaborationHandoffs(params = {}) { return this.request(`/api/collaboration/handoffs${toQuery(params)}`); }
  createCollaborationHandoff(input) { return this.request("/api/collaboration/handoffs", { method: "POST", body: JSON.stringify(input) }); }
  updateCollaborationHandoff(id, input) { return this.request(`/api/collaboration/handoffs/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  collaborationAudit(params = {}) { return this.request(`/api/collaboration/audit${toQuery(params)}`); }

  identityUsers(params = {}) { return this.request(`/api/identity/users${toQuery(params)}`); }
  identityUserProfile(id) { return this.request(`/api/identity/users/${encodeURIComponent(id)}/profile`); }
  updateIdentityUserProfile(id, input) { return this.request(`/api/identity/users/${encodeURIComponent(id)}/profile`, { method: "PATCH", body: JSON.stringify(input) }); }
  classes(params = {}) { return this.request(`/api/classes${toQuery(params)}`); }
  createClassroom(input) { return this.request("/api/classes", { method: "POST", body: JSON.stringify(input) }); }
  classroomDetail(id) { return this.request(`/api/classes/${encodeURIComponent(id)}`); }
  assignClassStudent(id, input) { return this.request(`/api/classes/${encodeURIComponent(id)}/students`, { method: "POST", body: JSON.stringify(input) }); }
  assignClassTeacher(id, input) { return this.request(`/api/classes/${encodeURIComponent(id)}/teachers`, { method: "POST", body: JSON.stringify(input) }); }
  groups(params = {}) { return this.request(`/api/groups${toQuery(params)}`); }
  createGroup(input) { return this.request("/api/groups", { method: "POST", body: JSON.stringify(input) }); }
  addGroupMember(id, input) { return this.request(`/api/groups/${encodeURIComponent(id)}/members`, { method: "POST", body: JSON.stringify(input) }); }
  rolePermissions() { return this.request("/api/role-permissions"); }
  identityDashboard() { return this.request("/api/admin/identity-dashboard"); }

  operationsCatalog() { return this.request("/api/operations/catalog"); }
  operationsDashboard(params = {}) { return this.request(`/api/operations/dashboard${toQuery(params)}`); }
  operationImports(params = {}) { return this.request(`/api/operations/imports${toQuery(params)}`); }
  operationImportDetail(id) { return this.request(`/api/operations/imports/${encodeURIComponent(id)}`); }
  previewOperationImport(input) { return this.request("/api/operations/imports/preview", { method: "POST", body: JSON.stringify(input) }); }
  commitOperationImport(id, input = {}) { return this.request(`/api/operations/imports/${encodeURIComponent(id)}/commit`, { method: "POST", body: JSON.stringify(input) }); }
  operationBatchJobs(params = {}) { return this.request(`/api/operations/batch-jobs${toQuery(params)}`); }
  createOperationBatchJob(input) { return this.request("/api/operations/batch-jobs", { method: "POST", body: JSON.stringify(input) }); }
  operationBatchJobDetail(id) { return this.request(`/api/operations/batch-jobs/${encodeURIComponent(id)}`); }
  runOperationBatchJob(id, input = {}) { return this.request(`/api/operations/batch-jobs/${encodeURIComponent(id)}/run`, { method: "POST", body: JSON.stringify(input) }); }
  operationAudit(params = {}) { return this.request(`/api/operations/audit${toQuery(params)}`); }
  createOperationAudit(input) { return this.request("/api/operations/audit", { method: "POST", body: JSON.stringify(input) }); }
  operationAuditDigest(params = {}) { return this.request(`/api/operations/audit/digest${toQuery(params)}`); }

  reportCatalog() { return this.request("/api/reports/catalog"); }
  studentWeeklyReport(params = {}) { return this.request(`/api/reports/student-weekly${toQuery(params)}`); }
  courseWeeklyReport(params = {}) { return this.request(`/api/reports/course-weekly${toQuery(params)}`); }
  assignmentGradingReport(id, params = {}) { return this.request(`/api/reports/assignments/${encodeURIComponent(id)}/grading${toQuery(params)}`); }
  mistakeReviewReport(params = {}) { return this.request(`/api/reports/mistakes/review${toQuery(params)}`); }
  aiUsageReport(params = {}) { return this.request(`/api/reports/ai-usage${toQuery(params)}`); }
}

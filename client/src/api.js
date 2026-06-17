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

  assignments(params = {}) { return this.request(`/api/assignments${toQuery(params)}`); }
  assignmentDetail(id) { return this.request(`/api/assignments/${encodeURIComponent(id)}`); }
  createAssignment(input) { return this.request("/api/assignments", { method: "POST", body: JSON.stringify(input) }); }
  updateAssignment(id, input) { return this.request(`/api/assignments/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  deleteAssignment(id) { return this.request(`/api/assignments/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  submitAssignment(id, input) { return this.request(`/api/assignments/${encodeURIComponent(id)}/submissions`, { method: "POST", body: JSON.stringify(input) }); }
  gradeSubmission(id, input) { return this.request(`/api/submissions/${encodeURIComponent(id)}/grade`, { method: "POST", body: JSON.stringify(input) }); }
  reviewSubmissionWithAI(id) { return this.request(`/api/submissions/${encodeURIComponent(id)}/ai-review`, { method: "POST", body: JSON.stringify({}) }); }

  rubrics(params = {}) { return this.request(`/api/rubrics${toQuery(params)}`); }
  createRubric(input) { return this.request("/api/rubrics", { method: "POST", body: JSON.stringify(input) }); }

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
  mistakes(params = {}) { return this.request(`/api/mistakes${toQuery(params)}`); }
  reviewMistake(id, input = { status: "reviewed" }) { return this.request(`/api/mistakes/${encodeURIComponent(id)}/review`, { method: "PATCH", body: JSON.stringify(input) }); }

  analyticsOverview() { return this.request("/api/analytics/overview"); }
  analyticsCourse(id) { return this.request(`/api/analytics/courses/${encodeURIComponent(id)}`); }
  analyticsStudent(id) { return this.request(`/api/analytics/students/${encodeURIComponent(id)}`); }
  analyticsTeacher() { return this.request("/api/analytics/teacher"); }
  analyticsFunnel(params = {}) { return this.request(`/api/analytics/funnel${toQuery(params)}`); }
  analyticsRiskBoard(params = {}) { return this.request(`/api/analytics/risk-board${toQuery(params)}`); }
  analyticsCourseDeepReport(id) { return this.request(`/api/analytics/courses/${encodeURIComponent(id)}/deep-report`); }
  analyticsStudentProgress(id) { return this.request(`/api/analytics/students/${encodeURIComponent(id)}/progress-report`); }
  analyticsEngagement(params = {}) { return this.request(`/api/analytics/engagement${toQuery(params)}`); }

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

  askAI(question) { return this.request("/api/ai/ask", { method: "POST", body: JSON.stringify({ question }) }); }
  generatePlan(goalId) { return this.request("/api/ai/plan", { method: "POST", body: JSON.stringify({ goalId }) }); }

  messages() { return this.request("/api/collaboration/messages"); }
  sendMessage(content) { return this.request("/api/collaboration/messages", { method: "POST", body: JSON.stringify({ content }) }); }
}

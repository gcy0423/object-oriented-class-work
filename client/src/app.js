import { ApiClient } from "./api.js";
import { assignmentManageView } from "./views/assignmentManageView.js";
import { analyticsView } from "./views/analyticsView.js";
import { aiView } from "./views/aiView.js";
import { dashboardView } from "./views/dashboardView.js";
import { learningView } from "./views/learningView.js";
import { practiceView } from "./views/practiceView.js";
import { questionBankManageView } from "./views/questionBankManageView.js";
import { settingsView } from "./views/settingsView.js";
import { teamView } from "./views/teamView.js";
import { createInitialState } from "./state/appState.js";
import { buildModelConfig, canManageAssessment, routeVisible, withErrorPatch, withLoadingPatch, withSavingPatch } from "./state/selectors.js";
import { Store } from "./state/viewState.js";
import { readCheckedValues, readFormData } from "./utils/dom.js";
import { compactErrors, validateAssignment, validateGrade, validateProfile, validateQuestion, validateQuestionBank } from "./utils/validation.js";
import { routeTable, shellLayout, subtitleFor, titleFor } from "./widgets/layout.js";
import { toastView } from "./widgets/toast.js";

const views = {
  dashboard: dashboardView,
  learning: learningView,
  assignments: assignmentManageView,
  "question-banks": questionBankManageView,
  practice: practiceView,
  analytics: analyticsView,
  ai: aiView,
  team: teamView,
  settings: settingsView
};

class EduMindApp {
  constructor(root) {
    this.root = root;
    this.api = new ApiClient();
    this.store = new Store(createInitialState());
    this.events = null;
    this.store.subscribe(() => this.render());
    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("submit", (event) => this.handleSubmit(event));
    this.root.addEventListener("change", (event) => this.handleChange(event));
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
    const route = routeVisible(state.route, state.user) ? state.route : "dashboard";
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
          <p>把学习、作业、题库、练习、统计、协作和 AI 面板放进一个原生 ESM 工作台，继续保持零构建依赖。</p>
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
    this.patchLoading("session", true);
    try {
      const me = await this.api.me();
      const route = this.readRoute();
      this.setState({ user: me.data.user, route, draft: { ...this.store.get().draft, profile: me.data.user } });
      await this.refreshApp();
      this.connectEvents();
    } finally {
      this.patchLoading("session", false);
    }
  }

  readRoute() {
    const value = typeof window !== "undefined" ? String(window.location.hash || "").replace(/^#/, "") : "";
    return routeTable[value] ? value : "dashboard";
  }

  writeRoute(route) {
    if (typeof window !== "undefined") {
      window.location.hash = route;
    }
  }

  async refreshApp(message = "") {
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

      this.setState({
        dashboard: dashboard.data,
        provider: dashboard.meta?.provider || "",
        messages: messagesResult.status === "fulfilled" ? messagesResult.value.data : [],
        activity: activityResult.status === "fulfilled" ? activityResult.value.data : [],
        toast: message,
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
          selectedStudent: state.analytics.selectedStudent
        },
        settings: {
          health: healthResult.status === "fulfilled" ? healthResult.value.data : null,
          modelConfig: buildModelConfig(dashboard.meta?.provider || "")
        }
      });
      if (message) {
        setTimeout(() => this.setState({ toast: "" }), 2600);
      }
    } finally {
      this.patchLoading("dashboard", false);
    }
  }

  connectEvents() {
    if (this.events) {
      this.events.close();
    }
    this.events = new EventSource(`/api/events?token=${encodeURIComponent(this.api.token)}`);
    for (const type of ["goal.changed", "task.changed", "note.changed", "message.created", "activity.created", "submission.created", "practice.completed"]) {
      this.events.addEventListener(type, () => this.refreshApp().catch(() => {}));
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
      if (action === "route") {
        const route = actionButton.dataset.route;
        this.writeRoute(route);
        this.setState({ route });
        return;
      }
      if (action === "refresh") {
        await this.refreshApp();
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
      if (action === "view-course-analytics") {
        const result = await this.api.analyticsCourse(actionButton.dataset.id);
        this.setState({ analytics: { ...this.store.get().analytics, selectedCourse: result.data }, route: "analytics" });
        return;
      }
      if (action === "view-student") {
        const result = await this.api.analyticsStudent(actionButton.dataset.id);
        this.setState({ analytics: { ...this.store.get().analytics, selectedStudent: result.data }, route: "analytics" });
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
        this.setState({ user: result.data.user, draft: { ...this.store.get().draft, profile: result.data.user } });
        await this.refreshApp("登录成功。");
        this.connectEvents();
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
        await this.api.sendMessage(data.content);
        form.reset();
        await this.refreshApp("消息已发送。");
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

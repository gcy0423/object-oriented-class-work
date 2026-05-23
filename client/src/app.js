import { ApiClient } from "./api.js";
import { Store } from "./store.js";
import { activityList, courseList, emptyState, escapeHtml, goalList, messageList, metric, noteList, taskList } from "./components.js";

class EduMindApp {
  constructor(root) {
    this.root = root;
    this.api = new ApiClient();
    this.store = new Store();
    this.events = null;
    this.store.subscribe(() => this.render());
    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("submit", (event) => this.handleSubmit(event));
  }

  async start() {
    try {
      if (this.api.token) {
        const me = await this.api.me();
        this.store.set({ user: me.data.user });
        await this.refresh();
        this.connectEvents();
      } else {
        this.renderLogin();
      }
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
    const dashboard = state.dashboard || {};
    const view = this.viewFor(state.route, dashboard, state);
    this.root.innerHTML = `
      <div class="layout">
        <aside class="sidebar">
          <div class="brand"><strong>EduMind Agent</strong><span>智能学习协同系统</span></div>
          <nav class="nav">
            ${this.navButton("dashboard", "总览", state.route)}
            ${this.navButton("learning", "学习", state.route)}
            ${this.navButton("ai", "AI", state.route)}
            ${this.navButton("team", "协作", state.route)}
          </nav>
          <div class="user-block">
            <div class="avatar-line"><div class="avatar">${escapeHtml(state.user.avatar)}</div><div><strong>${escapeHtml(state.user.name)}</strong><br /><small>${escapeHtml(state.user.role)}</small></div></div>
            <button class="btn ghost" data-action="logout">退出登录</button>
          </div>
        </aside>
        <main class="main">
          <div class="topbar">
            <div><h1>${escapeHtml(this.titleFor(state.route))}</h1><p>${escapeHtml(this.subtitleFor(state.route))}</p></div>
            <div class="status-pill"><span class="status-dot"></span><span>${escapeHtml(state.provider || "local")}</span></div>
          </div>
          ${view}
        </main>
      </div>
      ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
    `;
  }

  renderLogin() {
    this.root.innerHTML = `
      <section class="login-wrap">
        <div class="login-copy">
          <h1>EduMind Agent</h1>
          <p>把课程、目标、任务、笔记和 AI 学习教练放在一个可同步的工作台里。前端和后端通过 REST 与 SSE 协同，适合作为面向对象结课设计的团队项目。</p>
        </div>
        <form class="login-panel form-grid" data-form="login">
          <h2>进入系统</h2>
          <label>姓名<input name="name" value="林知夏" /></label>
          <label>邮箱<input name="email" value="student@edumind.local" /></label>
          <label>角色<select name="role"><option value="student">学生</option><option value="teacher">教师</option></select></label>
          <button class="btn primary" type="submit">登录</button>
        </form>
      </section>
    `;
  }

  navButton(route, label, current) {
    return `<button class="${route === current ? "active" : ""}" data-route="${route}"><strong>${label}</strong><span>›</span></button>`;
  }

  titleFor(route) {
    return { dashboard: "学习总览", learning: "目标与任务", ai: "AI 学习教练", team: "课程协作区" }[route] || "学习总览";
  }

  subtitleFor(route) {
    return {
      dashboard: "查看课程、进度、任务和近期活动。",
      learning: "创建目标、拆解任务、沉淀笔记。",
      ai: "调用可替换 LLM 服务，生成答疑和学习计划。",
      team: "通过服务端事件同步协作消息。"
    }[route];
  }

  viewFor(route, dashboard, state) {
    if (route === "learning") {
      return this.learningView(dashboard);
    }
    if (route === "ai") {
      return this.aiView(dashboard, state);
    }
    if (route === "team") {
      return this.teamView(dashboard, state);
    }
    return this.dashboardView(dashboard, state);
  }

  dashboardView(dashboard, state) {
    const metrics = dashboard.metrics || {};
    return `
      <section class="grid metric-grid">
        ${metric("活跃目标", metrics.activeGoals ?? 0)}
        ${metric("完成率", `${metrics.completionRate ?? 0}%`)}
        ${metric("已学分钟", metrics.studyMinutes ?? 0)}
        ${metric("笔记数", metrics.noteCount ?? 0)}
      </section>
      <section class="grid two-column" style="margin-top:16px">
        <div class="grid">
          <div class="panel"><div class="panel-header"><h2>课程</h2></div>${courseList(dashboard.courses || [])}</div>
          <div class="panel"><div class="panel-header"><h2>目标进度</h2></div>${goalList(dashboard.goals || [])}</div>
        </div>
        <div class="grid">
          <div class="panel"><div class="panel-header"><h2>今日任务</h2></div>${taskList(dashboard.tasks || [])}</div>
          <div class="panel"><div class="panel-header"><h2>近期活动</h2></div>${activityList(state.activity || [])}</div>
        </div>
      </section>
    `;
  }

  learningView(dashboard) {
    const goals = dashboard.goals || [];
    const courses = dashboard.courses || [];
    return `
      <section class="grid two-column">
        <div class="grid">
          <div class="panel"><div class="panel-header"><h2>学习目标</h2></div>${goalList(goals)}</div>
          <div class="panel"><div class="panel-header"><h2>任务清单</h2></div>${taskList(dashboard.tasks || [])}</div>
          <div class="panel"><div class="panel-header"><h2>学习笔记</h2></div>${noteList(dashboard.notes || [])}</div>
        </div>
        <div class="grid">
          <form class="panel form-grid" data-form="goal">
            <div class="panel-header"><h2>新增目标</h2></div>
            <label>课程<select name="courseId">${courses.map((course) => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.title)}</option>`).join("")}</select></label>
            <label>目标<input name="title" placeholder="例如：完成 UML 领域模型" required /></label>
            <label>截止日期<input name="targetDate" type="date" value="2026-06-21" /></label>
            <label>优先级<select name="priority"><option value="high">high</option><option value="medium">medium</option><option value="low">low</option></select></label>
            <button class="btn primary" type="submit">创建目标</button>
          </form>
          <form class="panel form-grid" data-form="task">
            <div class="panel-header"><h2>新增任务</h2></div>
            <label>目标<select name="goalId">${goals.map((goal) => `<option value="${escapeHtml(goal.id)}">${escapeHtml(goal.title)}</option>`).join("")}</select></label>
            <label>任务<input name="title" placeholder="例如：补充顺序图" required /></label>
            <label>预计分钟<input name="estimateMinutes" type="number" value="60" min="10" step="10" /></label>
            <button class="btn primary" type="submit">添加任务</button>
          </form>
          <form class="panel form-grid" data-form="note">
            <div class="panel-header"><h2>新增笔记</h2></div>
            <label>课程<select name="courseId">${courses.map((course) => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.title)}</option>`).join("")}</select></label>
            <label>标题<input name="title" required /></label>
            <label>内容<textarea name="content" required></textarea></label>
            <button class="btn primary" type="submit">保存笔记</button>
          </form>
        </div>
      </section>
    `;
  }

  aiView(dashboard, state) {
    const goals = dashboard.goals || [];
    return `
      <section class="grid two-column">
        <form class="panel form-grid" data-form="ai-question">
          <div class="panel-header"><h2>课程问答</h2></div>
          <label>问题<textarea name="question" placeholder="例如：如何在文档中说明包图和类图的关系？" required></textarea></label>
          <div class="button-row"><button class="btn primary" type="submit">询问 AI</button></div>
        </form>
        <div class="panel">
          <div class="panel-header"><h2>AI 输出</h2></div>
          ${state.aiAnswer ? `<div class="ai-answer">${escapeHtml(state.aiAnswer)}</div>` : emptyState("AI 回复会显示在这里。")}
        </div>
        <form class="panel form-grid" data-form="ai-plan">
          <div class="panel-header"><h2>生成学习计划</h2></div>
          <label>目标<select name="goalId">${goals.map((goal) => `<option value="${escapeHtml(goal.id)}">${escapeHtml(goal.title)}</option>`).join("")}</select></label>
          <button class="btn primary" type="submit">生成计划</button>
        </form>
      </section>
    `;
  }

  teamView(dashboard, state) {
    return `
      <section class="grid two-column">
        <div class="panel"><div class="panel-header"><h2>协作消息</h2></div>${messageList(state.messages, dashboard.users || [])}</div>
        <form class="panel form-grid" data-form="message">
          <div class="panel-header"><h2>发送消息</h2></div>
          <label>内容<textarea name="content" required></textarea></label>
          <button class="btn primary" type="submit">发送</button>
        </form>
      </section>
    `;
  }

  async handleClick(event) {
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) {
      this.store.set({ route: routeButton.dataset.route });
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) {
      return;
    }
    const action = actionButton.dataset.action;
    try {
      if (action === "logout") {
        this.api.setToken("");
        this.store.set({ user: null, dashboard: null, messages: [] });
      }
      if (action === "complete-task") {
        await this.api.completeTask(actionButton.dataset.id);
        await this.refresh("任务已完成。");
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
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      if (form.dataset.form === "login") {
        const result = await this.api.login(data);
        this.api.setToken(result.data.token);
        this.store.set({ user: result.data.user });
        await this.refresh("登录成功。");
        this.connectEvents();
      }
      if (form.dataset.form === "goal") {
        await this.api.createGoal(data);
        form.reset();
        await this.refresh("目标已创建。");
      }
      if (form.dataset.form === "task") {
        await this.api.createTask(data);
        form.reset();
        await this.refresh("任务已添加。");
      }
      if (form.dataset.form === "note") {
        await this.api.createNote({ ...data, tags: ["课堂"] });
        form.reset();
        await this.refresh("笔记已保存。");
      }
      if (form.dataset.form === "ai-question") {
        const response = await this.api.askAI(data.question);
        this.store.set({ aiAnswer: response.data.answer, provider: response.data.provider, route: "ai" });
      }
      if (form.dataset.form === "ai-plan") {
        const response = await this.api.generatePlan(data.goalId);
        this.store.set({ aiAnswer: response.data.answer, provider: response.data.provider, route: "ai" });
      }
      if (form.dataset.form === "message") {
        await this.api.sendMessage(data.content);
        form.reset();
        await this.refresh("消息已发送。");
      }
    } catch (error) {
      this.toast(error.message);
    }
  }

  async refresh(message = "") {
    const [dashboard, messages, activity] = await Promise.all([this.api.dashboard(), this.api.messages(), this.api.request("/api/activity")]);
    this.store.set({
      dashboard: dashboard.data,
      provider: dashboard.meta?.provider || "",
      messages: messages.data,
      activity: activity.data,
      toast: message
    });
    if (message) {
      setTimeout(() => this.store.set({ toast: "" }), 2600);
    }
  }

  connectEvents() {
    if (this.events) {
      this.events.close();
    }
    this.events = new EventSource(`/api/events?token=${encodeURIComponent(this.api.token)}`);
    for (const type of ["goal.changed", "task.changed", "note.changed", "message.created", "activity.created"]) {
      this.events.addEventListener(type, () => this.refresh().catch(() => {}));
    }
    this.events.onerror = () => {
      this.events?.close();
      this.events = null;
    };
  }

  toast(message) {
    this.store.set({ toast: message });
    setTimeout(() => this.store.set({ toast: "" }), 3200);
  }
}

new EduMindApp(document.getElementById("app")).start();

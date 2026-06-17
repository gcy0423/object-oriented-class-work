import { createHmac, timingSafeEqual } from "node:crypto";
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "../framework/errors.js";
import { AIResponse, LMStudioProvider, MockLLMProvider, OpenAICompatibleProvider, PromptTemplate } from "../domain/ai.js";
import { ActivityLog, RoomMessage } from "../domain/collaboration.js";
import { Roles, User } from "../domain/identity.js";
import { LearningGoal, LearningNote, StudyTask, TaskStatus } from "../domain/learning.js";
import { searchLearningResources } from "../domain/learningResourceCatalog.js";

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function requireText(value, label) {
  if (!String(value || "").trim()) {
    throw new ValidationError(`${label}不能为空。`);
  }
  return String(value).trim();
}

export class AuthService {
  constructor({ users, config }) {
    this.users = users;
    this.secret = config.tokenSecret;
  }

  async login({ email, name, role }) {
    const safeRole = Object.values(Roles).includes(role) ? role : Roles.STUDENT;
    const safeEmail = String(email || `${name || "student"}@edumind.local`).trim().toLowerCase();
    let user = this.users.findByEmail(safeEmail);
    if (!user) {
      const now = new Date().toISOString();
      user = new User({
        id: `user_${base64url(safeEmail).slice(0, 8)}`,
        name: requireText(name || safeEmail.split("@")[0], "用户名"),
        role: safeRole,
        email: safeEmail,
        avatar: (name || safeEmail).slice(0, 1).toUpperCase(),
        createdAt: now,
        updatedAt: now
      });
      user = await this.users.save(user);
    }
    return {
      user,
      token: this.issueToken(user)
    };
  }

  issueToken(user) {
    const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT-lite" }));
    const payload = base64url(
      JSON.stringify({
        sub: user.id,
        role: user.role,
        name: user.name,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600
      })
    );
    const unsigned = `${header}.${payload}`;
    return `${unsigned}.${sign(unsigned, this.secret)}`;
  }

  verifyToken(token) {
    if (!token || !token.includes(".")) {
      throw new AuthError();
    }
    const [header, payload, signature] = token.split(".");
    const unsigned = `${header}.${payload}`;
    const expected = sign(unsigned, this.secret);
    const givenBuffer = Buffer.from(signature || "");
    const expectedBuffer = Buffer.from(expected);
    if (givenBuffer.length !== expectedBuffer.length || !timingSafeEqual(givenBuffer, expectedBuffer)) {
      throw new AuthError();
    }
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (claims.exp < Math.floor(Date.now() / 1000)) {
      throw new AuthError("登录状态已过期。");
    }
    const user = this.users.findById(claims.sub);
    if (!user) {
      throw new AuthError();
    }
    return user;
  }

  requireUser(req) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    return this.verifyToken(token);
  }
}

export class ActivityService {
  constructor({ logs, eventBus }) {
    this.logs = logs;
    this.eventBus = eventBus;
  }

  async record(actor, type, summary, payload = {}) {
    const now = new Date().toISOString();
    const log = new ActivityLog({
      id: `log_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
      actorId: actor?.id || "system",
      type,
      summary,
      payload,
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.logs.save(log);
    this.eventBus.publish("activity.created", saved);
    return saved;
  }
}

export class LearningService {
  constructor({ database, courses, goals, tasks, notes, activity, eventBus }) {
    this.database = database;
    this.courses = courses;
    this.goals = goals;
    this.tasks = tasks;
    this.notes = notes;
    this.activity = activity;
    this.eventBus = eventBus;
  }

  dashboardFor(user) {
    const goals = this.goals.findByOwner(user.id);
    const tasks = this.tasks.findByOwner(user.id);
    const notes = this.notes.findByOwner(user.id);
    const courses = this.courses.all();
    return {
      courses,
      goals,
      tasks,
      notes,
      metrics: {
        activeGoals: goals.filter((goal) => goal.status === "active").length,
        completionRate: tasks.length ? Math.round((tasks.filter((task) => task.status === TaskStatus.DONE).length / tasks.length) * 100) : 0,
        studyMinutes: tasks.filter((task) => task.status === TaskStatus.DONE).reduce((sum, task) => sum + task.estimateMinutes, 0),
        noteCount: notes.length
      }
    };
  }

  async createGoal(user, input) {
    const courseId = requireText(input.courseId, "课程");
    if (!this.courses.findById(courseId)) {
      throw new NotFoundError("课程不存在。");
    }
    const now = new Date().toISOString();
    const goal = new LearningGoal({
      id: this.database.nextId("goal"),
      ownerId: user.id,
      courseId,
      title: requireText(input.title, "目标标题"),
      targetDate: input.targetDate || today(),
      priority: input.priority || "medium",
      status: "active",
      progress: 0,
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.goals.save(goal);
    await this.activity.record(user, "goal.created", `创建学习目标：${goal.title}`, { goalId: saved.id });
    this.eventBus.publish("goal.changed", saved);
    return saved;
  }

  async createTask(user, input) {
    const goal = this.goals.findById(requireText(input.goalId, "学习目标"));
    if (!goal || goal.ownerId !== user.id) {
      throw new NotFoundError("学习目标不存在。");
    }
    const now = new Date().toISOString();
    const task = new StudyTask({
      id: this.database.nextId("task"),
      goalId: goal.id,
      ownerId: user.id,
      title: requireText(input.title, "任务标题"),
      status: input.status || TaskStatus.TODO,
      estimateMinutes: Number(input.estimateMinutes || 60),
      dueDate: input.dueDate || goal.targetDate,
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.tasks.save(task);
    goal.recalculateProgress(this.tasks.findByGoal(goal.id));
    await this.goals.save(goal);
    await this.activity.record(user, "task.created", `新增学习任务：${task.title}`, { taskId: saved.id });
    this.eventBus.publish("task.changed", saved);
    return saved;
  }

  async completeTask(user, taskId) {
    const task = this.tasks.findById(taskId);
    if (!task || task.ownerId !== user.id) {
      throw new NotFoundError("任务不存在。");
    }
    task.complete();
    const saved = await this.tasks.save(task);
    const goal = this.goals.findById(task.goalId);
    if (goal) {
      goal.recalculateProgress(this.tasks.findByGoal(goal.id));
      await this.goals.save(goal);
    }
    await this.activity.record(user, "task.completed", `完成任务：${task.title}`, { taskId: task.id });
    this.eventBus.publish("task.changed", saved);
    return saved;
  }

  async createNote(user, input) {
    const now = new Date().toISOString();
    const note = new LearningNote({
      id: this.database.nextId("note"),
      ownerId: user.id,
      courseId: requireText(input.courseId, "课程"),
      title: requireText(input.title, "笔记标题"),
      content: requireText(input.content, "笔记内容"),
      tags: Array.isArray(input.tags) ? input.tags : [],
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.notes.save(note);
    await this.activity.record(user, "note.created", `新增学习笔记：${note.title}`, { noteId: saved.id });
    this.eventBus.publish("note.changed", saved);
    return saved;
  }
}

export class AITutorService {
  constructor({ config, learning, activity }) {
    this.learning = learning;
    this.activity = activity;
    this.provider = this.createProvider(config.llm);
    this.templates = {
      ask: new PromptTemplate({
        id: "ask",
        title: "课程问答",
        system: "你是一个严谨、友好的学习教练，请结合课程目标给出可执行建议。",
        user: "用户问题：{{question}}\n当前课程：{{courses}}\n当前学习目标：{{goals}}"
      }),
      plan: new PromptTemplate({
        id: "plan",
        title: "学习计划生成",
        system: "你是项目制学习计划助手，需要输出阶段、任务和检查点。",
        user: "请为目标“{{goal}}”生成一份到 {{targetDate}} 前完成的学习计划。"
      }),
      summarize: new PromptTemplate({
        id: "summarize",
        title: "笔记摘要",
        system: "你是课程笔记摘要助手，请提炼概念、行动项和疑问。",
        user: "笔记标题：{{title}}\n笔记正文：{{content}}"
      })
    };
  }

  createProvider(llmConfig) {
    if (llmConfig.provider === "lmstudio") {
      return new LMStudioProvider(llmConfig);
    }
    if (llmConfig.provider === "openai" || (llmConfig.apiKey && llmConfig.provider !== "mock")) {
      return new OpenAICompatibleProvider(llmConfig);
    }
    return new MockLLMProvider();
  }

  async ask(user, input) {
    const question = requireText(input.question, "问题");
    const dashboard = this.learning.dashboardFor(user);
    const resourceHints = searchLearningResources(question, 3)
      .map((item) => `${item.concept}：${item.promptHint}`)
      .join("\n");
    const prompt = this.templates.ask.render({
      question,
      courses: dashboard.courses.map((course) => course.title).join("、"),
      goals: dashboard.goals.map((goal) => goal.title).join("；")
    });
    const result = await this.provider.complete([
      { role: "system", content: prompt.system },
      { role: "user", content: `${prompt.user}\n可参考的本地课程知识库：\n${resourceHints || "未命中具体资源，请按通用学习策略回答。"}` }
    ]);
    const response = new AIResponse({
      answer: result.text,
      suggestions: ["加入今日任务", "生成复习卡片", "保存到笔记"],
      provider: result.provider,
      raw: result.raw || null
    });
    await this.activity.record(user, "ai.ask", `AI 回答问题：${question.slice(0, 24)}`, { provider: response.provider });
    return response;
  }

  async generatePlan(user, input) {
    const goal = this.learning.goals.findById(requireText(input.goalId, "学习目标"));
    if (!goal || goal.ownerId !== user.id) {
      throw new NotFoundError("学习目标不存在。");
    }
    const prompt = this.templates.plan.render({ goal: goal.title, targetDate: goal.targetDate });
    const result = await this.provider.complete([
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user }
    ]);
    const response = new AIResponse({
      answer: result.text,
      suggestions: ["拆成任务", "同步到协作区", "导出计划"],
      provider: result.provider,
      raw: result.raw || null
    });
    await this.activity.record(user, "ai.plan", `AI 生成计划：${goal.title}`, { goalId: goal.id, provider: response.provider });
    return response;
  }

  async summarizeNote(user, input) {
    const note = this.learning.notes.findById(requireText(input.noteId, "笔记"));
    if (!note || note.ownerId !== user.id) {
      throw new NotFoundError("笔记不存在。");
    }
    const prompt = this.templates.summarize.render({ title: note.title, content: note.content });
    const result = await this.provider.complete([
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user }
    ]);
    return new AIResponse({
      answer: result.text,
      suggestions: ["提取待办", "生成测验", "标记重点"],
      provider: result.provider,
      raw: result.raw || null
    });
  }
}

export class CollaborationService {
  constructor({ database, messages, activity, eventBus }) {
    this.database = database;
    this.messages = messages;
    this.activity = activity;
    this.eventBus = eventBus;
  }

  roomMessages(roomId = "room_ood") {
    return this.messages
      .findByRoom(roomId)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .slice(-80);
  }

  async sendMessage(user, input) {
    const now = new Date().toISOString();
    const message = new RoomMessage({
      id: this.database.nextId("msg"),
      roomId: input.roomId || "room_ood",
      authorId: user.id,
      content: requireText(input.content, "消息内容"),
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.messages.save(message);
    await this.activity.record(user, "message.sent", "发送协作消息", { messageId: saved.id });
    this.eventBus.publish("message.created", saved);
    return saved;
  }
}

export class SecurityFacade {
  assertCanUseAI(user) {
    if (!user) {
      throw new AuthError();
    }
    if (![Roles.STUDENT, Roles.TEACHER, Roles.ADMIN].includes(user.role)) {
      throw new ForbiddenError("当前角色不能调用 AI 服务。");
    }
  }
}

import { NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { LearningGoal, LearningNote, StudyTask, TaskStatus } from "../domain/learning.js";

function requireText(value, label) {
  if (!String(value || "").trim()) {
    throw new ValidationError(`${label}不能为空。`);
  }
  return String(value).trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export class LearningService {
  constructor({ database, courses, goals, tasks, notes, collaborationClient, logger = console }) {
    this.database = database;
    this.courses = courses;
    this.goals = goals;
    this.tasks = tasks;
    this.notes = notes;
    this.collaborationClient = collaborationClient || null;
    this.logger = logger;
  }

  dashboardFor(userId) {
    const goals = this.goals.findByOwner(userId);
    const tasks = this.tasks.findByOwner(userId);
    const notes = this.notes.findByOwner(userId);
    const courses = this.courses.all();

    return {
      courses,
      goals,
      tasks,
      notes,
      metrics: {
        activeGoals: goals.filter((goal) => goal.status === "active").length,
        completionRate: tasks.length
          ? Math.round((tasks.filter((task) => task.status === TaskStatus.DONE).length / tasks.length) * 100)
          : 0,
        studyMinutes: tasks
          .filter((task) => task.status === TaskStatus.DONE)
          .reduce((sum, task) => sum + task.estimateMinutes, 0),
        noteCount: notes.length
      }
    };
  }

  buildLearningContext(userId) {
    return {
      userId,
      ...this.dashboardFor(userId)
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

    const savedGoal = await this.goals.save(goal);
    await this.publishEvent({
      type: "goal.created",
      actorId: user.id,
      source: "learning-service",
      summary: `创建学习目标：${savedGoal.title}`,
      payload: { goalId: savedGoal.id, courseId: savedGoal.courseId }
    });
    return savedGoal;
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
      status: TaskStatus.TODO,
      estimateMinutes: Number(input.estimateMinutes || 60),
      dueDate: input.dueDate || goal.targetDate,
      createdAt: now,
      updatedAt: now
    });

    const savedTask = await this.tasks.save(task);
    await this.recalculateGoal(goal.id);
    await this.publishEvent({
      type: "task.created",
      actorId: user.id,
      source: "learning-service",
      summary: `新增学习任务：${savedTask.title}`,
      payload: { taskId: savedTask.id, goalId: savedTask.goalId }
    });
    return savedTask;
  }

  async completeTask(user, taskId) {
    const task = this.tasks.findById(taskId);
    if (!task || task.ownerId !== user.id) {
      throw new NotFoundError("任务不存在。");
    }

    task.complete();
    const savedTask = await this.tasks.save(task);
    await this.recalculateGoal(task.goalId);
    await this.publishEvent({
      type: "task.completed",
      actorId: user.id,
      source: "learning-service",
      summary: `完成任务：${savedTask.title}`,
      payload: { taskId: savedTask.id, goalId: savedTask.goalId }
    });
    return savedTask;
  }

  async createNote(user, input) {
    const courseId = requireText(input.courseId, "课程");
    if (!this.courses.findById(courseId)) {
      throw new NotFoundError("课程不存在。");
    }

    const now = new Date().toISOString();
    const note = new LearningNote({
      id: this.database.nextId("note"),
      ownerId: user.id,
      courseId,
      title: requireText(input.title, "笔记标题"),
      content: requireText(input.content, "笔记内容"),
      tags: Array.isArray(input.tags) ? input.tags : [],
      createdAt: now,
      updatedAt: now
    });

    const savedNote = await this.notes.save(note);
    await this.publishEvent({
      type: "note.created",
      actorId: user.id,
      source: "learning-service",
      summary: `新增学习笔记：${savedNote.title}`,
      payload: { noteId: savedNote.id, courseId: savedNote.courseId }
    });
    return savedNote;
  }

  async recalculateGoal(goalId) {
    const goal = this.goals.findById(goalId);
    if (!goal) {
      return null;
    }

    goal.recalculateProgress(this.tasks.findByGoal(goal.id));
    return this.goals.save(goal);
  }

  async publishEvent(event) {
    if (!this.collaborationClient) {
      return;
    }
    try {
      await this.collaborationClient.publishEvent(event);
    } catch (error) {
      this.logger.warn?.(`learning-service event publish failed: ${error.message}`);
    }
  }
}

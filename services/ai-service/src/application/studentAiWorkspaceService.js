import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";

function isTeacherRole(role) {
  return role === "teacher" || role === "admin";
}

function requireText(value, label) {
  const text = String(value || "").trim();
  if (!text) {
    throw new ValidationError(`${label} is required`);
  }
  return text;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cloneResult(result = {}) {
  return JSON.parse(JSON.stringify(result || {}));
}

function normalizeActions(actions = []) {
  return asArray(actions).map((action, index) => ({
    id: action.id || `action_${index + 1}`,
    label: String(action.label || action.title || `Action ${index + 1}`),
    route: String(action.route || "student-ai"),
    detail: String(action.detail || ""),
    kind: String(action.kind || "navigate"),
    status: String(action.status || "open"),
    note: String(action.note || ""),
    updatedAt: action.updatedAt || null
  }));
}

function buildResultPayload(record) {
  return {
    id: record.id,
    ownerId: record.ownerId,
    type: record.type,
    courseId: record.courseId,
    assignmentId: record.assignmentId,
    noteId: record.noteId,
    relatedSubmissionId: record.relatedSubmissionId,
    provider: record.provider,
    result: cloneResult(record.result),
    actions: normalizeActions(record.actions),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    generatedAt: record.generatedAt,
    meta: record.meta || {}
  };
}

function buildTaskDraftPayload(record) {
  return {
    id: record.id,
    ownerId: record.ownerId,
    courseId: record.courseId,
    goalId: record.goalId,
    title: record.title,
    type: record.type,
    estimateMinutes: record.estimateMinutes,
    dueDate: record.dueDate,
    steps: asArray(record.steps),
    doneDefinition: asArray(record.doneDefinition),
    summary: record.summary,
    status: record.status,
    sourceResultId: record.sourceResultId,
    confirmedTaskId: record.confirmedTaskId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export class StudentAiWorkspaceService {
  constructor({ database, results, taskDrafts, workflow, learningClient }) {
    this.database = database;
    this.results = results;
    this.taskDrafts = taskDrafts;
    this.workflow = workflow;
    this.learningClient = learningClient;
  }

  async buildAndStore(user, type, input = {}) {
    const result = await this.runWorkflow(user, type, input);
    const stored = await this.storeResult(user, type, result, input);
    return this.flattenStoredResult(stored);
  }

  async runWorkflow(user, type, input = {}) {
    if (type === "daily_plan") {
      return this.workflow.buildDailyPlan(user, input);
    }
    if (type === "weakness_insight") {
      return this.workflow.buildWeaknessInsight(user, input);
    }
    if (type === "task_draft" || type === "task_draft_result") {
      return this.workflow.draftTask(user, input);
    }
    if (type === "assignment_guide") {
      return this.workflow.guideAssignment(user, input);
    }
    if (type === "submission_check") {
      return this.workflow.checkSubmission(user, input);
    }
    if (type === "note_organize") {
      return this.workflow.organizeNote(user, input);
    }
    throw new ValidationError("unknown student ai workflow type");
  }

  async storeResult(user, type, result, input = {}) {
    const now = new Date().toISOString();
    const record = await this.results.save({
      id: this.database.nextId("student_ai_result"),
      ownerId: user.id,
      type,
      courseId: input.courseId || input.assignmentDetail?.assignment?.courseId || input.dashboard?.courses?.[0]?.id || null,
      assignmentId: input.assignmentId || input.assignmentDetail?.assignment?.id || null,
      noteId: input.noteId || null,
      relatedSubmissionId: input.relatedSubmissionId || null,
      provider: result?.provider || "fallback",
      result: cloneResult(result),
      actions: normalizeActions(result?.actions),
      meta: {
        route: input.route || "",
        request: input.request || "",
        source: input.source || "workflow"
      },
      generatedAt: result?.generatedAt || now,
      createdAt: now,
      updatedAt: now
    });
    return buildResultPayload(record);
  }

  listResults(user, filters = {}) {
    const ownerId = this.resolveOwnerId(user, filters.studentId);
    return {
      items: this.results.findByOwner(ownerId, filters).map(buildResultPayload)
    };
  }

  getResult(user, resultId, studentId = "") {
    const record = this.requireOwnedResult(user, resultId, studentId);
    return buildResultPayload(record);
  }

  async updateAction(user, resultId, actionId, input = {}) {
    const record = this.requireOwnedResult(user, resultId, input.studentId);
    const action = normalizeActions(record.actions).find((item) => item.id === actionId);
    if (!action) {
      throw new NotFoundError("student ai action not found");
    }
    action.status = String(input.status || action.status || "open");
    action.note = String(input.note || action.note || "");
    action.updatedAt = new Date().toISOString();
    record.actions = normalizeActions(record.actions).map((item) => (item.id === actionId ? action : item));
    record.touch();
    const saved = await this.results.save(record);
    return buildResultPayload(saved);
  }

  buildTimeline(user, filters = {}) {
    const ownerId = this.resolveOwnerId(user, filters.studentId);
    const resultItems = this.results.findByOwner(ownerId, { limit: Number(filters.limit || 20) });
    const draftItems = this.taskDrafts.findByOwner(ownerId);
    const timeline = [];
    for (const item of resultItems) {
      timeline.push({
        id: `timeline_${item.id}`,
        type: "ai_result",
        ownerId,
        resultId: item.id,
        title: item.result?.summary || item.type,
        summary: item.result?.summary || item.type,
        status: "done",
        at: item.generatedAt || item.createdAt,
        meta: {
          resultType: item.type,
          assignmentId: item.assignmentId,
          courseId: item.courseId
        }
      });
      for (const action of normalizeActions(item.actions)) {
        if (action.status === "open") {
          continue;
        }
        timeline.push({
          id: `timeline_${item.id}_${action.id}`,
          type: "ai_action",
          ownerId,
          resultId: item.id,
          title: action.label,
          summary: action.note || action.detail || action.label,
          status: action.status,
          at: action.updatedAt || item.updatedAt || item.createdAt,
          meta: {
            resultType: item.type,
            route: action.route
          }
        });
      }
    }
    for (const draft of draftItems) {
      timeline.push({
        id: `timeline_${draft.id}`,
        type: draft.status === "confirmed" ? "task_confirmed" : "task_draft",
        ownerId,
        draftId: draft.id,
        title: draft.title,
        summary: draft.summary || draft.type,
        status: draft.status,
        at: draft.updatedAt || draft.createdAt,
        meta: {
          courseId: draft.courseId,
          goalId: draft.goalId,
          confirmedTaskId: draft.confirmedTaskId
        }
      });
    }
    return {
      items: timeline
        .sort((a, b) => String(b.at).localeCompare(String(a.at)))
        .slice(0, Math.max(1, Math.min(40, Number(filters.limit || 20))))
    };
  }

  async createTaskDraft(user, input = {}) {
    const draftResult = input.resultId
      ? this.requireOwnedResult(user, input.resultId)
      : null;
    const draft = draftResult?.result?.draft || input.draft || input;
    const record = await this.taskDrafts.save({
      id: this.database.nextId("student_task_draft"),
      ownerId: user.id,
      courseId: draft.courseId || input.courseId || null,
      goalId: draft.goalId || input.goalId || null,
      title: requireText(draft.title, "title"),
      type: String(draft.type || input.type || ""),
      estimateMinutes: Number(draft.estimateMinutes || input.estimateMinutes || 45),
      dueDate: String(draft.dueDate || input.dueDate || ""),
      steps: asArray(draft.steps),
      doneDefinition: asArray(draft.doneDefinition),
      summary: String(input.summary || draftResult?.result?.summary || ""),
      status: "draft",
      sourceResultId: draftResult?.id || input.resultId || null
    });
    return buildTaskDraftPayload(record);
  }

  listTaskDrafts(user) {
    return {
      items: this.taskDrafts.findByOwner(user.id).map(buildTaskDraftPayload)
    };
  }

  async updateTaskDraft(user, draftId, input = {}) {
    const draft = this.requireOwnedDraft(user, draftId);
    if (input.title !== undefined) {
      draft.title = requireText(input.title, "title");
    }
    if (input.type !== undefined) {
      draft.type = String(input.type || "");
    }
    if (input.estimateMinutes !== undefined) {
      draft.estimateMinutes = Number(input.estimateMinutes || 45);
    }
    if (input.dueDate !== undefined) {
      draft.dueDate = String(input.dueDate || "");
    }
    if (input.goalId !== undefined) {
      draft.goalId = input.goalId || null;
    }
    if (input.courseId !== undefined) {
      draft.courseId = input.courseId || null;
    }
    if (input.steps !== undefined) {
      draft.steps = asArray(input.steps);
    }
    if (input.doneDefinition !== undefined) {
      draft.doneDefinition = asArray(input.doneDefinition);
    }
    if (input.summary !== undefined) {
      draft.summary = String(input.summary || "");
    }
    draft.touch();
    return buildTaskDraftPayload(await this.taskDrafts.save(draft));
  }

  async deleteTaskDraft(user, draftId) {
    const draft = this.requireOwnedDraft(user, draftId);
    await this.taskDrafts.remove(draft.id);
    return { id: draft.id, removed: true };
  }

  async confirmTaskDraft(user, draftId) {
    const draft = this.requireOwnedDraft(user, draftId);
    const created = await this.learningClient.createTaskForUser(user.id, {
      goalId: requireText(draft.goalId, "goalId"),
      title: draft.title,
      estimateMinutes: draft.estimateMinutes,
      dueDate: draft.dueDate
    });
    draft.status = "confirmed";
    draft.confirmedTaskId = created.id;
    draft.touch();
    const saved = await this.taskDrafts.save(draft);
    return {
      draft: buildTaskDraftPayload(saved),
      task: created
    };
  }

  listNoteOrganizeResults(user) {
    return {
      items: this.results.findByOwner(user.id, { type: "note_organize", limit: 20 }).map(buildResultPayload)
    };
  }

  async saveOrganizeResultAsNote(user, resultId, input = {}) {
    const record = this.requireOwnedResult(user, resultId);
    if (record.type !== "note_organize") {
      throw new ValidationError("result is not a note organize record");
    }
    const content = [
      record.result?.summary || "",
      ...asArray(record.result?.assignmentParagraphs)
    ].filter(Boolean).join("\n\n");
    return this.learningClient.createNoteForUser(user.id, {
      courseId: input.courseId || record.courseId || requireText(record.courseId, "courseId"),
      title: input.title || `${input.baseTitle || "课程笔记"} · AI整理`,
      content,
      tags: asArray(input.tags).length ? input.tags : ["AI整理"]
    });
  }

  buildActionSummary(studentId) {
    const items = this.results.findByOwner(studentId, { limit: 100 });
    const actions = items.flatMap((item) => normalizeActions(item.actions));
    const completed = actions.filter((item) => item.status === "completed").length;
    const dismissed = actions.filter((item) => item.status === "dismissed").length;
    const converted = actions.filter((item) => item.status === "converted").length;
    return {
      studentId,
      totalResults: items.length,
      totalActions: actions.length,
      completed,
      dismissed,
      converted,
      completionRate: actions.length ? Math.round((completed / actions.length) * 100) : 0,
      latestResults: items.slice(0, 5).map(buildResultPayload)
    };
  }

  flattenStoredResult(record) {
    return {
      id: record.id,
      type: record.type,
      provider: record.provider,
      generatedAt: record.generatedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      ...cloneResult(record.result),
      actions: normalizeActions(record.actions)
    };
  }

  requireOwnedResult(user, resultId, studentId = "") {
    const record = this.results.findById(resultId);
    if (!record) {
      throw new NotFoundError("student ai result not found");
    }
    const ownerId = studentId || record.ownerId;
    if (record.ownerId !== ownerId) {
      throw new NotFoundError("student ai result not found");
    }
    if (!isTeacherRole(user.role) && record.ownerId !== user.id) {
      throw new NotFoundError("student ai result not found");
    }
    return record;
  }

  requireOwnedDraft(user, draftId) {
    const draft = this.taskDrafts.findById(draftId);
    if (!draft || draft.ownerId !== user.id) {
      throw new NotFoundError("student task draft not found");
    }
    return draft;
  }

  resolveOwnerId(user, requestedStudentId = "") {
    if (requestedStudentId) {
      if (!isTeacherRole(user.role) && requestedStudentId !== user.id) {
        throw new ForbiddenError("cannot read another student's AI evidence");
      }
      return requestedStudentId;
    }
    return user.id;
  }
}

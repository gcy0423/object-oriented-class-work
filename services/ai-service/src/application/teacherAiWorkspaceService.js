import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";

function isTeacherRole(role) {
  return role === "teacher" || role === "admin";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function requireTeacher(user) {
  if (!isTeacherRole(user?.role)) {
    throw new ForbiddenError("teacher role required");
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeActions(actions = []) {
  return asArray(actions).map((action, index) => ({
    id: action.id || `action_${index + 1}`,
    label: String(action.label || `Action ${index + 1}`),
    route: String(action.route || "teacher-home"),
    type: String(action.type || "generate"),
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
    route: record.route,
    courseId: record.courseId,
    studentId: record.studentId,
    assignmentId: record.assignmentId,
    submissionId: record.submissionId,
    provider: record.provider,
    result: clone(record.result),
    actions: normalizeActions(record.actions),
    sourceEvidenceIds: asArray(record.sourceEvidenceIds),
    generatedAt: record.generatedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function buildDraftPayload(record) {
  return {
    id: record.id,
    ownerId: record.ownerId,
    type: record.type,
    status: record.status,
    title: record.title,
    summary: record.summary,
    body: record.body,
    structuredPayload: clone(record.structuredPayload),
    courseId: record.courseId,
    studentId: record.studentId,
    assignmentId: record.assignmentId,
    submissionId: record.submissionId,
    resultId: record.resultId,
    sourceEvidenceIds: asArray(record.sourceEvidenceIds),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function draftTitleFor(type, result) {
  const mapping = {
    teaching_plan: "今日教学方案",
    student_intervention: "学生干预草稿",
    assignment_commentary: "作业讲评草稿",
    feedback_draft: "批改反馈草稿",
    course_practice_plan: "课程补练草稿",
    report_summary: "报告摘要草稿"
  };
  return result?.draft?.title || mapping[type] || "教师 AI 草稿";
}

export class TeacherAiWorkspaceService {
  constructor({ database, results, drafts, workflow }) {
    this.database = database;
    this.results = results;
    this.drafts = drafts;
    this.workflow = workflow;
  }

  async buildAndStore(user, type, input = {}) {
    requireTeacher(user);
    const result = await this.runWorkflow(user, type, input);
    const stored = await this.storeResult(user, type, result, input);
    const draft = await this.createDraftFromResult(user, stored, input);
    return {
      ...this.flattenStoredResult(stored),
      draft
    };
  }

  async runWorkflow(user, type, input = {}) {
    if (type === "teaching_plan") {
      return this.workflow.buildTeachingPlan(user, input);
    }
    if (type === "student_intervention") {
      return this.workflow.buildStudentIntervention(user, input);
    }
    if (type === "assignment_commentary") {
      return this.workflow.buildAssignmentCommentary(user, input);
    }
    if (type === "feedback_draft") {
      return this.workflow.buildFeedbackDraft(user, input);
    }
    if (type === "course_practice_plan") {
      return this.workflow.buildCoursePracticePlan(user, input);
    }
    if (type === "report_summary") {
      return this.workflow.buildReportSummary(user, input);
    }
    throw new ValidationError("unknown teacher ai workflow type");
  }

  async storeResult(user, type, result, input = {}) {
    const now = new Date().toISOString();
    const record = await this.results.save({
      id: this.database.nextId("teacher_ai_result"),
      ownerId: user.id,
      type,
      route: input.route || "teacher-home",
      courseId: input.courseId || null,
      studentId: input.studentId || null,
      assignmentId: input.assignmentId || null,
      submissionId: input.submissionId || null,
      provider: result.provider || "fallback",
      result: clone(result),
      actions: normalizeActions(result.actions),
      sourceEvidenceIds: asArray(input.sourceEvidenceIds || input.evidenceIds || []),
      generatedAt: result.generatedAt || now,
      createdAt: now,
      updatedAt: now
    });
    return buildResultPayload(record);
  }

  async createDraftFromResult(user, resultRecord, input = {}) {
    const draft = resultRecord.result?.draft || {};
    const record = await this.drafts.save({
      id: this.database.nextId("teacher_ai_draft"),
      ownerId: user.id,
      type: resultRecord.type,
      status: "draft",
      title: draftTitleFor(resultRecord.type, resultRecord.result),
      summary: String(draft.summary || resultRecord.result?.summary || ""),
      body: String(draft.body || ""),
      structuredPayload: clone({
        ...draft,
        resultSummary: resultRecord.result?.summary || "",
        actions: resultRecord.actions || []
      }),
      courseId: draft.courseId || resultRecord.courseId || input.courseId || null,
      studentId: draft.studentId || resultRecord.studentId || input.studentId || null,
      assignmentId: draft.assignmentId || resultRecord.assignmentId || input.assignmentId || null,
      submissionId: draft.submissionId || resultRecord.submissionId || input.submissionId || null,
      resultId: resultRecord.id,
      sourceEvidenceIds: asArray(resultRecord.sourceEvidenceIds),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return buildDraftPayload(record);
  }

  listResults(user, filters = {}) {
    requireTeacher(user);
    return {
      items: this.results.findByOwner(user.id, filters).map(buildResultPayload)
    };
  }

  getResult(user, id) {
    requireTeacher(user);
    return buildResultPayload(this.requireOwnedResult(user, id));
  }

  async updateAction(user, resultId, actionId, input = {}) {
    requireTeacher(user);
    const record = this.requireOwnedResult(user, resultId);
    const action = normalizeActions(record.actions).find((item) => item.id === actionId);
    if (!action) {
      throw new NotFoundError("teacher ai action not found");
    }
    action.status = String(input.status || action.status || "open");
    action.note = String(input.note || action.note || "");
    action.updatedAt = new Date().toISOString();
    record.actions = normalizeActions(record.actions).map((item) => (item.id === actionId ? action : item));
    record.touch();
    return buildResultPayload(await this.results.save(record));
  }

  listDrafts(user, filters = {}) {
    requireTeacher(user);
    return {
      items: this.drafts.findByOwner(user.id, filters).map(buildDraftPayload)
    };
  }

  getDraft(user, id) {
    requireTeacher(user);
    return buildDraftPayload(this.requireOwnedDraft(user, id));
  }

  async updateDraft(user, id, input = {}) {
    requireTeacher(user);
    const draft = this.requireOwnedDraft(user, id);
    if (input.title !== undefined) {
      draft.title = String(input.title || "").trim();
    }
    if (input.summary !== undefined) {
      draft.summary = String(input.summary || "").trim();
    }
    if (input.body !== undefined) {
      draft.body = String(input.body || "");
    }
    if (input.status !== undefined) {
      draft.status = String(input.status || "draft");
    }
    if (input.structuredPayload !== undefined) {
      draft.structuredPayload = input.structuredPayload && typeof input.structuredPayload === "object" ? input.structuredPayload : {};
    }
    draft.touch();
    return buildDraftPayload(await this.drafts.save(draft));
  }

  async deleteDraft(user, id) {
    requireTeacher(user);
    const draft = this.requireOwnedDraft(user, id);
    await this.drafts.remove(draft.id);
    return { id: draft.id, removed: true };
  }

  async confirmDraft(user, id, actionType, input = {}) {
    requireTeacher(user);
    const draft = this.requireOwnedDraft(user, id);
    const nextStatus = actionType === "send-intervention" ? "sent" : "saved";
    draft.status = nextStatus;
    draft.structuredPayload = {
      ...draft.structuredPayload,
      confirmedAction: actionType,
      confirmationInput: clone(input)
    };
    draft.touch();
    const saved = await this.drafts.save(draft);
    return buildDraftPayload(saved);
  }

  flattenStoredResult(record) {
    return {
      id: record.id,
      type: record.type,
      route: record.route,
      provider: record.provider,
      generatedAt: record.generatedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      sourceEvidenceIds: asArray(record.sourceEvidenceIds),
      ...clone(record.result),
      actions: normalizeActions(record.actions)
    };
  }

  requireOwnedResult(user, id) {
    const record = this.results.findById(id);
    if (!record || record.ownerId !== user.id) {
      throw new NotFoundError("teacher ai result not found");
    }
    return record;
  }

  requireOwnedDraft(user, id) {
    const draft = this.drafts.findById(id);
    if (!draft || draft.ownerId !== user.id) {
      throw new NotFoundError("teacher ai draft not found");
    }
    return draft;
  }
}

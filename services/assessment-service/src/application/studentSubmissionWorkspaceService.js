import { promises as fs } from "node:fs";
import { join } from "node:path";
import { NotFoundError, ValidationError } from "../../../../shared/http/errors.js";

function requireText(value, label) {
  const text = String(value || "").trim();
  if (!text) {
    throw new ValidationError(`${label} is required`);
  }
  return text;
}

function ensureStudent(user, studentId) {
  if (user.role === "teacher" || user.role === "admin") {
    return studentId || user.id;
  }
  return user.id;
}

function normalizeAttachments(value) {
  return Array.isArray(value) ? value.filter(Boolean).map((item) => ({
    id: item.id || null,
    name: String(item.name || ""),
    url: String(item.url || ""),
    contentType: String(item.contentType || ""),
    size: Number(item.size || 0)
  })) : [];
}

export class StudentSubmissionWorkspaceService {
  constructor({ database, config, assignments, submissions, submissionDrafts, uploads, assignmentService, aiClient }) {
    this.database = database;
    this.config = config;
    this.assignments = assignments;
    this.submissions = submissions;
    this.submissionDrafts = submissionDrafts;
    this.uploads = uploads;
    this.assignmentService = assignmentService;
    this.aiClient = aiClient;
  }

  getDraft(user, filters = {}) {
    const studentId = ensureStudent(user, filters.studentId);
    const draft = filters.assignmentId
      ? this.submissionDrafts.findByAssignmentAndStudent(filters.assignmentId, studentId)
      : this.submissionDrafts.findByStudent(studentId)[0] || null;
    return draft ? draft.toJSON() : null;
  }

  async saveDraft(user, input = {}) {
    const studentId = ensureStudent(user);
    const assignmentId = requireText(input.assignmentId, "assignmentId");
    const assignment = this.assignments.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError("assignment not found");
    }
    const existing = this.submissionDrafts.findByAssignmentAndStudent(assignmentId, studentId);
    const draft = existing || {
      id: this.database.nextId("submission_draft"),
      assignmentId,
      studentId,
      content: "",
      attachments: [],
      aiCheckResultId: null,
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    draft.content = String(input.content || draft.content || "");
    draft.attachments = normalizeAttachments(input.attachments !== undefined ? input.attachments : draft.attachments);
    draft.aiCheckResultId = input.aiCheckResultId || draft.aiCheckResultId || null;
    draft.status = "draft";
    draft.updatedAt = new Date().toISOString();
    return this.submissionDrafts.save(draft);
  }

  async updateDraft(user, draftId, input = {}) {
    const draft = this.requireOwnedDraft(user, draftId);
    if (input.content !== undefined) {
      draft.content = String(input.content || "");
    }
    if (input.attachments !== undefined) {
      draft.attachments = normalizeAttachments(input.attachments);
    }
    if (input.aiCheckResultId !== undefined) {
      draft.aiCheckResultId = input.aiCheckResultId || null;
    }
    draft.updatedAt = new Date().toISOString();
    return this.submissionDrafts.save(draft);
  }

  async deleteDraft(user, draftId) {
    const draft = this.requireOwnedDraft(user, draftId);
    await this.submissionDrafts.remove(draft.id);
    return { id: draft.id, removed: true };
  }

  async submitDraft(user, draftId) {
    const draft = this.requireOwnedDraft(user, draftId);
    const submission = await this.assignmentService.createSubmission({ id: draft.studentId, role: "student" }, draft.assignmentId, {
      content: draft.content,
      attachments: draft.attachments,
      aiCheckResultId: draft.aiCheckResultId
    });
    draft.status = "submitted";
    draft.updatedAt = new Date().toISOString();
    await this.submissionDrafts.save(draft);
    await this.submissionDrafts.remove(draft.id);
    return submission;
  }

  async createUpload(user, input = {}) {
    const filename = requireText(input.filename, "filename");
    const base64 = requireText(input.base64, "base64");
    const contentType = String(input.contentType || "application/octet-stream");
    const buffer = Buffer.from(base64, "base64");
    await fs.mkdir(this.config.uploadDir, { recursive: true });
    const id = this.database.nextId("upload");
    const storagePath = join(this.config.uploadDir, `${id}_${filename}`);
    await fs.writeFile(storagePath, buffer);
    const record = await this.uploads.save({
      id,
      ownerId: user.id,
      name: filename,
      url: `/api/uploads/${id}`,
      contentType,
      size: buffer.length,
      storagePath,
      base64,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return record;
  }

  getUpload(user, uploadId) {
    const record = this.requireOwnedUpload(user, uploadId);
    return record;
  }

  async deleteUpload(user, uploadId) {
    const record = this.requireOwnedUpload(user, uploadId);
    await fs.rm(record.storagePath, { force: true }).catch(() => {});
    await this.uploads.remove(record.id);
    return { id: record.id, removed: true };
  }

  async getSubmissionEvidence(user, submissionId) {
    const submission = this.submissions.findById(submissionId);
    if (!submission) {
      throw new NotFoundError("submission not found");
    }
    const assignment = this.assignments.findById(submission.assignmentId);
    const aiCheck = submission.aiCheckResultId ? await this.aiClient.getStudentAiResult(submission.aiCheckResultId) : null;
    return {
      submission: submission.toJSON(),
      assignment: assignment?.toJSON() || null,
      aiCheck,
      draft: this.submissionDrafts.findByAssignmentAndStudent(submission.assignmentId, submission.studentId)?.toJSON() || null
    };
  }

  async getAssignmentEvidence(user, assignmentId) {
    const submissions = this.submissions.findByAssignment(assignmentId);
    const rows = [];
    for (const item of submissions) {
      rows.push(await this.getSubmissionEvidence(user, item.id));
    }
    return {
      assignment: this.assignments.findById(assignmentId)?.toJSON() || null,
      items: rows
    };
  }

  requireOwnedDraft(user, draftId) {
    const draft = this.submissionDrafts.findById(draftId);
    if (!draft || (user.role !== "teacher" && user.role !== "admin" && draft.studentId !== user.id)) {
      throw new NotFoundError("submission draft not found");
    }
    return draft;
  }

  requireOwnedUpload(user, uploadId) {
    const record = this.uploads.findById(uploadId);
    if (!record || (user.role !== "teacher" && user.role !== "admin" && record.ownerId !== user.id)) {
      throw new NotFoundError("upload not found");
    }
    return record;
  }
}

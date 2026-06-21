import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { FeedbackItem, Grade } from "../domain/assignment.js";
import { isTeacherRole } from "../domain/assessment.js";

function requireTeacher(user) {
  if (!isTeacherRole(user.role)) {
    throw new ForbiddenError("只有教师或管理员可以评分。");
  }
}

function requireNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new ValidationError(`${label}必须是数字。`);
  }
  return number;
}

export class GradingService {
  constructor({ database, assignments, submissions, rubrics, rubricCriteria, grades, feedbackItems, aiClient, identityClient, collaborationClient, logger = console }) {
    this.database = database;
    this.assignments = assignments;
    this.submissions = submissions;
    this.rubrics = rubrics;
    this.rubricCriteria = rubricCriteria;
    this.grades = grades;
    this.feedbackItems = feedbackItems;
    this.aiClient = aiClient;
    this.identityClient = identityClient;
    this.collaborationClient = collaborationClient;
    this.logger = logger;
  }

  async gradeSubmission(user, submissionId, input) {
    requireTeacher(user);
    const submission = this.submissions.findById(submissionId);
    if (!submission) {
      throw new NotFoundError("提交不存在。");
    }
    const assignment = this.assignments.findById(submission.assignmentId);
    if (!assignment) {
      throw new NotFoundError("作业不存在。");
    }

    const score = requireNumber(input.score, "总分");
    const criteriaScores = Array.isArray(input.criteriaScores) ? input.criteriaScores.map((item) => ({
      criterionId: item.criterionId,
      score: requireNumber(item.score, "维度分数"),
      comment: String(item.comment || "").trim()
    })) : [];

    const now = new Date().toISOString();
    const grade = new Grade({
      id: this.database.nextId("grade"),
      submissionId: submission.id,
      graderId: user.id,
      score,
      feedback: String(input.feedback || "").trim(),
      criteriaScores,
      source: "teacher",
      createdAt: now,
      updatedAt: now
    });

    const saved = await this.grades.save(grade);
    await this.publishEvent({
      type: "submission.graded",
      actorId: user.id,
      source: "assessment-service",
      summary: `完成作业评分：${assignment.title}`,
      payload: { submissionId: submission.id, assignmentId: assignment.id, score: saved.score }
    });
    return saved;
  }

  async saveTeacherFeedbackDraft(user, submissionId, input = {}) {
    requireTeacher(user);
    const submission = this.submissions.findById(submissionId);
    if (!submission) {
      throw new NotFoundError("提交不存在。");
    }
    const assignment = this.assignments.findById(submission.assignmentId);
    if (!assignment) {
      throw new NotFoundError("作业不存在。");
    }

    const scoreInput = input.score ?? input.suggestedScore ?? 0;
    const score = requireNumber(scoreInput, "总分");
    const criteriaScores = Array.isArray(input.criteriaScores) ? input.criteriaScores.map((item) => ({
      criterionId: item.criterionId || null,
      score: requireNumber(item.score, "维度分数"),
      comment: String(item.comment || "").trim()
    })) : [];
    const summary = String(input.summary || input.feedback || "").trim();
    const now = new Date().toISOString();

    const grade = new Grade({
      id: this.database.nextId("grade"),
      submissionId: submission.id,
      graderId: user.id,
      score,
      feedback: summary,
      criteriaScores,
      source: "teacher",
      createdAt: now,
      updatedAt: now
    });
    const savedGrade = await this.grades.save(grade);

    const feedback = new FeedbackItem({
      id: this.database.nextId("feedback"),
      submissionId: submission.id,
      gradeId: savedGrade.id,
      actorId: user.id,
      source: "teacher",
      summary,
      criteriaFeedback: criteriaScores.map((item) => ({
        criterionId: item.criterionId,
        score: item.score,
        comment: item.comment
      })),
      provider: input.provider || "teacher-ai-draft",
      createdAt: now,
      updatedAt: now
    });
    const savedFeedback = await this.feedbackItems.save(feedback);

    await this.publishEvent({
      type: "submission.feedback.saved",
      actorId: user.id,
      source: "assessment-service",
      summary: `保存教师反馈草稿：${assignment.title}`,
      payload: {
        submissionId: submission.id,
        assignmentId: assignment.id,
        gradeId: savedGrade.id,
        feedbackId: savedFeedback.id
      }
    });

    return {
      submissionId: submission.id,
      assignmentId: assignment.id,
      grade: savedGrade.toJSON(),
      feedbackItem: savedFeedback.toJSON()
    };
  }

  async reviewSubmissionByAi(user, submissionId) {
    requireTeacher(user);
    const submission = this.submissions.findById(submissionId);
    if (!submission) {
      throw new NotFoundError("提交不存在。");
    }
    const assignment = this.assignments.findById(submission.assignmentId);
    if (!assignment) {
      throw new NotFoundError("作业不存在。");
    }
    const rubric = assignment.rubricId ? this.rubrics.findById(assignment.rubricId) : null;
    const criteria = rubric ? this.rubricCriteria.findByRubric(rubric.id) : [];
    const student = await this.identityClient.getUserById(submission.studentId);

    const review = await this.aiClient.reviewSubmission({
      submission: submission.toJSON(),
      assignment: assignment.toJSON(),
      rubric: rubric ? { ...rubric.toJSON(), criteria: criteria.map((item) => item.toJSON()) } : null,
      student
    });

    const now = new Date().toISOString();
    const grade = new Grade({
      id: this.database.nextId("grade"),
      submissionId: submission.id,
      graderId: user.id,
      score: Number(review.suggestedScore || 0),
      feedback: String(review.summary || "").trim(),
      criteriaScores: Array.isArray(review.criteriaFeedback) ? review.criteriaFeedback.map((item) => ({
        criterionId: item.criterionId || null,
        score: Number(item.score || 0),
        comment: String(item.comment || "").trim()
      })) : [],
      source: "ai",
      provider: review.provider || "mock-local-llm",
      createdAt: now,
      updatedAt: now
    });
    const savedGrade = await this.grades.save(grade);

    const feedback = new FeedbackItem({
      id: this.database.nextId("feedback"),
      submissionId: submission.id,
      gradeId: savedGrade.id,
      actorId: user.id,
      source: "ai",
      summary: String(review.summary || "").trim(),
      criteriaFeedback: Array.isArray(review.criteriaFeedback) ? review.criteriaFeedback : [],
      provider: review.provider || "mock-local-llm",
      createdAt: now,
      updatedAt: now
    });
    await this.feedbackItems.save(feedback);

    await this.publishEvent({
      type: "submission.ai-reviewed",
      actorId: user.id,
      source: "assessment-service",
      summary: `完成 AI 初评：${assignment.title}`,
      payload: { submissionId: submission.id, assignmentId: assignment.id, provider: grade.provider }
    });

    return {
      review: {
        summary: review.summary,
        suggestedScore: savedGrade.score,
        criteriaFeedback: feedback.criteriaFeedback
      },
      provider: review.provider || "mock-local-llm"
    };
  }

  async publishEvent(event) {
    if (!this.collaborationClient) {
      return;
    }
    try {
      await this.collaborationClient.publishEvent(event);
    } catch (error) {
      this.logger.warn?.(`assessment-service event publish failed: ${error.message}`);
    }
  }
}

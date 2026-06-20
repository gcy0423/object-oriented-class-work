import { AppError, ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { Assignment, Rubric, RubricCriterion, Submission } from "../domain/assignment.js";
import { isTeacherRole, sortByCreatedDesc, toRoleSet } from "../domain/assessment.js";

function requireText(value, label) {
  if (!String(value || "").trim()) {
    throw new ValidationError(`${label}不能为空。`);
  }
  return String(value).trim();
}

function ensureAttachments(input) {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .filter((item) => item && (item.name || item.url))
    .map((item) => ({
      name: String(item.name || "").trim(),
      url: String(item.url || "").trim()
    }));
}

export class AssignmentService {
  constructor({ database, assignments, submissions, rubrics, rubricCriteria, grades, feedbackItems, learningClient, identityClient, collaborationClient, logger = console }) {
    this.database = database;
    this.assignments = assignments;
    this.submissions = submissions;
    this.rubrics = rubrics;
    this.rubricCriteria = rubricCriteria;
    this.grades = grades;
    this.feedbackItems = feedbackItems;
    this.learningClient = learningClient;
    this.identityClient = identityClient;
    this.collaborationClient = collaborationClient;
    this.logger = logger;
  }

  async ensureCourseVisible(user, courseId) {
    const context = await this.learningClient.getLearningContext(user.id);
    const course = (context.courses || []).find((item) => item.id === courseId);
    if (!course) {
      throw new NotFoundError("课程不存在。");
    }
    return course;
  }

  async createRubric(user, input) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("只有教师或管理员可以创建 Rubric。");
    }
    const courseId = requireText(input.courseId, "课程");
    await this.ensureCourseVisible(user, courseId);
    const criteriaInput = Array.isArray(input.criteria) ? input.criteria : [];
    if (criteriaInput.length === 0) {
      throw new ValidationError("评分维度不能为空。");
    }

    const title = requireText(input.title, "Rubric 标题");
    const now = new Date().toISOString();
    const rubricId = this.database.nextId("rubric");
    const criteriaDrafts = criteriaInput.map((item, index) => {
      const criterion = new RubricCriterion({
        id: this.database.nextId("criterion"),
        rubricId,
        title: requireText(item.title, "评分维度标题"),
        description: String(item.description || "").trim(),
        maxScore: Number(item.maxScore || 0),
        order: index + 1,
        createdAt: now,
        updatedAt: now
      });
      if (criterion.maxScore <= 0) {
        throw new ValidationError("评分维度分值必须大于 0。");
      }
      return criterion;
    });

    const rubric = new Rubric({
      id: rubricId,
      courseId,
      title,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    });
    const savedRubric = await this.rubrics.save(rubric);

    const criteria = [];
    for (const criterion of criteriaDrafts) {
      criteria.push(await this.rubricCriteria.save(criterion));
    }

    return {
      ...savedRubric.toJSON(),
      criteria: criteria.map((item) => item.toJSON())
    };
  }

  listRubrics({ courseId } = {}) {
    const rubrics = courseId ? this.rubrics.findByCourse(courseId) : this.rubrics.all();
    return rubrics.map((rubric) => ({
      ...rubric.toJSON(),
      criteria: this.rubricCriteria.findByRubric(rubric.id).map((item) => item.toJSON())
    }));
  }

  listAssignments(user, filters = {}) {
    const roleSet = toRoleSet(user);
    const assignments = sortByCreatedDesc(this.assignments.findByFilters(filters));
    if (roleSet.isTeacher) {
      return assignments;
    }
    return assignments.filter((assignment) => assignment.status === "published");
  }

  async createAssignment(user, input) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("只有教师或管理员可以发布作业。");
    }
    const courseId = requireText(input.courseId, "课程");
    await this.ensureCourseVisible(user, courseId);
    const rubricId = String(input.rubricId || "").trim() || null;
    if (rubricId) {
      const rubric = this.rubrics.findById(rubricId);
      if (!rubric || rubric.courseId !== courseId) {
        throw new NotFoundError("评分规则不存在。");
      }
    }

    const now = new Date().toISOString();
    const assignment = new Assignment({
      id: this.database.nextId("assignment"),
      courseId,
      classroomId: String(input.classroomId || "").trim() || null,
      title: requireText(input.title, "作业标题"),
      description: String(input.description || "").trim(),
      status: String(input.status || "published").trim() || "published",
      rubricId,
      dueAt: input.dueAt || null,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.assignments.save(assignment);
    await this.publishEvent({
      type: "assignment.published",
      actorId: user.id,
      source: "assessment-service",
      summary: `发布作业：${saved.title}`,
      payload: { assignmentId: saved.id, courseId: saved.courseId }
    });
    return saved;
  }

  async updateAssignment(user, assignmentId, input) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("只有教师或管理员可以编辑作业。");
    }
    const assignment = this.assignments.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError("作业不存在。");
    }
    const courseId = requireText(input.courseId || assignment.courseId, "课程");
    await this.ensureCourseVisible(user, courseId);
    const rubricId = String(input.rubricId ?? assignment.rubricId ?? "").trim() || null;
    if (rubricId) {
      const rubric = this.rubrics.findById(rubricId);
      if (!rubric || rubric.courseId !== courseId) {
        throw new NotFoundError("评分规则不存在。");
      }
    }
    assignment.title = requireText(input.title ?? assignment.title, "作业标题");
    assignment.description = String(input.description ?? assignment.description ?? "").trim();
    assignment.courseId = courseId;
    assignment.dueAt = input.dueAt ?? assignment.dueAt ?? null;
    assignment.status = String(input.status || assignment.status || "draft").trim();
    assignment.rubricId = rubricId;
    assignment.touch();
    return this.assignments.save(assignment);
  }

  async deleteAssignment(user, assignmentId) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("只有教师或管理员可以删除作业。");
    }
    const assignment = this.assignments.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError("作业不存在。");
    }
    const submissions = this.submissions.findByAssignment(assignmentId);
    if (submissions.length) {
      throw new AppError("该作业已有提交，暂不允许删除。", 409, "ASSIGNMENT_HAS_SUBMISSIONS");
    }
    await this.assignments.remove(assignmentId);
    return { id: assignmentId, deleted: true };
  }

  getAssignmentDetail(user, assignmentId) {
    const assignment = this.assignments.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError("作业不存在。");
    }
    const rubric = assignment.rubricId ? this.rubrics.findById(assignment.rubricId) : null;
    const criteria = rubric ? this.rubricCriteria.findByRubric(rubric.id) : [];
    const submissions = this.submissions.findByAssignment(assignment.id);
    const roleSet = toRoleSet(user);
    const visibleSubmissions = roleSet.isTeacher
      ? submissions
      : submissions.filter((item) => item.studentId === user.id);
    const gradeMap = new Map(visibleSubmissions.map((submission) => [submission.id, this.grades.findBySubmission(submission.id)]));

    return {
      assignment,
      rubric: rubric ? { ...rubric.toJSON(), criteria: criteria.map((item) => item.toJSON()) } : null,
      submissions: visibleSubmissions.map((submission) => ({
        ...submission.toJSON(),
        grades: (gradeMap.get(submission.id) || []).map((item) => item.toJSON()),
        feedback: this.feedbackItems.findBySubmission(submission.id).map((item) => item.toJSON())
      })),
      submissionSummary: {
        total: submissions.length,
        graded: submissions.filter((item) => this.grades.findFinalTeacherGrade(item.id)).length,
        submitted: submissions.length
      }
    };
  }

  async createSubmission(user, assignmentId, input) {
    const assignment = this.assignments.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundError("作业不存在。");
    }
    const content = requireText(input.content, "提交内容");
    const student = await this.identityClient.getUserById(user.id);
    const existing = this.submissions.findByAssignmentAndStudent(assignment.id, user.id);
    const now = new Date().toISOString();

    const submission = existing || new Submission({
      id: this.database.nextId("submission"),
      assignmentId: assignment.id,
      studentId: user.id,
      studentSnapshot: {
        name: student.name,
        role: student.role
      },
      content,
      attachments: ensureAttachments(input.attachments),
      aiCheckResultId: input.aiCheckResultId || null,
      status: "submitted",
      submittedAt: now,
      createdAt: now,
      updatedAt: now
    });

    submission.content = content;
    submission.attachments = ensureAttachments(input.attachments);
    submission.aiCheckResultId = input.aiCheckResultId || submission.aiCheckResultId || null;
    submission.status = "submitted";
    submission.submittedAt = now;
    submission.studentSnapshot = {
      name: student.name,
      role: student.role
    };
    submission.touch();

    const saved = await this.submissions.save(submission);
    await this.publishEvent({
      type: "submission.created",
      actorId: user.id,
      source: "assessment-service",
      summary: `提交作业：${assignment.title}`,
      payload: { submissionId: saved.id, assignmentId: assignment.id }
    });
    return saved;
  }

  buildAssessmentContext(userId) {
    return {
      userId,
      assignments: this.assignments.all().filter((assignment) => this.submissions.findByAssignmentAndStudent(assignment.id, userId)),
      submissions: this.submissions.findByStudent(userId),
      practiceSessions: [],
      mistakes: [],
      mastery: []
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

import { Repository } from "../../../../shared/data/repository.js";
import { Entity } from "../../../../shared/domain/entity.js";

export class Assignment extends Entity {
  constructor(record) {
    super(record);
    this.courseId = record.courseId;
    this.classroomId = record.classroomId || null;
    this.title = record.title;
    this.description = record.description || "";
    this.status = record.status || "published";
    this.rubricId = record.rubricId || null;
    this.createdBy = record.createdBy;
    this.dueAt = record.dueAt || null;
  }
}

export class Submission extends Entity {
  constructor(record) {
    super(record);
    this.assignmentId = record.assignmentId;
    this.studentId = record.studentId;
    this.studentSnapshot = record.studentSnapshot || null;
    this.content = record.content || "";
    this.attachments = Array.isArray(record.attachments) ? record.attachments : [];
    this.status = record.status || "submitted";
    this.submittedAt = record.submittedAt || this.createdAt;
  }
}

export class Rubric extends Entity {
  constructor(record) {
    super(record);
    this.courseId = record.courseId;
    this.title = record.title;
    this.createdBy = record.createdBy;
  }
}

export class RubricCriterion extends Entity {
  constructor(record) {
    super(record);
    this.rubricId = record.rubricId;
    this.title = record.title;
    this.description = record.description || "";
    this.maxScore = Number(record.maxScore || 0);
    this.order = Number(record.order || 0);
  }
}

export class Grade extends Entity {
  constructor(record) {
    super(record);
    this.submissionId = record.submissionId;
    this.graderId = record.graderId;
    this.score = Number(record.score || 0);
    this.feedback = record.feedback || "";
    this.criteriaScores = Array.isArray(record.criteriaScores) ? record.criteriaScores : [];
    this.source = record.source || "teacher";
    this.provider = record.provider || null;
  }
}

export class FeedbackItem extends Entity {
  constructor(record) {
    super(record);
    this.submissionId = record.submissionId;
    this.gradeId = record.gradeId || null;
    this.actorId = record.actorId || "system";
    this.source = record.source || "teacher";
    this.summary = record.summary || "";
    this.criteriaFeedback = Array.isArray(record.criteriaFeedback) ? record.criteriaFeedback : [];
    this.provider = record.provider || null;
  }
}

class AssessmentRepository extends Repository {
  constructor(database, collectionName, factory) {
    super(database, collectionName, factory);
  }
}

export class AssignmentRepository extends AssessmentRepository {
  constructor(database) {
    super(database, "assignments", (record) => new Assignment(record));
  }

  findByFilters({ courseId, classroomId, status } = {}) {
    return this.where((assignment) => {
      if (courseId && assignment.courseId !== courseId) {
        return false;
      }
      if (classroomId && assignment.classroomId !== classroomId) {
        return false;
      }
      if (status && assignment.status !== status) {
        return false;
      }
      return true;
    });
  }
}

export class SubmissionRepository extends AssessmentRepository {
  constructor(database) {
    super(database, "submissions", (record) => new Submission(record));
  }

  findByAssignment(assignmentId) {
    return this.where((submission) => submission.assignmentId === assignmentId);
  }

  findByStudent(studentId) {
    return this.where((submission) => submission.studentId === studentId);
  }

  findByAssignmentAndStudent(assignmentId, studentId) {
    return this.findByAssignment(assignmentId).find((submission) => submission.studentId === studentId) || null;
  }
}

export class RubricRepository extends AssessmentRepository {
  constructor(database) {
    super(database, "rubrics", (record) => new Rubric(record));
  }

  findByCourse(courseId) {
    return this.where((rubric) => rubric.courseId === courseId);
  }
}

export class RubricCriterionRepository extends AssessmentRepository {
  constructor(database) {
    super(database, "rubricCriteria", (record) => new RubricCriterion(record));
  }

  findByRubric(rubricId) {
    return this.where((criterion) => criterion.rubricId === rubricId)
      .sort((a, b) => a.order - b.order);
  }
}

export class GradeRepository extends AssessmentRepository {
  constructor(database) {
    super(database, "grades", (record) => new Grade(record));
  }

  findBySubmission(submissionId) {
    return this.where((grade) => grade.submissionId === submissionId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  findFinalTeacherGrade(submissionId) {
    return this.findBySubmission(submissionId).find((grade) => grade.source === "teacher") || null;
  }
}

export class FeedbackItemRepository extends AssessmentRepository {
  constructor(database) {
    super(database, "feedbackItems", (record) => new FeedbackItem(record));
  }

  findBySubmission(submissionId) {
    return this.where((item) => item.submissionId === submissionId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
}

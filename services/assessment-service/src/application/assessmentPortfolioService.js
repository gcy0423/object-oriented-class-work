import { ForbiddenError, ValidationError } from "../../../../shared/http/errors.js";
import { isTeacherRole } from "../domain/assessment.js";

const RISK_LEVELS = Object.freeze({
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low"
});

function requireCourseId(filters = {}) {
  const courseId = String(filters.courseId || "").trim();
  if (!courseId) {
    throw new ValidationError("courseId is required");
  }
  return courseId;
}

function resolveOwnerId(user, filters = {}) {
  if (isTeacherRole(user.role) && filters.studentId) {
    return String(filters.studentId);
  }
  return user.id;
}

function percent(numerator, denominator) {
  if (!denominator) {
    return 0;
  }
  return Math.round((numerator / denominator) * 100);
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function latestTime(items, field = "updatedAt") {
  return items
    .map((item) => item[field] || item.createdAt)
    .filter(Boolean)
    .sort((a, b) => String(b).localeCompare(String(a)))[0] || null;
}

function pushReason(reasons, code, message, weight) {
  reasons.push({ code, message, weight });
}

export class AssessmentPortfolioService {
  constructor({
    assignments,
    submissions,
    rubrics,
    grades,
    feedbackItems,
    practiceSessions,
    answerRecords,
    mistakeItems,
    masteryRecords,
    rubricInsightService,
    mistakeAnalysisService
  }) {
    this.assignments = assignments;
    this.submissions = submissions;
    this.rubrics = rubrics;
    this.grades = grades;
    this.feedbackItems = feedbackItems;
    this.practiceSessions = practiceSessions;
    this.answerRecords = answerRecords;
    this.mistakeItems = mistakeItems;
    this.masteryRecords = masteryRecords;
    this.rubricInsightService = rubricInsightService;
    this.mistakeAnalysisService = mistakeAnalysisService;
  }

  buildStudentPortfolio(user, filters = {}) {
    const courseId = requireCourseId(filters);
    const ownerId = resolveOwnerId(user, filters);
    if (!isTeacherRole(user.role) && ownerId !== user.id) {
      throw new ForbiddenError("cannot inspect another student's portfolio");
    }
    const assignments = this.assignments.findByFilters({ courseId });
    const submissions = this.submissions.findByStudent(ownerId)
      .filter((submission) => assignments.some((assignment) => assignment.id === submission.assignmentId));
    const sessions = this.practiceSessions.findByOwner(ownerId)
      .filter((session) => session.courseId === courseId);
    const mistakes = this.mistakeItems.findByOwner(ownerId)
      .filter((mistake) => mistake.courseId === courseId);
    const mastery = this.masteryRecords.findByOwner(ownerId)
      .filter((record) => record.courseId === courseId);
    const grades = submissions.flatMap((submission) => this.grades.findBySubmission(submission.id));
    return {
      ownerId,
      courseId,
      assignmentProgress: this.buildAssignmentProgress(assignments, submissions, grades),
      gradeTrend: this.buildGradeTrend(submissions, grades),
      practiceSummary: this.buildPracticeSummary(sessions),
      answerSummary: this.buildAnswerSummary(sessions),
      mistakeSummary: this.mistakeAnalysisService.buildStudentReport({ id: ownerId, role: "student" }, { courseId }),
      masterySummary: this.buildMasterySummary(mastery),
      evidenceTimeline: this.buildEvidenceTimeline({ submissions, grades, sessions, mistakes }),
      risk: this.computePortfolioRisk({ assignments, submissions, sessions, mistakes, mastery, grades })
    };
  }

  buildCourseReport(user, filters = {}) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("teacher role required");
    }
    const courseId = requireCourseId(filters);
    const assignments = this.assignments.findByFilters({ courseId });
    const rubrics = this.rubrics.findByCourse(courseId);
    const submissions = assignments.flatMap((assignment) => this.submissions.findByAssignment(assignment.id));
    const grades = submissions.flatMap((submission) => this.grades.findBySubmission(submission.id));
    const sessions = this.practiceSessions.findByFilters({ courseId });
    const mistakes = this.mistakeItems.all().filter((mistake) => mistake.courseId === courseId);
    const mastery = this.masteryRecords.all().filter((record) => record.courseId === courseId);
    return {
      courseId,
      assignmentCount: assignments.length,
      rubricCount: rubrics.length,
      submissionCount: submissions.length,
      gradedSubmissionCount: this.countGradedSubmissions(submissions),
      rubricQuality: rubrics.map((rubric) => this.rubricInsightService.getRubricProfile(rubric.id)),
      assignmentOverviews: assignments.map((assignment) => this.rubricInsightService.buildAssignmentGradingOverview(assignment.id)),
      gradeDistribution: this.buildGradeDistribution(grades),
      practiceEngagement: this.buildCoursePracticeEngagement(sessions),
      mistakeLoad: this.buildCourseMistakeLoad(mistakes),
      masteryCoverage: this.buildCourseMasteryCoverage(mastery),
      riskRegister: this.buildRiskRegister(user, { courseId }).items,
      generatedAt: new Date().toISOString()
    };
  }

  buildRiskRegister(user, filters = {}) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("teacher role required");
    }
    const courseId = requireCourseId(filters);
    const studentIds = this.collectCourseStudentIds(courseId);
    const items = studentIds.map((studentId) => {
      const portfolio = this.buildStudentPortfolio({ id: studentId, role: "student" }, { courseId });
      return {
        studentId,
        courseId,
        risk: portfolio.risk,
        assignmentCompletionRate: portfolio.assignmentProgress.completionRate,
        averageScore: portfolio.gradeTrend.averageScore,
        practiceCorrectRate: portfolio.answerSummary.correctRate,
        openMistakes: portfolio.mistakeSummary.openMistakes,
        weakConcepts: portfolio.masterySummary.weakConcepts
      };
    }).sort((a, b) => b.risk.score - a.risk.score || a.studentId.localeCompare(b.studentId));
    return {
      courseId,
      totalStudents: items.length,
      highRiskCount: items.filter((item) => item.risk.level === RISK_LEVELS.HIGH).length,
      mediumRiskCount: items.filter((item) => item.risk.level === RISK_LEVELS.MEDIUM).length,
      lowRiskCount: items.filter((item) => item.risk.level === RISK_LEVELS.LOW).length,
      items
    };
  }

  buildAssignmentProgress(assignments, submissions, grades) {
    const submittedAssignmentIds = new Set(submissions.map((submission) => submission.assignmentId));
    const gradedSubmissionIds = new Set(grades.map((grade) => grade.submissionId));
    const rows = assignments.map((assignment) => {
      const submission = submissions.find((item) => item.assignmentId === assignment.id) || null;
      const submissionGrades = submission ? this.grades.findBySubmission(submission.id) : [];
      const teacherGrade = submissionGrades.find((grade) => grade.source === "teacher") || null;
      const aiGrade = submissionGrades.find((grade) => grade.source === "ai") || null;
      return {
        assignmentId: assignment.id,
        title: assignment.title,
        dueAt: assignment.dueAt,
        submitted: Boolean(submission),
        submissionId: submission?.id || null,
        graded: submission ? gradedSubmissionIds.has(submission.id) : false,
        teacherScore: teacherGrade?.score ?? null,
        aiScore: aiGrade?.score ?? null
      };
    });
    return {
      totalAssignments: assignments.length,
      submittedCount: submittedAssignmentIds.size,
      missingCount: Math.max(0, assignments.length - submittedAssignmentIds.size),
      completionRate: percent(submittedAssignmentIds.size, assignments.length),
      rows
    };
  }

  buildGradeTrend(submissions, grades) {
    const gradeRows = submissions.flatMap((submission) => this.grades.findBySubmission(submission.id)
      .map((grade) => ({
        submissionId: submission.id,
        source: grade.source,
        score: grade.score,
        gradedAt: grade.createdAt
      })));
    const teacherScores = gradeRows.filter((grade) => grade.source === "teacher").map((grade) => grade.score);
    const finalScores = submissions
      .map((submission) => {
        const submissionGrades = this.grades.findBySubmission(submission.id);
        return submissionGrades.find((grade) => grade.source === "teacher")?.score
          ?? submissionGrades.find((grade) => grade.source === "ai")?.score
          ?? null;
      })
      .filter((score) => score !== null);
    return {
      averageScore: average(finalScores),
      teacherAverageScore: average(teacherScores),
      highestScore: finalScores.length ? Math.max(...finalScores) : 0,
      lowestScore: finalScores.length ? Math.min(...finalScores) : 0,
      gradedCount: finalScores.length,
      rows: gradeRows.sort((a, b) => String(a.gradedAt).localeCompare(String(b.gradedAt)))
    };
  }

  buildPracticeSummary(sessions) {
    const finished = sessions.filter((session) => session.status === "finished");
    return {
      sessionCount: sessions.length,
      activeCount: sessions.filter((session) => session.status === "active").length,
      finishedCount: finished.length,
      averageCorrectRate: average(finished.map((session) => session.correctRate)),
      totalQuestions: sessions.reduce((sum, session) => sum + session.questionIds.length, 0),
      lastPracticedAt: latestTime(sessions, "finishedAt")
    };
  }

  buildAnswerSummary(sessions) {
    const answers = sessions.flatMap((session) => this.answerRecords.findBySession(session.id));
    const judged = answers.filter((answer) => answer.correct !== null);
    const correct = judged.filter((answer) => answer.correct === true);
    return {
      answeredCount: answers.length,
      judgedCount: judged.length,
      correctCount: correct.length,
      incorrectCount: judged.length - correct.length,
      correctRate: percent(correct.length, judged.length)
    };
  }

  buildMasterySummary(mastery) {
    const weakConcepts = mastery
      .filter((record) => record.masteryScore < 70)
      .sort((a, b) => a.masteryScore - b.masteryScore)
      .map((record) => ({
        concept: record.concept,
        masteryScore: record.masteryScore,
        correctCount: record.correctCount,
        incorrectCount: record.incorrectCount
      }));
    return {
      conceptCount: mastery.length,
      averageMastery: average(mastery.map((record) => record.masteryScore)),
      weakConcepts,
      strongConcepts: mastery.filter((record) => record.masteryScore >= 85).map((record) => record.concept)
    };
  }

  buildEvidenceTimeline({ submissions, grades, sessions, mistakes }) {
    const events = [
      ...submissions.map((submission) => ({
        type: "submission",
        id: submission.id,
        at: submission.submittedAt,
        summary: `Submitted assignment ${submission.assignmentId}`
      })),
      ...grades.map((grade) => ({
        type: `grade:${grade.source}`,
        id: grade.id,
        at: grade.createdAt,
        summary: `Received ${grade.source} score ${grade.score}`
      })),
      ...sessions.map((session) => ({
        type: "practice",
        id: session.id,
        at: session.finishedAt || session.startedAt,
        summary: `Practice ${session.status}, correctRate=${session.correctRate}`
      })),
      ...mistakes.map((mistake) => ({
        type: `mistake:${mistake.status}`,
        id: mistake.id,
        at: mistake.updatedAt || mistake.createdAt,
        summary: `Mistake ${mistake.status} for question ${mistake.questionId}`
      }))
    ];
    return events
      .filter((event) => event.at)
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(0, 20);
  }

  computePortfolioRisk({ assignments, submissions, sessions, mistakes, mastery, grades }) {
    const reasons = [];
    const submittedAssignmentIds = new Set(submissions.map((submission) => submission.assignmentId));
    const completionRate = percent(submittedAssignmentIds.size, assignments.length);
    const finalScores = submissions
      .map((submission) => {
        const submissionGrades = this.grades.findBySubmission(submission.id);
        return submissionGrades.find((grade) => grade.source === "teacher")?.score
          ?? submissionGrades.find((grade) => grade.source === "ai")?.score
          ?? null;
      })
      .filter((score) => score !== null);
    const averageScore = average(finalScores);
    const openMistakes = mistakes.filter((mistake) => mistake.status !== "reviewed").length;
    const averageMastery = average(mastery.map((record) => record.masteryScore));
    const finishedSessions = sessions.filter((session) => session.status === "finished");
    if (assignments.length && completionRate < 60) {
      pushReason(reasons, "low-assignment-completion", "Assignment completion is below 60%.", 35);
    }
    if (finalScores.length && averageScore < 70) {
      pushReason(reasons, "low-average-score", "Average score is below 70.", 25);
    }
    if (openMistakes >= 3) {
      pushReason(reasons, "many-open-mistakes", "There are at least 3 open mistakes.", 20);
    }
    if (mastery.length && averageMastery < 65) {
      pushReason(reasons, "low-mastery", "Average mastery is below 65.", 20);
    }
    if (!finishedSessions.length && sessions.length) {
      pushReason(reasons, "unfinished-practice", "Practice sessions exist but none were finished.", 10);
    }
    if (!grades.length && submissions.length) {
      pushReason(reasons, "ungraded-submissions", "Submissions exist but no grade is available.", 10);
    }
    const score = Math.min(100, reasons.reduce((sum, reason) => sum + reason.weight, 0));
    return {
      score,
      level: this.riskLevel(score),
      reasons
    };
  }

  riskLevel(score) {
    if (score >= 60) {
      return RISK_LEVELS.HIGH;
    }
    if (score >= 25) {
      return RISK_LEVELS.MEDIUM;
    }
    return RISK_LEVELS.LOW;
  }

  countGradedSubmissions(submissions) {
    return submissions.filter((submission) => this.grades.findBySubmission(submission.id).length > 0).length;
  }

  buildGradeDistribution(grades) {
    const finalGrades = grades.filter((grade) => grade.source === "teacher" || grade.source === "ai");
    const scores = finalGrades.map((grade) => grade.score);
    return {
      gradeCount: finalGrades.length,
      averageScore: average(scores),
      excellent: scores.filter((score) => score >= 90).length,
      good: scores.filter((score) => score >= 75 && score < 90).length,
      pass: scores.filter((score) => score >= 60 && score < 75).length,
      risk: scores.filter((score) => score < 60).length
    };
  }

  buildCoursePracticeEngagement(sessions) {
    const studentIds = new Set(sessions.map((session) => session.ownerId));
    const finished = sessions.filter((session) => session.status === "finished");
    return {
      participantCount: studentIds.size,
      sessionCount: sessions.length,
      finishedSessionCount: finished.length,
      finishRate: percent(finished.length, sessions.length),
      averageCorrectRate: average(finished.map((session) => session.correctRate))
    };
  }

  buildCourseMistakeLoad(mistakes) {
    const open = mistakes.filter((mistake) => mistake.status !== "reviewed");
    const byStudent = new Map();
    for (const mistake of open) {
      byStudent.set(mistake.ownerId, (byStudent.get(mistake.ownerId) || 0) + 1);
    }
    return {
      totalMistakes: mistakes.length,
      openMistakes: open.length,
      reviewedMistakes: mistakes.length - open.length,
      mostAffectedStudents: [...byStudent.entries()]
        .map(([studentId, count]) => ({ studentId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  buildCourseMasteryCoverage(mastery) {
    const studentIds = new Set(mastery.map((record) => record.ownerId));
    const concepts = new Set(mastery.map((record) => record.concept));
    return {
      trackedStudentCount: studentIds.size,
      conceptCount: concepts.size,
      averageMastery: average(mastery.map((record) => record.masteryScore)),
      weakRecordCount: mastery.filter((record) => record.masteryScore < 70).length
    };
  }

  collectCourseStudentIds(courseId) {
    const ids = new Set();
    const courseAssignments = this.assignments.findByFilters({ courseId });
    for (const assignment of courseAssignments) {
      for (const submission of this.submissions.findByAssignment(assignment.id)) {
        ids.add(submission.studentId);
      }
    }
    for (const session of this.practiceSessions.findByFilters({ courseId })) {
      ids.add(session.ownerId);
    }
    for (const mistake of this.mistakeItems.all().filter((item) => item.courseId === courseId)) {
      ids.add(mistake.ownerId);
    }
    for (const record of this.masteryRecords.all().filter((item) => item.courseId === courseId)) {
      ids.add(record.ownerId);
    }
    return [...ids];
  }
}

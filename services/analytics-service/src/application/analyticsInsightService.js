import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import {
  average,
  ensureTeacherRole,
  groupAverageBy,
  isTeacherRole,
  percentage,
  sortByCreatedDesc,
  sum,
  uniqueBy
} from "../domain/analytics.js";

const RISK_WEIGHTS = Object.freeze({
  LOW_TASK_COMPLETION: 22,
  LOW_ASSIGNMENT_COMPLETION: 25,
  MANY_OPEN_MISTAKES: 20,
  LOW_MASTERY: 20,
  LOW_ENGAGEMENT: 10,
  NO_RECENT_PRACTICE: 8
});

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalCourseId(filters = {}) {
  const courseId = String(filters.courseId || "").trim();
  return courseId || null;
}

function requireCourseId(courseId) {
  const value = String(courseId || "").trim();
  if (!value) {
    throw new ValidationError("courseId is required");
  }
  return value;
}

function normalizeDate(value) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) {
    return null;
  }
  return new Date(time).toISOString().slice(0, 10);
}

function countBy(items, selector) {
  const map = new Map();
  for (const item of items) {
    const key = selector(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].map(([key, count]) => ({ key, count }));
}

function latest(items, field = "updatedAt") {
  return toArray(items)
    .map((item) => item?.[field] || item?.createdAt)
    .filter(Boolean)
    .sort((a, b) => String(b).localeCompare(String(a)))[0] || null;
}

function collectStudentIdsFromAssessment(assessment, courseId = null) {
  const ids = new Set();
  const assignments = toArray(assessment.assignments).filter((assignment) => !courseId || assignment.courseId === courseId);
  const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
  for (const submission of toArray(assessment.submissions)) {
    if (!courseId || assignmentIds.has(submission.assignmentId)) {
      ids.add(submission.studentId);
    }
  }
  for (const session of toArray(assessment.practiceSessions)) {
    if (!courseId || session.courseId === courseId) {
      ids.add(session.ownerId);
    }
  }
  for (const mistake of toArray(assessment.mistakeItems)) {
    if (!courseId || mistake.courseId === courseId) {
      ids.add(mistake.ownerId);
    }
  }
  for (const record of toArray(assessment.masteryRecords)) {
    if (!courseId || record.courseId === courseId) {
      ids.add(record.ownerId);
    }
  }
  return [...ids];
}

function findCourse(learning, courseId) {
  return toArray(learning?.courses).find((course) => course.id === courseId) || null;
}

function canAccessCourse(user, learning, courseId) {
  if (isTeacherRole(user.role)) {
    return true;
  }
  return Boolean(findCourse(learning, courseId));
}

function riskLevel(score) {
  if (score >= 65) {
    return "high";
  }
  if (score >= 30) {
    return "medium";
  }
  return "low";
}

function bandByScore(score) {
  if (score >= 90) {
    return "excellent";
  }
  if (score >= 75) {
    return "good";
  }
  if (score >= 60) {
    return "pass";
  }
  return "risk";
}

export class AnalyticsInsightService {
  constructor({ identityClient, learningClient, assessmentClient, collaborationClient, aiClient }) {
    this.identityClient = identityClient;
    this.learningClient = learningClient;
    this.assessmentClient = assessmentClient;
    this.collaborationClient = collaborationClient;
    this.aiClient = aiClient;
  }

  async getLearningFunnel(user, filters = {}) {
    const courseId = optionalCourseId(filters);
    if (isTeacherRole(user.role)) {
      return this.getTeacherLearningFunnel(user, { courseId });
    }
    const [learning, assessment, context, collaboration] = await Promise.all([
      this.learningClient.getLearningContext(user.id),
      this.assessmentClient.getAnalyticsSummary(),
      this.assessmentClient.getContext(user.id),
      this.collaborationClient.getAnalyticsSummary()
    ]);
    if (courseId && !canAccessCourse(user, learning, courseId)) {
      throw new ForbiddenError("course analytics not accessible");
    }
    const profile = this.buildStudentFunnelRow({
      student: user,
      learning,
      context,
      assessment,
      collaboration,
      courseId
    });
    return {
      scope: "student",
      courseId,
      stages: this.buildFunnelStages([profile]),
      students: [profile],
      generatedAt: new Date().toISOString()
    };
  }

  async getTeacherLearningFunnel(user, { courseId = null } = {}) {
    ensureTeacherRole(user);
    const [users, assessment, collaboration] = await Promise.all([
      this.identityClient.listUsers(),
      this.assessmentClient.getAnalyticsSummary(),
      this.collaborationClient.getAnalyticsSummary()
    ]);
    const students = users.filter((item) => item.role === "student");
    const contexts = await Promise.all(students.map(async (student) => ({
      student,
      learning: await this.learningClient.getLearningContext(student.id),
      context: await this.assessmentClient.getContext(student.id)
    })));
    const rows = contexts
      .filter((item) => !courseId || this.studentHasCourseEvidence(item.learning, item.context, assessment, courseId))
      .map((item) => this.buildStudentFunnelRow({
        student: item.student,
        learning: item.learning,
        context: item.context,
        assessment,
        collaboration,
        courseId
      }));
    return {
      scope: "teacher",
      courseId,
      stages: this.buildFunnelStages(rows),
      dropOffs: this.buildFunnelDropOffs(rows),
      students: rows,
      generatedAt: new Date().toISOString()
    };
  }

  async getRiskBoard(user, filters = {}) {
    ensureTeacherRole(user);
    const courseId = optionalCourseId(filters);
    const [users, assessment, collaboration] = await Promise.all([
      this.identityClient.listUsers(),
      this.assessmentClient.getAnalyticsSummary(),
      this.collaborationClient.getAnalyticsSummary()
    ]);
    const students = users.filter((item) => item.role === "student");
    const rows = await Promise.all(students.map(async (student) => {
      const learning = await this.learningClient.getLearningContext(student.id);
      const context = await this.assessmentClient.getContext(student.id);
      if (courseId && !this.studentHasCourseEvidence(learning, context, assessment, courseId)) {
        return null;
      }
      const funnel = this.buildStudentFunnelRow({ student, learning, context, assessment, collaboration, courseId });
      return this.scoreStudentRisk({ student, learning, context, assessment, collaboration, funnel, courseId });
    }));
    const items = rows.filter(Boolean).sort((a, b) => b.score - a.score || a.studentId.localeCompare(b.studentId));
    return {
      courseId,
      totalStudents: items.length,
      summary: {
        high: items.filter((item) => item.level === "high").length,
        medium: items.filter((item) => item.level === "medium").length,
        low: items.filter((item) => item.level === "low").length
      },
      items,
      recommendedActions: this.buildRiskActions(items),
      generatedAt: new Date().toISOString()
    };
  }

  async getCourseDeepReport(user, courseId) {
    const resolvedCourseId = requireCourseId(courseId);
    const [requesterLearning, assessment, collaboration, aiHealth] = await Promise.all([
      this.learningClient.getLearningContext(user.id),
      this.assessmentClient.getAnalyticsSummary(),
      this.collaborationClient.getAnalyticsSummary(),
      this.aiClient.getProviderHealth()
    ]);
    if (!canAccessCourse(user, requesterLearning, resolvedCourseId)) {
      throw new ForbiddenError("course analytics not accessible");
    }
    const course = findCourse(requesterLearning, resolvedCourseId)
      || this.inferCourseFromAssessment(assessment, resolvedCourseId);
    if (!course) {
      throw new NotFoundError("course not found");
    }
    const assignments = toArray(assessment.assignments).filter((assignment) => assignment.courseId === resolvedCourseId);
    const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
    const submissions = toArray(assessment.submissions).filter((submission) => assignmentIds.has(submission.assignmentId));
    const submissionIds = new Set(submissions.map((submission) => submission.id));
    const grades = toArray(assessment.grades).filter((grade) => submissionIds.has(grade.submissionId));
    const sessions = toArray(assessment.practiceSessions).filter((session) => session.courseId === resolvedCourseId);
    const mistakes = toArray(assessment.mistakeItems).filter((mistake) => mistake.courseId === resolvedCourseId);
    const mastery = toArray(assessment.masteryRecords).filter((record) => record.courseId === resolvedCourseId);
    const courseReport = toArray(assessment.courseReports).find((report) => report.courseId === resolvedCourseId) || null;
    const studentIds = collectStudentIdsFromAssessment(assessment, resolvedCourseId);
    const studentRows = isTeacherRole(user.role)
      ? await Promise.all(studentIds.map((studentId) => this.buildCourseStudentRow(studentId, resolvedCourseId, assessment, collaboration)))
      : [];
    return {
      courseId: resolvedCourseId,
      courseTitle: course.title || resolvedCourseId,
      ai: {
        provider: aiHealth.provider || "unknown",
        status: aiHealth.status || "unknown"
      },
      assignments: this.buildAssignmentAnalytics(assignments, submissions, grades),
      grading: this.buildGradeAnalytics(grades),
      practice: this.buildPracticeAnalytics(sessions, mistakes),
      mastery: this.buildMasteryAnalytics(mastery),
      collaboration: this.buildCourseCollaborationAnalytics(collaboration, resolvedCourseId, assignmentIds),
      assessmentReport: courseReport,
      students: studentRows,
      generatedAt: new Date().toISOString()
    };
  }

  async getStudentProgressReport(requestUser, studentId) {
    if (!isTeacherRole(requestUser.role) && requestUser.id !== studentId) {
      throw new ForbiddenError("cannot inspect another student's progress");
    }
    const [profile, learning, assessmentDashboard, assessmentContext, assessment, collaboration] = await Promise.all([
      this.identityClient.getUserById(studentId),
      this.learningClient.getLearningContext(studentId),
      this.assessmentClient.getDashboard(studentId),
      this.assessmentClient.getContext(studentId),
      this.assessmentClient.getAnalyticsSummary(),
      this.collaborationClient.getAnalyticsSummary()
    ]);
    if (!profile) {
      throw new NotFoundError("student not found");
    }
    const assignments = this.matchAssignmentsForStudent(assessment, studentId);
    const grades = assignments.flatMap((row) => row.grades);
    const sessions = toArray(assessmentContext.practiceSessions);
    const mistakes = toArray(assessmentContext.mistakes);
    const mastery = toArray(assessmentContext.mastery);
    return {
      studentId,
      profile: {
        name: profile.name,
        role: profile.role
      },
      learning: this.buildLearningProgress(learning),
      assignments: this.buildStudentAssignmentProgress(assignments),
      grading: this.buildGradeAnalytics(grades),
      practice: this.buildPracticeAnalytics(sessions, mistakes),
      mastery: this.buildMasteryAnalytics(mastery),
      collaboration: this.buildStudentCollaborationAnalytics(collaboration, studentId),
      dashboard: assessmentDashboard,
      timeline: this.buildStudentTimeline({ learning, assignments, sessions, mistakes, collaboration, studentId }),
      nextFocus: this.buildStudentNextFocus({ learning, assignments, sessions, mistakes, mastery }),
      generatedAt: new Date().toISOString()
    };
  }

  async getEngagementReport(user, filters = {}) {
    const courseId = optionalCourseId(filters);
    const [learning, collaboration, assessment] = await Promise.all([
      this.learningClient.getLearningContext(user.id),
      this.collaborationClient.getAnalyticsSummary(),
      this.assessmentClient.getAnalyticsSummary()
    ]);
    if (courseId && !canAccessCourse(user, learning, courseId)) {
      throw new ForbiddenError("course analytics not accessible");
    }
    const events = this.filterCollaborationEvents(collaboration, {
      actorId: isTeacherRole(user.role) ? null : user.id,
      courseId,
      assessment
    });
    const messages = this.filterMessages(collaboration, {
      actorId: isTeacherRole(user.role) ? null : user.id,
      courseId
    });
    return {
      scope: isTeacherRole(user.role) ? "teacher" : "student",
      courseId,
      activityCount: events.length,
      messageCount: messages.length,
      dailyActivity: this.buildDailyHistogram([...events, ...messages]),
      channelMix: this.buildChannelMix(events, messages),
      topActors: this.buildTopActors(events, messages),
      roomActivity: this.buildRoomActivity(collaboration, messages, courseId),
      quietSignals: this.buildQuietSignals(events, messages),
      generatedAt: new Date().toISOString()
    };
  }

  buildStudentFunnelRow({ student, learning, context, assessment, collaboration, courseId }) {
    const assignments = courseId
      ? toArray(assessment.assignments).filter((assignment) => assignment.courseId === courseId)
      : toArray(assessment.assignments);
    const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
    const submissions = toArray(context.submissions).filter((submission) => !courseId || assignmentIds.has(submission.assignmentId));
    const sessions = toArray(context.practiceSessions).filter((session) => !courseId || session.courseId === courseId);
    const mistakes = toArray(context.mistakes).filter((mistake) => !courseId || mistake.courseId === courseId);
    const mastery = toArray(context.mastery).filter((record) => !courseId || record.courseId === courseId);
    const activity = toArray(collaboration.activityLogs).filter((event) => event.actorId === student.id);
    const messages = toArray(collaboration.messages).filter((message) => message.authorId === student.id);
    const taskCompletion = numberValue(learning.metrics?.completionRate);
    const assignmentCompletion = percentage(new Set(submissions.map((item) => item.assignmentId)).size, Math.max(assignments.length, 1));
    const masteryScore = mastery.length ? average(mastery.map((record) => record.masteryScore)) : 0;
    return {
      studentId: student.id,
      name: student.name,
      hasGoal: toArray(learning.goals).length > 0,
      taskCompletion,
      assignmentCompletion,
      submittedAssignments: submissions.length,
      practiceSessions: sessions.length,
      finishedPracticeSessions: sessions.filter((session) => session.status === "finished").length,
      openMistakes: mistakes.filter((mistake) => mistake.status !== "reviewed").length,
      masteryScore,
      collaborationEvents: activity.length + messages.length,
      lastActivityAt: latest([...activity, ...messages])
    };
  }

  buildFunnelStages(rows) {
    const total = rows.length;
    return [
      { key: "students", count: total, rate: 100 },
      { key: "has-goal", count: rows.filter((row) => row.hasGoal).length, rate: percentage(rows.filter((row) => row.hasGoal).length, total) },
      { key: "task-progress", count: rows.filter((row) => row.taskCompletion >= 50).length, rate: percentage(rows.filter((row) => row.taskCompletion >= 50).length, total) },
      { key: "assignment-submitted", count: rows.filter((row) => row.assignmentCompletion > 0).length, rate: percentage(rows.filter((row) => row.assignmentCompletion > 0).length, total) },
      { key: "practice-started", count: rows.filter((row) => row.practiceSessions > 0).length, rate: percentage(rows.filter((row) => row.practiceSessions > 0).length, total) },
      { key: "mastery-stable", count: rows.filter((row) => row.masteryScore >= 70).length, rate: percentage(rows.filter((row) => row.masteryScore >= 70).length, total) },
      { key: "collaboration-active", count: rows.filter((row) => row.collaborationEvents > 0).length, rate: percentage(rows.filter((row) => row.collaborationEvents > 0).length, total) }
    ];
  }

  buildFunnelDropOffs(rows) {
    const stages = this.buildFunnelStages(rows);
    return stages.slice(1).map((stage, index) => {
      const previous = stages[index];
      return {
        from: previous.key,
        to: stage.key,
        lost: Math.max(0, previous.count - stage.count),
        retainedRate: percentage(stage.count, Math.max(previous.count, 1))
      };
    });
  }

  studentHasCourseEvidence(learning, context, assessment, courseId) {
    if (findCourse(learning, courseId)) {
      return true;
    }
    const assignmentIds = new Set(toArray(assessment.assignments)
      .filter((assignment) => assignment.courseId === courseId)
      .map((assignment) => assignment.id));
    return [
      ...toArray(context.submissions).filter((submission) => assignmentIds.has(submission.assignmentId)),
      ...toArray(context.practiceSessions).filter((session) => session.courseId === courseId),
      ...toArray(context.mistakes).filter((mistake) => mistake.courseId === courseId),
      ...toArray(context.mastery).filter((record) => record.courseId === courseId)
    ].length > 0;
  }

  scoreStudentRisk({ student, learning, context, assessment, collaboration, funnel, courseId }) {
    const reasons = [];
    if (funnel.taskCompletion < 50) {
      reasons.push({ code: "low-task-completion", weight: RISK_WEIGHTS.LOW_TASK_COMPLETION });
    }
    if (funnel.assignmentCompletion < 60) {
      reasons.push({ code: "low-assignment-completion", weight: RISK_WEIGHTS.LOW_ASSIGNMENT_COMPLETION });
    }
    if (funnel.openMistakes >= 2) {
      reasons.push({ code: "many-open-mistakes", weight: RISK_WEIGHTS.MANY_OPEN_MISTAKES });
    }
    if (funnel.masteryScore > 0 && funnel.masteryScore < 65) {
      reasons.push({ code: "low-mastery", weight: RISK_WEIGHTS.LOW_MASTERY });
    }
    if (funnel.collaborationEvents === 0) {
      reasons.push({ code: "low-engagement", weight: RISK_WEIGHTS.LOW_ENGAGEMENT });
    }
    if (funnel.practiceSessions === 0) {
      reasons.push({ code: "no-recent-practice", weight: RISK_WEIGHTS.NO_RECENT_PRACTICE });
    }
    const score = Math.min(100, sum(reasons.map((reason) => reason.weight)));
    return {
      studentId: student.id,
      name: student.name,
      courseId,
      score,
      level: riskLevel(score),
      reasons,
      signals: {
        taskCompletion: funnel.taskCompletion,
        assignmentCompletion: funnel.assignmentCompletion,
        openMistakes: funnel.openMistakes,
        masteryScore: funnel.masteryScore,
        collaborationEvents: funnel.collaborationEvents,
        lastActivityAt: funnel.lastActivityAt
      }
    };
  }

  buildRiskActions(items) {
    const actions = [];
    if (items.some((item) => item.reasons.some((reason) => reason.code === "low-assignment-completion"))) {
      actions.push("Check missing submissions and send a targeted assignment reminder.");
    }
    if (items.some((item) => item.reasons.some((reason) => reason.code === "many-open-mistakes"))) {
      actions.push("Schedule a short mistake-review session for high-risk students.");
    }
    if (items.some((item) => item.reasons.some((reason) => reason.code === "low-engagement"))) {
      actions.push("Use collaboration rooms to trigger peer discussion for quiet students.");
    }
    if (!actions.length) {
      actions.push("Keep current rhythm and monitor the next assessment cycle.");
    }
    return actions;
  }

  inferCourseFromAssessment(assessment, courseId) {
    const assignment = toArray(assessment.assignments).find((item) => item.courseId === courseId);
    if (!assignment) {
      return null;
    }
    return {
      id: courseId,
      title: assignment.courseTitle || courseId
    };
  }

  buildAssignmentAnalytics(assignments, submissions, grades) {
    const rows = assignments.map((assignment) => {
      const assignmentSubmissions = submissions.filter((submission) => submission.assignmentId === assignment.id);
      const submissionIds = new Set(assignmentSubmissions.map((submission) => submission.id));
      const teacherGrades = grades.filter((grade) => submissionIds.has(grade.submissionId) && grade.source === "teacher");
      return {
        assignmentId: assignment.id,
        title: assignment.title,
        dueAt: assignment.dueAt,
        submissionCount: assignmentSubmissions.length,
        teacherGradeCount: teacherGrades.length,
        averageScore: average(teacherGrades.map((grade) => grade.score))
      };
    });
    return {
      published: assignments.length,
      submitted: submissions.length,
      graded: grades.filter((grade) => grade.source === "teacher").length,
      rows
    };
  }

  buildGradeAnalytics(grades) {
    const teacherGrades = grades.filter((grade) => grade.source === "teacher");
    const scores = teacherGrades.map((grade) => grade.score);
    return {
      gradeCount: teacherGrades.length,
      averageScore: average(scores),
      distribution: countBy(scores, bandByScore),
      aiGradeCount: grades.filter((grade) => grade.source === "ai").length,
      consistencySamples: this.buildGradeConsistencySamples(grades)
    };
  }

  buildGradeConsistencySamples(grades) {
    const bySubmission = new Map();
    for (const grade of grades) {
      const rows = bySubmission.get(grade.submissionId) || [];
      rows.push(grade);
      bySubmission.set(grade.submissionId, rows);
    }
    return [...bySubmission.entries()].map(([submissionId, rows]) => {
      const teacher = rows.find((grade) => grade.source === "teacher");
      const ai = rows.find((grade) => grade.source === "ai");
      return {
        submissionId,
        teacherScore: teacher?.score ?? null,
        aiScore: ai?.score ?? null,
        gap: teacher && ai ? Math.abs(teacher.score - ai.score) : null
      };
    }).filter((item) => item.gap !== null);
  }

  buildPracticeAnalytics(sessions, mistakes) {
    const finished = sessions.filter((session) => session.status === "finished");
    const openMistakes = mistakes.filter((mistake) => mistake.status !== "reviewed");
    return {
      sessionCount: sessions.length,
      finishedCount: finished.length,
      averageCorrectRate: average(finished.map((session) => session.correctRate)),
      openMistakes: openMistakes.length,
      reviewedMistakes: mistakes.length - openMistakes.length,
      lastPracticedAt: latest(sessions, "finishedAt")
    };
  }

  buildMasteryAnalytics(mastery) {
    const grouped = groupAverageBy(mastery, "concept", "masteryScore")
      .map((item) => ({
        concept: item.key,
        score: item.score,
        level: item.score >= 80 ? "strong" : item.score >= 60 ? "watch" : "weak"
      }))
      .sort((a, b) => a.score - b.score || a.concept.localeCompare(b.concept));
    return {
      averageMastery: average(mastery.map((record) => record.masteryScore)),
      conceptCount: grouped.length,
      weakConcepts: grouped.filter((item) => item.level === "weak"),
      concepts: grouped
    };
  }

  buildCourseCollaborationAnalytics(collaboration, courseId, assignmentIds) {
    const rooms = toArray(collaboration.rooms).filter((room) => room.courseId === courseId);
    const roomIds = new Set(rooms.map((room) => room.id));
    const activity = toArray(collaboration.activityLogs).filter((event) => {
      if (event.payload?.courseId === courseId) {
        return true;
      }
      if (assignmentIds.has(event.payload?.assignmentId)) {
        return true;
      }
      return roomIds.has(event.payload?.roomId);
    });
    const messages = toArray(collaboration.messages).filter((message) => roomIds.has(message.roomId));
    return {
      roomCount: rooms.length,
      activityCount: activity.length,
      messageCount: messages.length,
      dailyActivity: this.buildDailyHistogram([...activity, ...messages]),
      recentActivity: sortByCreatedDesc(activity).slice(0, 10)
    };
  }

  async buildCourseStudentRow(studentId, courseId, assessment, collaboration) {
    const [student, learning, context] = await Promise.all([
      this.identityClient.getUserById(studentId),
      this.learningClient.getLearningContext(studentId),
      this.assessmentClient.getContext(studentId)
    ]);
    const funnel = this.buildStudentFunnelRow({
      student: student || { id: studentId, name: studentId },
      learning,
      context,
      assessment,
      collaboration,
      courseId
    });
    return {
      studentId,
      name: student?.name || studentId,
      taskCompletion: funnel.taskCompletion,
      assignmentCompletion: funnel.assignmentCompletion,
      masteryScore: funnel.masteryScore,
      openMistakes: funnel.openMistakes,
      practiceSessions: funnel.practiceSessions
    };
  }

  matchAssignmentsForStudent(assessment, studentId) {
    return toArray(assessment.submissions)
      .filter((submission) => submission.studentId === studentId)
      .map((submission) => {
        const assignment = toArray(assessment.assignments).find((item) => item.id === submission.assignmentId) || null;
        const grades = toArray(assessment.grades).filter((grade) => grade.submissionId === submission.id);
        return { assignment, submission, grades };
      });
  }

  buildLearningProgress(learning) {
    const goals = toArray(learning.goals);
    const tasks = toArray(learning.tasks);
    const notes = toArray(learning.notes);
    return {
      metrics: learning.metrics || {},
      goalCount: goals.length,
      activeGoalCount: goals.filter((goal) => goal.status !== "completed").length,
      taskCount: tasks.length,
      completedTaskCount: tasks.filter((task) => task.status === "completed").length,
      noteCount: notes.length,
      lastLearningAt: latest([...goals, ...tasks, ...notes])
    };
  }

  buildStudentAssignmentProgress(rows) {
    const submitted = rows.filter((row) => row.submission);
    const teacherGrades = rows.flatMap((row) => row.grades).filter((grade) => grade.source === "teacher");
    return {
      submittedCount: submitted.length,
      gradedCount: teacherGrades.length,
      averageScore: average(teacherGrades.map((grade) => grade.score)),
      rows: rows.map((row) => ({
        assignmentId: row.assignment?.id || row.submission.assignmentId,
        title: row.assignment?.title || row.submission.assignmentId,
        submittedAt: row.submission.submittedAt,
        teacherScore: row.grades.find((grade) => grade.source === "teacher")?.score ?? null,
        aiScore: row.grades.find((grade) => grade.source === "ai")?.score ?? null
      }))
    };
  }

  buildStudentCollaborationAnalytics(collaboration, studentId) {
    const activity = toArray(collaboration.activityLogs).filter((event) => event.actorId === studentId);
    const messages = toArray(collaboration.messages).filter((message) => message.authorId === studentId);
    return {
      activityCount: activity.length,
      messageCount: messages.length,
      dailyActivity: this.buildDailyHistogram([...activity, ...messages]),
      lastCollaborationAt: latest([...activity, ...messages])
    };
  }

  buildStudentTimeline({ learning, assignments, sessions, mistakes, collaboration, studentId }) {
    const events = [
      ...toArray(learning.tasks).map((task) => ({
        type: `task:${task.status || "unknown"}`,
        id: task.id,
        at: task.updatedAt || task.createdAt,
        summary: task.title
      })),
      ...assignments.map((row) => ({
        type: "submission",
        id: row.submission.id,
        at: row.submission.submittedAt,
        summary: row.assignment?.title || row.submission.assignmentId
      })),
      ...sessions.map((session) => ({
        type: `practice:${session.status}`,
        id: session.id,
        at: session.finishedAt || session.startedAt,
        summary: `correctRate=${session.correctRate}`
      })),
      ...mistakes.map((mistake) => ({
        type: `mistake:${mistake.status}`,
        id: mistake.id,
        at: mistake.updatedAt || mistake.createdAt,
        summary: mistake.questionId
      })),
      ...toArray(collaboration.activityLogs)
        .filter((event) => event.actorId === studentId)
        .map((event) => ({
          type: `activity:${event.type}`,
          id: event.id,
          at: event.createdAt,
          summary: event.summary
        }))
    ];
    return sortByCreatedDesc(events, "at").slice(0, 20);
  }

  buildStudentNextFocus({ learning, assignments, sessions, mistakes, mastery }) {
    const actions = [];
    const metrics = learning.metrics || {};
    if (numberValue(metrics.completionRate) < 70) {
      actions.push("Finish one pending learning task before starting new material.");
    }
    if (!assignments.length) {
      actions.push("Submit at least one assignment artifact to make assessment progress visible.");
    }
    if (mistakes.filter((mistake) => mistake.status !== "reviewed").length) {
      actions.push("Review open mistakes and add correction notes.");
    }
    const weakest = [...mastery].sort((a, b) => a.masteryScore - b.masteryScore)[0];
    if (weakest) {
      actions.push(`Practice weak concept: ${weakest.concept}.`);
    }
    if (!sessions.length) {
      actions.push("Start a short practice session to create objective mastery evidence.");
    }
    if (!actions.length) {
      actions.push("Keep current progress and do a mixed review next.");
    }
    return actions.slice(0, 4);
  }

  filterCollaborationEvents(collaboration, { actorId = null, courseId = null, assessment = {} } = {}) {
    const assignmentIds = new Set(toArray(assessment.assignments)
      .filter((assignment) => !courseId || assignment.courseId === courseId)
      .map((assignment) => assignment.id));
    const roomIds = new Set(toArray(collaboration.rooms)
      .filter((room) => !courseId || room.courseId === courseId)
      .map((room) => room.id));
    return toArray(collaboration.activityLogs).filter((event) => {
      if (actorId && event.actorId !== actorId) {
        return false;
      }
      if (!courseId) {
        return true;
      }
      return event.payload?.courseId === courseId
        || assignmentIds.has(event.payload?.assignmentId)
        || roomIds.has(event.payload?.roomId);
    });
  }

  filterMessages(collaboration, { actorId = null, courseId = null } = {}) {
    const roomIds = new Set(toArray(collaboration.rooms)
      .filter((room) => !courseId || room.courseId === courseId)
      .map((room) => room.id));
    return toArray(collaboration.messages).filter((message) => {
      if (actorId && message.authorId !== actorId) {
        return false;
      }
      return !courseId || roomIds.has(message.roomId);
    });
  }

  buildDailyHistogram(items) {
    const rows = countBy(items.filter((item) => normalizeDate(item.createdAt || item.at)), (item) => normalizeDate(item.createdAt || item.at))
      .sort((a, b) => String(a.key).localeCompare(String(b.key)));
    return rows.map((row) => ({
      date: row.key,
      count: row.count
    }));
  }

  buildChannelMix(events, messages) {
    const eventTypes = countBy(events, (event) => event.type || "activity");
    return [
      ...eventTypes.map((item) => ({ channel: item.key, count: item.count })),
      { channel: "message", count: messages.length }
    ].filter((item) => item.count > 0);
  }

  buildTopActors(events, messages) {
    const rows = [
      ...events.map((event) => event.actorId).filter(Boolean),
      ...messages.map((message) => message.authorId).filter(Boolean)
    ];
    return countBy(rows, (id) => id)
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
      .slice(0, 10)
      .map((item) => ({ actorId: item.key, count: item.count }));
  }

  buildRoomActivity(collaboration, messages, courseId = null) {
    const rooms = toArray(collaboration.rooms).filter((room) => !courseId || room.courseId === courseId);
    return rooms.map((room) => ({
      roomId: room.id,
      title: room.title,
      courseId: room.courseId,
      messageCount: messages.filter((message) => message.roomId === room.id).length
    })).sort((a, b) => b.messageCount - a.messageCount);
  }

  buildQuietSignals(events, messages) {
    const activityCount = events.length + messages.length;
    const signals = [];
    if (activityCount === 0) {
      signals.push("No collaboration activity is visible in the selected scope.");
    }
    if (messages.length === 0) {
      signals.push("No discussion message was found in the selected scope.");
    }
    if (events.length > 0 && messages.length === 0) {
      signals.push("Operational events exist, but discussion is still quiet.");
    }
    if (!signals.length) {
      signals.push("Engagement has both event and message evidence.");
    }
    return signals;
  }
}

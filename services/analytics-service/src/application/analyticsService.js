import { ForbiddenError, NotFoundError } from "../../../../shared/http/errors.js";
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

function findCourse(courses, courseId) {
  return (courses || []).find((course) => course.id === courseId) || null;
}

function summarizeAssessmentDashboard(dashboard = {}, context = {}) {
  const assignments = dashboard.assignments || [];
  const submissions = context.submissions || [];
  const practiceSessions = context.practiceSessions || [];
  const mistakes = context.mistakes || [];
  const mastery = context.mastery || [];

  return {
    assignmentCount: assignments.length,
    submissionCount: submissions.length,
    gradedCount: submissions.filter((submission) => submission.grade || submission.grades?.length).length,
    practiceCount: practiceSessions.length,
    mistakeCount: mistakes.filter((item) => item.status !== "reviewed").length,
    masteryScore: mastery.length ? average(mastery.map((item) => item.masteryScore)) : dashboard.metrics?.masteryScore || 0
  };
}

function buildRecommendations({ learning, assessment, dashboard }) {
  const recommendations = [];
  const assignments = dashboard.assignments || [];
  const dueAssignments = assignments
    .filter((item) => !item.submitted && item.dueAt)
    .sort((left, right) => String(left.dueAt).localeCompare(String(right.dueAt)));

  if (dueAssignments.length) {
    recommendations.push("优先完成即将截止但尚未提交的作业。");
  }
  if ((assessment.mistakeCount || 0) > 0) {
    recommendations.push("先复习仍处于开放状态的错题。");
  }
  if ((assessment.masteryScore || 0) < 70) {
    recommendations.push("围绕掌握度较低的知识点追加一次针对性练习。");
  }
  if ((learning.noteCount || 0) < 2) {
    recommendations.push("补充至少一条课程笔记，方便后续 AI 总结与复习。");
  }
  if (!recommendations.length) {
    recommendations.push("继续保持当前节奏，优先推进剩余任务收尾。");
  }
  return recommendations.slice(0, 3);
}

function buildStudentRisk(student) {
  const reasons = [];
  if ((student.learning?.completionRate || 0) < 50) {
    reasons.push("任务完成率偏低");
  }
  if ((student.assessment?.mistakeCount || 0) >= 2) {
    reasons.push("开放错题较多");
  }
  if ((student.assessment?.masteryScore || 0) < 60) {
    reasons.push("掌握度偏低");
  }
  const pendingAssignments = (student.assignments || []).filter((item) => !item.submitted).length;
  if (pendingAssignments > 0) {
    reasons.push("存在未提交作业");
  }
  if (!reasons.length) {
    return null;
  }
  return {
    studentId: student.studentId,
    name: student.profile.name,
    reasons
  };
}

export class AnalyticsService {
  constructor({ identityClient, learningClient, assessmentClient, collaborationClient, aiClient }) {
    this.identityClient = identityClient;
    this.learningClient = learningClient;
    this.assessmentClient = assessmentClient;
    this.collaborationClient = collaborationClient;
    this.aiClient = aiClient;
  }

  async getOverview(user) {
    if (isTeacherRole(user.role)) {
      return this.getTeacherOverview(user);
    }

    const [learning, assessmentDashboard, assessmentContext, collaboration, aiHealth] = await Promise.all([
      this.learningClient.getLearningContext(user.id),
      this.assessmentClient.getDashboard(user.id),
      this.assessmentClient.getContext(user.id),
      this.collaborationClient.getAnalyticsSummary(),
      this.aiClient.getProviderHealth()
    ]);

    return {
      role: user.role,
      learning: learning.metrics || {
        activeGoals: 0,
        completionRate: 0,
        studyMinutes: 0,
        noteCount: 0
      },
      assessment: summarizeAssessmentDashboard(assessmentDashboard, assessmentContext),
      collaboration: {
        activityCount: (collaboration.activityLogs || []).filter((item) => item.actorId === user.id).length,
        messageCount: (collaboration.messages || []).filter((item) => item.authorId === user.id).length
      },
      ai: {
        provider: aiHealth.provider || "unknown",
        status: aiHealth.status || "unknown"
      }
    };
  }

  async getCourseAnalytics(user, courseId) {
    const [users, assessment, collaboration, requesterLearning] = await Promise.all([
      this.identityClient.listUsers(),
      this.assessmentClient.getAnalyticsSummary(),
      this.collaborationClient.getAnalyticsSummary(),
      this.learningClient.getLearningContext(user.id)
    ]);
    const course = findCourse(requesterLearning.courses || [], courseId);
    if (!course) {
      throw new NotFoundError("课程不存在。");
    }

    if (!isTeacherRole(user.role)) {
      const ownContext = await this.assessmentClient.getContext(user.id);
      const joined = [
        ...(requesterLearning.goals || []),
        ...(requesterLearning.notes || []),
        ...(ownContext.submissions || []),
        ...(ownContext.practiceSessions || []),
        ...(ownContext.mistakes || []),
        ...(ownContext.mastery || [])
      ].some((item) => item.courseId === courseId);
      if (!joined) {
        throw new ForbiddenError("当前课程统计不可访问。");
      }
    }

    const studentIds = users.filter((item) => item.role === "student").map((item) => item.id);
    const studentContexts = await Promise.all(studentIds.map((studentId) => this.assessmentClient.getContext(studentId)));
    const courseSubmissions = (assessment.submissions || []).filter((item) => {
      const assignment = (assessment.assignments || []).find((candidate) => candidate.id === item.assignmentId);
      return assignment?.courseId === courseId;
    });
    const assignmentIds = new Set((assessment.assignments || []).filter((item) => item.courseId === courseId).map((item) => item.id));
    const submissionIds = new Set(courseSubmissions.map((item) => item.id));
    const courseGrades = (assessment.grades || []).filter((item) => submissionIds.has(item.submissionId) && item.source === "teacher");
    const coursePractice = (assessment.practiceSessions || []).filter((item) => item.courseId === courseId);
    const courseMistakes = (assessment.mistakeItems || []).filter((item) => item.courseId === courseId && item.status !== "reviewed");
    const courseMastery = (assessment.masteryRecords || []).filter((item) => item.courseId === courseId);
    const mastery = groupAverageBy(courseMastery, "concept", "masteryScore")
      .map((item) => ({ concept: item.key, score: item.score }))
      .sort((left, right) => left.concept.localeCompare(right.concept));
    const activity = sortByCreatedDesc(
      (collaboration.activityLogs || []).filter((item) => {
        if (item.payload?.courseId === courseId) {
          return true;
        }
        if (assignmentIds.has(item.payload?.assignmentId)) {
          return true;
        }
        if (item.payload?.roomId) {
          const room = (collaboration.rooms || []).find((candidate) => candidate.id === item.payload.roomId);
          return room?.courseId === courseId;
        }
        return false;
      })
    ).slice(0, 8);

    return {
      courseId,
      courseTitle: course.title,
      assignments: {
        published: assignmentIds.size,
        submitted: courseSubmissions.length,
        graded: courseGrades.length,
        completionRate: percentage(courseSubmissions.length, studentContexts.length * Math.max(assignmentIds.size, 1))
      },
      practice: {
        sessions: coursePractice.length,
        averageCorrectRate: average(coursePractice.map((item) => item.correctRate)),
        openMistakes: courseMistakes.length
      },
      mastery,
      activity
    };
  }

  async getStudentAnalytics(requestUser, studentId) {
    if (!isTeacherRole(requestUser.role) && requestUser.id !== studentId) {
      throw new ForbiddenError("不能查看其他学生的统计画像。");
    }

    const [profile, learning, assessmentDashboard, assessmentContext, collaboration] = await Promise.all([
      this.identityClient.getUserById(studentId),
      this.learningClient.getLearningContext(studentId),
      this.assessmentClient.getDashboard(studentId),
      this.assessmentClient.getContext(studentId),
      this.collaborationClient.getAnalyticsSummary()
    ]);
    if (!profile) {
      throw new NotFoundError("学生不存在。");
    }

    const assessment = summarizeAssessmentDashboard(assessmentDashboard, assessmentContext);
    return {
      studentId,
      profile: {
        name: profile.name,
        role: profile.role
      },
      learning: {
        ...(learning.metrics || {}),
        goals: learning.goals || [],
        tasks: learning.tasks || [],
        notes: learning.notes || []
      },
      assessment: {
        ...assessment,
        assignments: assessmentDashboard.assignments || [],
        practiceSessions: assessmentContext.practiceSessions || [],
        mistakes: assessmentContext.mistakes || [],
        mastery: assessmentContext.mastery || []
      },
      collaboration: {
        activityCount: (collaboration.activityLogs || []).filter((item) => item.actorId === studentId).length,
        messageCount: (collaboration.messages || []).filter((item) => item.authorId === studentId).length
      },
      recommendations: buildRecommendations({
        learning: learning.metrics || {},
        assessment,
        dashboard: assessmentDashboard
      })
    };
  }

  async getTeacherOverview(user) {
    ensureTeacherRole(user);
    const [users, assessment, collaboration, aiHealth] = await Promise.all([
      this.identityClient.listUsers(),
      this.assessmentClient.getAnalyticsSummary(),
      this.collaborationClient.getAnalyticsSummary(),
      this.aiClient.getProviderHealth()
    ]);
    const students = users.filter((item) => item.role === "student");
    const learningContexts = await Promise.all(students.map((student) => this.learningClient.getLearningContext(student.id)));

    return {
      role: user.role,
      learning: {
        activeGoals: sum(learningContexts.map((item) => item.metrics?.activeGoals || 0)),
        completionRate: average(learningContexts.map((item) => item.metrics?.completionRate || 0)),
        studyMinutes: sum(learningContexts.map((item) => item.metrics?.studyMinutes || 0)),
        noteCount: sum(learningContexts.map((item) => item.metrics?.noteCount || 0))
      },
      assessment: {
        assignmentCount: (assessment.assignments || []).length,
        submissionCount: (assessment.submissions || []).length,
        gradedCount: (assessment.grades || []).filter((item) => item.source === "teacher").length,
        practiceCount: (assessment.practiceSessions || []).length,
        mistakeCount: (assessment.mistakeItems || []).filter((item) => item.status !== "reviewed").length,
        masteryScore: average((assessment.masteryRecords || []).map((item) => item.masteryScore))
      },
      collaboration: {
        activityCount: (collaboration.activityLogs || []).length,
        messageCount: (collaboration.messages || []).length
      },
      ai: {
        provider: aiHealth.provider || "unknown",
        status: aiHealth.status || "unknown"
      }
    };
  }

  async getTeacherAnalytics(user) {
    ensureTeacherRole(user);

    const [users, assessment, collaboration, ownLearning] = await Promise.all([
      this.identityClient.listUsers(),
      this.assessmentClient.getAnalyticsSummary(),
      this.collaborationClient.getAnalyticsSummary(),
      this.learningClient.getLearningContext(user.id)
    ]);
    const studentUsers = users.filter((item) => item.role === "student");
    const courseList = uniqueBy(ownLearning.courses || [], (item) => item.id);
    const studentAnalytics = await Promise.all(studentUsers.map((student) => this.getStudentAnalytics(user, student.id)));
    const courseAnalytics = await Promise.all(courseList.map((course) => this.getCourseAnalytics(user, course.id)));
    const assignments = (assessment.assignments || []).map((assignment) => {
      const submissions = (assessment.submissions || []).filter((item) => item.assignmentId === assignment.id);
      const graded = (assessment.grades || []).filter((item) => {
        if (item.source !== "teacher") {
          return false;
        }
        return submissions.some((submission) => submission.id === item.submissionId);
      });
      return {
        id: assignment.id,
        title: assignment.title,
        courseId: assignment.courseId,
        dueAt: assignment.dueAt,
        submissionCount: submissions.length,
        gradedCount: graded.length,
        averageScore: average(graded.map((item) => item.score))
      };
    });

    return {
      courses: courseAnalytics,
      students: studentAnalytics.map((student) => ({
        studentId: student.studentId,
        name: student.profile.name,
        learning: {
          activeGoals: student.learning.activeGoals || 0,
          completionRate: student.learning.completionRate || 0,
          studyMinutes: student.learning.studyMinutes || 0
        },
        assessment: {
          assignmentCount: student.assessment.assignmentCount || 0,
          mistakeCount: student.assessment.mistakeCount || 0,
          masteryScore: student.assessment.masteryScore || 0
        }
      })),
      assignments,
      riskStudents: studentAnalytics.map((student) => ({
        ...student,
        assignments: student.assessment.assignments || []
      })).map(buildStudentRisk).filter(Boolean),
      recentActivity: sortByCreatedDesc(collaboration.activityLogs || []).slice(0, 12)
    };
  }
}

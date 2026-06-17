import { ForbiddenError, NotFoundError } from "../../../../shared/http/errors.js";
import {
  asMetric,
  asSection,
  asTable,
  average,
  compactDate,
  countBy,
  createReport,
  exportReport,
  groupBy,
  isTeacherRole,
  percentage,
  reportId,
  sortDesc
} from "../domain/report.js";

function byId(items = []) {
  return new Map(items.map((item) => [item.id, item]));
}

function matchCourse(item, courseId) {
  return !courseId || item?.courseId === courseId;
}

function userName(users = [], id = "") {
  return users.find((user) => user.id === id)?.name || id || "-";
}

function take(items = [], size = 8) {
  return items.slice(0, size);
}

function stringifyExport(report, format) {
  const exported = exportReport(report, format);
  return exported ? { report, export: exported } : { report };
}

function assignmentForSubmission(assessment, submission) {
  return (assessment.assignments || []).find((assignment) => assignment.id === submission.assignmentId) || null;
}

function scoreForSubmission(assessment, submissionId) {
  const teacherGrade = (assessment.grades || []).find((grade) => grade.submissionId === submissionId && grade.source === "teacher");
  const anyGrade = (assessment.grades || []).find((grade) => grade.submissionId === submissionId);
  return teacherGrade?.score ?? anyGrade?.score ?? "";
}

function summarizeCollaboration(collaboration = {}, userId = "", courseId = "") {
  const rooms = (collaboration.rooms || []).filter((room) => matchCourse(room, courseId));
  const roomIds = new Set(rooms.map((room) => room.id));
  const messages = (collaboration.messages || []).filter((message) => (!courseId || roomIds.has(message.roomId)) && (!userId || message.authorId === userId));
  const replies = (collaboration.replies || []).filter((reply) => (!courseId || roomIds.has(reply.roomId)) && (!userId || reply.authorId === userId));
  const tasks = (collaboration.tasks || []).filter((task) => (!courseId || roomIds.has(task.roomId)) && (!userId || task.assigneeId === userId || task.createdBy === userId));
  const decisions = (collaboration.decisions || []).filter((decision) => !courseId || roomIds.has(decision.roomId));
  const checklist = (collaboration.checklist || []).filter((item) => (!courseId || roomIds.has(item.roomId)) && (!userId || item.ownerId === userId));
  return {
    rooms,
    messages,
    replies,
    tasks,
    decisions,
    checklist,
    messageCount: messages.length + replies.length,
    openTaskCount: tasks.filter((task) => task.status !== "done" && task.status !== "archived").length,
    doneTaskCount: tasks.filter((task) => task.status === "done").length,
    acceptedDecisionCount: decisions.filter((decision) => decision.status === "accepted").length,
    openChecklistCount: checklist.filter((item) => item.status !== "done" && item.status !== "archived").length
  };
}

function buildRecommendationSet({ learning, assessmentContext, collaborationSummary }) {
  const recommendations = [];
  const openMistakes = (assessmentContext.mistakes || []).filter((item) => item.status !== "reviewed");
  const activeGoals = (learning.goals || []).filter((goal) => goal.status !== "done" && goal.status !== "archived");
  const todoTasks = (learning.tasks || []).filter((task) => task.status !== "done");
  if (openMistakes.length) {
    recommendations.push(`Review ${openMistakes.length} open mistake item(s) before the next practice session.`);
  }
  if (todoTasks.length) {
    recommendations.push(`Close ${Math.min(todoTasks.length, 3)} high-value study task(s) linked to active goals.`);
  }
  if (collaborationSummary.openTaskCount) {
    recommendations.push(`Resolve ${collaborationSummary.openTaskCount} collaboration task(s) to keep team work traceable.`);
  }
  if (!activeGoals.length) {
    recommendations.push("Create a concrete learning goal for the coming week.");
  }
  if (!recommendations.length) {
    recommendations.push("Maintain the current pace and collect evidence for the final course design report.");
  }
  return recommendations.slice(0, 5);
}

export class ReportService {
  constructor({ identityClient, learningClient, assessmentClient, collaborationClient, aiClient }) {
    this.identityClient = identityClient;
    this.learningClient = learningClient;
    this.assessmentClient = assessmentClient;
    this.collaborationClient = collaborationClient;
    this.aiClient = aiClient;
  }

  catalog(user) {
    const teacher = isTeacherRole(user.role);
    return {
      reports: [
        { key: "student-weekly", title: "Student Learning Weekly Report", roles: ["student", "teacher", "admin"], formats: ["json", "markdown", "html", "csv"] },
        { key: "mistake-review", title: "Mistake Review Report", roles: ["student", "teacher", "admin"], formats: ["json", "markdown", "html", "csv"] },
        { key: "ai-usage", title: "AI Usage Report", roles: ["student", "teacher", "admin"], formats: ["json", "markdown", "html", "csv"] },
        ...(teacher ? [
          { key: "course-weekly", title: "Teacher Course Weekly Report", roles: ["teacher", "admin"], formats: ["json", "markdown", "html", "csv"] },
          { key: "assignment-grading", title: "Assignment Grading Report", roles: ["teacher", "admin"], formats: ["json", "markdown", "html", "csv"] }
        ] : [])
      ]
    };
  }

  async buildStudentWeeklyReport(user, query = {}) {
    const targetUserId = query.studentId || user.id;
    if (!isTeacherRole(user.role) && targetUserId !== user.id) {
      throw new ForbiddenError("Cannot inspect another student's weekly report.");
    }
    const [profile, learning, assessmentDashboard, assessmentContext, collaboration] = await Promise.all([
      this.identityClient.getUserById(targetUserId),
      this.learningClient.getContext(targetUserId),
      this.assessmentClient.getDashboard(targetUserId),
      this.assessmentClient.getContext(targetUserId),
      this.collaborationClient.getAnalyticsSummary()
    ]);
    if (!profile) {
      throw new NotFoundError("Student not found.");
    }
    const courseId = query.courseId || learning.courses?.[0]?.id || "";
    const course = (learning.courses || []).find((item) => item.id === courseId) || learning.courses?.[0] || {};
    const assignments = (assessmentDashboard.assignments || []).filter((assignment) => matchCourse(assignment, courseId));
    const submissions = (assessmentContext.submissions || []).filter((submission) => {
      const assignment = assignmentForSubmission({ assignments }, submission);
      return !courseId || assignment?.courseId === courseId;
    });
    const practice = (assessmentContext.practiceSessions || []).filter((session) => matchCourse(session, courseId));
    const mistakes = (assessmentContext.mistakes || []).filter((mistake) => matchCourse(mistake, courseId));
    const mastery = (assessmentContext.mastery || []).filter((record) => matchCourse(record, courseId));
    const collaborationSummary = summarizeCollaboration(collaboration, targetUserId, courseId);
    const taskRows = (learning.tasks || []).map((task) => ({
      title: task.title,
      status: task.status,
      dueDate: compactDate(task.dueDate),
      estimateMinutes: task.estimateMinutes || 0
    }));
    const report = createReport({
      id: reportId("student_weekly"),
      type: "student-weekly",
      title: `${profile.name || targetUserId} Weekly Learning Report`,
      scope: { studentId: targetUserId, courseId, courseTitle: course.title || courseId },
      summary: `Weekly report for ${profile.name || targetUserId}, covering learning goals, assignments, practice, mistakes, mastery, and collaboration evidence.`,
      metrics: [
        asMetric("Active goals", (learning.goals || []).filter((goal) => goal.status !== "done").length),
        asMetric("Learning completion", `${learning.metrics?.completionRate ?? 0}%`),
        asMetric("Submitted assignments", `${submissions.length}/${assignments.length}`),
        asMetric("Practice sessions", practice.length),
        asMetric("Open mistakes", mistakes.filter((item) => item.status !== "reviewed").length),
        asMetric("Average mastery", average(mastery.map((item) => item.masteryScore))),
        asMetric("Collaboration messages", collaborationSummary.messageCount),
        asMetric("Open team tasks", collaborationSummary.openTaskCount)
      ],
      sections: [
        asSection("Learning Progress", `The student has ${(learning.goals || []).length} goal(s), ${(learning.tasks || []).length} task(s), and ${learning.metrics?.studyMinutes || 0} recorded study minutes.`, take((learning.goals || []).map((goal) => `${goal.title} (${goal.progress || 0}%)`), 5)),
        asSection("Assessment Progress", `Assignments submitted: ${submissions.length}; practice sessions: ${practice.length}; open mistake items: ${mistakes.filter((item) => item.status !== "reviewed").length}.`, take(mistakes.map((mistake) => `${mistake.questionId || mistake.id} - ${mistake.status}`), 5)),
        asSection("Team Collaboration", `The report found ${collaborationSummary.messageCount} discussion contribution(s), ${collaborationSummary.doneTaskCount} completed collaboration task(s), and ${collaborationSummary.acceptedDecisionCount} accepted decision(s).`, take(collaborationSummary.tasks.map((task) => `${task.title} (${task.status})`), 6))
      ],
      tables: [
        asTable("Study Tasks", [
          { key: "title", label: "Task" },
          { key: "status", label: "Status" },
          { key: "dueDate", label: "Due" },
          { key: "estimateMinutes", label: "Minutes" }
        ], taskRows),
        asTable("Assignment Submissions", [
          { key: "assignmentId", label: "Assignment" },
          { key: "status", label: "Status" },
          { key: "submittedAt", label: "Submitted" }
        ], submissions.map((submission) => ({
          assignmentId: submission.assignmentId,
          status: submission.status,
          submittedAt: compactDate(submission.submittedAt)
        })))
      ],
      recommendations: buildRecommendationSet({ learning, assessmentContext, collaborationSummary }),
      evidence: [
        "learning-service internal learning context",
        "assessment-service internal assessment context and dashboard",
        "collaboration-service internal analytics snapshot"
      ]
    });
    return stringifyExport(report, query.format);
  }

  async buildTeacherCourseWeeklyReport(user, query = {}) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("Teacher course reports require teacher or admin role.");
    }
    const [users, assessment, collaboration, teacherLearning, aiHealth] = await Promise.all([
      this.identityClient.listUsers(),
      this.assessmentClient.getAnalyticsSummary(),
      this.collaborationClient.getAnalyticsSummary(),
      this.learningClient.getContext(user.id),
      this.aiClient.getProviderHealth()
    ]);
    const courseId = query.courseId || teacherLearning.courses?.[0]?.id || "";
    const course = (teacherLearning.courses || []).find((item) => item.id === courseId) || { id: courseId, title: courseId };
    const assignments = (assessment.assignments || []).filter((assignment) => matchCourse(assignment, courseId));
    const assignmentIds = new Set(assignments.map((assignment) => assignment.id));
    const submissions = (assessment.submissions || []).filter((submission) => assignmentIds.has(submission.assignmentId));
    const submissionIds = new Set(submissions.map((submission) => submission.id));
    const grades = (assessment.grades || []).filter((grade) => submissionIds.has(grade.submissionId));
    const practice = (assessment.practiceSessions || []).filter((session) => matchCourse(session, courseId));
    const mistakes = (assessment.mistakeItems || []).filter((mistake) => matchCourse(mistake, courseId));
    const mastery = (assessment.masteryRecords || []).filter((record) => matchCourse(record, courseId));
    const collaborationSummary = summarizeCollaboration(collaboration, "", courseId);
    const studentIds = users.filter((candidate) => candidate.role === "student").map((candidate) => candidate.id);
    const submissionByStudent = countBy(submissions, "studentId");
    const studentRows = studentIds.map((studentId) => {
      const ownSubmissions = submissions.filter((submission) => submission.studentId === studentId);
      const ownMistakes = mistakes.filter((mistake) => mistake.ownerId === studentId && mistake.status !== "reviewed");
      return {
        student: userName(users, studentId),
        submissions: ownSubmissions.length,
        openMistakes: ownMistakes.length,
        completionRate: `${percentage(ownSubmissions.length, assignments.length || 1)}%`
      };
    });
    const report = createReport({
      id: reportId("course_weekly"),
      type: "course-weekly",
      title: `${course.title || courseId} Teacher Weekly Report`,
      scope: { courseId, courseTitle: course.title || courseId },
      summary: `Weekly course report with assignment progress, grading throughput, practice engagement, collaboration activity, and AI provider status.`,
      metrics: [
        asMetric("Students", studentIds.length),
        asMetric("Assignments", assignments.length),
        asMetric("Submissions", submissions.length),
        asMetric("Graded items", grades.length),
        asMetric("Practice sessions", practice.length),
        asMetric("Open mistakes", mistakes.filter((item) => item.status !== "reviewed").length),
        asMetric("Average mastery", average(mastery.map((item) => item.masteryScore))),
        asMetric("Collaboration rooms", collaborationSummary.rooms.length),
        asMetric("AI provider", aiHealth.provider || "unknown", aiHealth.status || "unknown")
      ],
      sections: [
        asSection("Teaching Operations", `The course currently has ${assignments.length} assignment(s), ${submissions.length} submission(s), and ${grades.length} grading record(s).`, assignments.map((assignment) => `${assignment.title} (${assignment.status})`)),
        asSection("Practice and Mastery", `Practice sessions: ${practice.length}; average correct rate: ${average(practice.map((session) => session.correctRate))}%; average mastery: ${average(mastery.map((record) => record.masteryScore))}.`, countBy(mastery, "concept").map((item) => `${item.name}: ${item.count} record(s)`)),
        asSection("Collaboration Evidence", `Rooms: ${collaborationSummary.rooms.length}; messages: ${collaborationSummary.messageCount}; accepted decisions: ${collaborationSummary.acceptedDecisionCount}.`, take(collaborationSummary.decisions.map((decision) => `${decision.title} (${decision.status})`), 6))
      ],
      tables: [
        asTable("Student Progress", [
          { key: "student", label: "Student" },
          { key: "submissions", label: "Submissions" },
          { key: "completionRate", label: "Completion" },
          { key: "openMistakes", label: "Open Mistakes" }
        ], studentRows),
        asTable("Submission Count By Student", [
          { key: "name", label: "Student ID" },
          { key: "count", label: "Submissions" }
        ], submissionByStudent)
      ],
      recommendations: [
        submissions.length < assignments.length * Math.max(studentIds.length, 1) ? "Follow up with students who still have missing submissions." : "Submission coverage is stable; focus on feedback quality.",
        mistakes.some((item) => item.status !== "reviewed") ? "Schedule a mistake-review session for repeated weak concepts." : "Mistake queue is controlled.",
        collaborationSummary.openTaskCount ? "Close open collaboration tasks before the weekly project checkpoint." : "Collaboration task flow is clean."
      ],
      evidence: [
        "assessment-service internal analytics",
        "identity-service internal user list",
        "collaboration-service internal analytics",
        "ai-service provider health"
      ]
    });
    return stringifyExport(report, query.format);
  }

  async buildAssignmentGradingReport(user, assignmentId, query = {}) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("Assignment grading reports require teacher or admin role.");
    }
    const [users, assessment, collaboration] = await Promise.all([
      this.identityClient.listUsers(),
      this.assessmentClient.getAnalyticsSummary(),
      this.collaborationClient.getAnalyticsSummary()
    ]);
    const assignment = (assessment.assignments || []).find((item) => item.id === assignmentId);
    if (!assignment) {
      throw new NotFoundError("Assignment not found.");
    }
    const submissions = (assessment.submissions || []).filter((submission) => submission.assignmentId === assignment.id);
    const submissionIds = new Set(submissions.map((submission) => submission.id));
    const grades = (assessment.grades || []).filter((grade) => submissionIds.has(grade.submissionId));
    const overview = (assessment.gradingOverviews || []).find((item) => item.assignment?.id === assignment.id || item.assignmentId === assignment.id) || {};
    const rooms = (collaboration.rooms || []).filter((room) => room.assignmentId === assignment.id || room.courseId === assignment.courseId);
    const roomIds = new Set(rooms.map((room) => room.id));
    const discussions = (collaboration.messages || []).filter((message) => roomIds.has(message.roomId));
    const rows = submissions.map((submission) => ({
      student: userName(users, submission.studentId),
      status: submission.status,
      submittedAt: compactDate(submission.submittedAt),
      score: scoreForSubmission(assessment, submission.id),
      gradeCount: grades.filter((grade) => grade.submissionId === submission.id).length
    }));
    const report = createReport({
      id: reportId("assignment_grading"),
      type: "assignment-grading",
      title: `${assignment.title} Grading Report`,
      scope: { assignmentId: assignment.id, courseId: assignment.courseId },
      summary: `Grading report for ${assignment.title}, including submission coverage, score distribution, rubric insight, and collaboration evidence.`,
      metrics: [
        asMetric("Submissions", submissions.length),
        asMetric("Grades", grades.length),
        asMetric("Average score", average(grades.map((grade) => grade.score))),
        asMetric("AI review count", grades.filter((grade) => grade.source === "ai").length),
        asMetric("Teacher grade count", grades.filter((grade) => grade.source === "teacher").length),
        asMetric("Related discussions", discussions.length)
      ],
      sections: [
        asSection("Grading Throughput", `The assignment has ${submissions.length} submission(s) and ${grades.length} grading record(s).`, [
          `Published status: ${assignment.status}`,
          `Due date: ${compactDate(assignment.dueAt)}`,
          `Average score: ${average(grades.map((grade) => grade.score))}`
        ]),
        asSection("Rubric Quality", `Rubric insight quality score: ${overview.rubricInsight?.qualityScore || overview.qualityScore || "n/a"}.`, [
          `Consistency status: ${overview.consistency?.status || "unknown"}`,
          `Excellent band: ${overview.bands?.excellent ?? 0}`,
          `Risk band: ${overview.bands?.risk ?? 0}`
        ]),
        asSection("Collaboration Evidence", `Related rooms: ${rooms.length}; messages: ${discussions.length}.`, take(discussions.map((message) => message.content), 5))
      ],
      tables: [
        asTable("Submission Grading Rows", [
          { key: "student", label: "Student" },
          { key: "status", label: "Status" },
          { key: "submittedAt", label: "Submitted" },
          { key: "score", label: "Score" },
          { key: "gradeCount", label: "Grade Records" }
        ], rows),
        asTable("Grade Sources", [
          { key: "name", label: "Source" },
          { key: "count", label: "Count" }
        ], countBy(grades, "source"))
      ],
      recommendations: [
        grades.length < submissions.length ? "Finish manual grading for submissions without teacher score." : "All submitted work has at least one grading record.",
        discussions.length ? "Use discussion evidence in feedback summary." : "Create an assignment discussion room for grading issues.",
        average(grades.map((grade) => grade.score)) < 70 ? "Review rubric clarity for low average score." : "Score level is acceptable; inspect score gaps next."
      ],
      evidence: [
        "assessment-service internal analytics",
        "collaboration-service assignment/course room analytics"
      ]
    });
    return stringifyExport(report, query.format);
  }

  async buildMistakeReviewReport(user, query = {}) {
    const targetUserId = query.studentId || user.id;
    if (!isTeacherRole(user.role) && targetUserId !== user.id) {
      throw new ForbiddenError("Cannot inspect another student's mistake review report.");
    }
    const [profile, assessmentContext, learning] = await Promise.all([
      this.identityClient.getUserById(targetUserId),
      this.assessmentClient.getContext(targetUserId),
      this.learningClient.getContext(targetUserId)
    ]);
    if (!profile) {
      throw new NotFoundError("Student not found.");
    }
    const courseId = query.courseId || learning.courses?.[0]?.id || "";
    const mistakes = (assessmentContext.mistakes || []).filter((mistake) => matchCourse(mistake, courseId));
    const mastery = (assessmentContext.mastery || []).filter((record) => matchCourse(record, courseId));
    const byConcept = [...groupBy(mistakes, "concept").entries()].map(([concept, rows]) => ({
      concept,
      total: rows.length,
      open: rows.filter((item) => item.status !== "reviewed").length,
      reviewed: rows.filter((item) => item.status === "reviewed").length,
      mastery: average(mastery.filter((record) => record.concept === concept).map((record) => record.masteryScore))
    }));
    const report = createReport({
      id: reportId("mistake_review"),
      type: "mistake-review",
      title: `${profile.name || targetUserId} Mistake Review Report`,
      scope: { studentId: targetUserId, courseId },
      summary: `Mistake review report with concept-level load, open mistake queue, reviewed items, and mastery alignment.`,
      metrics: [
        asMetric("Total mistakes", mistakes.length),
        asMetric("Open mistakes", mistakes.filter((item) => item.status !== "reviewed").length),
        asMetric("Reviewed mistakes", mistakes.filter((item) => item.status === "reviewed").length),
        asMetric("Weak concepts", byConcept.filter((item) => item.open > 0 || item.mastery < 70).length),
        asMetric("Average mastery", average(mastery.map((item) => item.masteryScore)))
      ],
      sections: [
        asSection("Open Queue", `There are ${mistakes.filter((item) => item.status !== "reviewed").length} open mistake(s).`, take(mistakes.filter((item) => item.status !== "reviewed").map((item) => `${item.questionId || item.id} (${item.concept || "unknown"})`), 8)),
        asSection("Concept Recovery", "Concepts with open mistakes or low mastery should drive the next practice set.", byConcept.filter((item) => item.open > 0 || item.mastery < 70).map((item) => `${item.concept}: ${item.open} open, mastery ${item.mastery}`))
      ],
      tables: [
        asTable("Mistakes By Concept", [
          { key: "concept", label: "Concept" },
          { key: "total", label: "Total" },
          { key: "open", label: "Open" },
          { key: "reviewed", label: "Reviewed" },
          { key: "mastery", label: "Mastery" }
        ], byConcept),
        asTable("Recent Mistakes", [
          { key: "id", label: "Mistake" },
          { key: "questionId", label: "Question" },
          { key: "concept", label: "Concept" },
          { key: "status", label: "Status" }
        ], take(sortDesc(mistakes), 20).map((item) => ({
          id: item.id,
          questionId: item.questionId,
          concept: item.concept || "-",
          status: item.status
        })))
      ],
      recommendations: byConcept.filter((item) => item.open > 0 || item.mastery < 70).slice(0, 5).map((item) => `Prioritize ${item.concept}: ${item.open} open mistake(s), mastery ${item.mastery}.`),
      evidence: [
        "assessment-service internal mistake context",
        "assessment-service mastery records"
      ]
    });
    return stringifyExport(report, query.format);
  }

  async buildAiUsageReport(user, query = {}) {
    const [aiHealth, collaboration, learning] = await Promise.all([
      this.aiClient.getProviderHealth(),
      this.collaborationClient.getAnalyticsSummary(),
      this.learningClient.getContext(user.id)
    ]);
    const courseId = query.courseId || learning.courses?.[0]?.id || "";
    const aiActivities = (collaboration.activityLogs || []).filter((item) => {
      const text = `${item.type || ""} ${item.summary || ""}`.toLowerCase();
      return text.includes("ai") || text.includes("review") || text.includes("context");
    });
    const events = (collaboration.events || []).filter((item) => {
      const text = `${item.type || ""} ${item.summary || ""}`.toLowerCase();
      return text.includes("ai") || text.includes("review") || text.includes("context");
    });
    const report = createReport({
      id: reportId("ai_usage"),
      type: "ai-usage",
      title: "AI Usage Report",
      scope: { userId: user.id, courseId },
      summary: `AI usage report for provider ${aiHealth.provider || "unknown"}, including provider health, AI-related events, and explainability evidence.`,
      metrics: [
        asMetric("Provider", aiHealth.provider || "unknown", aiHealth.status || "unknown"),
        asMetric("AI activities", aiActivities.length),
        asMetric("AI events", events.length),
        asMetric("Configured model", aiHealth.model || aiHealth.provider || "unknown"),
        asMetric("Learning goals", (learning.goals || []).length)
      ],
      sections: [
        asSection("Provider Health", `Provider status is ${aiHealth.status || "unknown"} with provider ${aiHealth.provider || "unknown"}.`, [
          `Endpoint: ${aiHealth.endpoint || "not exposed"}`,
          `Model: ${aiHealth.model || "not exposed"}`
        ]),
        asSection("Usage Trace", `Found ${aiActivities.length} AI-related activity log item(s) and ${events.length} AI-related event item(s).`, take([...aiActivities, ...events].map((item) => `${item.type}: ${item.summary}`), 10)),
        asSection("Explainability Notes", "The report keeps AI usage as structured evidence instead of opaque generated text.", [
          "Provider health is checked through ai-service.",
          "AI review activity is connected through collaboration events.",
          "Exports keep source evidence separate from recommendations."
        ])
      ],
      tables: [
        asTable("AI Activity Log", [
          { key: "type", label: "Type" },
          { key: "summary", label: "Summary" },
          { key: "createdAt", label: "Created" }
        ], take(aiActivities, 30).map((item) => ({
          type: item.type,
          summary: item.summary,
          createdAt: compactDate(item.createdAt)
        })))
      ],
      recommendations: [
        aiHealth.status === "up" ? "AI provider is available; keep generated outputs tied to source evidence." : "Check AI provider configuration before class demonstration.",
        "Use Markdown export for the final report appendix.",
        "Use CSV export when explaining system data flow during defense."
      ],
      evidence: [
        "ai-service provider health",
        "collaboration-service activity and event logs",
        "learning-service context"
      ]
    });
    return stringifyExport(report, query.format);
  }
}

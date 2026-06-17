export class AssessmentFacade {
  constructor({
    assignmentService,
    gradingService,
    questionBankService,
    practiceService,
    mistakeService,
    masteryService,
    rubricInsightService,
    mistakeAnalysisService,
    adaptivePracticePlanner,
    assessmentPortfolioService,
    repositories
  }) {
    this.assignmentService = assignmentService;
    this.gradingService = gradingService;
    this.questionBankService = questionBankService;
    this.practiceService = practiceService;
    this.mistakeService = mistakeService;
    this.masteryService = masteryService;
    this.rubricInsightService = rubricInsightService;
    this.mistakeAnalysisService = mistakeAnalysisService;
    this.adaptivePracticePlanner = adaptivePracticePlanner;
    this.assessmentPortfolioService = assessmentPortfolioService;
    this.repositories = repositories;
  }

  buildInternalContext(userId) {
    return {
      userId,
      assignments: this.repositories.assignments.all(),
      submissions: this.repositories.submissions.findByStudent(userId),
      practiceSessions: this.repositories.practiceSessions.findByOwner(userId),
      mistakes: this.repositories.mistakeItems.findByOwner(userId),
      mastery: this.repositories.masteryRecords.findByOwner(userId),
      mistakeReport: this.mistakeAnalysisService.buildStudentReport({ id: userId, role: "student" })
    };
  }

  buildDashboard(userId) {
    return this.masteryService.buildDashboard(userId, {
      assignments: this.repositories.assignments,
      submissions: this.repositories.submissions,
      practiceSessions: this.repositories.practiceSessions,
      mistakeItems: this.repositories.mistakeItems
    });
  }

  buildAnalyticsSummary() {
    const courseIds = new Set([
      ...this.repositories.assignments.all().map((assignment) => assignment.courseId),
      ...this.repositories.practiceSessions.all().map((session) => session.courseId),
      ...this.repositories.masteryRecords.all().map((record) => record.courseId)
    ].filter(Boolean));
    return {
      assignments: this.repositories.assignments.all().map((item) => item.toJSON()),
      submissions: this.repositories.submissions.all().map((item) => item.toJSON()),
      grades: this.repositories.grades.all().map((item) => item.toJSON()),
      practiceSessions: this.repositories.practiceSessions.all().map((item) => item.toJSON()),
      answerRecords: this.repositories.answerRecords.all().map((item) => item.toJSON()),
      mistakeItems: this.repositories.mistakeItems.all().map((item) => item.toJSON()),
      masteryRecords: this.repositories.masteryRecords.all().map((item) => item.toJSON()),
      rubricInsights: this.repositories.rubrics.all().map((rubric) => this.rubricInsightService.getRubricProfile(rubric.id)),
      gradingOverviews: this.repositories.assignments.all().map((assignment) => this.rubricInsightService.buildAssignmentGradingOverview(assignment.id)),
      courseReports: [...courseIds].map((courseId) => this.assessmentPortfolioService.buildCourseReport({ id: "system", role: "teacher" }, { courseId }))
    };
  }
}

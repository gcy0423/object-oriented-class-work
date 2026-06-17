export class AssessmentFacade {
  constructor({ assignmentService, gradingService, questionBankService, practiceService, mistakeService, masteryService, repositories }) {
    this.assignmentService = assignmentService;
    this.gradingService = gradingService;
    this.questionBankService = questionBankService;
    this.practiceService = practiceService;
    this.mistakeService = mistakeService;
    this.masteryService = masteryService;
    this.repositories = repositories;
  }

  buildInternalContext(userId) {
    return {
      userId,
      assignments: this.repositories.assignments.all(),
      submissions: this.repositories.submissions.findByStudent(userId),
      practiceSessions: this.repositories.practiceSessions.findByOwner(userId),
      mistakes: this.repositories.mistakeItems.findByOwner(userId),
      mastery: this.repositories.masteryRecords.findByOwner(userId)
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
    return {
      assignments: this.repositories.assignments.all().map((item) => item.toJSON()),
      submissions: this.repositories.submissions.all().map((item) => item.toJSON()),
      grades: this.repositories.grades.all().map((item) => item.toJSON()),
      practiceSessions: this.repositories.practiceSessions.all().map((item) => item.toJSON()),
      answerRecords: this.repositories.answerRecords.all().map((item) => item.toJSON()),
      mistakeItems: this.repositories.mistakeItems.all().map((item) => item.toJSON()),
      masteryRecords: this.repositories.masteryRecords.all().map((item) => item.toJSON())
    };
  }
}

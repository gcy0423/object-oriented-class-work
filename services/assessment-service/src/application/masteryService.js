export class MasteryService {
  constructor({ masteryRecords }) {
    this.masteryRecords = masteryRecords;
  }

  listByOwner(ownerId) {
    return this.masteryRecords.findByOwner(ownerId);
  }

  buildDashboard(ownerId, { assignments, submissions, practiceSessions, mistakeItems }) {
    const ownedAssignments = assignments.all();
    const ownedSubmissions = submissions.findByStudent(ownerId);
    const sessions = practiceSessions.findByOwner(ownerId);
    const mistakes = mistakeItems.findByOwner(ownerId);
    const mastery = this.listByOwner(ownerId);
    const publishedAssignments = ownedAssignments.filter((item) => item.status === "published");

    return {
      assignments: publishedAssignments.map((assignment) => {
        const submission = ownedSubmissions.find((item) => item.assignmentId === assignment.id) || null;
        return {
          ...assignment.toJSON(),
          submitted: Boolean(submission),
          submissionId: submission?.id || null
        };
      }),
      practice: {
        activeSessions: sessions.filter((item) => item.status === "active").length,
        mistakeCount: mistakes.filter((item) => item.status !== "reviewed").length
      },
      metrics: {
        assignmentCompletionRate: publishedAssignments.length
          ? Math.round((ownedSubmissions.length / publishedAssignments.length) * 100)
          : 0,
        mistakeCount: mistakes.filter((item) => item.status !== "reviewed").length,
        masteryScore: mastery.length
          ? Math.round(mastery.reduce((sum, item) => sum + item.masteryScore, 0) / mastery.length)
          : 0
      }
    };
  }
}

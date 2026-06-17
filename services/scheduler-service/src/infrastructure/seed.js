export function createSchedulerSeed(now = new Date()) {
  const today = now.toISOString();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  return {
    reminderRules: [
      {
        id: "reminder_ood_assignment",
        ownerId: "user_student",
        createdBy: "user_teacher",
        courseId: "course_ood",
        title: "Review object-oriented assignment",
        message: "Check class responsibility and UML evidence before submission.",
        targetType: "assignment",
        targetId: "assignment_ood_model",
        dueAt: tomorrow,
        nextRunAt: tomorrow,
        lastRunAt: null,
        frequency: "once",
        intervalDays: 1,
        status: "active",
        severity: "warning",
        channels: ["in_app"],
        metadata: { source: "seed" },
        createdAt: today,
        updatedAt: today
      }
    ],
    scheduleRuns: []
  };
}

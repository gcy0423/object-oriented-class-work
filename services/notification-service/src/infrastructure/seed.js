export function createNotificationSeed(now = new Date()) {
  const today = now.toISOString();
  return {
    notifications: [],
    preferences: [
      {
        id: "pref_user_student",
        userId: "user_student",
        channelSettings: { in_app: true, email: false, sms: false },
        categorySettings: { assignment: true, scheduler: true, system: true },
        quietHours: { enabled: true, start: "22:30", end: "07:00" },
        digestFrequency: "daily",
        createdAt: today,
        updatedAt: today
      },
      {
        id: "pref_user_teacher",
        userId: "user_teacher",
        channelSettings: { in_app: true, email: true, sms: false },
        categorySettings: { assignment: true, scheduler: true, system: true },
        quietHours: { enabled: false, start: "22:00", end: "07:00" },
        digestFrequency: "immediate",
        createdAt: today,
        updatedAt: today
      }
    ],
    templates: [
      {
        id: "tpl_assignment_due",
        code: "assignment.due",
        titleTemplate: "Assignment due: {title}",
        bodyTemplate: "{title} is due at {dueAt}.",
        defaultCategory: "assignment",
        defaultSeverity: "warning",
        defaultChannels: ["in_app"],
        enabled: true,
        createdAt: today,
        updatedAt: today
      },
      {
        id: "tpl_scheduler_reminder",
        code: "scheduler.reminder",
        titleTemplate: "{title}",
        bodyTemplate: "{message}",
        defaultCategory: "scheduler",
        defaultSeverity: "info",
        defaultChannels: ["in_app"],
        enabled: true,
        createdAt: today,
        updatedAt: today
      },
      {
        id: "tpl_system_notice",
        code: "system.notice",
        titleTemplate: "{title}",
        bodyTemplate: "{message}",
        defaultCategory: "system",
        defaultSeverity: "info",
        defaultChannels: ["in_app"],
        enabled: true,
        createdAt: today,
        updatedAt: today
      }
    ],
    deliveryLogs: []
  };
}

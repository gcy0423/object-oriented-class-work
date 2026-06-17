import { ReminderStatus } from "../domain/schedule.js";

function sortByTime(items, field) {
  return [...items].sort((a, b) => String(a[field] || "").localeCompare(String(b[field] || "")));
}

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export class SchedulerAnalyticsService {
  constructor({ reminderRules, scheduleRuns }) {
    this.reminderRules = reminderRules;
    this.scheduleRuns = scheduleRuns;
  }

  buildDashboard(user, filters = {}, canSeeAll = false) {
    const reminders = canSeeAll
      ? this.reminderRules.findByFilters(filters)
      : this.reminderRules.findByFilters({ ...filters, ownerId: user.id });
    const reminderIds = new Set(reminders.map((item) => item.id));
    const runs = this.scheduleRuns.all().filter((run) => reminderIds.has(run.reminderId));
    return {
      totalReminders: reminders.length,
      activeReminders: reminders.filter((item) => item.status === ReminderStatus.ACTIVE).length,
      pausedReminders: reminders.filter((item) => item.status === ReminderStatus.PAUSED).length,
      completedReminders: reminders.filter((item) => item.status === ReminderStatus.COMPLETED).length,
      byCourse: countBy(reminders, (item) => item.courseId || "none"),
      byTargetType: countBy(reminders, (item) => item.targetType || "general"),
      runStatus: countBy(runs, (item) => item.status),
      upcoming: sortByTime(reminders.filter((item) => item.status === ReminderStatus.ACTIVE), "nextRunAt").slice(0, 10).map((item) => item.toJSON()),
      recentRuns: [...runs].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 10).map((item) => item.toJSON())
    };
  }

  buildTimeline(user, filters = {}, canSeeAll = false) {
    const reminders = canSeeAll
      ? this.reminderRules.findByFilters(filters)
      : this.reminderRules.findByFilters({ ...filters, ownerId: user.id });
    const reminderIds = new Set(reminders.map((item) => item.id));
    const runs = this.scheduleRuns.all().filter((run) => reminderIds.has(run.reminderId));
    const reminderEvents = reminders.map((item) => ({
      type: "reminder.next",
      reminderId: item.id,
      ownerId: item.ownerId,
      courseId: item.courseId,
      at: item.nextRunAt,
      title: item.title,
      status: item.status
    }));
    const runEvents = runs.map((run) => ({
      type: `run.${run.status}`,
      reminderId: run.reminderId,
      ownerId: run.ownerId,
      at: run.finishedAt || run.startedAt,
      title: `Run for ${run.reminderId}`,
      status: run.status
    }));
    return [...reminderEvents, ...runEvents]
      .filter((item) => item.at)
      .sort((a, b) => String(a.at).localeCompare(String(b.at)));
  }
}

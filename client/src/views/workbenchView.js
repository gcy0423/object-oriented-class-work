import { escapeHtml } from "../utils/dom.js";
import { formatDate } from "../utils/format.js";
import { emptyState, metric, sectionCard, statusBadge } from "../widgets/cards.js";
import { horizontalBars } from "../widgets/charts.js";

function firstCourseId(state) {
  return state.filters.workbench.courseId || state.dashboard?.courses?.[0]?.id || "";
}

function notificationRows(items = []) {
  if (!items.length) {
    return emptyState("No active notifications.");
  }
  return `<ul class="workbench-feed">${items.map((item) => `
    <li class="workbench-feed-item ${item.readAt ? "is-read" : "is-unread"}">
      <div>
        <div class="workbench-feed-head">
          <strong>${escapeHtml(item.title)}</strong>
          ${statusBadge(item.severity || "info")}
        </div>
        <p class="muted">${escapeHtml(item.body || item.message || "")}</p>
        <div class="tag-row">
          <span class="tag">${escapeHtml(item.category || "general")}</span>
          <span class="tag">${escapeHtml(formatDate(item.createdAt))}</span>
          ${item.readAt ? `<span class="tag">read</span>` : `<span class="badge warning">unread</span>`}
        </div>
      </div>
      <div class="inline-actions">
        ${item.readAt ? "" : `<button class="btn small" data-action="read-notification" data-id="${escapeHtml(item.id)}">Read</button>`}
        <button class="btn small" data-action="dismiss-notification" data-id="${escapeHtml(item.id)}">Dismiss</button>
      </div>
    </li>
  `).join("")}</ul>`;
}

function reminderRows(items = []) {
  if (!items.length) {
    return emptyState("No reminders in the selected scope.");
  }
  return `<div class="table-wrap">
    <table class="data-table workbench-table">
      <thead><tr><th>Title</th><th>Target</th><th>Next Run</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        ${items.map((item) => `
          <tr>
            <td><strong>${escapeHtml(item.title)}</strong><br /><span class="muted">${escapeHtml(item.message || "")}</span></td>
            <td>${escapeHtml(item.targetType || "general")}<br /><span class="muted">${escapeHtml(item.courseId || "-")}</span></td>
            <td>${escapeHtml(item.nextRunAt ? formatDate(item.nextRunAt) : "-")}</td>
            <td>${statusBadge(item.status || "active")}</td>
            <td>
              <div class="inline-actions">
                ${item.status === "paused"
                  ? `<button class="btn small" data-action="resume-reminder" data-id="${escapeHtml(item.id)}">Resume</button>`
                  : `<button class="btn small" data-action="pause-reminder" data-id="${escapeHtml(item.id)}">Pause</button>`}
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>`;
}

function timelineRows(items = []) {
  if (!items.length) {
    return emptyState("No scheduler timeline events.");
  }
  return `<ol class="workbench-timeline">${items.slice(0, 14).map((item) => `
    <li>
      <time>${escapeHtml(formatDate(item.at))}</time>
      <div>
        <strong>${escapeHtml(item.title || item.type)}</strong>
        <span class="muted">${escapeHtml(item.type)} / ${escapeHtml(item.status || "-")}</span>
      </div>
    </li>
  `).join("")}</ol>`;
}

function riskRows(board) {
  const items = board?.items || [];
  if (!items.length) {
    return emptyState("No risk-board data.");
  }
  return `<div class="table-wrap">
    <table class="data-table workbench-table">
      <thead><tr><th>Student</th><th>Risk</th><th>Assignment</th><th>Mastery</th><th>Signals</th></tr></thead>
      <tbody>
        ${items.slice(0, 8).map((item) => `
          <tr>
            <td>${escapeHtml(item.name || item.studentId)}</td>
            <td>${statusBadge(item.level || "low")} <strong>${escapeHtml(item.score ?? 0)}</strong></td>
            <td>${escapeHtml(item.signals?.assignmentCompletion ?? 0)}%</td>
            <td>${escapeHtml(item.signals?.masteryScore ?? 0)}%</td>
            <td>${(item.reasons || []).map((reason) => `<span class="tag">${escapeHtml(reason.code || reason)}</span>`).join(" ")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>`;
}

function funnelChart(funnel) {
  const stages = funnel?.stages || [];
  return horizontalBars(stages.map((stage) => ({
    label: stage.key,
    value: stage.rate,
    text: `${stage.count} / ${stage.rate}%`
  })), { label: "Learning funnel" });
}

function engagementPanel(engagement) {
  if (!engagement) {
    return emptyState("Engagement report is not loaded.");
  }
  const channels = engagement.channelMix || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("Activity", engagement.activityCount ?? 0)}
      ${metric("Messages", engagement.messageCount ?? 0)}
    </div>
    ${horizontalBars(channels.map((item) => ({
      label: item.channel,
      value: item.count,
      text: item.count
    })), { max: Math.max(1, ...channels.map((item) => Number(item.count || 0))), label: "Channel mix" })}
    <ul class="plain-list workbench-notes">
      ${(engagement.quietSignals || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function deepReportPanel(report) {
  if (!report) {
    return emptyState("Course deep report is not loaded.");
  }
  return `
    <div class="stats-grid compact-stats">
      ${metric("Assignments", report.assignments?.published ?? 0)}
      ${metric("Submitted", report.assignments?.submitted ?? 0)}
      ${metric("Practice", report.practice?.sessionCount ?? 0)}
      ${metric("Open Mistakes", report.practice?.openMistakes ?? 0)}
    </div>
    ${horizontalBars((report.mastery?.concepts || []).slice(0, 8).map((item) => ({
      label: item.concept,
      value: item.score,
      text: `${item.score}%`
    })), { label: "Course mastery" })}
  `;
}

function progressPanel(progress) {
  if (!progress) {
    return emptyState("Student progress report is not loaded.");
  }
  return `
    <div class="stats-grid compact-stats">
      ${metric("Tasks", progress.learning?.completedTaskCount ?? 0, `${progress.learning?.taskCount ?? 0} total`)}
      ${metric("Submissions", progress.assignments?.submittedCount ?? 0)}
      ${metric("Avg Score", progress.grading?.averageScore ?? 0)}
      ${metric("Correct Rate", `${progress.practice?.averageCorrectRate ?? 0}%`)}
    </div>
    <ul class="plain-list workbench-notes">
      ${(progress.nextFocus || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function filterForm(state) {
  const courseId = firstCourseId(state);
  const courses = state.dashboard?.courses || [];
  const filter = state.filters.workbench;
  const canRunScheduler = state.user?.role === "teacher" || state.user?.role === "admin";
  return `
    <form class="filter-toolbar workbench-filter" data-form="workbench-filter">
      <label><span>Course</span><select name="courseId">
        <option value="">All / first course</option>
        ${courses.map((course) => `<option value="${escapeHtml(course.id)}" ${course.id === courseId ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}
      </select></label>
      <label><span>Category</span><select name="category">
        <option value="">All notifications</option>
        ${["system", "scheduler", "assignment"].map((item) => `<option value="${item}" ${filter.category === item ? "selected" : ""}>${item}</option>`).join("")}
      </select></label>
      <label><span>Reminder</span><select name="reminderStatus">
        <option value="">All reminders</option>
        ${["active", "paused", "completed"].map((item) => `<option value="${item}" ${filter.reminderStatus === item ? "selected" : ""}>${item}</option>`).join("")}
      </select></label>
      <div class="filter-actions">
        <button class="btn primary" type="submit">Apply</button>
        ${canRunScheduler ? `<button class="btn" type="button" data-action="run-due-scheduler">Run due</button>` : ""}
      </div>
    </form>
  `;
}

function reminderForm(state) {
  const draft = state.draft.reminder || {};
  const courseId = draft.courseId || firstCourseId(state);
  const saving = state.saving.reminder;
  return `
    <form class="form-grid compact-form" data-form="workbench-reminder">
      <input type="hidden" name="id" value="${escapeHtml(draft.id || "")}" />
      <label><span>Title</span><input name="title" value="${escapeHtml(draft.title || "")}" placeholder="Review UML evidence" /></label>
      <label><span>Message</span><textarea name="message" placeholder="What should be done?">${escapeHtml(draft.message || "")}</textarea></label>
      <div class="form-grid two-field-row">
        <label><span>Course</span><input name="courseId" value="${escapeHtml(courseId)}" /></label>
        <label><span>Due At</span><input type="datetime-local" name="dueAt" value="${escapeHtml(draft.dueAt || "")}" /></label>
      </div>
      <div class="form-grid two-field-row">
        <label><span>Target</span><select name="targetType">
          ${["general", "assignment", "practice", "mistake"].map((item) => `<option value="${item}" ${draft.targetType === item ? "selected" : ""}>${item}</option>`).join("")}
        </select></label>
        <label><span>Frequency</span><select name="frequency">
          ${["once", "daily", "weekly", "interval"].map((item) => `<option value="${item}" ${draft.frequency === item ? "selected" : ""}>${item}</option>`).join("")}
        </select></label>
      </div>
      <div class="button-row">
        <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "Saving..." : "Create reminder"}</button>
        <button class="btn" type="button" data-action="clear-reminder-draft">Clear</button>
      </div>
    </form>
  `;
}

export function workbenchView(state) {
  const wb = state.workbench || {};
  const summary = wb.notificationSummary || {};
  const scheduler = wb.schedulerDashboard || {};
  const risk = wb.riskBoard || {};
  return `
    <section class="grid metric-grid workbench-metrics">
      ${metric("Unread", summary.unread ?? 0, "notifications")}
      ${metric("Active Reminders", scheduler.activeReminders ?? 0)}
      ${metric("Risk Students", risk.summary?.high ?? 0, "high risk")}
      ${metric("Engagement", wb.engagement?.activityCount ?? 0, "activity")}
    </section>
    ${filterForm(state)}
    <section class="workbench-grid">
      <div class="workbench-main">
        ${sectionCard("Learning Funnel", funnelChart(wb.funnel))}
        ${sectionCard("Risk Board", riskRows(wb.riskBoard))}
        ${sectionCard("Course Deep Report", deepReportPanel(wb.courseDeepReport))}
        ${sectionCard("Student Progress", progressPanel(wb.studentProgress))}
      </div>
      <aside class="workbench-side">
        ${sectionCard("Notifications", notificationRows(wb.notifications || []), `<button class="btn small" data-action="mark-all-notifications-read">Read all</button>`)}
        ${sectionCard("Reminder Composer", reminderForm(state))}
        ${sectionCard("Scheduler", reminderRows(wb.reminders || []))}
        ${sectionCard("Timeline", timelineRows(wb.schedulerTimeline || []))}
        ${sectionCard("Engagement", engagementPanel(wb.engagement))}
      </aside>
    </section>
  `;
}

import { escapeHtml } from "../utils/dom.js";
import { formatDate, statusText } from "../utils/format.js";
import { emptyState, metric, sectionCard, statusBadge } from "../widgets/cards.js";
import { horizontalBars } from "../widgets/charts.js";

function firstCourseId(state) {
  return state.filters.workbench.courseId || state.dashboard?.courses?.[0]?.id || "";
}

function labelText(value) {
  const mapping = {
    system: "系统",
    scheduler: "日程",
    assignment: "作业",
    general: "通用",
    practice: "练习",
    mistake: "错题",
    once: "一次",
    daily: "每天",
    weekly: "每周",
    interval: "间隔"
  };
  return mapping[value] || statusText(value);
}

function notificationRows(items = []) {
  if (!items.length) {
    return emptyState("当前没有待处理通知。");
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
          <span class="tag">${escapeHtml(labelText(item.category || "general"))}</span>
          <span class="tag">${escapeHtml(formatDate(item.createdAt))}</span>
          ${item.readAt ? `<span class="tag">已读</span>` : `<span class="badge warning">未读</span>`}
        </div>
      </div>
      <div class="inline-actions">
        ${item.readAt ? "" : `<button class="btn small" data-action="read-notification" data-id="${escapeHtml(item.id)}">标为已读</button>`}
        <button class="btn small" data-action="dismiss-notification" data-id="${escapeHtml(item.id)}">忽略</button>
      </div>
    </li>
  `).join("")}</ul>`;
}

function reminderRows(items = []) {
  if (!items.length) {
    return emptyState("当前筛选范围内没有提醒。");
  }
  return `<div class="table-wrap">
    <table class="data-table workbench-table">
      <thead><tr><th>标题</th><th>对象</th><th>下次提醒</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>
        ${items.map((item) => `
          <tr>
            <td><strong>${escapeHtml(item.title)}</strong><br /><span class="muted">${escapeHtml(item.message || "")}</span></td>
            <td>${escapeHtml(labelText(item.targetType || "general"))}</td>
            <td>${escapeHtml(item.nextRunAt ? formatDate(item.nextRunAt) : "-")}</td>
            <td>${statusBadge(item.status || "active")}</td>
            <td>
              <div class="inline-actions">
                ${item.status === "paused"
                  ? `<button class="btn small" data-action="resume-reminder" data-id="${escapeHtml(item.id)}">恢复</button>`
                  : `<button class="btn small" data-action="pause-reminder" data-id="${escapeHtml(item.id)}">暂停</button>`}
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
    return emptyState("暂无日程执行记录。");
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
    return emptyState("暂无风险学生数据。");
  }
  return `<div class="table-wrap">
    <table class="data-table workbench-table">
      <thead><tr><th>学生</th><th>风险</th><th>作业</th><th>掌握度</th><th>信号</th></tr></thead>
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
  })), { label: "学习漏斗" });
}

function engagementPanel(engagement) {
  if (!engagement) {
    return emptyState("互动数据尚未加载。");
  }
  const channels = engagement.channelMix || [];
  return `
    <div class="stats-grid compact-stats">
      ${metric("活动", engagement.activityCount ?? 0)}
      ${metric("消息", engagement.messageCount ?? 0)}
    </div>
    ${horizontalBars(channels.map((item) => ({
      label: item.channel,
      value: item.count,
      text: item.count
    })), { max: Math.max(1, ...channels.map((item) => Number(item.count || 0))), label: "渠道分布" })}
    <ul class="plain-list workbench-notes">
      ${(engagement.quietSignals || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function deepReportPanel(report) {
  if (!report) {
    return emptyState("课程深度报告尚未加载。");
  }
  return `
    <div class="stats-grid compact-stats">
      ${metric("作业", report.assignments?.published ?? 0)}
      ${metric("已提交", report.assignments?.submitted ?? 0)}
      ${metric("练习", report.practice?.sessionCount ?? 0)}
      ${metric("待复习错题", report.practice?.openMistakes ?? 0)}
    </div>
    ${horizontalBars((report.mastery?.concepts || []).slice(0, 8).map((item) => ({
      label: item.concept,
      value: item.score,
      text: `${item.score}%`
    })), { label: "课程掌握度" })}
  `;
}

function progressPanel(progress) {
  if (!progress) {
    return emptyState("学生进度报告尚未加载。");
  }
  return `
    <div class="stats-grid compact-stats">
      ${metric("任务", progress.learning?.completedTaskCount ?? 0, `共 ${progress.learning?.taskCount ?? 0} 项`)}
      ${metric("提交", progress.assignments?.submittedCount ?? 0)}
      ${metric("平均分", progress.grading?.averageScore ?? 0)}
      ${metric("正确率", `${progress.practice?.averageCorrectRate ?? 0}%`)}
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
      <label><span>课程</span><select name="courseId">
        <option value="">全部 / 默认课程</option>
        ${courses.map((course) => `<option value="${escapeHtml(course.id)}" ${course.id === courseId ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}
      </select></label>
      <label><span>通知类型</span><select name="category">
        <option value="">全部通知</option>
        ${["system", "scheduler", "assignment"].map((item) => `<option value="${item}" ${filter.category === item ? "selected" : ""}>${labelText(item)}</option>`).join("")}
      </select></label>
      <label><span>提醒状态</span><select name="reminderStatus">
        <option value="">全部提醒</option>
        ${["active", "paused", "completed"].map((item) => `<option value="${item}" ${filter.reminderStatus === item ? "selected" : ""}>${statusText(item)}</option>`).join("")}
      </select></label>
      <div class="filter-actions">
        <button class="btn primary" type="submit">应用筛选</button>
        ${canRunScheduler ? `<button class="btn" type="button" data-action="run-due-scheduler">执行到期提醒</button>` : ""}
      </div>
    </form>
  `;
}

function reminderForm(state) {
  const draft = state.draft.reminder || {};
  const courseId = draft.courseId || firstCourseId(state);
  const courses = state.dashboard?.courses || [];
  const saving = state.saving.reminder;
  return `
    <form class="form-grid compact-form" data-form="workbench-reminder">
      <input type="hidden" name="id" value="${escapeHtml(draft.id || "")}" />
      <label><span>标题</span><input name="title" value="${escapeHtml(draft.title || "")}" placeholder="复核 UML 证据" /></label>
      <label><span>消息</span><textarea name="message" placeholder="需要完成什么？">${escapeHtml(draft.message || "")}</textarea></label>
      <div class="form-grid two-field-row">
        <label><span>课程</span><select name="courseId">
          ${courses.map((course) => `<option value="${escapeHtml(course.id)}" ${course.id === courseId ? "selected" : ""}>${escapeHtml(course.title)}</option>`).join("")}
        </select></label>
        <label><span>提醒时间</span><input type="datetime-local" name="dueAt" value="${escapeHtml(draft.dueAt || "")}" /></label>
      </div>
      <div class="form-grid two-field-row">
        <label><span>对象</span><select name="targetType">
          ${["general", "assignment", "practice", "mistake"].map((item) => `<option value="${item}" ${draft.targetType === item ? "selected" : ""}>${labelText(item)}</option>`).join("")}
        </select></label>
        <label><span>频率</span><select name="frequency">
          ${["once", "daily", "weekly", "interval"].map((item) => `<option value="${item}" ${draft.frequency === item ? "selected" : ""}>${labelText(item)}</option>`).join("")}
        </select></label>
      </div>
      <div class="button-row">
        <button class="btn primary" type="submit" ${saving ? "disabled" : ""}>${saving ? "保存中..." : "创建提醒"}</button>
        <button class="btn" type="button" data-action="clear-reminder-draft">清空</button>
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
      ${metric("未读通知", summary.unread ?? 0)}
      ${metric("活跃提醒", scheduler.activeReminders ?? 0)}
      ${metric("高风险学生", risk.summary?.high ?? 0)}
      ${metric("互动活动", wb.engagement?.activityCount ?? 0)}
    </section>
    ${filterForm(state)}
    <section class="workbench-grid">
      <div class="workbench-main">
        ${sectionCard("学习漏斗", funnelChart(wb.funnel))}
        ${sectionCard("风险看板", riskRows(wb.riskBoard))}
        ${sectionCard("课程深度报告", deepReportPanel(wb.courseDeepReport))}
        ${sectionCard("学生进度", progressPanel(wb.studentProgress))}
      </div>
      <aside class="workbench-side">
        ${sectionCard("通知", notificationRows(wb.notifications || []), `<button class="btn small" data-action="mark-all-notifications-read">全部已读</button>`)}
        ${sectionCard("创建提醒", reminderForm(state))}
        ${sectionCard("提醒列表", reminderRows(wb.reminders || []))}
        ${sectionCard("执行时间线", timelineRows(wb.schedulerTimeline || []))}
        ${sectionCard("互动概览", engagementPanel(wb.engagement))}
      </aside>
    </section>
  `;
}

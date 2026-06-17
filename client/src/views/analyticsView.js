import { activityList } from "../components.js";
import { selectAnalyticsViewModel } from "../state/selectors.js";
import { escapeHtml } from "../utils/dom.js";
import { formatPercent } from "../utils/format.js";
import { emptyState, metric, statusBadge } from "../widgets/cards.js";
import { horizontalBars } from "../widgets/charts.js";
import { dataTable } from "../widgets/tables.js";

function courseCards(items = []) {
  if (!items.length) {
    return emptyState("暂时没有课程统计。");
  }
  return `<div class="course-card-grid">${items.map((item) => `
    <article class="panel">
      <div class="panel-header"><h2>${escapeHtml(item.title)}</h2><button class="btn small" data-action="view-course-analytics" data-id="${escapeHtml(item.id)}">查看</button></div>
      <div class="stats-grid">
        ${metric("作业完成率", formatPercent(item.assignmentCompletionRate))}
        ${metric("练习正确率", formatPercent(item.averageCorrectRate))}
        ${metric("开放错题", item.openMistakes)}
      </div>
    </article>
  `).join("")}</div>`;
}

function studentTable(items = []) {
  return dataTable({
    columns: [
      { key: "name", label: "学生", render: (row) => `<button class="link-button" data-action="view-student" data-id="${escapeHtml(row.id)}">${escapeHtml(row.name)}</button>` },
      { key: "completionRate", label: "完成率", render: (row) => escapeHtml(formatPercent(row.completionRate)) },
      { key: "studyMinutes", label: "学习分钟", render: (row) => escapeHtml(row.studyMinutes) },
      { key: "mistakeCount", label: "错题数", render: (row) => escapeHtml(row.mistakeCount) },
      { key: "masteryScore", label: "掌握度", render: (row) => escapeHtml(formatPercent(row.masteryScore)) }
    ],
    rows: items,
    emptyText: "暂无学生画像。"
  });
}

export function analyticsView(state) {
  const vm = selectAnalyticsViewModel(state);
  if (!vm.canView) {
    return `<div class="panel">${emptyState("学生视角不显示教师统计页。")}</div>`;
  }
  const selectedCourseBars = vm.selectedCourse?.mastery || [];
  const selectedStudentBars = vm.selectedStudent?.mastery || [];
  return `
    <section class="grid">
      <section class="grid metric-grid">
        ${metric("课程数", vm.courseCards.length)}
        ${metric("学生数", vm.studentProfiles.length)}
        ${metric("风险学生", vm.riskStudents.length)}
        ${metric("近期活动", vm.recentActivity.length)}
      </section>
      <div class="panel"><div class="panel-header"><h2>课程统计</h2></div>${courseCards(vm.courseCards)}</div>
      <div class="panel"><div class="panel-header"><h2>学生画像</h2></div>${studentTable(vm.studentProfiles)}</div>
      <section class="grid analytics-grid">
        <div class="panel">
          <div class="panel-header"><h2>作业完成率</h2></div>
          ${horizontalBars(vm.courseCards.map((item) => ({ label: item.title, value: item.assignmentCompletionRate, text: formatPercent(item.assignmentCompletionRate) })), { label: "作业完成率" })}
        </div>
        <div class="panel">
          <div class="panel-header"><h2>掌握度条形图</h2></div>
          ${horizontalBars((selectedCourseBars.length ? selectedCourseBars : selectedStudentBars).map((item) => ({ label: item.label, value: item.value, text: formatPercent(item.value) })), { label: "掌握度条形图" })}
        </div>
      </section>
      <section class="grid analytics-grid">
        <div class="panel">
          <div class="panel-header"><h2>风险学生</h2></div>
          ${vm.riskStudents.length ? `<div class="course-list">${vm.riskStudents.map((item) => `
            <article class="course-item">
              <strong>${escapeHtml(item.name)}</strong>
              <div class="tag-row">${(item.reasons || []).map((reason) => statusBadge(reason, "high")).join("")}</div>
            </article>
          `).join("")}</div>` : emptyState("当前没有风险学生。")}
        </div>
        <div class="panel"><div class="panel-header"><h2>近期活动</h2></div>${activityList(vm.recentActivity)}</div>
      </section>
    </section>
  `;
}

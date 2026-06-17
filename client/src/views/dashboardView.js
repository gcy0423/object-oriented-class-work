import { activityList, courseList, goalList, noteList } from "../components.js";
import { metric, sectionCard } from "../widgets/cards.js";

export function dashboardView(state) {
  const dashboard = state.dashboard || {};
  const metrics = dashboard.metrics || {};
  return `
    <section class="grid metric-grid">
      ${metric("活跃目标", metrics.activeGoals ?? 0)}
      ${metric("学习完成率", `${metrics.completionRate ?? 0}%`)}
      ${metric("作业完成率", `${metrics.assignmentCompletionRate ?? 0}%`)}
      ${metric("掌握度", `${metrics.masteryScore ?? 0}%`)}
    </section>
    <section class="grid dashboard-grid">
      ${sectionCard("课程", courseList(dashboard.courses || []))}
      ${sectionCard("目标进度", goalList(dashboard.goals || []))}
      ${sectionCard("学习笔记", noteList(dashboard.notes || []))}
      ${sectionCard("近期活动", activityList(state.activity || dashboard.activity || []))}
    </section>
  `;
}

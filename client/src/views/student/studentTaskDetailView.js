import { escapeHtml } from "../../utils/dom.js";
import { selectStudentTaskDetailModel } from "../../state/studentSelectors.js";
import { emptyBlock, studentSection } from "./shared.js";

export function studentTaskDetailView(state) {
  const model = selectStudentTaskDetailModel(state);
  if (!model.task) {
    return studentSection("学习任务详情", emptyBlock("没有选中的任务，返回学习页后重新进入。"));
  }
  return `
    <section class="student-page-grid">
      ${studentSection("任务详情", `
        <article class="student-detail-card">
          <h2>${escapeHtml(model.task.title || "")}</h2>
          <p>预计 ${escapeHtml(model.task.estimateMinutes || 0)} 分钟，截止 ${escapeHtml(model.task.dueDate || "未设置")}。</p>
          <ul class="student-plain-list">${model.steps.map((item) => `<li>${escapeHtml(item || "")}</li>`).join("")}</ul>
        </article>
      `)}
      ${studentSection("完成标准", `<ul class="student-plain-list">${model.doneDefinition.map((item) => `<li>${escapeHtml(item || "")}</li>`).join("")}</ul>`)}
      ${studentSection("关联作业", `<ul class="student-plain-list">${model.relatedAssignments.map((item) => `<li>${escapeHtml(item.title || "")}</li>`).join("") || "<li>当前没有直接关联的作业，按课程 fallback 展示为空。</li>"}</ul>`)}
    </section>
  `;
}

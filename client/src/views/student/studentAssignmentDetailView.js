import { escapeHtml } from "../../utils/dom.js";
import { selectStudentAssignmentDetailModel } from "../../state/studentSelectors.js";
import { aiResultBlock, emptyBlock, studentSection } from "./shared.js";

export function studentAssignmentDetailView(state) {
  const model = selectStudentAssignmentDetailModel(state);
  if (!model.assignment) {
    return studentSection("作业详情", emptyBlock("没有选中的作业，返回作业页后重新进入。"));
  }
  return `
    <section class="student-detail-layout">
      <div class="student-page-grid">
        ${studentSection("作业要求", `
          <article class="student-detail-card">
            <h2>${escapeHtml(model.assignment.title || "")}</h2>
            <p>${escapeHtml(model.assignment.description || "暂无作业说明。")}</p>
            <div class="student-meta-row">
              <span>状态 ${escapeHtml(model.assignment.status || "published")}</span>
              <span>截止 ${escapeHtml(model.assignment.dueAt || "未设置")}</span>
            </div>
            <div class="button-row">
              <button class="btn primary" data-action="student-open-submit">进入提交</button>
              <button class="btn" data-action="student-open-history">历史提交</button>
              <button class="btn" data-action="student-open-feedback">教师反馈</button>
              <button class="btn" data-action="student-build-assignment-guide">刷新 AI 拆解</button>
            </div>
          </article>
        `)}
        ${studentSection("我的提交摘要", `
          <ul class="student-plain-list">
            ${model.submissions.map((item) => `<li>${escapeHtml(item.submittedAt || item.updatedAt || "")} · ${escapeHtml(item.content?.slice(0, 80) || "已提交")}</li>`).join("") || "<li>你还没有提交这份作业。</li>"}
          </ul>
        `)}
      </div>
      ${studentSection("AI 作业拆解", aiResultBlock(model.guide, { emptyText: "点击右侧 AI 或进入提交页触发结构化拆解。" }))}
    </section>
  `;
}

import { escapeHtml } from "../../utils/dom.js";
import { selectStudentMistakeDetailModel } from "../../state/studentSelectors.js";
import { studentSection } from "./shared.js";

export function studentMistakeDetailView(state) {
  const model = selectStudentMistakeDetailModel(state);
  return `
    <section class="student-page-grid">
      ${studentSection("错题详情", `
        <article class="student-detail-card">
          <h2>${escapeHtml(model.question?.stem || "未找到题目")}</h2>
          <p>我的答案：${escapeHtml(model.answer?.answer || "-")}</p>
          <p>正确答案：${escapeHtml(model.question?.answer || "-")}</p>
          <p>解析：${escapeHtml(model.question?.analysis || "-")}</p>
        </article>
      `)}
      ${studentSection("AI 建议", `<p>${escapeHtml(model.remediation?.advice || "当前没有额外建议。")}</p>`)}
    </section>
  `;
}

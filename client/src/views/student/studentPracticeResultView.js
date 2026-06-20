import { escapeHtml } from "../../utils/dom.js";
import { selectStudentPracticeResultModel } from "../../state/studentSelectors.js";
import { studentSection } from "./shared.js";

export function studentPracticeResultView(state) {
  const model = selectStudentPracticeResultModel(state);
  return `
    <section class="student-page-grid">
      ${studentSection("练习结果", `
        <article class="student-detail-card">
          <h2>正确率 ${escapeHtml(model.correctRate || 0)}%</h2>
          <p>已完成本次练习，可以继续回看错题或再做一组同类题。</p>
        </article>
      `)}
      ${studentSection("错题摘要", `<ul class="student-plain-list">${model.mistakeSummary.map((item) => `<li>${escapeHtml(item || "")}</li>`).join("") || "<li>当前没有额外错题摘要。</li>"}</ul>`)}
    </section>
  `;
}

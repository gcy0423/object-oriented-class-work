import { escapeHtml } from "../../utils/dom.js";
import { aiResultBlock, studentSection } from "./shared.js";

export function studentAiInsightView(state) {
  const result = state.student?.ai?.weaknessInsight || null;
  const weaknesses = result?.weaknesses || [];
  return `
    <section class="student-page-grid">
      ${studentSection("AI 分析结果", aiResultBlock(result, { emptyText: "先从 AI 学习台生成薄弱点分析。" }))}
      ${studentSection("薄弱点排序", `
        <div class="student-card-list">
          ${weaknesses.map((item) => `
            <article class="student-list-card">
              <div class="student-list-card__head">
                <strong>${escapeHtml(item.title || "")}</strong>
                <span>${escapeHtml(item.score || 0)}%</span>
              </div>
              <p>${escapeHtml(item.action || "")}</p>
              <ul class="student-plain-list">${(item.evidence || []).map((entry) => `<li>${escapeHtml(entry || "")}</li>`).join("")}</ul>
            </article>
          `).join("") || '<div class="student-empty">当前没有薄弱点数据。</div>'}
        </div>
      `)}
    </section>
  `;
}

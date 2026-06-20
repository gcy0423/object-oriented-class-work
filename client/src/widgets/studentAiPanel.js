import { escapeHtml } from "../utils/dom.js";
import { studentActionCards } from "./studentActionCards.js";

export function studentAiPanel(model = {}) {
  return `
    <aside class="student-ai-panel">
      <div class="student-ai-panel__header">
        <strong>AI 上下文助手</strong>
        <span>${escapeHtml(model.title || "当前关注")}</span>
      </div>
      <div class="student-ai-panel__body">
        <section class="student-side-card">
          <h3>当前关注</h3>
          <p>${escapeHtml(model.summary || "暂无新的学习建议。")}</p>
        </section>
        <section class="student-side-card">
          <h3>建议行动</h3>
          ${studentActionCards(model.actions || [])}
        </section>
        <section class="student-side-card">
          <h3>风险提醒</h3>
          <ul class="student-plain-list">
            ${(model.risks || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("") || "<li>当前没有高优先级风险。</li>"}
          </ul>
        </section>
      </div>
    </aside>
  `;
}

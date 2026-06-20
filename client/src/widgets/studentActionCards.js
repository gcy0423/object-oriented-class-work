import { attr, escapeHtml } from "../utils/dom.js";
import { statusText } from "../utils/format.js";

export function studentActionCards(actions = []) {
  if (!actions.length) {
    return `<div class="student-empty muted">当前没有可执行建议。</div>`;
  }
  return `
    <div class="student-action-list">
      ${actions.map((action) => `
        <article class="student-action-card">
          <button class="student-action-card__main" data-action="student-ai-action" data-result-id="${attr(action.resultId || "")}" data-action-id="${attr(action.id || "")}" data-route="${attr(action.route || "student-ai")}" data-kind="${attr(action.kind || "navigate")}" data-detail="${attr(action.detail || "")}">
            <strong>${escapeHtml(action.label || "查看")}</strong>
            <span>${escapeHtml(action.detail || "")}</span>
          </button>
          <span class="student-chip ${attr(action.status || "open")}">${escapeHtml(statusText(action.status || "open"))}</span>
          <div class="button-row">
            <button class="btn small" data-action="student-ai-action-status" data-result-id="${attr(action.resultId || "")}" data-action-id="${attr(action.id || "")}" data-status="completed">完成</button>
            <button class="btn small" data-action="student-ai-action-status" data-result-id="${attr(action.resultId || "")}" data-action-id="${attr(action.id || "")}" data-status="dismissed">忽略</button>
            <button class="btn small" data-action="student-ai-action-status" data-result-id="${attr(action.resultId || "")}" data-action-id="${attr(action.id || "")}" data-status="converted">转任务</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

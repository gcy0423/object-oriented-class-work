import { escapeHtml } from "../utils/dom.js";

function list(items = []) {
  const safeItems = items.length ? items : ["暂无新的风险，保持当前节奏。"];
  return `<ul class="teacher-plain-list">${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function teacherAiPanel(model) {
  return `
    <aside class="teacher-ai-panel" aria-label="教师 AI 上下文助手">
      <header class="teacher-ai-panel__header">
        <div>
          <span class="teacher-eyebrow">Context AI</span>
          <h2>${escapeHtml(model.title || "教学助手")}</h2>
        </div>
      </header>
      <div class="teacher-ai-panel__body">
        <section class="teacher-side-card is-current">
          <h3>当前判断</h3>
          <p>${escapeHtml(model.summary || "正在等待更多课堂证据。")}</p>
        </section>
        <section class="teacher-side-card">
          <h3>建议动作</h3>
          ${list(model.actions)}
        </section>
        <section class="teacher-side-card">
          <h3>需要留意</h3>
          ${list(model.risks)}
        </section>
      </div>
    </aside>
  `;
}

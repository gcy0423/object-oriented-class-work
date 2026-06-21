import { escapeHtml } from "../utils/dom.js";

function list(items = []) {
  const safeItems = items.length ? items : ["暂无新的风险，保持当前节奏。"];
  return `<ul class="teacher-plain-list">${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function commandButtons(items = []) {
  if (!items.length) {
    return `<div class="teacher-empty">当前页面暂无可执行 AI 指令。</div>`;
  }
  return `<div class="teacher-action-row">${items.map((item) => `
    <button class="btn ${item.action === "teacher-generate-ai" ? "primary" : ""}" data-action="${escapeHtml(item.action)}" ${item.command ? `data-command="${escapeHtml(item.command)}"` : ""} ${item.route ? `data-route="${escapeHtml(item.route)}"` : ""}>${escapeHtml(item.label)}</button>
  `).join("")}</div>`;
}

function renderDrafts(items = []) {
  if (!items.length) {
    return `<div class="teacher-empty">暂无草稿。</div>`;
  }
  return items.slice(0, 2).map((item) => `
    <article class="teacher-list-card">
      <div class="teacher-list-card__head">
        <div>
          <h3>${escapeHtml(item.title || "教师 AI 草稿")}</h3>
          <p>${escapeHtml(item.summary || item.body || "暂无草稿摘要。")}</p>
        </div>
        <span class="teacher-chip">${escapeHtml(item.status || "draft")}</span>
      </div>
      ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}
      <div class="teacher-action-row">
        <button class="btn" data-action="teacher-open-ai-draft" data-id="${escapeHtml(item.id)}">打开草稿</button>
      </div>
    </article>
  `).join("");
}

export function teacherAiPanel(model) {
  const result = model.currentResult || null;
  return `
    <aside class="teacher-ai-panel" aria-label="教师 AI 上下文助手">
      <header class="teacher-ai-panel__header">
        <div>
          <span class="teacher-eyebrow">AI 助手</span>
          <h2>${escapeHtml(model.title || "教学助手")}</h2>
        </div>
      </header>
      <div class="teacher-ai-panel__body">
        <section class="teacher-side-card is-current">
          <h3>当前判断</h3>
          <p>${escapeHtml(model.summary || "正在等待更多课堂证据。")}</p>
        </section>
        <section class="teacher-side-card">
          <h3>快捷指令</h3>
          ${commandButtons(model.commands || [])}
        </section>
        <section class="teacher-side-card">
          <h3>最近结果</h3>
          ${result ? `
            <article class="teacher-list-card">
              <div class="teacher-list-card__head">
                <div>
                  <h3>${escapeHtml(result.draft?.title || result.summary || "教师 AI 结果")}</h3>
                  <p>${escapeHtml(result.summary || "暂无结果摘要。")}</p>
                </div>
                <span class="teacher-chip">${escapeHtml(result.provider || "AI")}</span>
              </div>
              ${result.draft?.body ? `<p>${escapeHtml(result.draft.body)}</p>` : ""}
            </article>
          ` : `<div class="teacher-empty">当前页面还没有生成结果。</div>`}
        </section>
        <section class="teacher-side-card">
          <h3>建议动作</h3>
          ${list(model.actions)}
        </section>
        <section class="teacher-side-card">
          <h3>需要留意</h3>
          ${list(model.risks)}
        </section>
        <section class="teacher-side-card">
          <h3>草稿确认</h3>
          ${renderDrafts(model.drafts || [])}
        </section>
      </div>
    </aside>
  `;
}

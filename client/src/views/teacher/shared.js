import { attr, escapeHtml } from "../../utils/dom.js";

export function teacherEmpty(text = "暂无可展示数据。") {
  return `<div class="teacher-empty">${escapeHtml(text)}</div>`;
}

export function metricStrip(metrics = []) {
  return `
    <section class="teacher-metric-strip">
      ${metrics.map((item) => `
        <article class="teacher-metric-card">
          <small>${escapeHtml(item.label)}</small>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `).join("")}
    </section>
  `;
}

export function actionRow(actions = []) {
  return `
    <div class="teacher-action-row">
      ${actions.map((item) => `
        <button class="btn ${item.primary ? "primary" : ""}" data-action="${attr(item.action || "teacher-route")}" ${item.route ? `data-route="${attr(item.route)}"` : ""} ${item.id ? `data-id="${attr(item.id)}"` : ""}>
          ${escapeHtml(item.label)}
        </button>
      `).join("")}
    </div>
  `;
}

export function panel({ eyebrow = "", title, text = "", actions = [], body = "" }) {
  return `
    <section class="teacher-panel">
      <header class="teacher-panel__header">
        <div>
          ${eyebrow ? `<span class="teacher-eyebrow">${escapeHtml(eyebrow)}</span>` : ""}
          <h2>${escapeHtml(title)}</h2>
          ${text ? `<p>${escapeHtml(text)}</p>` : ""}
        </div>
      </header>
      ${body}
      ${actions.length ? actionRow(actions) : ""}
    </section>
  `;
}

export function cardList(items = [], renderItem, emptyText) {
  if (!items.length) {
    return teacherEmpty(emptyText);
  }
  return `<div class="teacher-card-list">${items.map(renderItem).join("")}</div>`;
}

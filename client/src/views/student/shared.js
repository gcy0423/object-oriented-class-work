import { attr, escapeHtml } from "../../utils/dom.js";
import { formatDate, formatDateTime, formatPercent, statusText } from "../../utils/format.js";
import { studentActionCards } from "../../widgets/studentActionCards.js";

export function studentHero(title, summary, metricItems = []) {
  return `
    <section class="student-hero-panel">
      <div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(summary)}</p>
      </div>
      <div class="student-metric-grid">
        ${metricItems.map((item) => `
          <article class="student-metric-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            ${item.hint ? `<small>${escapeHtml(item.hint)}</small>` : ""}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

export function studentSection(title, body, actions = "") {
  return `
    <section class="student-panel">
      <div class="student-panel__header">
        <h3>${escapeHtml(title)}</h3>
        ${actions}
      </div>
      ${body}
    </section>
  `;
}

export function chip(value, tone = "") {
  return `<span class="student-chip ${attr(tone || String(value || "").toLowerCase())}">${escapeHtml(statusText(value))}</span>`;
}

export function courseTabs(courses = [], selectedCourseId = "") {
  return `
    <div class="student-tab-row">
      ${courses.map((course) => `
        <button class="student-tab ${selectedCourseId === course.id ? "is-active" : ""}" data-action="student-select-course" data-id="${attr(course.id)}">
          ${escapeHtml(course.title)}
        </button>
      `).join("")}
    </div>
  `;
}

export function listCards(items = [], render) {
  return `<div class="student-card-list">${items.map(render).join("")}</div>`;
}

export function assignmentCard(item) {
  return `
    <article class="student-list-card">
      <div class="student-list-card__head">
        <strong>${escapeHtml(item.title)}</strong>
        ${chip(item.urgency || "active", item.urgency || "active")}
      </div>
      <p>${escapeHtml(item.description || "暂无作业说明。")}</p>
      <div class="student-meta-row">
        <span>截止 ${escapeHtml(formatDate(item.dueAt))}</span>
        ${item.courseTitle ? `<span>${escapeHtml(item.courseTitle)}</span>` : ""}
      </div>
      <div class="button-row">
        <button class="btn" data-action="student-open-assignment" data-id="${attr(item.id)}">查看详情</button>
      </div>
    </article>
  `;
}

export function taskCard(item) {
  return `
    <article class="student-list-card">
      <div class="student-list-card__head">
        <strong>${escapeHtml(item.title)}</strong>
        ${chip(item.status || "active", item.status || "active")}
      </div>
      <div class="student-meta-row">
        <span>预计 ${escapeHtml(item.estimateMinutes || 0)} 分钟</span>
        <span>截止 ${escapeHtml(formatDate(item.dueDate))}</span>
      </div>
      <div class="button-row">
        <button class="btn" data-action="student-open-task" data-id="${attr(item.id)}">详情</button>
        ${item.status === "done" ? "" : `<button class="btn primary" data-action="student-complete-task" data-id="${attr(item.id)}">完成任务</button>`}
      </div>
    </article>
  `;
}

export function noteCard(item) {
  return `
    <article class="student-list-card">
      <div class="student-list-card__head">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(formatDateTime(item.updatedAt || item.createdAt))}</span>
      </div>
      <p>${escapeHtml(String(item.content || "").slice(0, 120))}</p>
      <div class="button-row">
        <button class="btn" data-action="student-edit-note" data-id="${attr(item.id)}">查看/编辑</button>
        <button class="btn" data-action="student-delete-note" data-id="${attr(item.id)}">删除</button>
      </div>
    </article>
  `;
}

export function aiResultBlock(result, options = {}) {
  if (!result) {
    return `<div class="student-empty muted">${escapeHtml(options.emptyText || "当前还没有 AI 结果。")}</div>`;
  }
  return `
    <div class="student-ai-result">
      <p class="student-ai-result__summary">${escapeHtml(result.summary || "")}</p>
      ${result.actions ? studentActionCards(result.actions.map((action) => ({ ...action, resultId: action.resultId || result.id || "" }))) : ""}
      ${(result.evidence || []).length ? `<div><strong>依据</strong><ul class="student-plain-list">${result.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
      ${(result.risks || []).length ? `<div><strong>风险</strong><ul class="student-plain-list">${result.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
      ${(result.questions || []).length ? `<div><strong>可继续追问</strong><ul class="student-plain-list">${result.questions.map((item) => `<li>${escapeHtml(item.text || item)}</li>`).join("")}</ul></div>` : ""}
    </div>
  `;
}

export function emptyBlock(text) {
  return `<div class="student-empty">${escapeHtml(text)}</div>`;
}

export function percentText(value) {
  return formatPercent(value || 0);
}

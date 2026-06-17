import { attr, escapeHtml } from "../utils/dom.js";
import { statusText } from "../utils/format.js";

export function metric(label, value, hint = "") {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${hint ? `<small class="muted">${escapeHtml(hint)}</small>` : ""}</div>`;
}

export function statusBadge(value, tone = "") {
  const resolved = tone || String(value || "").toLowerCase().replaceAll("_", "-");
  return `<span class="badge ${attr(resolved)}">${escapeHtml(statusText(value))}</span>`;
}

export function emptyState(text, action = "") {
  return `<div class="empty-state"><p class="muted">${escapeHtml(text)}</p>${action}</div>`;
}

export function sectionCard(title, content, extra = "") {
  return `<section class="panel"><div class="panel-header"><h2>${escapeHtml(title)}</h2>${extra}</div>${content}</section>`;
}
